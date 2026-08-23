import { NextRequest, NextResponse } from "next/server";
import {
  setAdminSession,
  clearAdminSession,
  getSessionUser,
} from "@/lib/auth";
import { generateOtp, storeOtp, verifyOtp, sendOtpEmail } from "@/lib/email";
import { sanitizeSlug } from "@/lib/utils";
import {
  findUserByEmailOrUsername,
  createOrUpdateUser,
  verifyPasswordHash,
} from "@/lib/userStore";

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
    const { action, email, code, username, password } = body;

    // 1. Send 6-digit verification code to email
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

    // 2. Verify 6-digit code
    if (action === "verify_code") {
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

      const finalUsername = verification.username || (username ? sanitizeSlug(username) : "creator");

      return NextResponse.json({
        success: true,
        verified: true,
        username: finalUsername,
        email: cleanEmail,
      });
    }

    // 3. Complete Sign Up / Set Password
    if (action === "complete_signup" || action === "set_password") {
      if (!email || !password) {
        return NextResponse.json(
          { error: "Email and password are required" },
          { status: 400 }
        );
      }

      const cleanEmail = email.trim().toLowerCase();
      const cleanUsername = sanitizeSlug(username || "creator");

      const user = await createOrUpdateUser(cleanUsername, cleanEmail, password);
      await setAdminSession(user.username, user.email);

      return NextResponse.json({
        success: true,
        user: { username: user.username, email: user.email },
      });
    }

    // 4. Sign In with existing Email + Password
    if (action === "password_login" || (email && password && !code)) {
      const cleanIdentifier = String(email || username || "").trim().toLowerCase();
      if (!cleanIdentifier || !password) {
        return NextResponse.json(
          { error: "Please enter your email and password" },
          { status: 400 }
        );
      }

      const user = await findUserByEmailOrUsername(cleanIdentifier);
      if (!user || !verifyPasswordHash(password, user.password)) {
        return NextResponse.json(
          { error: "Incorrect email or password" },
          { status: 401 }
        );
      }

      await setAdminSession(user.username, user.email);
      return NextResponse.json({
        success: true,
        user: { username: user.username, email: user.email },
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
