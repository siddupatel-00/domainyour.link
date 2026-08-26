import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { redirects, Redirect, clickEvents } from "@/lib/db/schema";
import { isAuthenticated, getSessionUser } from "@/lib/auth";
import { sanitizeSlug, isValidUrl } from "@/lib/utils";
import { desc, and, eq, gte, lte } from "drizzle-orm";
import {
  isTursoEnabled,
  tursoGetRedirects,
  tursoGetRedirectsWithTimeframe,
  parseTimeframeDates,
  tursoFindRedirect,
  tursoCreateRedirect,
} from "@/lib/tursoDb";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// In-memory fallback store for local development
const localFallbackLinks: Redirect[] = [];
const localFallbackClickEvents: { redirectId: number; createdAt: Date }[] = [];
let nextId = 1;

export function getLocalFallbackLinks() {
  return localFallbackLinks;
}

export function getLocalFallbackClickEvents() {
  return localFallbackClickEvents;
}

export function logLocalFallbackClick(redirectId: number) {
  localFallbackClickEvents.push({
    redirectId,
    createdAt: new Date(),
  });
}

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

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

// GET /api/redirects - List all redirects with accurate timeframe filtering
export async function GET(request: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noCacheHeaders });
  }

  const session = await getSessionUser();
  const username = session?.username || "creator";

  const { searchParams } = new URL(request.url);
  const timeframe = searchParams.get("timeframe");
  const customStart = searchParams.get("startDate");
  const customEnd = searchParams.get("endDate");

  const { startDate, endDate } = parseTimeframeDates(timeframe, customStart, customEnd);

  // 1. Try Turso if enabled
  if (isTursoEnabled) {
    try {
      const list = await tursoGetRedirectsWithTimeframe(username, startDate, endDate);
      return NextResponse.json({ redirects: list }, { headers: noCacheHeaders });
    } catch (err) {
      console.error("Turso redirects list error:", err);
    }
  }

  // 2. Try PostgreSQL / Neon
  try {
    const list = await db
      .select()
      .from(redirects)
      .where(eq(redirects.username, username))
      .orderBy(desc(redirects.createdAt));

    if (startDate) {
      const events = await db
        .select()
        .from(clickEvents)
        .where(
          and(
            gte(clickEvents.createdAt, startDate),
            lte(clickEvents.createdAt, endDate)
          )
        );

      const countMap: Record<number, number> = {};
      events.forEach((e) => {
        countMap[e.redirectId] = (countMap[e.redirectId] || 0) + 1;
      });

      const filtered = list.map((r) => ({
        ...r,
        clickCount: countMap[r.id] ?? 0,
      }));

      return NextResponse.json({ redirects: filtered }, { headers: noCacheHeaders });
    }

    return NextResponse.json({ redirects: list }, { headers: noCacheHeaders });
  } catch {
    // 3. Fallback memory store
    const userLinks = localFallbackLinks.filter((l) => l.username === username);
    if (startDate) {
      const filteredEvents = localFallbackClickEvents.filter(
        (e) => e.createdAt >= startDate && e.createdAt <= endDate
      );
      const countMap: Record<number, number> = {};
      filteredEvents.forEach((e) => {
        countMap[e.redirectId] = (countMap[e.redirectId] || 0) + 1;
      });

      const filtered = userLinks.map((r) => ({
        ...r,
        clickCount: countMap[r.id] ?? 0,
      }));

      return NextResponse.json({ redirects: filtered }, { headers: noCacheHeaders });
    }

    return NextResponse.json({ redirects: userLinks }, { headers: noCacheHeaders });
  }
}

