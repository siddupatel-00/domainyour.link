import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { redirects, Redirect } from "@/lib/db/schema";
import { isAuthenticated } from "@/lib/auth";
import { sanitizeSlug, isValidUrl } from "@/lib/utils";
import { desc, and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// In-memory fallback store for local development when Postgres is not yet connected
const localFallbackLinks: Redirect[] = [];
let nextId = 1;

export function getLocalFallbackLinks() {
  return localFallbackLinks;
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
    // If DB is not connected locally, fallback gracefully to in-memory store
    console.warn("Using local fallback store:", error);
    return NextResponse.json({ redirects: localFallbackLinks });
  }
}

// POST /api/redirects - Create a new redirect
export async function POST(request: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { username, webname, destinationUrl } = body;

    if (!username || !webname || !destinationUrl) {
      return NextResponse.json(
        { error: "Username, link name, and destination URL are required" },
        { status: 400 }
      );
    }

    const cleanUsername = sanitizeSlug(username);
    const cleanWebname = sanitizeSlug(webname);

    if (!cleanUsername || cleanUsername.length < 1) {
      return NextResponse.json(
        { error: "Username contains invalid characters" },
        { status: 400 }
      );
    }

    if (!cleanWebname || cleanWebname.length < 1) {
      return NextResponse.json(
        { error: "Link name contains invalid characters" },
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

    try {
      // Check if (username, webname) already exists in DB
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
            error: `A link for /${cleanUsername}/${cleanWebname} already exists. You can edit it instead.`,
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
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      localFallbackLinks.unshift(newRecord);
      return NextResponse.json({ success: true, redirect: newRecord }, { status: 201 });
    }
  } catch (error) {
    console.error("Create redirect error:", error);
    return NextResponse.json(
      { error: "Failed to create redirect" },
      { status: 500 }
    );
  }
}
