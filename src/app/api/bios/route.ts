import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bios, Bio } from "@/lib/db/schema";
import { isAuthenticated, getSessionUser } from "@/lib/auth";
import { sanitizeSlug } from "@/lib/utils";
import { desc, and, eq } from "drizzle-orm";
import { calculateExpiration } from "../redirects/route";
import { isTursoEnabled, tursoGetBios, tursoFindBio, turso } from "@/lib/tursoDb";
import { findUserByEmailOrUsername } from "@/lib/userStore";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// In-memory fallback store for local development
const localFallbackBios: Bio[] = [];
let nextBioId = 1;

export function getLocalFallbackBios() {
  return localFallbackBios;
}

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

// GET /api/bios - List all bios for the authenticated user
export async function GET() {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noCacheHeaders });
  }

  const session = await getSessionUser();
  const username = session?.username || "creator";

  const user = await findUserByEmailOrUsername(username);
  const mainBioCode = user?.bioCode || Math.random().toString(36).substring(2, 8).toLowerCase();

  // 1. Try Turso if enabled
  if (isTursoEnabled) {
    try {
      const list = await tursoGetBios(username);
      return NextResponse.json({ bios: list, mainBioCode }, { headers: noCacheHeaders });
    } catch {}
  }

  // 2. Try PostgreSQL / Neon
  try {
    const list = await db
      .select()
      .from(bios)
      .where(eq(bios.username, username))
      .orderBy(desc(bios.createdAt));

    return NextResponse.json({ bios: list, mainBioCode }, { headers: noCacheHeaders });
  } catch (error) {
    // 3. Fallback memory store
    const userBios = localFallbackBios.filter((b) => b.username === username);
    return NextResponse.json({ bios: userBios, mainBioCode }, { headers: noCacheHeaders });
  }
}

// POST /api/bios - Create a new bio / sub-bio
export async function POST(request: NextRequest) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noCacheHeaders });
  }

  try {
    const body = await request.json();
    const {
      bioname,
      title,
      description,
      linkIds,
      duration,
      expiresAt,
    } = body;

    const username = session.username || "creator";

    if (!bioname) {
      return NextResponse.json(
        { error: "Bio name is required (e.g. work, socials, hackathon)" },
        { status: 400, headers: noCacheHeaders }
      );
    }

    const cleanBioname = sanitizeSlug(bioname);
    if (!cleanBioname) {
      return NextResponse.json(
        { error: "Please enter a valid bio name" },
        { status: 400, headers: noCacheHeaders }
      );
    }

    const expirationDate = expiresAt ? new Date(expiresAt) : calculateExpiration(duration);
    const linkIdsJson = Array.isArray(linkIds) ? JSON.stringify(linkIds) : "[]";
    const bioCode = (body.code || Math.random().toString(36).substring(2, 8)).toLowerCase().trim();

    // 1. Try Turso if enabled
    if (isTursoEnabled) {
      try {
        const existing = await tursoFindBio(username, cleanBioname);
        if (existing) {
          return NextResponse.json(
            { error: `A bio page for /${username}/b/${cleanBioname} already exists.` },
            { status: 409, headers: noCacheHeaders }
          );
        }

        const expiresStr = expirationDate ? expirationDate.toISOString() : null;
        const result = await turso.execute({
          sql: `INSERT INTO bios (username, bioname, title, description, link_ids, code, expires_at)
                VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *;`,
          args: [
            username.toLowerCase(),
            cleanBioname.toLowerCase(),
            title || null,
            description || null,
            linkIdsJson,
            bioCode,
            expiresStr,
          ],
        });

        const row = result.rows[0];
        const newBio: Bio = {
          id: Number(row.id),
          username: String(row.username),
          bioname: String(row.bioname),
          title: row.title ? String(row.title) : null,
          description: row.description ? String(row.description) : null,
          linkIds: String(row.link_ids || "[]"),
          code: row.code ? String(row.code) : bioCode,
          expiresAt: row.expires_at ? new Date(String(row.expires_at)) : null,
          createdAt: new Date(String(row.created_at)),
          updatedAt: new Date(String(row.updated_at)),
        };

        return NextResponse.json({ success: true, bio: newBio }, { status: 201, headers: noCacheHeaders });
      } catch (err: any) {
        console.error("Turso create bio error:", err);
      }
    }

    // 2. Try PostgreSQL / Neon
    try {
      const existing = await db
        .select({ id: bios.id })
        .from(bios)
        .where(
          and(
            eq(bios.username, username),
            eq(bios.bioname, cleanBioname)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        return NextResponse.json(
          {
            error: `A bio page for /${username}/b/${cleanBioname} already exists.`,
          },
          { status: 409, headers: noCacheHeaders }
        );
      }

      const [newRecord] = await db
        .insert(bios)
        .values({
          username,
          bioname: cleanBioname,
          title: title || null,
          description: description || null,
          linkIds: linkIdsJson,
          code: bioCode,
          expiresAt: expirationDate,
        })
        .returning();

      return NextResponse.json({ success: true, bio: newRecord }, { status: 201, headers: noCacheHeaders });
    } catch {
      // 3. Fallback memory store
      const exists = localFallbackBios.some(
        (b) => b.username === username && b.bioname === cleanBioname
      );
      if (exists) {
        return NextResponse.json(
          { error: `A bio page for /${username}/b/${cleanBioname} already exists.` },
          { status: 409, headers: noCacheHeaders }
        );
      }

      const newRecord: Bio = {
        id: nextBioId++,
        username,
        bioname: cleanBioname,
        title: title || null,
        description: description || null,
        linkIds: linkIdsJson,
        code: bioCode,
        expiresAt: expirationDate,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      localFallbackBios.unshift(newRecord);
      return NextResponse.json({ success: true, bio: newRecord }, { status: 201, headers: noCacheHeaders });
    }
  } catch (error) {
    console.error("Create bio error:", error);
    return NextResponse.json(
      { error: "Failed to create bio page" },
      { status: 500, headers: noCacheHeaders }
    );
  }
}
