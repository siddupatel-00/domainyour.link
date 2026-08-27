import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, setAdminSession } from "@/lib/auth";
import { sanitizeSlug } from "@/lib/utils";
import { isReservedUsername } from "@/lib/reservedUsernames";
import { findUserByEmailOrUsername, updateUsername } from "@/lib/userStore";

export const dynamic = "force-dynamic";

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session || !session.username) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noCacheHeaders });
    }

    const body = await request.json();
    const { newUsername } = body;

    if (!newUsername || typeof newUsername !== "string") {
      return NextResponse.json({ error: "Please provide a valid username" }, { status: 400, headers: noCacheHeaders });
    }

    const cleanNew = sanitizeSlug(newUsername);
    if (!cleanNew || cleanNew.length < 3) {
      return NextResponse.json({ error: "Username must be at least 3 characters" }, { status: 400, headers: noCacheHeaders });
    }

    if (cleanNew.length > 30) {
      return NextResponse.json({ error: "Username must be 30 characters or less" }, { status: 400, headers: noCacheHeaders });
    }

    const currentClean = sanitizeSlug(session.username);
    if (cleanNew === currentClean) {
      return NextResponse.json({ success: true, username: cleanNew, message: "Username unchanged" }, { headers: noCacheHeaders });
    }

    if (isReservedUsername(cleanNew)) {
      return NextResponse.json({ error: "This username is reserved and cannot be used" }, { status: 400, headers: noCacheHeaders });
    }

    const existingUser = await findUserByEmailOrUsername(cleanNew);
    if (existingUser && existingUser.username.toLowerCase() !== currentClean.toLowerCase()) {
      return NextResponse.json({ error: "This username is already taken" }, { status: 409, headers: noCacheHeaders });
    }

    const success = await updateUsername(currentClean, cleanNew);
    if (!success) {
      return NextResponse.json({ error: "Failed to update username" }, { status: 500, headers: noCacheHeaders });
    }

    // Refresh session cookie with the new username
    await setAdminSession(cleanNew, session.email);

    return NextResponse.json({
      success: true,
      username: cleanNew,
      message: `Username successfully changed to @${cleanNew}`,
    }, { headers: noCacheHeaders });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update username" },
      { status: 500, headers: noCacheHeaders }
    );
  }
}
