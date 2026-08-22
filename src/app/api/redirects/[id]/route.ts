import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { redirects } from "@/lib/db/schema";
import { isAuthenticated } from "@/lib/auth";
import { isValidUrl } from "@/lib/utils";
import { eq } from "drizzle-orm";
import { getLocalFallbackLinks, calculateExpiration } from "../route";

export const dynamic = "force-dynamic";

// PATCH /api/redirects/[id] - Update destination URL or expiration
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
    const { destinationUrl, duration, expiresAt } = body;

    const updateFields: {
      destinationUrl?: string;
      expiresAt?: Date | null;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (destinationUrl) {
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
      updateFields.destinationUrl = formattedDestination;
    }

    if (duration !== undefined || expiresAt !== undefined) {
      updateFields.expiresAt = expiresAt !== undefined
        ? (expiresAt ? new Date(expiresAt) : null)
        : calculateExpiration(duration);
    }

    try {
      const [updatedRecord] = await db
        .update(redirects)
        .set(updateFields)
        .where(eq(redirects.id, numericId))
        .returning();

      if (updatedRecord) {
        return NextResponse.json({ success: true, redirect: updatedRecord });
      }
    } catch {
      // Fallback
    }

    // Fallback store update
    const fallbackList = getLocalFallbackLinks();
    const item = fallbackList.find((l) => l.id === numericId);
    if (item) {
      if (updateFields.destinationUrl) item.destinationUrl = updateFields.destinationUrl;
      if (updateFields.expiresAt !== undefined) item.expiresAt = updateFields.expiresAt;
      item.updatedAt = new Date();
      return NextResponse.json({ success: true, redirect: item });
    }

    return NextResponse.json(
      { error: "Link not found" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Update redirect error:", error);
    return NextResponse.json(
      { error: "Failed to update link" },
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

    try {
      const [deletedRecord] = await db
        .delete(redirects)
        .where(eq(redirects.id, numericId))
        .returning();

      if (deletedRecord) {
        return NextResponse.json({ success: true, message: "Link deleted" });
      }
    } catch {
      // Fallback
    }

    // Fallback store delete
    const fallbackList = getLocalFallbackLinks();
    const index = fallbackList.findIndex((l) => l.id === numericId);
    if (index !== -1) {
      fallbackList.splice(index, 1);
      return NextResponse.json({ success: true, message: "Link deleted" });
    }

    return NextResponse.json(
      { error: "Link not found" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Delete redirect error:", error);
    return NextResponse.json(
      { error: "Failed to delete link" },
      { status: 500 }
    );
  }
}
