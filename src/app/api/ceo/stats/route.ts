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
} from "@/lib/tursoDb";

export const dynamic = "force-dynamic";

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
    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date = now;

    if (timeframe) {
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
      }
    }

    // Calculate timeframe clicks map
    const countsMap: Record<number, number> = {};
    if (startDate) {
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
      } catch {
        const localEvents = getLocalFallbackClickEvents();
        const filtered = localEvents.filter(
          (e) => e.createdAt >= (startDate as Date) && e.createdAt <= endDate
        );
        filtered.forEach((ev) => {
          countsMap[ev.redirectId] = (countsMap[ev.redirectId] || 0) + 1;
        });
      }
    }

    const enrichedLinks = allRedirects.map((r) => ({
      ...r,
      periodClicks: startDate ? (countsMap[r.id] ?? 0) : r.clickCount,
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
      userMap[u].totalClicks += (countsMap[r.id] !== undefined ? countsMap[r.id] : r.clickCount);
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
    const topGlobalLinks = [...enrichedLinks]
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
