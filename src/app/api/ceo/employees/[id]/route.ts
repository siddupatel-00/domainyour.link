import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { employees } from "@/lib/db/schema";
import { isCeoAuthenticated } from "@/lib/auth";
import { updateSharedEmployee, deleteSharedEmployee } from "@/lib/employeeStore";
import {
  isTursoEnabled,
  tursoUpdateEmployee,
  tursoDeleteEmployee,
} from "@/lib/tursoDb";
import { eq } from "drizzle-orm";

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

    const updateFields: any = {
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

    // 1. Try Turso
    if (isTursoEnabled) {
      try {
        const updated = await tursoUpdateEmployee(numericId, updateFields);
        if (updated) {
          updateSharedEmployee(numericId, updated);
          return NextResponse.json({ success: true, employee: updated }, { headers: noCacheHeaders });
        }
      } catch (err) {
        console.error("Turso update employee error:", err);
      }
    }

    // 2. Try PostgreSQL / Neon
    try {
      const [updatedRecord] = await db
        .update(employees)
        .set(updateFields)
        .where(eq(employees.id, numericId))
        .returning();

      if (updatedRecord) {
        updateSharedEmployee(numericId, updatedRecord);
        return NextResponse.json({ success: true, employee: updatedRecord }, { headers: noCacheHeaders });
      }
    } catch {}

    // 3. Fallback in-memory
    const updated = updateSharedEmployee(numericId, updateFields);
    if (updated) {
      return NextResponse.json({ success: true, employee: updated }, { headers: noCacheHeaders });
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

    // 1. Try Turso
    if (isTursoEnabled) {
      try {
        const ok = await tursoDeleteEmployee(numericId);
        if (ok) {
          deleteSharedEmployee(numericId);
          return NextResponse.json({ success: true, message: "Employee removed" }, { headers: noCacheHeaders });
        }
      } catch (err) {
        console.error("Turso delete employee error:", err);
      }
    }

    // 2. Try PostgreSQL / Neon
    try {
      const [deletedRecord] = await db
        .delete(employees)
        .where(eq(employees.id, numericId))
        .returning();

      if (deletedRecord) {
        deleteSharedEmployee(numericId);
        return NextResponse.json({ success: true, message: "Employee removed" }, { headers: noCacheHeaders });
      }
    } catch {}

    // 3. Fallback in-memory
    const deleted = deleteSharedEmployee(numericId);
    if (deleted) {
      return NextResponse.json({ success: true, message: "Employee removed" }, { headers: noCacheHeaders });
    }

    return NextResponse.json({ error: "Employee not found" }, { status: 404, headers: noCacheHeaders });
  } catch (error) {
    console.error("Delete employee error:", error);
    return NextResponse.json({ error: "Failed to remove employee" }, { status: 500, headers: noCacheHeaders });
  }
}
