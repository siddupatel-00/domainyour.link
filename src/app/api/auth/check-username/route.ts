import { NextRequest, NextResponse } from "next/server";
import { sanitizeSlug } from "@/lib/utils";
import { isReservedUsername } from "@/lib/reservedUsernames";
import { findUserByEmailOrUsername } from "@/lib/userStore";
import { isTursoEnabled, tursoFindRedirect } from "@/lib/tursoDb";
import { db } from "@/lib/db";
import { redirects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getLocalFallbackLinks } from "@/app/api/redirects/route";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawUsername = searchParams.get("username");

  if (!rawUsername || !rawUsername.trim()) {
    return NextResponse.json(
      { available: false, message: "Username is required" },
      { status: 400, headers: noCacheHeaders }
    );
  }

  const clean = sanitizeSlug(rawUsername);

  // 1. Length validation (min 3 chars, max 30 chars)
  if (clean.length < 3) {
    return NextResponse.json(
      {
        available: false,
        reason: "length",
        username: clean,
        message: "Username must be at least 3 characters",
      },
      { headers: noCacheHeaders }
    );
  }

  if (clean.length > 32) {
    return NextResponse.json(
      {
        available: false,
        reason: "length",
        username: clean,
        message: "Username cannot exceed 32 characters",
      },
      { headers: noCacheHeaders }
    );
  }

  // 2. Check reserved keywords
  if (isReservedUsername(clean)) {
    return NextResponse.json(
      {
        available: false,
        reason: "reserved",
        username: clean,
        message: `"${clean}" is a reserved system name`,
      },
      { headers: noCacheHeaders }
    );
  }

  // 3. Check if username is already registered in users table
  try {
    const existingUser = await findUserByEmailOrUsername(clean);
    if (existingUser && existingUser.username.toLowerCase() === clean) {
      return NextResponse.json(
        {
          available: false,
          reason: "taken",
          username: clean,
          message: `@${clean} is already taken`,
        },
        { headers: noCacheHeaders }
      );
    }
  } catch {}

  // 4. Check if any links or records exist for this username
  if (isTursoEnabled) {
    try {
      const anyRedirect = await tursoFindRedirect(clean, "test");
      // If records exist with this username
    } catch {}
  }

  try {
    if (db) {
      const existingRedirects = await db
        .select({ id: redirects.id })
        .from(redirects)
        .where(eq(redirects.username, clean))
        .limit(1);

      if (existingRedirects.length > 0) {
        return NextResponse.json(
          {
            available: false,
            reason: "taken",
            username: clean,
            message: `@${clean} is already taken`,
          },
          { headers: noCacheHeaders }
        );
      }
    }
  } catch {
    const fallbackLinks = getLocalFallbackLinks();
    if (fallbackLinks.some((l) => l.username.toLowerCase() === clean)) {
      return NextResponse.json(
        {
          available: false,
          reason: "taken",
          username: clean,
          message: `@${clean} is already taken`,
        },
        { headers: noCacheHeaders }
      );
    }
  }

  // Username is 100% available
  return NextResponse.json(
    {
      available: true,
      username: clean,
      message: `@${clean} is available!`,
    },
    { headers: noCacheHeaders }
  );
}
