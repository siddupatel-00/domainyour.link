import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { linkGroups } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import {
  isTursoEnabled,
  tursoUpdateLinkGroup,
  tursoDeleteLinkGroup,
} from "@/lib/tursoDb";
import {
  updateSharedLinkGroup,
  deleteSharedLinkGroup,
} from "@/lib/groupStore";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

// PATCH /api/groups/[id] - Update group name, color, or assigned link IDs (ownership enforced)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser();
  if (!session || !session.username) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noCacheHeaders });
  }
  const username = session.username.trim().toLowerCase();

  try {
    const { id } = await params;
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      return NextResponse.json({ error: "Invalid group ID" }, { status: 400, headers: noCacheHeaders });
    }

    const body = await request.json();
    const { name, color, linkIds, shareCode, isShared, duration, expiresAt } = body;

    const updateFields: any = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateFields.name = name.trim();
    if (color !== undefined) updateFields.color = color.trim();
    if (linkIds !== undefined) {
      updateFields.linkIds = Array.isArray(linkIds)
        ? JSON.stringify(linkIds)
        : typeof linkIds === "string"
        ? linkIds
        : "[]";
    }
    if (shareCode !== undefined) updateFields.shareCode = shareCode.trim().toLowerCase();
    if (isShared !== undefined) updateFields.isShared = Boolean(isShared);
    if (expiresAt !== undefined) {
      updateFields.expiresAt = expiresAt ? new Date(expiresAt) : null;
    } else if (duration !== undefined) {
      updateFields.expiresAt = duration === "permanent" || !duration
        ? null
        : new Date(Date.now() + (duration === "1h" ? 3600000 : duration === "24h" ? 86400000 : duration === "7d" ? 604800000 : 2592000000));
    }

    // 1. Try Turso
    if (isTursoEnabled) {
      try {
        const updated = await tursoUpdateLinkGroup(numericId, updateFields, username);
        if (updated) {
          updateSharedLinkGroup(numericId, updated);
          return NextResponse.json({ success: true, group: updated }, { headers: noCacheHeaders });
        }
      } catch (err) {
        console.warn("Turso update group error:", err);
      }
    }

    // 2. Try PostgreSQL / Neon
    if (db) {
      try {
        const [updatedRecord] = await db
          .update(linkGroups)
          .set(updateFields)
          .where(and(eq(linkGroups.id, numericId), eq(linkGroups.username, username)))
          .returning();

        if (updatedRecord) {
          updateSharedLinkGroup(numericId, updatedRecord);
          return NextResponse.json({ success: true, group: updatedRecord }, { headers: noCacheHeaders });
        }
      } catch {}
    }

    // 3. Fallback in-memory
    const updated = updateSharedLinkGroup(numericId, updateFields);
    if (updated && updated.username.toLowerCase() === username) {
      return NextResponse.json({ success: true, group: updated }, { headers: noCacheHeaders });
    }

    return NextResponse.json({ error: "Group not found or access denied" }, { status: 404, headers: noCacheHeaders });
  } catch (error) {
    console.error("Update group error:", error);
    return NextResponse.json({ error: "Failed to update group" }, { status: 500, headers: noCacheHeaders });
  }
}

// DELETE /api/groups/[id] - Delete a group (ownership enforced)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser();
  if (!session || !session.username) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noCacheHeaders });
  }
  const username = session.username.trim().toLowerCase();

  try {
    const { id } = await params;
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      return NextResponse.json({ error: "Invalid group ID" }, { status: 400, headers: noCacheHeaders });
    }

    // 1. Try Turso
    if (isTursoEnabled) {
      try {
        const ok = await tursoDeleteLinkGroup(numericId, username);
        if (ok) {
          deleteSharedLinkGroup(numericId);
          return NextResponse.json({ success: true }, { headers: noCacheHeaders });
        }
      } catch (err) {
        console.warn("Turso delete group error:", err);
      }
    }

    // 2. Try PostgreSQL / Neon
    if (db) {
      try {
        const [deleted] = await db
          .delete(linkGroups)
          .where(and(eq(linkGroups.id, numericId), eq(linkGroups.username, username)))
          .returning();
        if (deleted) {
          deleteSharedLinkGroup(numericId);
          return NextResponse.json({ success: true }, { headers: noCacheHeaders });
        }
      } catch {}
    }

    // 3. Fallback in-memory
    deleteSharedLinkGroup(numericId);
    return NextResponse.json({ success: true }, { headers: noCacheHeaders });
  } catch (error) {
    console.error("Delete group error:", error);
    return NextResponse.json({ error: "Failed to delete group" }, { status: 500, headers: noCacheHeaders });
  }
}
