import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { redirects, usedCodes, Redirect } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  isTursoEnabled,
  tursoFindRedirectByCode,
  tursoIncrementClick,
  tursoIncrementExpiredClick,
  tursoIsCodeUsed,
} from "@/lib/tursoDb";
import { getLocalFallbackLinks, logLocalFallbackClick } from "@/app/api/redirects/route";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const noCacheHeaders = {
  "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  if (!code) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const cleanCode = code.trim().toLowerCase();

  let link: Redirect | null = null;

  // 1. Try Turso
  if (isTursoEnabled) {
    try {
      link = await tursoFindRedirectByCode(cleanCode);
    } catch (err) {
      console.error("Turso find redirect by code error:", err);
    }
  }

  // 2. Try PostgreSQL / Neon
  if (!link && db) {
    try {
      const results = await db
        .select()
        .from(redirects)
        .where(eq(redirects.code, cleanCode))
        .limit(1);
      if (results && results.length > 0) {
        link = results[0];
      }
    } catch {}
  }

  // 3. Fallback in-memory
  if (!link) {
    const fallbacks = getLocalFallbackLinks();
    link = fallbacks.find((l) => (l.code || "").toLowerCase() === cleanCode) || null;
  }

  // If active link is found
  if (link) {
    // Check if expired
    const isExpired = link.expiresAt && new Date(link.expiresAt).getTime() <= Date.now();
    if (isExpired) {
      if (isTursoEnabled) {
        tursoIncrementExpiredClick(link.id).catch(() => {});
      }
      const expiredUrl = new URL("/expired", request.url);
      return NextResponse.redirect(expiredUrl, {
        status: 307,
        headers: noCacheHeaders,
      });
    }

    // Increment click count & analytics asynchronously
    if (isTursoEnabled) {
      tursoIncrementClick(link.id).catch(() => {});
    } else {
      logLocalFallbackClick(link.id);
    }

    // Redirect to destination
    return NextResponse.redirect(link.destinationUrl, {
      status: 307,
      headers: noCacheHeaders,
    });
  }

  // If not found, check if code was ever used (retired/deleted tombstone)
  let isRetired = false;
  if (isTursoEnabled) {
    try {
      isRetired = await tursoIsCodeUsed(cleanCode);
    } catch {}
  }
  if (!isRetired && db) {
    try {
      const [used] = await db
        .select()
        .from(usedCodes)
        .where(eq(usedCodes.code, cleanCode))
        .limit(1);
      if (used) isRetired = true;
    } catch {}
  }

  if (isRetired) {
    // Code was once valid but has been permanently retired / deleted
    const retiredUrl = new URL("/expired?retired=true", request.url);
    return NextResponse.redirect(retiredUrl, {
      status: 307,
      headers: noCacheHeaders,
    });
  }

  return new NextResponse("Link Not Found", { status: 404 });
}
