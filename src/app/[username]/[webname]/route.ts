import { NextRequest, NextResponse, after } from "next/server";
import { db } from "@/lib/db";
import { redirects } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";

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

  try {
    // 1. Single indexed database lookup for lowest latency
    const results = await db
      .select({
        id: redirects.id,
        destinationUrl: redirects.destinationUrl,
        redirectCode: redirects.redirectCode,
      })
      .from(redirects)
      .where(
        and(
          eq(redirects.username, cleanUsername),
          eq(redirects.webname, cleanWebname)
        )
      )
      .limit(1);

    if (!results || results.length === 0) {
      return new NextResponse(
        `<!DOCTYPE html>
        <html lang="en">
          <head>
            <title>PermanentLink - Not Found</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #000000; color: #ffffff; }
              .card { text-align: center; max-width: 440px; padding: 2rem; background: #0a0a0a; border-radius: 0.75rem; border: 1px solid #262626; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.8); }
              h1 { font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; color: #ffffff; letter-spacing: -0.02em; }
              p { color: #a3a3a3; font-size: 0.85rem; line-height: 1.5; margin-bottom: 1.5rem; }
              code { background: #171717; border: 1px solid #262626; padding: 0.2rem 0.4rem; border-radius: 0.25rem; color: #ffffff; font-family: monospace; font-size: 0.8rem; }
              a { display: inline-block; background: #ffffff; color: #000000; text-decoration: none; padding: 0.5rem 1rem; border-radius: 0.5rem; font-weight: 600; font-size: 0.8rem; transition: background 0.2s; }
              a:hover { background: #e5e5e5; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>Link Not Found</h1>
              <p>The permanent link <code>/${cleanUsername}/${cleanWebname}</code> does not exist or has been deleted.</p>
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

    const record = results[0];
    const destination = record.destinationUrl;
    const statusCode = record.redirectCode === 308 ? 308 : 307;

    // 2. Schedule non-blocking click count increment AFTER response is returned
    // This guarantees the redirect is never delayed by DB write operations
    try {
      after(async () => {
        try {
          await db
            .update(redirects)
            .set({
              clickCount: sql`${redirects.clickCount} + 1`,
            })
            .where(eq(redirects.id, record.id));
        } catch (err) {
          console.error("Non-blocking analytics increment failed:", err);
        }
      });
    } catch {
      // Fallback for environments where after() might not be supported
      db.update(redirects)
        .set({ clickCount: sql`${redirects.clickCount} + 1` })
        .where(eq(redirects.id, record.id))
        .catch(() => {});
    }

    // 3. Perform immediate HTTP 307 redirect with no-cache headers so destination updates are instant
    return NextResponse.redirect(destination, {
      status: statusCode,
      headers: {
        "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
        Pragma: "no-cache",
      },
    });
  } catch (error) {
    console.error("Redirect lookup error:", error);
    return new NextResponse("Server Error", { status: 500 });
  }
}
