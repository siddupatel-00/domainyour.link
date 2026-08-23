import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { employees, Employee } from "@/lib/db/schema";
import { isCeoAuthenticated } from "@/lib/auth";
import { sendEmployeeInviteEmail } from "@/lib/email";
import {
  getSharedEmployees,
  addSharedEmployee,
  findSharedEmployeeByEmailOrUser,
} from "@/lib/employeeStore";
import { desc, eq } from "drizzle-orm";
import crypto from "crypto";

export const dynamic = "force-dynamic";

let nextEmployeeId = 100;

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

// GET /api/ceo/employees - List employees
export async function GET() {
  const authed = await isCeoAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized: CEO Master Access Required" }, { status: 401, headers: noCacheHeaders });
  }

  try {
    const list = await db.select().from(employees).orderBy(desc(employees.createdAt));
    return NextResponse.json({ employees: list }, { headers: noCacheHeaders });
  } catch (error) {
    console.warn("Using shared fallback for employees:", error);
    return NextResponse.json({ employees: getSharedEmployees() }, { headers: noCacheHeaders });
  }
}

// POST /api/ceo/employees - Invite employee by email
export async function POST(request: NextRequest) {
  const authed = await isCeoAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized: CEO Master Access Required" }, { status: 401, headers: noCacheHeaders });
  }

  try {
    const body = await request.json();
    const { email, role } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Please enter a valid work email address" },
        { status: 400, headers: noCacheHeaders }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const employeeRole = role?.trim() || "Insights Viewer";
    const inviteToken = crypto.randomBytes(24).toString("hex");

    const origin = request.nextUrl.origin || "http://localhost:3000";
    const inviteLink = `${origin}/staff/join?token=${inviteToken}`;

    try {
      const existing = await db
        .select({ id: employees.id, status: employees.status })
        .from(employees)
        .where(eq(employees.email, cleanEmail))
        .limit(1);

      if (existing.length > 0) {
        return NextResponse.json(
          { error: `An employee with email "${cleanEmail}" is already added or invited.` },
          { status: 409, headers: noCacheHeaders }
        );
      }

      const [newRecord] = await db
        .insert(employees)
        .values({
          name: "",
          email: cleanEmail,
          role: employeeRole,
          status: "invited",
          inviteToken,
          permissions: JSON.stringify(["view_insights"]),
        })
        .returning();

      // Also mirror to shared in-memory store
      addSharedEmployee(newRecord);

      // Send the email automatically
      await sendEmployeeInviteEmail(cleanEmail, employeeRole, inviteLink);

      return NextResponse.json(
        { success: true, employee: newRecord, inviteLink },
        { status: 201, headers: noCacheHeaders }
      );
    } catch {
      // Fallback in-memory
      const exists = findSharedEmployeeByEmailOrUser(cleanEmail);
      if (exists) {
        return NextResponse.json(
          { error: `An employee with email "${cleanEmail}" is already added or invited.` },
          { status: 409, headers: noCacheHeaders }
        );
      }

      const newRecord: Employee = {
        id: nextEmployeeId++,
        name: "",
        email: cleanEmail,
        username: null,
        password: null,
        role: employeeRole,
        status: "invited",
        inviteToken,
        permissions: JSON.stringify(["view_insights"]),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      addSharedEmployee(newRecord);

      await sendEmployeeInviteEmail(cleanEmail, employeeRole, inviteLink);

      return NextResponse.json(
        { success: true, employee: newRecord, inviteLink },
        { status: 201, headers: noCacheHeaders }
      );
    }
  } catch (error) {
    console.error("Invite employee error:", error);
    return NextResponse.json(
      { error: "Failed to send employee invite" },
      { status: 500, headers: noCacheHeaders }
    );
  }
}
