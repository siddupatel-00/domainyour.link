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
  updateSharedEmployee,
} from "@/lib/employeeStore";
import {
  isTursoEnabled,
  tursoFindEmployeeByEmailOrUsername,
  tursoUpdateEmployee,
} from "@/lib/tursoDb";
import { eq, or } from "drizzle-orm";

export const dynamic = "force-dynamic";

function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  if (!domain) return email;
  const visible = name.slice(0, Math.min(3, name.length));
  return `${visible}***@${domain}`;
}

async function findEmployee(identifier: string): Promise<Employee | null> {
  const clean = identifier.trim().toLowerCase();
  if (!clean) return null;

  // 1. Try Turso
  if (isTursoEnabled) {
    try {
      const emp = await tursoFindEmployeeByEmailOrUsername(clean);
      if (emp) return emp;
    } catch (err) {
      console.warn("Turso query error in findEmployee:", err);
    }
  }

  // 2. Try PostgreSQL / Neon
  if (db) {
    try {
      const found = await db
        .select()
        .from(employees)
        .where(or(eq(employees.email, clean), eq(employees.username, clean)))
        .limit(1);
      if (found.length > 0) return found[0];
    } catch {}
  }

  // 3. Try In-Memory Store
  return findSharedEmployeeByEmailOrUser(clean) || null;
}

export async function GET() {
  const session = await getEmployeeSession();
  if (!session) {
    await clearEmployeeSession();
  }
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

    // Action 1: Forgot Password - Step 1: Send OTP Code
    if (action === "forgot_send_code") {
      const cleanIdent = (identifier || email || "").trim().toLowerCase();
      if (!cleanIdent) {
        return NextResponse.json(
          { error: "Please enter your username or work email" },
          { status: 400 }
        );
      }

      const targetEmployee = await findEmployee(cleanIdent);
      if (!targetEmployee) {
        return NextResponse.json(
          { error: "No staff account found with this username or work email." },
          { status: 404 }
        );
      }

      if (targetEmployee.status === "suspended") {
        return NextResponse.json(
          { error: "Your employee account has been suspended. Please contact your CEO." },
          { status: 403 }
        );
      }

      const otp = generateOtp();
      storeOtp(targetEmployee.email, otp, targetEmployee.name || targetEmployee.email);
      const emailResult = await sendOtpEmail(targetEmployee.email, otp);

      const isDev = process.env.NODE_ENV !== "production";
      return NextResponse.json({
        success: true,
        email: targetEmployee.email,
        maskedEmail: maskEmail(targetEmployee.email),
        message: `6-digit security code sent to ${maskEmail(targetEmployee.email)}`,
        ...(isDev && emailResult.devCode ? { devCode: emailResult.devCode } : {}),
      });
    }

    // Action 2: Forgot Password - Step 2: Verify Code
    if (action === "forgot_verify_code") {
      const cleanEmail = (email || identifier || "").trim().toLowerCase();
      if (!cleanEmail || !code) {
        return NextResponse.json(
          { error: "Email and 6-digit security code are required" },
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

      return NextResponse.json({
        success: true,
        verified: true,
      });
    }

    // Action 3: Forgot Password - Step 3: Reset Password
    if (action === "forgot_reset_password") {
      const cleanEmail = (email || identifier || "").trim().toLowerCase();
      if (!cleanEmail || !password) {
        return NextResponse.json(
          { error: "Email and new password are required" },
          { status: 400 }
        );
      }

      if (password.length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters long" },
          { status: 400 }
        );
      }

      // Verify OTP code
      if (code) {
        const verification = verifyOtp(cleanEmail, code);
        if (!verification.valid) {
          return NextResponse.json(
            { error: verification.message || "Invalid or expired security code" },
            { status: 400 }
          );
        }
      }

      const targetEmployee = await findEmployee(cleanEmail);
      if (!targetEmployee) {
        return NextResponse.json(
          { error: "Employee account not found" },
          { status: 404 }
        );
      }

      const { hashPassword } = await import("@/lib/userStore");
      const hashedPassword = hashPassword(password);

      // Update password in Turso
      if (isTursoEnabled) {
        try {
          await tursoUpdateEmployee(targetEmployee.id, {
            password: hashedPassword,
            status: targetEmployee.status === "invited" ? "active" : targetEmployee.status,
          });
        } catch (err) {
          console.warn("Turso update employee password error:", err);
        }
      }

      // Update in PostgreSQL if enabled
      if (db) {
        try {
          await db
            .update(employees)
            .set({
              password: hashedPassword,
              status: targetEmployee.status === "invited" ? "active" : targetEmployee.status,
              updatedAt: new Date(),
            })
            .where(eq(employees.id, targetEmployee.id));
        } catch {}
      }

      // Update in-memory store
      updateSharedEmployee(targetEmployee.id, {
        password: hashedPassword,
        status: targetEmployee.status === "invited" ? "active" : targetEmployee.status,
      });

      // Automatically sign in the employee
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
        message: "Password reset successfully! Logged into staff workspace.",
        employee: employeePayload,
      });
    }

    // Action A: Password Login with Username or Work Email
    if (action === "password" || (identifier && password)) {
      const cleanIdent = (identifier || email || "").trim().toLowerCase();

      if (!cleanIdent || !password) {
        return NextResponse.json(
          { error: "Please enter your username/email and password" },
          { status: 400 }
        );
      }

      const targetEmployee = await findEmployee(cleanIdent);

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

      const { verifyPasswordHash } = await import("@/lib/userStore");
      if (!targetEmployee.password || !verifyPasswordHash(password, targetEmployee.password)) {
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
    const targetEmployee = await findEmployee(cleanEmail);

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

      const isDev = process.env.NODE_ENV !== "production";
      return NextResponse.json({
        success: true,
        message: `6-digit security code sent to ${cleanEmail}`,
        ...(isDev && emailResult.devCode ? { devCode: emailResult.devCode } : {}),
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
