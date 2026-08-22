import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { redirects } from "@/lib/db/schema";
import { isAuthenticated } from "@/lib/auth";
import { isValidUrl } from "@/lib/utils";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// PATCH /api/redirects/[id] - Update destination URL
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await request.json();
    const { destinationUrl, redirectCode } = body;

    if (!destinationUrl) {
      return NextResponse.json(
        { error: "Destination URL is required" },
        { status: 400 }
      );
    }

    let formattedDestination = destinationUrl.trim();
    if (
      !formattedDestination.startsWith("http://") &&
      !formattedDestination.startsWith("https://")
    ) {
      formattedDestination = `https://${formattedDestination}`;
    }

    if (!isValidUrl(formattedDestination)) {
      return NextResponse.json(
        { error: "Please enter a valid destination URL" },
        { status: 400 }
      );
    }

    const updateData: {
      destinationUrl: string;
      updatedAt: Date;
      redirectCode?: number;
    } = {
      destinationUrl: formattedDestination,
      updatedAt: new Date(),
    };

    if (redirectCode === 307 || redirectCode === 308) {
      updateData.redirectCode = redirectCode;
    }

    const [updatedRecord] = await db
      .update(redirects)
      .set(updateData)
      .where(eq(redirects.id, numericId))
      .returning();

    if (!updatedRecord) {
      return NextResponse.json(
        { error: "Redirect record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, redirect: updatedRecord });
  } catch (error) {
    console.error("Update redirect error:", error);
    return NextResponse.json(
      { error: "Failed to update redirect" },
      { status: 500 }
    );
  }
}

// DELETE /api/redirects/[id] - Remove redirect
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const [deletedRecord] = await db
      .delete(redirects)
      .where(eq(redirects.id, numericId))
      .returning();

    if (!deletedRecord) {
      return NextResponse.json(
        { error: "Redirect record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Redirect deleted successfully" });
  } catch (error) {
    console.error("Delete redirect error:", error);
    return NextResponse.json(
      { error: "Failed to delete redirect" },
      { status: 500 }
    );
  }
}
