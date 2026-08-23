import { NextRequest, NextResponse } from "next/server";
import {
  setAdminSession,
  clearAdminSession,
  getSessionUser,
} from "@/lib/auth";
import { generateOtp, storeOtp, verifyOtp, sendOtpEmail } from "@/lib/email";
import { sanitizeSlug } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSessionUser();
  return NextResponse.json({
    authenticated: session !== null,
    user: session,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, email, code, username } = body;

    // Action 1: Send 6-digit verification code to email
    if (action === "send_code") {
      if (!email || !email.includes("@")) {
        return NextResponse.json(
          { error: "Please enter a valid email address" },
          { status: 400 }
        );
      }

      const cleanEmail = email.trim().toLowerCase();
      const cleanUsername = username ? sanitizeSlug(username) : undefined;
      const otp = generateOtp();

      storeOtp(cleanEmail, otp, cleanUsername);
      const emailResult = await sendOtpEmail(cleanEmail, otp);

      return NextResponse.json({
        success: true,
        message: `Verification code sent to ${cleanEmail}`,
        devCode: emailResult.devCode,
      });
    }

    // Action 2: Verify 6-digit code & log in
    if (action === "verify_code" || (code && email)) {
      if (!email || !code) {
        return NextResponse.json(
          { error: "Email and verification code are required" },
          { status: 400 }
        );
      }

      const cleanEmail = email.trim().toLowerCase();
      const verification = verifyOtp(cleanEmail, code);

      if (!verification.valid) {
        return NextResponse.json(
          { error: verification.message || "Invalid or expired verification code" },
          { status: 400 }
        );
      }

      const finalUsername = verification.username || sanitizeSlug(username || "creator");
      await setAdminSession(finalUsername, cleanEmail);

      return NextResponse.json({
        success: true,
        user: { username: finalUsername, email: cleanEmail },
      });
    }

    return NextResponse.json(
      { error: "Invalid request payload" },
      { status: 400 }
    );
  } catch (err) {
    console.error("Auth route error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  await clearAdminSession();
  return NextResponse.json({ success: true });
}
