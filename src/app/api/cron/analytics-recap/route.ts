import { NextRequest, NextResponse } from "next/server";
import {
  isTursoEnabled,
  tursoGetUsersWithRecapEnabled,
  tursoGetRedirectsWithTimeframe,
  parseTimeframeDates,
} from "@/lib/tursoDb";
import { sendAnalyticsRecapEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const frequency = searchParams.get("frequency") === "monthly" ? "monthly" : "weekly";

    if (!isTursoEnabled) {
      return NextResponse.json({ message: "Turso not enabled; skipping cron recap" });
    }

    const optedInUsers = await tursoGetUsersWithRecapEnabled(frequency);
    let sentCount = 0;

    for (const u of optedInUsers) {
      if (!u.email) continue;
      try {
        const { startDate } = parseTimeframeDates(frequency === "monthly" ? "this_month" : "7d");
        const links = await tursoGetRedirectsWithTimeframe(u.username, startDate);
        const totalClicks = links.reduce((sum, l) => sum + (l.clickCount || 0), 0);
        const activeLinks = links.filter((l) => !l.expiresAt || new Date(l.expiresAt).getTime() > Date.now());
        const sortedLinks = [...links].sort((a, b) => (b.clickCount || 0) - (a.clickCount || 0)).slice(0, 3);

        const topLinks = sortedLinks.map((l) => ({
          path: `/${l.username}/${l.webname}`,
          destinationUrl: l.destinationUrl,
          clicks: l.clickCount || 0,
        }));

        await sendAnalyticsRecapEmail({
          toEmail: u.email,
          username: u.username,
          frequency,
          totalClicks,
          activeLinksCount: activeLinks.length,
          topLinks,
        });

        sentCount++;
      } catch (userErr) {
        console.error(`Failed to send recap email for @${u.username}:`, userErr);
      }
    }

    return NextResponse.json({
      success: true,
      frequency,
      sentCount,
      totalUsers: optedInUsers.length,
    });
  } catch (error) {
    console.error("Cron recap error:", error);
    return NextResponse.json({ error: "Cron execution failed" }, { status: 500 });
  }
}
