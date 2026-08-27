import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { linkGroups, redirects, users, LinkGroup, Redirect } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  isTursoEnabled,
  tursoFindGroupByShareCode,
  tursoGetRedirects,
  tursoGetUserAvatar,
} from "@/lib/tursoDb";
import { findSharedGroupByShareCode } from "@/lib/groupStore";
import { findUserByEmailOrUsername } from "@/lib/userStore";
import { getLocalFallbackLinks } from "@/app/api/redirects/route";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code")?.trim().toLowerCase();

    if (!code) {
      return NextResponse.json(
        { error: "Share code is required" },
        { status: 400, headers: noCacheHeaders }
      );
    }

    let group: LinkGroup | null = null;

    // 1. Try Turso
    if (isTursoEnabled) {
      try {
        group = await tursoFindGroupByShareCode(code);
      } catch (err) {
        console.warn("Turso find group by code error:", err);
      }
    }

    // 2. Try PostgreSQL / Neon
    if (!group && db) {
      try {
        const [found] = await db
          .select()
          .from(linkGroups)
          .where(eq(linkGroups.shareCode, code))
          .limit(1);
        if (found) group = found;
      } catch {}
    }

    // 3. Fallback in-memory
    if (!group) {
      const found = findSharedGroupByShareCode(code);
      if (found) group = found;
    }

    if (!group) {
      return NextResponse.json(
        { error: "Group not found" },
        { status: 404, headers: noCacheHeaders }
      );
    }

    // Fetch creator's avatar
    let creatorAvatar: string | null = null;
    if (isTursoEnabled) {
      try {
        creatorAvatar = await tursoGetUserAvatar(group.username);
      } catch {}
    }
    if (!creatorAvatar && db) {
      try {
        const u = await db
          .select({ avatar: users.avatar })
          .from(users)
          .where(eq(users.username, group.username))
          .limit(1);
        if (u.length > 0) creatorAvatar = u[0].avatar;
      } catch {}
    }
    if (!creatorAvatar) {
      const u = await findUserByEmailOrUsername(group.username);
      if (u?.avatar) creatorAvatar = u.avatar;
    }

    const creatorInfo = {
      username: group.username,
      avatar: creatorAvatar,
    };

    // Check if sharing is turned off
    if (group.isShared === false) {
      return NextResponse.json(
        {
          isPrivate: true,
          isExpired: false,
          creator: creatorInfo,
          group: {
            name: group.name,
            color: group.color,
          },
          links: [],
        },
        { headers: noCacheHeaders }
      );
    }

    // Check if group share link has expired
    if (group.expiresAt) {
      const expDate = new Date(group.expiresAt);
      if (expDate.getTime() <= Date.now()) {
        return NextResponse.json(
          {
            isExpired: true,
            isPrivate: false,
            creator: creatorInfo,
            group: {
              name: group.name,
              color: group.color,
            },
            links: [],
          },
          { headers: noCacheHeaders }
        );
      }
    }

    // Parse assigned link IDs
    let linkIdsArray: number[] = [];
    try {
      const parsed = JSON.parse(group.linkIds || "[]");
      if (Array.isArray(parsed)) linkIdsArray = parsed.map(Number).filter((n) => !isNaN(n));
    } catch {
      linkIdsArray = [];
    }

    // Fetch user's active redirect links
    let allUserRedirects: Redirect[] = [];
    if (isTursoEnabled) {
      try {
        allUserRedirects = await tursoGetRedirects(group.username);
      } catch {}
    }

    if (allUserRedirects.length === 0 && db) {
      try {
        allUserRedirects = await db
          .select()
          .from(redirects)
          .where(eq(redirects.username, group.username));
      } catch {}
    }

    if (allUserRedirects.length === 0) {
      allUserRedirects = getLocalFallbackLinks().filter(
        (l) => l.username.toLowerCase() === group!.username.toLowerCase()
      );
    }

    // Filter and preserve group's link order
    const redirectMap = new Map<number, Redirect>();
    allUserRedirects.forEach((r) => redirectMap.set(r.id, r));

    const matchedLinks: Array<{
      id: number;
      username: string;
      webname: string;
      title: string;
      destinationUrl: string;
      redirectUrl: string;
      expiresAt: Date | string | null;
      clickCount: number;
    }> = [];

    linkIdsArray.forEach((id) => {
      const link = redirectMap.get(id);
      if (link) {
        // Check if individual link is expired
        const isLinkExpired = link.expiresAt && new Date(link.expiresAt).getTime() <= Date.now();
        if (!isLinkExpired) {
          matchedLinks.push({
            id: link.id,
            username: link.username,
            webname: link.webname,
            title: link.title || link.webname,
            destinationUrl: link.destinationUrl,
            redirectUrl: `/${link.username}/${link.webname}`,
            expiresAt: link.expiresAt,
            clickCount: link.clickCount || 0,
          });
        }
      }
    });

    return NextResponse.json(
      {
        success: true,
        isPrivate: false,
        isExpired: false,
        creator: creatorInfo,
        group: {
          id: group.id,
          name: group.name,
          color: group.color,
          shareCode: group.shareCode,
          isShared: group.isShared,
          expiresAt: group.expiresAt,
        },
        links: matchedLinks,
      },
      { headers: noCacheHeaders }
    );
  } catch (error) {
    console.error("Public group fetch error:", error);
    return NextResponse.json(
      { error: "Failed to load group" },
      { status: 500, headers: noCacheHeaders }
    );
  }
}
