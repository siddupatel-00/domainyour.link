import { NextResponse } from "next/server";
import { getSessionUser, clearAdminSession } from "@/lib/auth";
import { deleteUserAccount } from "@/lib/userStore";
import { sanitizeSlug } from "@/lib/utils";

export const dynamic = "force-dynamic";

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function DELETE() {
  try {
    const session = await getSessionUser();
    if (!session || !session.username) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noCacheHeaders });
    }

    const clean = sanitizeSlug(session.username);
    await deleteUserAccount(clean);
    await clearAdminSession();

    return NextResponse.json({
      success: true,
      message: "Account deleted successfully",
    }, { headers: noCacheHeaders });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete account" },
      { status: 500, headers: noCacheHeaders }
    );
  }
}
