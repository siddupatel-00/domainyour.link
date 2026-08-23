import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { redirects, bios, clickEvents, Redirect, Bio } from "@/lib/db/schema";
import { isCeoAuthenticated } from "@/lib/auth";
import { desc, and, gte, lte } from "drizzle-orm";
import { getLocalFallbackLinks, getLocalFallbackClickEvents } from "@/app/api/redirects/route";
import { getLocalFallbackBios } from "@/app/api/bios/route";
import {
  isTursoEnabled,
  tursoGetAllRedirects,
  tursoGetAllBios,
  parseTimeframeDates,
  tursoGetClickEventsCountMap,
} from "@/lib/tursoDb";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(request: NextRequest) {
  const authed = await isCeoAuthenticated();
  if (!authed) {
    return NextResponse.json(
      { error: "Unauthorized: CEO Master Access Required" },
      { status: 401, headers: noCacheHeaders }
    );
  }

  const { searchParams } = new URL(request.url);
  const timeframe = searchParams.get("timeframe");
  const customStart = searchParams.get("startDate");
  const customEnd = searchParams.get("endDate");

  try {
    let allRedirects: Redirect[] = [];
    let allBios: Bio[] = [];

    // 1. Try Turso
    if (isTursoEnabled) {
      try {
        allRedirects = await tursoGetAllRedirects();
        allBios = await tursoGetAllBios();
      } catch (err) {
        console.warn("Turso stats error:", err);
      }
    }

    // 2. Try PostgreSQL
    if (allRedirects.length === 0 && db) {
      try {
        allRedirects = await db.select().from(redirects).orderBy(desc(redirects.clickCount));
        allBios = await db.select().from(bios).orderBy(desc(bios.createdAt));
      } catch {
        allRedirects = getLocalFallbackLinks();
        allBios = getLocalFallbackBios();
      }
    }

    if (allRedirects.length === 0) {
      allRedirects = getLocalFallbackLinks();
      allBios = getLocalFallbackBios();
    }

    // Timeframe range calculation for clicks
    const { startDate, endDate } = parseTimeframeDates(timeframe, customStart, customEnd);

    // Calculate timeframe clicks map
    let countsMap: Record<number, number> = {};
    if (startDate) {
      if (isTursoEnabled) {
        try {
          countsMap = await tursoGetClickEventsCountMap(startDate, endDate);
        } catch (err) {
          console.error("Turso ceo stats click map error:", err);
        }
      } else if (db) {
        try {
          const events = await db
            .select()
            .from(clickEvents)
            .where(
              and(
                gte(clickEvents.createdAt, startDate),
                lte(clickEvents.createdAt, endDate)
              )
            );

          events.forEach((ev) => {
            countsMap[ev.redirectId] = (countsMap[ev.redirectId] || 0) + 1;
          });
        } catch {}
      } else {
        const localEvents = getLocalFallbackClickEvents();
        const filtered = localEvents.filter(
          (e) => e.createdAt >= startDate && e.createdAt <= endDate
        );
        filtered.forEach((ev) => {
          countsMap[ev.redirectId] = (countsMap[ev.redirectId] || 0) + 1;
        });
      }
    }

    const enrichedLinks = allRedirects.map((r) => ({
      ...r,
      periodClicks: startDate ? (countsMap[r.id] ?? 0) : (r.clickCount || 0),
    }));

    const isLinkExpired = (r: Redirect) => {
      return r.expiresAt && new Date(r.expiresAt).getTime() <= Date.now();
    };

    const activeLinks = allRedirects.filter((r) => !isLinkExpired(r));
    const expiredLinks = allRedirects.filter((r) => isLinkExpired(r));

    const totalClicksWorldwide = enrichedLinks.reduce((acc, curr) => acc + (curr.periodClicks || 0), 0);
    const allTimeClicksWorldwide = allRedirects.reduce((acc, curr) => acc + (curr.clickCount || 0), 0);
    const totalExpiredClicksWorldwide = allRedirects.reduce((acc, curr) => acc + (curr.expiredClickCount || 0), 0);

    // Users breakdown
    const userMap: Record<
      string,
      { username: string; totalLinks: number; activeLinks: number; totalClicks: number; totalBios: number }
    > = {};

    allRedirects.forEach((r) => {
      const u = r.username.toLowerCase();
      if (!userMap[u]) {
        userMap[u] = { username: r.username, totalLinks: 0, activeLinks: 0, totalClicks: 0, totalBios: 0 };
      }
      userMap[u].totalLinks += 1;
      if (!isLinkExpired(r)) userMap[u].activeLinks += 1;
      userMap[u].totalClicks += (startDate ? (countsMap[r.id] ?? 0) : (r.clickCount || 0));
    });

    allBios.forEach((b) => {
      const u = b.username.toLowerCase();
      if (!userMap[u]) {
        userMap[u] = { username: b.username, totalLinks: 0, activeLinks: 0, totalClicks: 0, totalBios: 0 };
      }
      userMap[u].totalBios += 1;
    });

    const usersList = Object.values(userMap).sort((a, b) => b.totalClicks - a.totalClicks);

    // Top Global Links Leaderboard
    const validLinksForLeaderboard = startDate
      ? enrichedLinks.filter((r) => (r.periodClicks || 0) > 0)
      : enrichedLinks;

    const topGlobalLinks = [...validLinksForLeaderboard]
      .sort((a, b) => (b.periodClicks || 0) - (a.periodClicks || 0))
      .slice(0, 10);

    return NextResponse.json(
      {
        overview: {
          totalClicksWorldwide,
          allTimeClicksWorldwide,
          totalExpiredClicksWorldwide,
          totalLinksCreated: allRedirects.length,
          activeLinksCount: activeLinks.length,
          expiredLinksCount: expiredLinks.length,
          totalUsersCount: usersList.length || (allRedirects.length > 0 ? 1 : 0),
          totalBiosCount: allBios.length,
        },
        topGlobalLinks,
        usersList,
      },
      { headers: noCacheHeaders }
    );
  } catch (error) {
    console.error("CEO stats error:", error);
    return NextResponse.json(
      { error: "Failed to load CEO statistics" },
      { status: 500, headers: noCacheHeaders }
    );
  }
}
