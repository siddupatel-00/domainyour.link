import { NextRequest, NextResponse, after } from "next/server";
import { db } from "@/lib/db";
import { redirects } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { getLocalFallbackLinks } from "@/app/api/redirects/route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string; webname: string }> }
) {
  const { username, webname } = await params;

  if (!username || !webname) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const cleanUsername = username.trim().toLowerCase();
  const cleanWebname = webname.trim().toLowerCase();

  let destination = "";
  let recordId: number | null = null;
  let expiresAt: Date | null = null;

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
    }
  } catch {
    // Fallback store check
  }

  if (!destination) {
    const fallbackList = getLocalFallbackLinks();
    const match = fallbackList.find(
      (l) => l.username === cleanUsername && l.webname === cleanWebname
    );
    if (match) {
      destination = match.destinationUrl;
      expiresAt = match.expiresAt;
      recordId = match.id;
      match.clickCount = (match.clickCount || 0) + 1;
    }
  }

  // If link does not exist
  if (!destination) {
    return new NextResponse(
      `<!DOCTYPE html>
      <html lang="en">
        <head>
          <title>PermanentLink - Not Found</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #ffffff; color: #0a0a0a; }
            .card { text-align: center; max-width: 440px; padding: 2.5rem; background: #ffffff; border-radius: 1.5rem; border: 1px solid #e5e5e5; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
            h1 { font-size: 1.4rem; font-weight: 700; margin-bottom: 0.5rem; color: #0a0a0a; letter-spacing: -0.02em; }
            p { color: #525252; font-size: 0.9rem; line-height: 1.5; margin-bottom: 1.5rem; }
            code { background: #f5f5f5; border: 1px solid #e5e5e5; padding: 0.2rem 0.4rem; border-radius: 0.35rem; color: #0a0a0a; font-family: monospace; font-size: 0.85rem; font-weight: 600; }
            a { display: inline-block; background: #000000; color: #ffffff; text-decoration: none; padding: 0.6rem 1.2rem; border-radius: 0.75rem; font-weight: 600; font-size: 0.85rem; transition: background 0.2s; }
            a:hover { background: #262626; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Link Not Found</h1>
            <p>The link <code>/${cleanUsername}/${cleanWebname}</code> does not exist.</p>
            <a href="/">Return to Home</a>
          </div>
        </body>
      </html>`,
      {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  }

  // Check if link has expired
  if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
    return new NextResponse(
      `<!DOCTYPE html>
      <html lang="en">
        <head>
          <title>PermanentLink - Link Expired</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #ffffff; color: #0a0a0a; }
            .card { text-align: center; max-width: 440px; padding: 2.5rem; background: #ffffff; border-radius: 1.5rem; border: 1px solid #e5e5e5; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
            .icon { font-size: 2.5rem; margin-bottom: 0.75rem; }
            h1 { font-size: 1.4rem; font-weight: 700; margin-bottom: 0.5rem; color: #0a0a0a; letter-spacing: -0.02em; }
            p { color: #525252; font-size: 0.9rem; line-height: 1.5; margin-bottom: 1.5rem; }
            code { background: #f5f5f5; border: 1px solid #e5e5e5; padding: 0.2rem 0.4rem; border-radius: 0.35rem; color: #0a0a0a; font-family: monospace; font-size: 0.85rem; font-weight: 600; }
            a { display: inline-block; background: #000000; color: #ffffff; text-decoration: none; padding: 0.6rem 1.2rem; border-radius: 0.75rem; font-weight: 600; font-size: 0.85rem; transition: background 0.2s; }
            a:hover { background: #262626; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">⏳</div>
            <h1>This Link Has Expired</h1>
            <p>The temporary link <code>/${cleanUsername}/${cleanWebname}</code> was set to expire and is no longer active.</p>
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

  // Non-blocking analytics increment
  if (recordId) {
    try {
      after(async () => {
        try {
          await db
            .update(redirects)
            .set({ clickCount: sql`${redirects.clickCount} + 1` })
            .where(eq(redirects.id, recordId));
        } catch {}
      });
    } catch {
      db.update(redirects)
        .set({ clickCount: sql`${redirects.clickCount} + 1` })
        .where(eq(redirects.id, recordId))
        .catch(() => {});
    }
  }

  // Instant HTTP 307 redirect
  return NextResponse.redirect(destination, {
    status: 307,
    headers: {
      "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
      Pragma: "no-cache",
    },
  });
}
