import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { redirects, bios, users, Redirect, Bio } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getLocalFallbackLinks } from "@/app/api/redirects/route";
import { getLocalFallbackBios } from "@/app/api/bios/route";
import {
  isTursoEnabled,
  tursoGetRedirects,
  tursoGetBios,
  tursoGetUserAvatar,
} from "@/lib/tursoDb";
import { findUserByEmailOrUsername } from "@/lib/userStore";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const noCacheHeaders = {
  "Cache-Control": "public, s-maxage=1, stale-while-revalidate=59",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");
  const bioname = searchParams.get("bioname");

  if (!username) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }

  const cleanUsername = username.trim().toLowerCase();
  const cleanBioname = bioname ? bioname.trim().toLowerCase() : null;

  try {
    let userLinks: Redirect[] = [];
    let userBios: Bio[] = [];
    let avatar: string | null = null;

    // 1. Try Turso Database
    if (isTursoEnabled) {
      try {
        userLinks = await tursoGetRedirects(cleanUsername);
        userBios = await tursoGetBios(cleanUsername);
        avatar = await tursoGetUserAvatar(cleanUsername);
      } catch (err) {
        console.warn("Turso public profile error:", err);
      }
    }

    // 2. Try PostgreSQL / Neon Database
    if (userLinks.length === 0 && db) {
      try {
        userLinks = await db
          .select()
          .from(redirects)
          .where(eq(redirects.username, cleanUsername));
        userBios = await db
          .select()
          .from(bios)
          .where(eq(bios.username, cleanUsername));
        if (!avatar) {
          const u = await db.select({ avatar: users.avatar }).from(users).where(eq(users.username, cleanUsername)).limit(1);
          if (u.length > 0) avatar = u[0].avatar;
        }
      } catch {}
    }

    // 3. Try Local fallback store
    if (userLinks.length === 0) {
      const fallbackLinks = getLocalFallbackLinks();
      userLinks = fallbackLinks.filter((l) => l.username.toLowerCase() === cleanUsername);
      const fallbackBios = getLocalFallbackBios();
      userBios = fallbackBios.filter((b) => b.username.toLowerCase() === cleanUsername);
      if (!avatar) {
        const u = await findUserByEmailOrUsername(cleanUsername);
        if (u?.avatar) avatar = u.avatar;
      }
    }

    // 4. If no links found, check if this is an old/previous username of an existing user
    let activeUsername = cleanUsername;
    if (userLinks.length === 0) {
      const aliasUser = await findUserByEmailOrUsername(cleanUsername);
      if (aliasUser && aliasUser.username.toLowerCase() !== cleanUsername) {
        activeUsername = aliasUser.username.toLowerCase();
        if (isTursoEnabled) {
          userLinks = await tursoGetRedirects(activeUsername);
          userBios = await tursoGetBios(activeUsername);
          if (!avatar) avatar = await tursoGetUserAvatar(activeUsername);
        }
        if (userLinks.length === 0 && db) {
          try {
            userLinks = await db.select().from(redirects).where(eq(redirects.username, activeUsername));
            userBios = await db.select().from(bios).where(eq(bios.username, activeUsername));
          } catch {}
        }
        if (userLinks.length === 0) {
          userLinks = getLocalFallbackLinks().filter((l) => l.username.toLowerCase() === activeUsername);
          userBios = getLocalFallbackBios().filter((b) => b.username.toLowerCase() === activeUsername);
        }
        if (!avatar && aliasUser.avatar) {
          avatar = aliasUser.avatar;
        }
      }
    }

    // Filter active non-expired links
    const now = Date.now();
    const activeVisibleLinks = userLinks.filter((r) => {
      const isNotExpired = !r.expiresAt || new Date(r.expiresAt).getTime() > now;
      const isVisible = r.showOnProfile !== false;
      return isNotExpired && isVisible;
    });

    let targetBio: Bio | null = null;
    let finalLinks: Redirect[] = activeVisibleLinks;
    let isExpired = false;

    if (cleanBioname) {
      targetBio = userBios.find((b) => b.bioname.toLowerCase() === cleanBioname) || null;
      if (targetBio) {
        if (targetBio.expiresAt && new Date(targetBio.expiresAt).getTime() <= now) {
          isExpired = true;
          finalLinks = [];
        } else {
          let selectedIds: number[] = [];
          try {
            selectedIds = JSON.parse(targetBio.linkIds);
          } catch {}

          if (selectedIds.length > 0) {
            finalLinks = activeVisibleLinks.filter((r) => selectedIds.includes(r.id));
          }
        }
      }
    }

    return NextResponse.json(
      {
        username: activeUsername,
        redirectedFrom: activeUsername !== cleanUsername ? cleanUsername : undefined,
        avatar,
        bio: targetBio,
        isExpired,
        links: finalLinks,
      },
      { headers: noCacheHeaders }
    );
  } catch (error) {
    console.error("Public profile API error:", error);
    return NextResponse.json(
      { error: "Failed to load public profile" },
      { status: 500 }
    );
  }
}
