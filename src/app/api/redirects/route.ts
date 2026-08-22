import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { redirects, Redirect } from "@/lib/db/schema";
import { isAuthenticated, getSessionUser } from "@/lib/auth";
import { sanitizeSlug, isValidUrl } from "@/lib/utils";
import { desc, and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// In-memory fallback store for local development when Postgres is not yet connected
const localFallbackLinks: Redirect[] = [];
let nextId = 1;

export function getLocalFallbackLinks() {
  return localFallbackLinks;
}

// Helper to calculate expiration date from preset duration
export function calculateExpiration(duration?: string | null): Date | null {
  if (!duration || duration === "permanent" || duration === "never") return null;

  const now = Date.now();
  switch (duration) {
    case "1h":
      return new Date(now + 1 * 60 * 60 * 1000);
    case "24h":
      return new Date(now + 24 * 60 * 60 * 1000);
    case "7d":
      return new Date(now + 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now + 30 * 24 * 60 * 60 * 1000);
    default:
      const parsed = new Date(duration);
      return !isNaN(parsed.getTime()) ? parsed : null;
  }
}

// GET /api/redirects - List all redirects
export async function GET() {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const list = await db
      .select()
      .from(redirects)
      .orderBy(desc(redirects.createdAt));

    return NextResponse.json({ redirects: list });
  } catch (error) {
    console.warn("Using local fallback store:", error);
    return NextResponse.json({ redirects: localFallbackLinks });
  }
}

// POST /api/redirects - Create a new redirect or sub-link
export async function POST(request: NextRequest) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      username: bodyUsername,
      webname,
      destinationUrl,
      duration,
      expiresAt,
      parentId,
    } = body;

    const finalUsername = bodyUsername || session.username || "siddu";

    if (!webname || !destinationUrl) {
      return NextResponse.json(
        { error: "Name and destination URL are required" },
        { status: 400 }
      );
    }

    const cleanUsername = sanitizeSlug(finalUsername);
    const cleanWebname = sanitizeSlug(webname);

    if (!cleanUsername || cleanUsername.length < 1) {
      return NextResponse.json(
        { error: "Username is invalid" },
        { status: 400 }
      );
    }

    if (!cleanWebname || cleanWebname.length < 1) {
      return NextResponse.json(
        { error: "Please enter a valid name (e.g. linkedin, reddit, insta)" },
        { status: 400 }
      );
    }

    let formattedDestination = destinationUrl.trim();
    if (
      !formattedDestination.startsWith("http://") &&
      !formattedDestination.startsWith("https://")
    ) {
      formattedDestination = `https://${formattedDestination}`;
    }

    if (!isValidUrl(formattedDestination)) {
      return NextResponse.json(
        { error: "Please enter a valid destination URL (e.g. https://linkedin.com/in/...)" },
        { status: 400 }
      );
    }

    const expirationDate = expiresAt ? new Date(expiresAt) : calculateExpiration(duration);

    try {
      const existing = await db
        .select({ id: redirects.id })
        .from(redirects)
        .where(
          and(
            eq(redirects.username, cleanUsername),
            eq(redirects.webname, cleanWebname)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        return NextResponse.json(
          {
            error: `A link for /${cleanUsername}/${cleanWebname} already exists. Please choose a different name.`,
          },
          { status: 409 }
        );
      }

      const [newRecord] = await db
        .insert(redirects)
        .values({
          username: cleanUsername,
          webname: cleanWebname,
          destinationUrl: formattedDestination,
          redirectCode: 307,
          clickCount: 0,
          expiresAt: expirationDate,
          parentId: parentId ? Number(parentId) : null,
        })
        .returning();

      return NextResponse.json({ success: true, redirect: newRecord }, { status: 201 });
    } catch {
      // Fallback local memory insert
      const exists = localFallbackLinks.some(
        (l) => l.username === cleanUsername && l.webname === cleanWebname
      );
      if (exists) {
        return NextResponse.json(
          { error: `A link for /${cleanUsername}/${cleanWebname} already exists.` },
          { status: 409 }
        );
      }

      const newRecord: Redirect = {
        id: nextId++,
        username: cleanUsername,
        webname: cleanWebname,
        destinationUrl: formattedDestination,
        redirectCode: 307,
        clickCount: 0,
        expiresAt: expirationDate,
        parentId: parentId ? Number(parentId) : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      localFallbackLinks.unshift(newRecord);
      return NextResponse.json({ success: true, redirect: newRecord }, { status: 201 });
    }
  } catch (error) {
    console.error("Create redirect error:", error);
    return NextResponse.json(
      { error: "Failed to create link" },
      { status: 500 }
    );
  }
}
