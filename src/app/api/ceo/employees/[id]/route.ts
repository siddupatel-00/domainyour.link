import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { employees } from "@/lib/db/schema";
import { isCeoAuthenticated } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { getLocalFallbackEmployees } from "../route";

export const dynamic = "force-dynamic";

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

// PATCH /api/ceo/employees/[id] - Update employee
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authed = await isCeoAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized: CEO Master Access Required" }, { status: 401, headers: noCacheHeaders });
  }

  try {
    const { id } = await params;
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400, headers: noCacheHeaders });
    }

    const body = await request.json();
    const { name, role, status, permissions } = body;

    const updateFields: {
      name?: string;
      role?: string;
      status?: string;
      permissions?: string;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateFields.name = name.trim();
    if (role !== undefined) updateFields.role = role.trim();
    if (status !== undefined) updateFields.status = status.trim();
    if (permissions !== undefined) {
      updateFields.permissions = Array.isArray(permissions)
        ? JSON.stringify(permissions)
        : String(permissions);
    }

    try {
      const [updatedRecord] = await db
        .update(employees)
        .set(updateFields)
        .where(eq(employees.id, numericId))
        .returning();

      if (updatedRecord) {
        return NextResponse.json({ success: true, employee: updatedRecord }, { headers: noCacheHeaders });
      }
    } catch {
      // Fallback
    }

    const fallbackList = getLocalFallbackEmployees();
    const item = fallbackList.find((e) => e.id === numericId);
    if (item) {
      if (updateFields.name !== undefined) item.name = updateFields.name;
      if (updateFields.role !== undefined) item.role = updateFields.role;
      if (updateFields.status !== undefined) item.status = updateFields.status;
      if (updateFields.permissions !== undefined) item.permissions = updateFields.permissions;
      item.updatedAt = new Date();
      return NextResponse.json({ success: true, employee: item }, { headers: noCacheHeaders });
    }

    return NextResponse.json({ error: "Employee not found" }, { status: 404, headers: noCacheHeaders });
  } catch (error) {
    console.error("Update employee error:", error);
    return NextResponse.json({ error: "Failed to update employee" }, { status: 500, headers: noCacheHeaders });
  }
}

// DELETE /api/ceo/employees/[id] - Remove employee
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authed = await isCeoAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized: CEO Master Access Required" }, { status: 401, headers: noCacheHeaders });
  }

  try {
    const { id } = await params;
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400, headers: noCacheHeaders });
    }

    try {
      const [deletedRecord] = await db
        .delete(employees)
        .where(eq(employees.id, numericId))
        .returning();

      if (deletedRecord) {
        return NextResponse.json({ success: true, message: "Employee removed" }, { headers: noCacheHeaders });
      }
    } catch {
      // Fallback
    }

    const fallbackList = getLocalFallbackEmployees();
    const index = fallbackList.findIndex((e) => e.id === numericId);
    if (index !== -1) {
      fallbackList.splice(index, 1);
      return NextResponse.json({ success: true, message: "Employee removed" }, { headers: noCacheHeaders });
    }

    return NextResponse.json({ error: "Employee not found" }, { status: 404, headers: noCacheHeaders });
  } catch (error) {
    console.error("Delete employee error:", error);
    return NextResponse.json({ error: "Failed to remove employee" }, { status: 500, headers: noCacheHeaders });
  }
}
