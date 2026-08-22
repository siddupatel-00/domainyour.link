import { NextRequest, NextResponse } from "next/server";
import {
  checkAdminPassword,
  setAdminSession,
  clearAdminSession,
  getSessionUser,
} from "@/lib/auth";
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
    const { username, email, password } = body;

    if (!password) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    if (!process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: "ADMIN_PASSWORD is not configured in server environment" },
        { status: 500 }
      );
    }

    const isValid = checkAdminPassword(password);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }

    const cleanUsername = username ? sanitizeSlug(username) : "admin";
    const cleanEmail = email ? String(email).trim().toLowerCase() : "";

    await setAdminSession(cleanUsername, cleanEmail);
    return NextResponse.json({
      success: true,
      user: { username: cleanUsername, email: cleanEmail },
    });
  } catch (err) {
    console.error("Auth login error:", err);
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
