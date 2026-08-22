import { NextRequest, NextResponse } from "next/server";
import {
  verifyCeoPassword,
  createCeoSessionToken,
  isCeoAuthenticated,
  CEO_COOKIE_NAME,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

// GET /api/ceo/auth - Check CEO authentication status
export async function GET() {
  const authed = await isCeoAuthenticated();
  return NextResponse.json({ authenticated: authed }, { headers: noCacheHeaders });
}

// POST /api/ceo/auth - CEO master password login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: "CEO Master Password is required" },
        { status: 400, headers: noCacheHeaders }
      );
    }

    if (!verifyCeoPassword(password.trim())) {
      return NextResponse.json(
        { error: "Incorrect CEO Master Password. Access Denied." },
        { status: 401, headers: noCacheHeaders }
      );
    }

    const token = createCeoSessionToken();

    const response = NextResponse.json(
      { success: true, message: "CEO Master Access Granted" },
      { headers: noCacheHeaders }
    );

    response.cookies.set({
      name: CEO_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("CEO login error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500, headers: noCacheHeaders }
    );
  }
}

// DELETE /api/ceo/auth - CEO Logout
export async function DELETE() {
  const response = NextResponse.json(
    { success: true, message: "CEO Logged Out" },
    { headers: noCacheHeaders }
  );

  response.cookies.set({
    name: CEO_COOKIE_NAME,
    value: "",
    httpOnly: true,
    maxAge: 0,
    path: "/",
  });

  return response;
}
