import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bios, Bio } from "@/lib/db/schema";
import { isAuthenticated, getSessionUser } from "@/lib/auth";
import { sanitizeSlug } from "@/lib/utils";
import { desc, and, eq } from "drizzle-orm";
import { calculateExpiration } from "../redirects/route";

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
  const username = session?.username || "siddu";

  try {
    const list = await db
      .select()
      .from(bios)
      .where(eq(bios.username, username))
      .orderBy(desc(bios.createdAt));

    return NextResponse.json({ bios: list }, { headers: noCacheHeaders });
  } catch (error) {
    console.warn("Using local fallback for bios:", error);
    const userBios = localFallbackBios.filter((b) => b.username === username);
    return NextResponse.json({ bios: userBios }, { headers: noCacheHeaders });
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

    const username = session.username || "siddu";

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
          { error: `A bio page named "${cleanBioname}" already exists. Please choose a different name.` },
          { status: 409, headers: noCacheHeaders }
        );
      }

      const [newRecord] = await db
        .insert(bios)
        .values({
          username,
          bioname: cleanBioname,
          title: title?.trim() || cleanBioname,
          description: description?.trim() || null,
          linkIds: linkIdsJson,
          expiresAt: expirationDate,
        })
        .returning();

      return NextResponse.json({ success: true, bio: newRecord }, { status: 201, headers: noCacheHeaders });
    } catch {
      // Fallback local memory insert
      const exists = localFallbackBios.some(
        (b) => b.username === username && b.bioname === cleanBioname
      );
      if (exists) {
        return NextResponse.json(
          { error: `A bio page named "${cleanBioname}" already exists.` },
          { status: 409, headers: noCacheHeaders }
        );
      }

      const newRecord: Bio = {
        id: nextBioId++,
        username,
        bioname: cleanBioname,
        title: title?.trim() || cleanBioname,
        description: description?.trim() || null,
        linkIds: linkIdsJson,
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
