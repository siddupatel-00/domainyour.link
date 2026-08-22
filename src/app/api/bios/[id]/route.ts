import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bios } from "@/lib/db/schema";
import { isAuthenticated } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { getLocalFallbackBios } from "../route";
import { calculateExpiration } from "../../redirects/route";

export const dynamic = "force-dynamic";

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

// PATCH /api/bios/[id] - Update bio
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noCacheHeaders });
  }

  try {
    const { id } = await params;
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400, headers: noCacheHeaders });
    }

    const body = await request.json();
    const { title, description, linkIds, duration, expiresAt } = body;

    const updateFields: {
      title?: string;
      description?: string | null;
      linkIds?: string;
      expiresAt?: Date | null;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (title !== undefined) updateFields.title = title.trim();
    if (description !== undefined) updateFields.description = description ? description.trim() : null;
    if (linkIds !== undefined) updateFields.linkIds = Array.isArray(linkIds) ? JSON.stringify(linkIds) : "[]";

    if (duration !== undefined || expiresAt !== undefined) {
      updateFields.expiresAt = expiresAt !== undefined
        ? (expiresAt ? new Date(expiresAt) : null)
        : calculateExpiration(duration);
    }

    try {
      const [updatedRecord] = await db
        .update(bios)
        .set(updateFields)
        .where(eq(bios.id, numericId))
        .returning();

      if (updatedRecord) {
        return NextResponse.json({ success: true, bio: updatedRecord }, { headers: noCacheHeaders });
      }
    } catch {
      // Fallback
    }

    // Fallback store update
    const fallbackList = getLocalFallbackBios();
    const item = fallbackList.find((b) => b.id === numericId);
    if (item) {
      if (updateFields.title !== undefined) item.title = updateFields.title;
      if (updateFields.description !== undefined) item.description = updateFields.description;
      if (updateFields.linkIds !== undefined) item.linkIds = updateFields.linkIds;
      if (updateFields.expiresAt !== undefined) item.expiresAt = updateFields.expiresAt;
      item.updatedAt = new Date();
      return NextResponse.json({ success: true, bio: item }, { headers: noCacheHeaders });
    }

    return NextResponse.json(
      { error: "Bio not found" },
      { status: 404, headers: noCacheHeaders }
    );
  } catch (error) {
    console.error("Update bio error:", error);
    return NextResponse.json(
      { error: "Failed to update bio" },
      { status: 500, headers: noCacheHeaders }
    );
  }
}

// DELETE /api/bios/[id] - Delete bio
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noCacheHeaders });
  }

  try {
    const { id } = await params;
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400, headers: noCacheHeaders });
    }

    try {
      const [deletedRecord] = await db
        .delete(bios)
        .where(eq(bios.id, numericId))
        .returning();

      if (deletedRecord) {
        return NextResponse.json({ success: true, message: "Bio deleted" }, { headers: noCacheHeaders });
      }
    } catch {
      // Fallback
    }

    // Fallback store delete
    const fallbackList = getLocalFallbackBios();
    const index = fallbackList.findIndex((b) => b.id === numericId);
    if (index !== -1) {
      fallbackList.splice(index, 1);
      return NextResponse.json({ success: true, message: "Bio deleted" }, { headers: noCacheHeaders });
    }

    return NextResponse.json(
      { error: "Bio not found" },
      { status: 404, headers: noCacheHeaders }
    );
  } catch (error) {
    console.error("Delete bio error:", error);
    return NextResponse.json(
      { error: "Failed to delete bio" },
      { status: 500, headers: noCacheHeaders }
    );
  }
}