// POST /api/redirects - Create a new redirect or sub-link
export async function POST(request: NextRequest) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noCacheHeaders });
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
      showOnProfile,
    } = body;

    const finalUsername = bodyUsername || session.username || "creator";

    if (!webname || !destinationUrl) {
      return NextResponse.json(
        { error: "Link name and destination URL are required" },
        { status: 400, headers: noCacheHeaders }
      );
    }

    const cleanUsername = sanitizeSlug(finalUsername);
    const cleanWebname = sanitizeSlug(webname);

    if (!cleanWebname) {
      return NextResponse.json(
        { error: "Please enter a valid link name" },
        { status: 400, headers: noCacheHeaders }
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
        { error: "Please enter a valid destination URL (e.g. https://linkedin.com/in/you)" },
        { status: 400, headers: noCacheHeaders }
      );
    }

    const expirationDate = expiresAt ? new Date(expiresAt) : calculateExpiration(duration);

    // 1. Try Turso if enabled
    if (isTursoEnabled) {
      try {
        const existing = await tursoFindRedirect(cleanUsername, cleanWebname);
        if (existing) {
          return NextResponse.json(
            { error: `The link /${cleanUsername}/${cleanWebname} already exists.` },
            { status: 409, headers: noCacheHeaders }
          );
        }

        const newRecord = await tursoCreateRedirect({
          username: cleanUsername,
          webname: cleanWebname,
          destinationUrl: formattedDestination,
          redirectCode: 307,
          expiresAt: expirationDate,
          parentId: parentId ? Number(parentId) : null,
          showOnProfile: showOnProfile !== false,
        });

        return NextResponse.json({ success: true, redirect: newRecord }, { status: 201, headers: noCacheHeaders });
      } catch (err: any) {
        console.error("Turso create redirect error:", err);
      }
    }

    // 2. Try PostgreSQL / Neon
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
            error: `The link /${cleanUsername}/${cleanWebname} already exists.`,
          },
          { status: 409, headers: noCacheHeaders }
        );
      }

      const [newRecord] = await db
        .insert(redirects)
        .values({
          username: cleanUsername,
          webname: cleanWebname,
          destinationUrl: formattedDestination,
          redirectCode: 307,
          expiresAt: expirationDate,
          parentId: parentId ? Number(parentId) : null,
          showOnProfile: showOnProfile !== false,
        })
        .returning();

      return NextResponse.json({ success: true, redirect: newRecord }, { status: 201, headers: noCacheHeaders });
    } catch {
      // 3. Fallback memory store
      const exists = localFallbackLinks.some(
        (l) => l.username === cleanUsername && l.webname === cleanWebname
      );
      if (exists) {
        return NextResponse.json(
          { error: `The link /${cleanUsername}/${cleanWebname} already exists.` },
          { status: 409, headers: noCacheHeaders }
        );
      }

      const newRecord: Redirect = {
        id: nextId++,
        username: cleanUsername,
        webname: cleanWebname,
        destinationUrl: formattedDestination,
        redirectCode: 307,
        clickCount: 0,
        expiredClickCount: 0,
        expiresAt: expirationDate,
        parentId: parentId ? Number(parentId) : null,
        showOnProfile: showOnProfile !== false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      localFallbackLinks.unshift(newRecord);
      return NextResponse.json({ success: true, redirect: newRecord }, { status: 201, headers: noCacheHeaders });
    }
  } catch (error) {
    console.error("Create redirect error:", error);
    return NextResponse.json(
      { error: "Failed to create link" },
      { status: 500, headers: noCacheHeaders }
    );
  }
}

// PATCH /api/redirects - Bulk actions like reset_all_analytics
export async function PATCH(request: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noCacheHeaders });
  }

  const user = await getSessionUser();
  const username = user?.username || "creator";

  try {
    const body = await request.json();
    if (body.action === "reset_all_analytics") {
      if (isTursoEnabled) {
        const { tursoResetAllUserClicks } = await import("@/lib/tursoDb");
        await tursoResetAllUserClicks(username);
      }
      if (db) {
        try {
          const userLinks = await db
            .select()
            .from(redirects)
            .where(eq(redirects.username, username));
          const linkIds = userLinks.map((l) => l.id);
          await db
            .update(redirects)
            .set({ clickCount: 0, expiredClickCount: 0, updatedAt: new Date() })
            .where(eq(redirects.username, username));
          for (const lId of linkIds) {
            await db.delete(clickEvents).where(eq(clickEvents.redirectId, lId));
          }
        } catch {}
      }

      // Memory fallback
      localFallbackLinks
        .filter((l) => l.username.toLowerCase() === username.toLowerCase())
        .forEach((l) => {
          l.clickCount = 0;
          l.expiredClickCount = 0;
        });

      return NextResponse.json(
        { success: true, message: "All analytics reset to 0" },
        { headers: noCacheHeaders }
      );
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400, headers: noCacheHeaders });
  } catch (err) {
    console.error("Bulk redirects action error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500, headers: noCacheHeaders });
  }
}

