import { NextRequest, NextResponse } from "next/server";
import { getEmployeeSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirects, bios, Redirect, Bio } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

declare global {
  // eslint-disable-next-line no-var
  var fallbackRedirectsStore: Redirect[] | undefined;
  // eslint-disable-next-line no-var
  var fallbackBiosStore: Bio[] | undefined;
}

export async function GET(request: NextRequest) {
  const employee = await getEmployeeSession();
  if (!employee) {
    return NextResponse.json({ error: "Unauthorized employee session" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get("timeframe") || "7d";

    let allLinks: Redirect[] = [];
    let allBios: Bio[] = [];

    if (db) {
      try {
        allLinks = await db.select().from(redirects).orderBy(desc(redirects.createdAt));
        allBios = await db.select().from(bios).orderBy(desc(bios.createdAt));
      } catch (err) {
        console.error("DB error in employee data:", err);
      }
    }

    if (allLinks.length === 0 && global.fallbackRedirectsStore) {
      allLinks = global.fallbackRedirectsStore;
    }
    if (allBios.length === 0 && global.fallbackBiosStore) {
      allBios = global.fallbackBiosStore;
    }

    // Calculate aggregated metrics without revealing any user personal names
    const uniqueUsernames = new Set(allLinks.map((l) => l.username));
    const totalPeople = uniqueUsernames.size;
    const totalLinksCreated = allLinks.length;
    const activeCount = allLinks.filter(
      (r) => !r.expiresAt || new Date(r.expiresAt).getTime() > Date.now()
    ).length;
    const expiredOrDeletedCount = allLinks.filter(
      (r) => r.expiresAt && new Date(r.expiresAt).getTime() <= Date.now()
    ).length;
    const totalClicksWorldwide = allLinks.reduce((acc, curr) => acc + (curr.clickCount || 0), 0);
    const totalBiosCreated = allBios.length;

    // Timeframe click calculations
    const now = Date.now();
    let timeframeStart = now - 7 * 24 * 60 * 60 * 1000;
    if (timeframe === "24h") {
      timeframeStart = now - 24 * 60 * 60 * 1000;
    } else if (timeframe === "14d") {
      timeframeStart = now - 14 * 24 * 60 * 60 * 1000;
    } else if (timeframe === "this_month") {
      const d = new Date();
      timeframeStart = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
    } else if (timeframe === "last_month") {
      const d = new Date();
      timeframeStart = new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime();
    }

    // Domain breakdown (anonymized destinations like youtube.com, instagram.com, linkedin.com)
    const domainCounts: Record<string, number> = {};
    for (const link of allLinks) {
      try {
        let url = link.destinationUrl;
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
          url = `https://${url}`;
        }
        const parsed = new URL(url);
        const host = parsed.hostname.replace(/^www\./, "");
        domainCounts[host] = (domainCounts[host] || 0) + (link.clickCount || 0);
      } catch {
        domainCounts["direct-links"] = (domainCounts["direct-links"] || 0) + (link.clickCount || 0);
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
          totalBiosCreated,
          topDomains,
          timeframe,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (err) {
    console.error("Employee data error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
