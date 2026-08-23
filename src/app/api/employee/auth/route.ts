import { NextRequest, NextResponse } from "next/server";
import {
  setEmployeeSession,
  clearEmployeeSession,
  getEmployeeSession,
} from "@/lib/auth";
import { generateOtp, storeOtp, verifyOtp, sendOtpEmail } from "@/lib/email";
import { db } from "@/lib/db";
import { employees, Employee } from "@/lib/db/schema";
import {
  findSharedEmployeeByEmailOrUser,
} from "@/lib/employeeStore";
import {
  isTursoEnabled,
  tursoFindEmployeeByEmailOrUsername,
} from "@/lib/tursoDb";
import { eq, or } from "drizzle-orm";

export const dynamic = "force-dynamic";

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
    const { action, email, identifier, password, code } = body;

    // Action A: Password Login with Username or Work Email
    if (action === "password" || (identifier && password)) {
      const cleanIdent = (identifier || email || "").trim().toLowerCase();

      if (!cleanIdent || !password) {
        return NextResponse.json(
          { error: "Please enter your username/email and password" },
          { status: 400 }
        );
      }

      let targetEmployee: Employee | null = null;

      // 1. Try Turso
      if (isTursoEnabled) {
        try {
          targetEmployee = await tursoFindEmployeeByEmailOrUsername(cleanIdent);
        } catch (err) {
          console.warn("Turso query error in employee auth:", err);
        }
      }

      // 2. Try PostgreSQL / Neon
      if (!targetEmployee && db) {
        try {
          const found = await db
            .select()
            .from(employees)
            .where(or(eq(employees.email, cleanIdent), eq(employees.username, cleanIdent)))
            .limit(1);
          if (found.length > 0) {
            targetEmployee = found[0];
          }
        } catch {}
      }

      // 3. Try In-Memory Store
      if (!targetEmployee) {
        targetEmployee = findSharedEmployeeByEmailOrUser(cleanIdent) || null;
      }

      if (!targetEmployee) {
        return NextResponse.json(
          { error: "Invalid username or password" },
          { status: 401 }
        );
      }

      if (targetEmployee.status === "suspended") {
        return NextResponse.json(
          { error: "Your employee account has been suspended. Please contact your CEO." },
          { status: 403 }
        );
      }

      if (targetEmployee.status === "invited" && !targetEmployee.password) {
        return NextResponse.json(
          { error: "Account setup not completed. Please use the invitation link sent to your email to set your password." },
          { status: 403 }
        );
      }

      if (!targetEmployee.password || targetEmployee.password !== password) {
        return NextResponse.json(
          { error: "Invalid username or password" },
          { status: 401 }
        );
      }

      let perms: string[] = ["view_insights"];
      try {
        const parsed = JSON.parse(targetEmployee.permissions || "[]");
        if (Array.isArray(parsed) && parsed.length > 0) perms = parsed;
      } catch {}

      const employeePayload = {
        id: targetEmployee.id,
        name: targetEmployee.name || targetEmployee.email.split("@")[0],
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

    // Action B: OTP fallback
    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Please enter a valid work email address" },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    let targetEmployee: Employee | null = null;

    if (isTursoEnabled) {
      try {
        targetEmployee = await tursoFindEmployeeByEmailOrUsername(cleanEmail);
      } catch {}
    }

    if (!targetEmployee && db) {
      try {
        const found = await db
          .select()
          .from(employees)
          .where(eq(employees.email, cleanEmail))
          .limit(1);
        if (found.length > 0) {
          targetEmployee = found[0];
        }
      } catch {}
    }

    if (!targetEmployee) {
      targetEmployee = findSharedEmployeeByEmailOrUser(cleanEmail) || null;
    }

    if (!targetEmployee) {
      return NextResponse.json(
        { error: "Work email not authorized. Please ask your CEO to invite you." },
        { status: 403 }
      );
    }

    if (targetEmployee.status === "suspended") {
      return NextResponse.json(
        { error: "Your employee account has been suspended. Please contact your CEO." },
        { status: 403 }
      );
    }

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
