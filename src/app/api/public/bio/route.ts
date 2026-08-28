import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { redirects, bios, users, Redirect, Bio, User } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getLocalFallbackLinks } from "@/app/api/redirects/route";
import { getLocalFallbackBios } from "@/app/api/bios/route";
import {
  isTursoEnabled,
  tursoGetRedirects,
  tursoFindBioByCode,
  tursoFindUserByBioCode,
  tursoGetUserAvatar,
  tursoFindUser,
} from "@/lib/tursoDb";
import { findUserByEmailOrUsername, findUserByBioCode } from "@/lib/userStore";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const noCacheHeaders = {
  "Cache-Control": "public, s-maxage=1, stale-while-revalidate=59",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Code is required" }, { status: 400, headers: noCacheHeaders });
  }

  const cleanCode = code.trim().toLowerCase();
  const now = Date.now();

  try {
    // 1. Check if code belongs to a Sub-Bio (bios table)
    let targetBio: Bio | null = null;
    if (isTursoEnabled) {
      try {
        targetBio = await tursoFindBioByCode(cleanCode);
      } catch {}
    }
    if (!targetBio && db) {
      try {
        const res = await db.select().from(bios).where(eq(bios.code, cleanCode)).limit(1);
        if (res.length > 0) targetBio = res[0];
      } catch {}
    }
    if (!targetBio) {
      const fallbackBios = getLocalFallbackBios();
      targetBio = fallbackBios.find((b) => (b.code || "").toLowerCase() === cleanCode) || null;
    }

    if (targetBio) {
      const ownerUsername = targetBio.username.toLowerCase();
      let avatar: string | null = null;
      if (isTursoEnabled) {
        try {
          avatar = await tursoGetUserAvatar(ownerUsername);
        } catch {}
      }
      if (!avatar) {
        const u = await findUserByEmailOrUsername(ownerUsername);
        if (u?.avatar) avatar = u.avatar;
      }

      // Fetch all links for this user
      let allLinks: Redirect[] = [];
      if (isTursoEnabled) {
        try {
          allLinks = await tursoGetRedirects(ownerUsername);
        } catch {}
      }
      if (allLinks.length === 0 && db) {
        try {
          allLinks = await db.select().from(redirects).where(eq(redirects.username, ownerUsername));
        } catch {}
      }
      if (allLinks.length === 0) {
        allLinks = getLocalFallbackLinks().filter((l) => l.username.toLowerCase() === ownerUsername);
      }

      let isExpired = false;
      let finalLinks: Redirect[] = [];

      if (targetBio.expiresAt && new Date(targetBio.expiresAt).getTime() <= now) {
        isExpired = true;
      } else {
        let selectedIds: number[] = [];
        try {
          selectedIds = JSON.parse(targetBio.linkIds);
        } catch {}

        const activeLinks = allLinks.filter((r) => {
          const notExpired = !r.expiresAt || new Date(r.expiresAt).getTime() > now;
          return notExpired;
        });

        if (selectedIds.length > 0) {
          finalLinks = activeLinks.filter((r) => selectedIds.includes(r.id));
        } else {
          finalLinks = activeLinks.filter((r) => r.showOnProfile !== false);
        }
      }

      const sanitizedLinks = finalLinks.map((r) => ({
        id: r.id,
        username: r.username,
        webname: r.webname,
        code: r.code,
        title: r.title,
        destinationUrl: r.destinationUrl,
        expiresAt: r.expiresAt,
        showOnProfile: r.showOnProfile,
      }));

      return NextResponse.json(
        {
          type: "sub",
          code: targetBio.code,
          bioname: targetBio.bioname,
          title: targetBio.title || `@${targetBio.username} • ${targetBio.bioname}`,
          description: targetBio.description || null,
          username: targetBio.username,
          avatar,
          isExpired,
          links: sanitizedLinks,
        },
        { headers: noCacheHeaders }
      );
    }

    // 2. Check if code belongs to a Main User Bio (users table bio_code)
    let targetUser: User | null = null;
    if (isTursoEnabled) {
      try {
        targetUser = await tursoFindUserByBioCode(cleanCode);
      } catch {}
    }
    if (!targetUser) {
      targetUser = await findUserByBioCode(cleanCode);
    }
    if (!targetUser && !cleanCode.includes("@")) {
      // Check if code matches a username directly (e.g. /b/siddu) or previous username (NEVER search by email)
      const potentialUser = await findUserByEmailOrUsername(cleanCode);
      if (potentialUser) {
        const isCurrentMatch = potentialUser.username.toLowerCase() === cleanCode;
        let isPreviousMatch = false;
        try {
          const prevs: string[] = JSON.parse(potentialUser.previousUsernames || "[]");
          isPreviousMatch = prevs.map((p) => p.toLowerCase()).includes(cleanCode);
        } catch {}
        if (isCurrentMatch || isPreviousMatch) {
          targetUser = potentialUser;
        }
      }
    }

    if (targetUser) {
      const username = targetUser.username.toLowerCase();
      let avatar = targetUser.avatar;
      if (!avatar && isTursoEnabled) {
        try {
          avatar = await tursoGetUserAvatar(username);
        } catch {}
      }

      let allLinks: Redirect[] = [];
      if (isTursoEnabled) {
        try {
          allLinks = await tursoGetRedirects(username);
        } catch {}
      }
      if (allLinks.length === 0 && db) {
        try {
          allLinks = await db.select().from(redirects).where(eq(redirects.username, username));
        } catch {}
      }
      if (allLinks.length === 0) {
        allLinks = getLocalFallbackLinks().filter((l) => l.username.toLowerCase() === username);
      }

      const activeVisibleLinks = allLinks.filter((r) => {
        const notExpired = !r.expiresAt || new Date(r.expiresAt).getTime() > now;
        const isVisible = r.showOnProfile !== false;
        return notExpired && isVisible;
      });

      const sanitizedLinks = activeVisibleLinks.map((r) => ({
        id: r.id,
        username: r.username,
        webname: r.webname,
        code: r.code,
        title: r.title,
        destinationUrl: r.destinationUrl,
        expiresAt: r.expiresAt,
        showOnProfile: r.showOnProfile,
      }));

      return NextResponse.json(
        {
          type: "main",
          code: targetUser.bioCode || cleanCode,
          title: `@${targetUser.username}`,
          description: "Permanent bio page",
          username: targetUser.username,
          avatar,
          isExpired: false,
          links: sanitizedLinks,
        },
        { headers: noCacheHeaders }
      );
    }

    return NextResponse.json({ error: "Bio page not found" }, { status: 404, headers: noCacheHeaders });
  } catch (error) {
    console.error("Public bio API error:", error);
    return NextResponse.json({ error: "Failed to load bio page" }, { status: 500, headers: noCacheHeaders });
  }
}
