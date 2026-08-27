import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { redirects, clickEvents } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { getLocalFallbackLinks, logLocalFallbackClick } from "@/app/api/redirects/route";
import {
  isTursoEnabled,
  tursoFindRedirect,
  tursoIncrementClick,
  tursoIncrementExpiredClick,
} from "@/lib/tursoDb";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string; webname: string | string[] }> }
) {
  const { username, webname } = await params;

  if (!username || !webname) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const cleanUsername = username.trim().toLowerCase();
  const rawWebname = Array.isArray(webname) ? webname.join("/") : String(webname);
  const cleanWebname = rawWebname.trim().toLowerCase();
  const hyphenWebname = cleanWebname.replace(/\//g, "-");

  let destination = "";
  let recordId: number | null = null;
  let expiresAt: Date | null = null;
  let isFromTurso = false;
  let fallbackMatch: any = null;

  // 1. Try Turso Database if configured
  if (isTursoEnabled) {
    try {
      let tursoMatch = await tursoFindRedirect(cleanUsername, cleanWebname);
      if (!tursoMatch && hyphenWebname !== cleanWebname) {
        tursoMatch = await tursoFindRedirect(cleanUsername, hyphenWebname);
      }
      if (!tursoMatch) {
        const { tursoFindUserByPreviousUsername } = await import("@/lib/tursoDb");
        const prevUser = await tursoFindUserByPreviousUsername(cleanUsername);
        if (prevUser) {
          tursoMatch = await tursoFindRedirect(prevUser.username, cleanWebname);
          if (!tursoMatch && hyphenWebname !== cleanWebname) {
            tursoMatch = await tursoFindRedirect(prevUser.username, hyphenWebname);
          }
        }
      }
      if (tursoMatch) {
        destination = tursoMatch.destinationUrl;
        recordId = tursoMatch.id;
        expiresAt = tursoMatch.expiresAt;
        isFromTurso = true;
      }
    } catch {}
  }

  // 2. Try PostgreSQL / Neon Database
  if (!destination && db) {
    try {
      const results = await db
        .select({
          id: redirects.id,
          destinationUrl: redirects.destinationUrl,
          redirectCode: redirects.redirectCode,
          expiresAt: redirects.expiresAt,
        })
        .from(redirects)
        .where(
          and(
            eq(redirects.username, cleanUsername),
            eq(redirects.webname, cleanWebname)
          )
        )
        .limit(1);

      if (results && results.length > 0) {
        destination = results[0].destinationUrl;
        recordId = results[0].id;
        expiresAt = results[0].expiresAt;
      } else if (hyphenWebname !== cleanWebname) {
        const hyphenResults = await db
          .select({
            id: redirects.id,
            destinationUrl: redirects.destinationUrl,
            redirectCode: redirects.redirectCode,
            expiresAt: redirects.expiresAt,
          })
          .from(redirects)
          .where(
            and(
              eq(redirects.username, cleanUsername),
              eq(redirects.webname, hyphenWebname)
            )
          )
          .limit(1);

        if (hyphenResults && hyphenResults.length > 0) {
          destination = hyphenResults[0].destinationUrl;
          recordId = hyphenResults[0].id;
          expiresAt = hyphenResults[0].expiresAt;
        }
      }
    } catch {}
  }

  // 3. Try Local fallback store
  if (!destination) {
    const fallbackList = getLocalFallbackLinks();
    const match = fallbackList.find(
      (l) =>
        l.username === cleanUsername &&
        (l.webname === cleanWebname || l.webname === hyphenWebname)
    );
    if (match) {
      destination = match.destinationUrl;
      expiresAt = match.expiresAt;
      recordId = match.id;
      fallbackMatch = match;
    }
  }

  // If link does not exist (404)
  if (!destination) {
    return new NextResponse(
      `<!DOCTYPE html>
      <html lang="en">
        <head>
          <title>RelayLink - Not Found</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #ffffff; color: #0a0a0a; }
            .card { text-align: center; max-width: 440px; padding: 2.5rem; background: #ffffff; border-radius: 1.5rem; border: 1px solid #e5e5e5; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
            h1 { font-size: 1.4rem; font-weight: 700; margin-bottom: 0.5rem; color: #0a0a0a; letter-spacing: -0.02em; }
            p { color: #525252; font-size: 0.9rem; line-height: 1.5; margin-bottom: 1.5rem; }
            a { display: inline-block; background: #000000; color: #ffffff; text-decoration: none; padding: 0.75rem 1.4rem; border-radius: 0.75rem; font-weight: 600; font-size: 0.85rem; transition: background 0.2s; }
            a:hover { background: #262626; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Link Not Found</h1>
            <p>This link does not exist or has been removed.</p>
            <a href="/">Create Your Own Permanent Link</a>
          </div>
        </body>
      </html>`,
      {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  }

  // Check if link has expired (410)
  if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
    if (recordId) {
      if (isFromTurso) {
        try {
          await tursoIncrementExpiredClick(recordId);
        } catch {}
      } else if (db) {
        try {
          await db
            .update(redirects)
            .set({ expiredClickCount: sql`${redirects.expiredClickCount} + 1` })
            .where(eq(redirects.id, recordId));
        } catch {}
      }
    }

    if (fallbackMatch) {
      fallbackMatch.expiredClickCount = (fallbackMatch.expiredClickCount || 0) + 1;
    }

    return new NextResponse(
      `<!DOCTYPE html>
      <html lang="en">
        <head>
          <title>RelayLink - Link Expired</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #ffffff; color: #0a0a0a; }
            .card { text-align: center; max-width: 440px; padding: 2.5rem; background: #ffffff; border-radius: 1.5rem; border: 1px solid #e5e5e5; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
            .icon { font-size: 2.5rem; margin-bottom: 0.75rem; }
            h1 { font-size: 1.4rem; font-weight: 700; margin-bottom: 0.5rem; color: #0a0a0a; letter-spacing: -0.02em; }
            p { color: #525252; font-size: 0.9rem; line-height: 1.5; margin-bottom: 1.5rem; }
            a { display: inline-block; background: #000000; color: #ffffff; text-decoration: none; padding: 0.75rem 1.4rem; border-radius: 0.75rem; font-weight: 600; font-size: 0.85rem; transition: background 0.2s; }
            a:hover { background: #262626; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">⏳</div>
            <h1>This Link Has Expired</h1>
            <p>This link is no longer active.</p>
            <a href="/">Create Your Own Permanent Link</a>
          </div>
        </body>
      </html>`,
      {
        status: 410,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  }

  // Active redirect: increment click counters
  if (recordId) {
    if (isFromTurso) {
      try {
        await tursoIncrementClick(recordId);
      } catch {}
    } else if (db) {
      try {
        await Promise.all([
          db
            .update(redirects)
            .set({ clickCount: sql`${redirects.clickCount} + 1` })
            .where(eq(redirects.id, recordId)),
          db.insert(clickEvents).values({ redirectId: recordId }),
        ]);
      } catch {}
    }
  }

  if (fallbackMatch) {
    fallbackMatch.clickCount = (fallbackMatch.clickCount || 0) + 1;
    logLocalFallbackClick(fallbackMatch.id);
  }

  // Direct fast HTTP 307 redirect with zero-cache headers
  return NextResponse.redirect(destination, {
    status: 307,
    headers: {
      "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
