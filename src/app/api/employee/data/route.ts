import { NextRequest, NextResponse } from "next/server";
import { getEmployeeSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirects, bios, clickEvents, Redirect, Bio } from "@/lib/db/schema";
import { desc, and, gte, lte } from "drizzle-orm";
import { getLocalFallbackLinks, getLocalFallbackClickEvents } from "@/app/api/redirects/route";
import { getLocalFallbackBios } from "@/app/api/bios/route";

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

    let allLinks: Redirect[] = [];
    let allBios: Bio[] = [];

    try {
      if (db) {
        allLinks = await db.select().from(redirects).orderBy(desc(redirects.createdAt));
        allBios = await db.select().from(bios).orderBy(desc(bios.createdAt));
      }
    } catch {
      allLinks = getLocalFallbackLinks();
      allBios = getLocalFallbackBios();
    }

    if (allLinks.length === 0) {
      allLinks = getLocalFallbackLinks();
    }
    if (allBios.length === 0) {
      allBios = getLocalFallbackBios();
    }

    // Timeframe range calculation for real-time clicks
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
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }
    }

    // Calculate timeframe clicks map
    const countsMap: Record<number, number> = {};
    if (startDate) {
      try {
        if (db) {
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
        }
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
      const pClicks = countsMap[curr.id] !== undefined ? countsMap[curr.id] : curr.clickCount;
      return acc + (pClicks || 0);
    }, 0);
    const totalBiosCreated = allBios.length;

    // Anonymized domain breakdown
    const domainCounts: Record<string, number> = {};
    for (const link of allLinks) {
      try {
        let url = link.destinationUrl;
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
          url = `https://${url}`;
        }
        const parsed = new URL(url);
        const host = parsed.hostname.replace(/^www\./, "");
        const clicks = countsMap[link.id] !== undefined ? countsMap[link.id] : (link.clickCount || 0);
        domainCounts[host] = (domainCounts[host] || 0) + clicks;
      } catch {
        const clicks = countsMap[link.id] !== undefined ? countsMap[link.id] : (link.clickCount || 0);
        domainCounts["direct-links"] = (domainCounts["direct-links"] || 0) + clicks;
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
