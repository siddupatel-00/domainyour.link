import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { isAuthenticated, getSessionUser } from "@/lib/auth";
import { eq } from "drizzle-orm";
import {
  isTursoEnabled,
  tursoGetUserRecapPreference,
  tursoUpdateUserRecapPreference,
  tursoGetRedirectsWithTimeframe,
  tursoGetRedirects,
} from "@/lib/tursoDb";
import { sendAnalyticsRecapEmail } from "@/lib/email";
import { findUserByEmailOrUsername } from "@/lib/userStore";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

// In-memory fallback preference store
const fallbackRecapPrefs: Record<string, "off" | "weekly" | "monthly" | "both"> = {};

// GET /api/user/settings - Fetch user settings (recap preference, email)
export async function GET() {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noCacheHeaders });
  }

  const user = await getSessionUser();
  const username = user?.username || "creator";

  try {
    let email = user?.email || "";
    let preference: "off" | "weekly" | "monthly" | "both" = "off";

    // 1. Try Turso
    if (isTursoEnabled) {
      const tursoData = await tursoGetUserRecapPreference(username);
      if (tursoData) {
        preference = tursoData.preference;
        if (tursoData.email) email = tursoData.email;
      }
    }

    // 2. Try PostgreSQL
    if (!email && db) {
      try {
        const found = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);
        if (found.length > 0) {
          email = found[0].email;
          const raw = String(found[0].recapPreference || "off");
          preference = ["off", "weekly", "monthly", "both"].includes(raw)
            ? (raw as "off" | "weekly" | "monthly" | "both")
            : "off";
        }
      } catch {}
    }

    // 3. Try In-Memory User Store
    if (!email) {
      const memoryUser = await findUserByEmailOrUsername(username);
      if (memoryUser) email = memoryUser.email;
      preference = fallbackRecapPrefs[username.toLowerCase()] || "off";
    }

    const weeklyRecap = preference === "weekly" || preference === "both";
    const monthlyRecap = preference === "monthly" || preference === "both";

    return NextResponse.json(
      {
        username,
        email,
        recapPreference: preference,
        weeklyRecap,
        monthlyRecap,
      },
      { headers: noCacheHeaders }
    );
  } catch (error) {
    console.error("Get user settings error:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500, headers: noCacheHeaders });
  }
}

// PATCH /api/user/settings - Update email recap preference or send a test recap
export async function PATCH(request: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noCacheHeaders });
  }

  const user = await getSessionUser();
  const username = user?.username || "creator";

  try {
    const body = await request.json();
    const { recapPreference, weeklyRecap, monthlyRecap, sendTest } = body;

    // Send a test recap email immediately
    if (sendTest) {
      let email = user?.email || "";
      if (isTursoEnabled) {
        const t = await tursoGetUserRecapPreference(username);
        if (t?.email) email = t.email;
      }
      if (!email) {
        const u = await findUserByEmailOrUsername(username);
        if (u?.email) email = u.email;
      }

      if (!email) {
        return NextResponse.json({ error: "No email address found for your account" }, { status: 400, headers: noCacheHeaders });
      }

      const { parseTimeframeDates } = await import("@/lib/tursoDb");
      const { startDate } = parseTimeframeDates("7d");
      const links = isTursoEnabled
        ? await tursoGetRedirectsWithTimeframe(username, startDate)
        : await tursoGetRedirects(username);

      const totalClicks = links.reduce((sum, l) => sum + (l.clickCount || 0), 0);
      const activeLinks = links.filter((l) => !l.expiresAt || new Date(l.expiresAt).getTime() > Date.now());
      const sortedLinks = [...links].sort((a, b) => (b.clickCount || 0) - (a.clickCount || 0)).slice(0, 3);

      const topLinks = sortedLinks.map((l) => ({
        path: `/${l.username}/${l.webname}`,
        destinationUrl: l.destinationUrl,
        clicks: l.clickCount || 0,
      }));

      const res = await sendAnalyticsRecapEmail({
        toEmail: email,
        username,
        frequency: (recapPreference === "monthly" ? "monthly" : "weekly"),
        totalClicks,
        activeLinksCount: activeLinks.length,
        topLinks,
      });

      if (!res.success) {
        return NextResponse.json({ error: res.error || "Failed to send test recap email" }, { status: 500, headers: noCacheHeaders });
      }

      return NextResponse.json({ success: true, message: `Test recap email sent to ${email}` }, { headers: noCacheHeaders });
    }

    // Update preference
    let validPref: "off" | "weekly" | "monthly" | "both" | null = null;

    if (weeklyRecap !== undefined || monthlyRecap !== undefined) {
      // Determine existing state if one of them is undefined
      let currentPref: "off" | "weekly" | "monthly" | "both" = "off";
      if (isTursoEnabled) {
        const t = await tursoGetUserRecapPreference(username);
        if (t) currentPref = t.preference;
      } else {
        currentPref = fallbackRecapPrefs[username.toLowerCase()] || "off";
      }

      const currentWeekly = currentPref === "weekly" || currentPref === "both";
      const currentMonthly = currentPref === "monthly" || currentPref === "both";

      const finalWeekly = weeklyRecap !== undefined ? !!weeklyRecap : currentWeekly;
      const finalMonthly = monthlyRecap !== undefined ? !!monthlyRecap : currentMonthly;

      if (finalWeekly && finalMonthly) validPref = "both";
      else if (finalWeekly) validPref = "weekly";
      else if (finalMonthly) validPref = "monthly";
      else validPref = "off";
    } else if (recapPreference !== undefined) {
      validPref = ["off", "weekly", "monthly", "both"].includes(recapPreference)
        ? (recapPreference as "off" | "weekly" | "monthly" | "both")
        : "off";
    }

    if (validPref !== null) {
      if (isTursoEnabled) {
        await tursoUpdateUserRecapPreference(username, validPref);
      }

      if (db) {
        try {
          await db
            .update(users)
            .set({ recapPreference: validPref, updatedAt: new Date() })
            .where(eq(users.username, username));
        } catch {}
      }

      fallbackRecapPrefs[username.toLowerCase()] = validPref;

      const descMap = {
        off: "Email recaps disabled",
        weekly: "Weekly recap enabled (every Monday)",
        monthly: "Monthly recap enabled (1st of each month)",
        both: "Both Weekly & Monthly recaps enabled",
      };

      return NextResponse.json(
        {
          success: true,
          recapPreference: validPref,
          weeklyRecap: validPref === "weekly" || validPref === "both",
          monthlyRecap: validPref === "monthly" || validPref === "both",
          message: descMap[validPref],
        },
        { headers: noCacheHeaders }
      );
    }

    return NextResponse.json({ error: "Invalid payload" }, { status: 400, headers: noCacheHeaders });
  } catch (error) {
    console.error("Update user settings error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500, headers: noCacheHeaders });
  }
}
