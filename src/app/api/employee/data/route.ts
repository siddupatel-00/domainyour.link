import { NextResponse } from "next/server";
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

export async function GET() {
  const employee = await getEmployeeSession();
  if (!employee) {
    return NextResponse.json({ error: "Unauthorized employee session" }, { status: 401 });
  }

  try {
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

    // Fallback if empty in local offline memory
    if (allLinks.length === 0 && global.fallbackRedirectsStore) {
      allLinks = global.fallbackRedirectsStore;
    }

    const activeCount = allLinks.filter(
      (r) => !r.expiresAt || new Date(r.expiresAt).getTime() > Date.now()
    ).length;

    const expiredCount = allLinks.filter(
      (r) => r.expiresAt && new Date(r.expiresAt).getTime() <= Date.now()
    ).length;

    const totalClicks = allLinks.reduce((acc, curr) => acc + (curr.clickCount || 0), 0);

    return NextResponse.json(
      {
        employee,
        overview: {
          totalLinks: allLinks.length,
          activeCount,
          expiredCount,
          totalClicks,
          totalBios: allBios.length,
        },
        links: allLinks,
        bios: allBios,
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
