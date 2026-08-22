import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { redirects } from "@/lib/db/schema";
import { isAuthenticated } from "@/lib/auth";
import { sanitizeSlug, isValidUrl } from "@/lib/utils";
import { desc, and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET /api/redirects - List all redirects (requires auth)
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
    console.error("Fetch redirects error:", error);
    return NextResponse.json(
      { error: "Failed to fetch redirects" },
      { status: 500 }
    );
  }
}

// POST /api/redirects - Create a new redirect (requires auth)
export async function POST(request: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { username, webname, destinationUrl, redirectCode } = body;

    if (!username || !webname || !destinationUrl) {
      return NextResponse.json(
        { error: "Username, webname, and destination URL are required" },
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
        { error: "Webname contains invalid characters" },
        { status: 400 }
      );
    }

    // Standardize destination URL format
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

    const cleanCode = redirectCode === 308 ? 308 : 307;

    // Check if (username, webname) already exists
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
          error: `A permanent link for /${cleanUsername}/${cleanWebname} already exists. You can edit its destination instead.`,
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
        redirectCode: cleanCode,
        clickCount: 0,
      })
      .returning();

    return NextResponse.json({ success: true, redirect: newRecord }, { status: 201 });
  } catch (error) {
    console.error("Create redirect error:", error);
    return NextResponse.json(
      { error: "Failed to create redirect" },
      { status: 500 }
    );
  }
}
