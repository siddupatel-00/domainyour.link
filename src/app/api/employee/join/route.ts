import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { employees } from "@/lib/db/schema";
import { setEmployeeSession } from "@/lib/auth";
import { sanitizeSlug } from "@/lib/utils";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Invite token is missing" }, { status: 400 });
  }

  try {
    let employee = null;
    if (db) {
      const found = await db
        .select()
        .from(employees)
        .where(eq(employees.inviteToken, token))
        .limit(1);
      if (found.length > 0) {
        employee = found[0];
      }
    }

    if (!employee && global.fallbackEmployeesStore) {
      employee = global.fallbackEmployeesStore.find((e) => e.inviteToken === token);
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

    let employee = null;
    if (db) {
      const found = await db
        .select()
        .from(employees)
        .where(eq(employees.inviteToken, token))
        .limit(1);
      if (found.length > 0) {
        employee = found[0];
      }
    }

    if (!employee && global.fallbackEmployeesStore) {
      employee = global.fallbackEmployeesStore.find((e) => e.inviteToken === token);
    }

    if (!employee) {
      return NextResponse.json(
        { error: "Invalid or expired invitation link." },
        { status: 404 }
      );
    }

    // Update employee status to active and save profile
    if (db) {
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
    }

    if (global.fallbackEmployeesStore) {
      const idx = global.fallbackEmployeesStore.findIndex((e) => e.id === employee.id);
      if (idx !== -1) {
        global.fallbackEmployeesStore[idx] = {
          ...global.fallbackEmployeesStore[idx],
          name: cleanName,
          username: cleanUsername,
          password: password,
          status: "active",
          inviteToken: null,
          updatedAt: new Date(),
        };
      }
    }

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
