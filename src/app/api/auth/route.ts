import { NextRequest, NextResponse } from "next/server";
import {
  setAdminSession,
  clearAdminSession,
  getSessionUser,
} from "@/lib/auth";
import { generateOtp, createOtpChallenge, verifyOtpChallenge, sendOtpEmail } from "@/lib/email";
import { sanitizeSlug } from "@/lib/utils";
import {
  findUserByEmailOrUsername,
  createOrUpdateUser,
  verifyPasswordHash,
} from "@/lib/userStore";

export const dynamic = "force-dynamic";

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET() {
  const session = await getSessionUser();
  return NextResponse.json({
    authenticated: session !== null,
    user: session,
  }, { headers: noCacheHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, email, code, username, password, challengeToken } = body;

    // 1. Send 6-digit verification code to email (Serverless & Cold-Start Safe)
    if (action === "send_code") {
      if (!email || !email.includes("@")) {
        return NextResponse.json(
          { error: "Please enter a valid email address" },
          { status: 400, headers: noCacheHeaders }
        );
      }

      const cleanEmail = email.trim().toLowerCase();
      const cleanUsername = username ? sanitizeSlug(username) : undefined;
      const otp = generateOtp();

      // Create stateless signed HMAC challenge token
      const token = createOtpChallenge(cleanEmail, otp, cleanUsername);

      const emailResult = await sendOtpEmail(cleanEmail, otp);

      const isDev = process.env.NODE_ENV !== "production";
      const response = NextResponse.json({
        success: true,
        message: `Verification code sent to ${cleanEmail}`,
        challengeToken: token,
        ...(isDev && emailResult.devCode ? { devCode: emailResult.devCode } : {}),
      }, { headers: noCacheHeaders });

      // Also set HTTP-only cookie as fallback
      response.cookies.set({
        name: "relaylink_otp_challenge",
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 600, // 10 minutes
        path: "/",
      });

      return response;
    }

    // 2. Verify 6-digit code (Stateless Cryptographic Verification)
    if (action === "verify_code" || (code && email)) {
      if (!email || !code) {
        return NextResponse.json(
          { error: "Email and verification code are required" },
          { status: 400, headers: noCacheHeaders }
        );
      }

      const cleanEmail = email.trim().toLowerCase();
      const cookieToken =
        request.cookies.get("relaylink_otp_challenge")?.value ||
        request.cookies.get("domainyourlink_otp_challenge")?.value;
      const effectiveChallenge = challengeToken || cookieToken;

      const verification = verifyOtpChallenge(cleanEmail, code, effectiveChallenge);

      if (!verification.valid) {
        return NextResponse.json(
          { error: verification.message || "Invalid or expired verification code" },
          { status: 400, headers: noCacheHeaders }
        );
      }

      const finalUsername = verification.username || (username ? sanitizeSlug(username) : "creator");

      return NextResponse.json({
        success: true,
        verified: true,
        username: finalUsername,
        email: cleanEmail,
      }, { headers: noCacheHeaders });
    }

    // 3. Complete Sign Up / Set Password
    if (action === "complete_signup" || action === "set_password") {
      if (!email || !password) {
        return NextResponse.json(
          { error: "Email and password are required" },
          { status: 400, headers: noCacheHeaders }
        );
      }

      const cleanEmail = email.trim().toLowerCase();
      const cleanUsername = sanitizeSlug(username || "creator");

      const user = await createOrUpdateUser(cleanUsername, cleanEmail, password);
      await setAdminSession(user.username, user.email);

      return NextResponse.json({
        success: true,
        user: { username: user.username, email: user.email },
      }, { headers: noCacheHeaders });
    }

    // 4. Sign In with existing Email + Password
    if (action === "password_login" || (email && password && !code)) {
      const cleanIdentifier = String(email || username || "").trim().toLowerCase();
      if (!cleanIdentifier || !password) {
        return NextResponse.json(
          { error: "Please enter your email and password" },
          { status: 400, headers: noCacheHeaders }
        );
      }

      const user = await findUserByEmailOrUsername(cleanIdentifier);
      if (!user || !verifyPasswordHash(password, user.password)) {
        return NextResponse.json(
          { error: "Incorrect email or password" },
          { status: 401, headers: noCacheHeaders }
        );
      }

      await setAdminSession(user.username, user.email);
      return NextResponse.json({
        success: true,
        user: { username: user.username, email: user.email },
      }, { headers: noCacheHeaders });
    }

    return NextResponse.json(
      { error: "Invalid request payload" },
      { status: 400, headers: noCacheHeaders }
    );
  } catch (err) {
    console.error("Auth route error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: noCacheHeaders }
    );
  }
}

export async function DELETE() {
  await clearAdminSession();
  const res = NextResponse.json({ success: true }, { headers: noCacheHeaders });
  res.cookies.delete("relaylink_otp_challenge");
  res.cookies.delete("domainyourlink_otp_challenge");
  return res;
}
