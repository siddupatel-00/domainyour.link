import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { redirects, Redirect, clickEvents } from "@/lib/db/schema";
import { isAuthenticated, getSessionUser } from "@/lib/auth";
import { sanitizeSlug, isValidUrl } from "@/lib/utils";
import { desc, and, eq, gte, lte } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// In-memory fallback store for local development when Postgres is not yet connected
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

// GET /api/redirects - List all redirects with real-time freshness
export async function GET(request: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noCacheHeaders });
  }

  const { searchParams } = new URL(request.url);
  const timeframe = searchParams.get("timeframe");
  const customStart = searchParams.get("startDate");
  const customEnd = searchParams.get("endDate");

  try {
    const list = await db
      .select()
      .from(redirects)
      .orderBy(desc(redirects.createdAt));

    // If timeframe filtering is requested, calculate clicks in that range
    if (timeframe) {
      const now = new Date();
      let startDate: Date;
      let endDate: Date = now;

      switch (timeframe) {
        case "24h":
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case "7d":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "14d":
          startDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
          break;
        case "this_month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "last_month":
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
          break;
        case "custom":
          startDate = customStart ? new Date(customStart) : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (customEnd) endDate = new Date(new Date(customEnd).setHours(23, 59, 59, 999));
          break;
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      // Query click events in range
      const events = await db
        .select()
        .from(clickEvents)
        .where(
          and(
            gte(clickEvents.createdAt, startDate),
            lte(clickEvents.createdAt, endDate)
          )
        );

      const countsMap: Record<number, number> = {};
      events.forEach((ev) => {
        countsMap[ev.redirectId] = (countsMap[ev.redirectId] || 0) + 1;
      });

      const enrichedList = list.map((r) => ({
        ...r,
        clickCount: countsMap[r.id] ?? r.clickCount,
      }));

      return NextResponse.json({ redirects: enrichedList }, { headers: noCacheHeaders });
    }

    return NextResponse.json({ redirects: list }, { headers: noCacheHeaders });
  } catch (error) {
    console.warn("Using local fallback store:", error);
    
    // In local fallback, if click events exist filter them, else return list
    if (timeframe && localFallbackClickEvents.length > 0) {
      const now = new Date();
      let startDate: Date;
      let endDate: Date = now;

      switch (timeframe) {
        case "24h":
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case "7d":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "14d":
          startDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
          break;
        case "this_month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "last_month":
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
          break;
        case "custom":
          startDate = customStart ? new Date(customStart) : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (customEnd) endDate = new Date(new Date(customEnd).setHours(23, 59, 59, 999));
          break;
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      const filteredEvents = localFallbackClickEvents.filter(
        (e) => e.createdAt >= startDate && e.createdAt <= endDate
      );
      const countsMap: Record<number, number> = {};
      filteredEvents.forEach((ev) => {
        countsMap[ev.redirectId] = (countsMap[ev.redirectId] || 0) + 1;
      });

      const enrichedList = localFallbackLinks.map((r) => ({
        ...r,
        clickCount: countsMap[r.id] ?? r.clickCount,
      }));

      return NextResponse.json({ redirects: enrichedList }, { headers: noCacheHeaders });
    }

    return NextResponse.json({ redirects: localFallbackLinks }, { headers: noCacheHeaders });
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
    } = body;

    const finalUsername = bodyUsername || session.username || "siddu";

    if (!webname || !destinationUrl) {
      return NextResponse.json(
        { error: "Name and destination URL are required" },
        { status: 400, headers: noCacheHeaders }
      );
    }

    const cleanUsername = sanitizeSlug(finalUsername);
    const cleanWebname = sanitizeSlug(webname);

    if (!cleanUsername || cleanUsername.length < 1) {
      return NextResponse.json(
        { error: "Username is invalid" },
        { status: 400, headers: noCacheHeaders }
      );
    }

    if (!cleanWebname || cleanWebname.length < 1) {
      return NextResponse.json(
        { error: "Please enter a valid name (e.g. linkedin, reddit, insta)" },
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
        { error: "Please enter a valid destination URL (e.g. https://linkedin.com/in/...)" },
        { status: 400, headers: noCacheHeaders }
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
          clickCount: 0,
          expiredClickCount: 0,
          expiresAt: expirationDate,
          parentId: parentId ? Number(parentId) : null,
        })
        .returning();

      return NextResponse.json({ success: true, redirect: newRecord }, { status: 201, headers: noCacheHeaders });
    } catch {
      // Fallback local memory insert
      const exists = localFallbackLinks.some(
        (l) => l.username === cleanUsername && l.webname === cleanWebname
      );
      if (exists) {
        return NextResponse.json(
          { error: `A link for /${cleanUsername}/${cleanWebname} already exists.` },
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
