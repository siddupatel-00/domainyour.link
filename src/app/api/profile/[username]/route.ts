import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { redirects } from "@/lib/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { getLocalFallbackLinks } from "@/app/api/redirects/route";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  if (!username) {
    return NextResponse.json({ error: "Username required" }, { status: 400, headers: noCacheHeaders });
  }

  const cleanUsername = username.trim().toLowerCase();
  let userLinks: Array<{
    id: number;
    username: string;
    webname: string;
    destinationUrl: string;
    expiresAt: Date | string | null;
    showOnProfile: boolean;
    clickCount: number;
  }> = [];

  let dbSuccess = false;
  try {
    const records = await db
      .select({
        id: redirects.id,
        username: redirects.username,
        webname: redirects.webname,
        destinationUrl: redirects.destinationUrl,
        expiresAt: redirects.expiresAt,
        showOnProfile: redirects.showOnProfile,
        clickCount: redirects.clickCount,
      })
      .from(redirects)
      .where(
        and(
          eq(redirects.username, cleanUsername),
          eq(redirects.showOnProfile, true)
        )
      )
      .orderBy(desc(redirects.createdAt));

    if (records) {
      userLinks = records;
      dbSuccess = true;
    }
  } catch {
    // Database offline in local dev, will use memory fallback
  }

  if (!dbSuccess) {
    const fallbackList = getLocalFallbackLinks();
    userLinks = fallbackList.filter(
      (l) => l.username === cleanUsername && l.showOnProfile !== false
    );
  }

  // Filter out any expired links
  const activeLinks = userLinks.filter((l) => {
    if (!l.expiresAt) return true;
    return new Date(l.expiresAt).getTime() > Date.now();
  });

  return NextResponse.json({ username: cleanUsername, links: activeLinks }, { headers: noCacheHeaders });
}
