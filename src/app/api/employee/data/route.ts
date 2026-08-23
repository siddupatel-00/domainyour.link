import { NextRequest, NextResponse } from "next/server";
import { getEmployeeSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirects, bios, clickEvents, Redirect, Bio } from "@/lib/db/schema";
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
  const employee = await getEmployeeSession();
  if (!employee) {
    return NextResponse.json({ error: "Unauthorized employee session" }, { status: 401, headers: noCacheHeaders });
  }

  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get("timeframe") || "7d";
    const customStart = searchParams.get("startDate");
    const customEnd = searchParams.get("endDate");

    let allLinks: Redirect[] = [];
    let allBios: Bio[] = [];

    // 1. Try Turso
    if (isTursoEnabled) {
      try {
        allLinks = await tursoGetAllRedirects();
        allBios = await tursoGetAllBios();
      } catch (err) {
        console.warn("Turso employee data error:", err);
      }
    }

    // 2. Try PostgreSQL
    if (allLinks.length === 0 && db) {
      try {
        allLinks = await db.select().from(redirects).orderBy(desc(redirects.createdAt));
        allBios = await db.select().from(bios).orderBy(desc(bios.createdAt));
      } catch {
        allLinks = getLocalFallbackLinks();
        allBios = getLocalFallbackBios();
      }
    }

    if (allLinks.length === 0) {
      allLinks = getLocalFallbackLinks();
    }
    if (allBios.length === 0) {
      allBios = getLocalFallbackBios();
    }

    // Calculate timeframe range
    const { startDate, endDate } = parseTimeframeDates(timeframe, customStart, customEnd);

    // Calculate timeframe clicks map from database
    let countsMap: Record<number, number> = {};

    if (startDate) {
      if (isTursoEnabled) {
        try {
          countsMap = await tursoGetClickEventsCountMap(startDate, endDate);
        } catch (err) {
          console.error("Turso click map error:", err);
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

    const isLinkExpired = (r: Redirect) => {
      return r.expiresAt && new Date(r.expiresAt).getTime() <= Date.now();
    };

    const uniqueUsernames = new Set(allLinks.map((l) => l.username.toLowerCase()));
    const totalPeople = uniqueUsernames.size || (allLinks.length > 0 ? 1 : 0);
    const totalLinksCreated = allLinks.length;
    const activeCount = allLinks.filter((r) => !isLinkExpired(r)).length;
    const expiredOrDeletedCount = allLinks.filter((r) => isLinkExpired(r)).length;
    const totalClicksWorldwide = allLinks.reduce((acc, curr) => acc + (curr.clickCount || 0), 0);

    const timeframeClicks = allLinks.reduce((acc, curr) => {
      const pClicks = startDate ? (countsMap[curr.id] ?? 0) : (curr.clickCount || 0);
      return acc + pClicks;
    }, 0);

    const totalBiosCreated = allBios.length;

    // Anonymized domain breakdown for the selected timeframe
    const domainCounts: Record<string, number> = {};
    for (const link of allLinks) {
      const clicks = startDate ? (countsMap[link.id] ?? 0) : (link.clickCount || 0);
      if (clicks > 0) {
        try {
          let url = link.destinationUrl;
          if (!url.startsWith("http://") && !url.startsWith("https://")) {
            url = `https://${url}`;
          }
          const parsed = new URL(url);
          const host = parsed.hostname.replace(/^www\./, "");
          domainCounts[host] = (domainCounts[host] || 0) + clicks;
        } catch {
          domainCounts["direct-links"] = (domainCounts["direct-links"] || 0) + clicks;
        }
      }
    }

    const topDomains = Object.entries(domainCounts)
      .map(([domain, clicks]) => ({ domain, clicks }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 8);

    return NextResponse.json(
      {
        employee: {
          name: employee.name,
          email: employee.email,
          role: employee.role,
        },
        insights: {
          totalPeople,
          totalLinksCreated,
          activeLinksCount: activeCount,
          expiredOrDeletedCount,
          totalClicksWorldwide,
          timeframeClicks,
          totalBiosCreated,
          topDomains,
          timeframe,
        },
      },
      { headers: noCacheHeaders }
    );
  } catch (err) {
    console.error("Employee data error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: noCacheHeaders });
  }
}
