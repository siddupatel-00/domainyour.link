import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { employees, Employee } from "@/lib/db/schema";
import { setEmployeeSession } from "@/lib/auth";
import { sanitizeSlug } from "@/lib/utils";
import {
  findSharedEmployeeByToken,
  updateSharedEmployee,
} from "@/lib/employeeStore";
import {
  isTursoEnabled,
  tursoFindEmployeeByToken,
  tursoUpdateEmployee,
} from "@/lib/tursoDb";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Invite token is missing" }, { status: 400 });
  }

  try {
    let employee: Employee | null = null;

    // 1. Try Turso
    if (isTursoEnabled) {
      try {
        employee = await tursoFindEmployeeByToken(token);
      } catch (err) {
        console.warn("Turso query error in join GET:", err);
      }
    }

    // 2. Try PostgreSQL / Neon
    if (!employee && db) {
      try {
        const found = await db
          .select()
          .from(employees)
          .where(eq(employees.inviteToken, token))
          .limit(1);
        if (found.length > 0) {
          employee = found[0];
        }
      } catch (dbErr) {
        console.warn("DB query error in join (falling back to memory):", dbErr);
      }
    }

    // 3. Try In-Memory Store
    if (!employee) {
      employee = findSharedEmployeeByToken(token) || null;
    }

    if (!employee) {
      return NextResponse.json(
        { error: "Invalid or expired invitation link. Please ask your CEO for a new invite." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      valid: true,
      email: employee.email,
      role: employee.role,
    });
  } catch (err) {
    console.error("Validate invite error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, name, username, password } = body;

    if (!token || !name?.trim() || !username?.trim() || !password) {
      return NextResponse.json(
        { error: "Full Name, Username, and Password are all required" },
        { status: 400 }
      );
    }

    const cleanName = name.trim();
    const cleanUsername = sanitizeSlug(username);

    let employee: Employee | null = null;

    // 1. Try Turso
    if (isTursoEnabled) {
      try {
        employee = await tursoFindEmployeeByToken(token);
      } catch (err) {
        console.warn("Turso query error in join POST:", err);
      }
    }

    // 2. Try PostgreSQL / Neon
    if (!employee && db) {
      try {
        const found = await db
          .select()
          .from(employees)
          .where(eq(employees.inviteToken, token))
          .limit(1);
        if (found.length > 0) {
          employee = found[0];
        }
      } catch (dbErr) {
        console.warn("DB query error in join POST (falling back to memory):", dbErr);
      }
    }

    // 3. Try In-Memory Store
    if (!employee) {
      employee = findSharedEmployeeByToken(token) || null;
    }

    if (!employee) {
      return NextResponse.json(
        { error: "Invalid or expired invitation link." },
        { status: 404 }
      );
    }

    // Update in Turso
    if (isTursoEnabled) {
      try {
        await tursoUpdateEmployee(employee.id, {
          name: cleanName,
          username: cleanUsername,
          password: password,
          status: "active",
          inviteToken: undefined,
        });
      } catch (err) {
        console.warn("Turso update error in join POST:", err);
      }
    }

    // Update in PostgreSQL
    if (db) {
      try {
        await db
          .update(employees)
          .set({
            name: cleanName,
            username: cleanUsername,
            password: password,
            status: "active",
            inviteToken: null,
            updatedAt: new Date(),
          })
          .where(eq(employees.id, employee.id));
      } catch (dbErr) {
        console.warn("DB update error in join POST:", dbErr);
      }
    }

    // Always update in shared store
    updateSharedEmployee(employee.id, {
      name: cleanName,
      username: cleanUsername,
      password: password,
      status: "active",
      inviteToken: null,
    });

    const employeeSession = {
      id: employee.id,
      name: cleanName,
      email: employee.email,
      role: employee.role,
      permissions: ["view_insights"],
    };

    await setEmployeeSession(employeeSession);

    return NextResponse.json({
      success: true,
      employee: employeeSession,
    });
  } catch (err) {
    console.error("Employee join error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
