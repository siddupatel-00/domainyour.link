import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { linkGroups } from "@/lib/db/schema";
import { isAuthenticated } from "@/lib/auth";
import { eq } from "drizzle-orm";
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

// PATCH /api/groups/[id] - Update group name, color, or assigned link IDs
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
      return NextResponse.json({ error: "Invalid group ID" }, { status: 400, headers: noCacheHeaders });
    }

    const body = await request.json();
    const { name, color, linkIds } = body;

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

    // 1. Try Turso
    if (isTursoEnabled) {
      try {
        const updated = await tursoUpdateLinkGroup(numericId, updateFields);
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
          .where(eq(linkGroups.id, numericId))
          .returning();

        if (updatedRecord) {
          updateSharedLinkGroup(numericId, updatedRecord);
          return NextResponse.json({ success: true, group: updatedRecord }, { headers: noCacheHeaders });
        }
      } catch {}
    }

    // 3. Fallback in-memory
    const updated = updateSharedLinkGroup(numericId, updateFields);
    if (updated) {
      return NextResponse.json({ success: true, group: updated }, { headers: noCacheHeaders });
    }

    return NextResponse.json({ error: "Group not found" }, { status: 404, headers: noCacheHeaders });
  } catch (error) {
    console.error("Update group error:", error);
    return NextResponse.json({ error: "Failed to update group" }, { status: 500, headers: noCacheHeaders });
  }
}

// DELETE /api/groups/[id] - Delete a group (does NOT delete links)
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
      return NextResponse.json({ error: "Invalid group ID" }, { status: 400, headers: noCacheHeaders });
    }

    // 1. Try Turso
    if (isTursoEnabled) {
      try {
        const ok = await tursoDeleteLinkGroup(numericId);
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
        await db.delete(linkGroups).where(eq(linkGroups.id, numericId));
        deleteSharedLinkGroup(numericId);
        return NextResponse.json({ success: true }, { headers: noCacheHeaders });
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
