import { NextRequest, NextResponse } from "next/server";
import {
  setEmployeeSession,
  clearEmployeeSession,
  getEmployeeSession,
} from "@/lib/auth";
import { generateOtp, storeOtp, verifyOtp, sendOtpEmail } from "@/lib/email";
import { db } from "@/lib/db";
import { employees, Employee } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

declare global {
  // eslint-disable-next-line no-var
  var fallbackEmployeesStore: Employee[] | undefined;
}

export async function GET() {
  const session = await getEmployeeSession();
  return NextResponse.json(
    {
      authenticated: session !== null,
      employee: session,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, email, code } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Please enter a valid work email address" },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // Look up employee in database or local fallback
    let targetEmployee: Employee | null = null;
    try {
      if (db) {
        const found = await db
          .select()
          .from(employees)
          .where(eq(employees.email, cleanEmail))
          .limit(1);
        if (found.length > 0) {
          targetEmployee = found[0];
        }
      }
    } catch {
      // Fallback
    }

    if (!targetEmployee && global.fallbackEmployeesStore) {
      targetEmployee = global.fallbackEmployeesStore.find(
        (e) => e.email.toLowerCase() === cleanEmail
      ) || null;
    }

    // If still not found
    if (!targetEmployee) {
      return NextResponse.json(
        { error: "Work email not authorized. Please ask your CEO to invite you." },
        { status: 403 }
      );
    }

    // Check if account is suspended
    if (targetEmployee.status === "suspended") {
      return NextResponse.json(
        { error: "Your employee account has been suspended. Please contact your CEO." },
        { status: 403 }
      );
    }

    // Action 1: Send 6-digit OTP code to employee work email
    if (action === "send_code") {
      const otp = generateOtp();
      storeOtp(cleanEmail, otp, targetEmployee.name || cleanEmail);
      const emailResult = await sendOtpEmail(cleanEmail, otp);

      return NextResponse.json({
        success: true,
        message: `6-digit security code sent to ${cleanEmail}`,
        devCode: emailResult.devCode,
      });
    }

    // Action 2: Verify code and sign into Employee Portal
    if (action === "verify_code" || code) {
      if (!code) {
        return NextResponse.json(
          { error: "Security code is required" },
          { status: 400 }
        );
      }

      const verification = verifyOtp(cleanEmail, code);
      if (!verification.valid) {
        return NextResponse.json(
          { error: verification.message || "Invalid or expired security code" },
          { status: 400 }
        );
      }

      let perms: string[] = ["view_insights"];
      try {
        const parsed = JSON.parse(targetEmployee.permissions || "[]");
        if (Array.isArray(parsed) && parsed.length > 0) perms = parsed;
      } catch {}

      const employeePayload = {
        id: targetEmployee.id,
        name: targetEmployee.name || cleanEmail.split("@")[0],
        email: targetEmployee.email,
        role: targetEmployee.role,
        permissions: perms,
      };

      await setEmployeeSession(employeePayload);

      return NextResponse.json({
        success: true,
        employee: employeePayload,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("Employee auth error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE() {
  await clearEmployeeSession();
  return NextResponse.json({ success: true });
}
