import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { employees, Employee } from "@/lib/db/schema";
import { setEmployeeSession } from "@/lib/auth";
import { sanitizeSlug } from "@/lib/utils";
import { generateOtp, createOtpChallenge, verifyOtpChallenge, sendOtpEmail } from "@/lib/email";
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
export const revalidate = 0;

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Invite token is missing" }, { status: 400, headers: noCacheHeaders });
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
        { status: 404, headers: noCacheHeaders }
      );
    }

    return NextResponse.json({
      valid: true,
      email: employee.email,
      role: employee.role,
    }, { headers: noCacheHeaders });
  } catch (err) {
    console.error("Validate invite error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: noCacheHeaders });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, token, name, username, password, code, challengeToken } = body;

    if (!token) {
      return NextResponse.json({ error: "Invite token is required" }, { status: 400, headers: noCacheHeaders });
    }

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
        { status: 404, headers: noCacheHeaders }
      );
    }

    // Sub-action 1: Send OTP code to employee work email
    if (action === "send_code") {
      const cleanName = (name || "").trim();
      const cleanUsername = sanitizeSlug(username || "");

      if (!cleanName || !cleanUsername) {
        return NextResponse.json(
          { error: "Please enter your full name and choose a username" },
          { status: 400, headers: noCacheHeaders }
        );
      }

      const otp = generateOtp();
      const newChallenge = createOtpChallenge(employee.email, otp, cleanUsername);
      const emailResult = await sendOtpEmail(employee.email, otp);

      const isDev = process.env.NODE_ENV !== "production";
      return NextResponse.json({
        success: true,
        message: `6-digit verification code sent to ${employee.email}`,
        challengeToken: newChallenge,
        ...(isDev && emailResult.devCode ? { devCode: emailResult.devCode } : {}),
      }, { headers: noCacheHeaders });
    }

    // Sub-action 2: Verify OTP code
    if (action === "verify_code") {
      if (!code || code.length < 6) {
        return NextResponse.json(
          { error: "Please enter the 6-digit verification code" },
          { status: 400, headers: noCacheHeaders }
        );
      }

      const verification = verifyOtpChallenge(employee.email, code, challengeToken);
      if (!verification.valid) {
        return NextResponse.json(
          { error: verification.message || "Invalid or expired verification code" },
          { status: 400, headers: noCacheHeaders }
        );
      }

      return NextResponse.json({
        success: true,
        verified: true,
      }, { headers: noCacheHeaders });
    }

    // Sub-action 3: Complete setup & set password
    const cleanName = (name || employee.name || "").trim();
    const cleanUsername = sanitizeSlug(username || employee.username || "");

    if (!cleanName || !cleanUsername || !password || password.length < 6) {
      return NextResponse.json(
        { error: "Full Name, Username, and Password (min 6 chars) are required" },
        { status: 400, headers: noCacheHeaders }
      );
    }

    const { hashPassword } = await import("@/lib/userStore");
    const hashedPassword = hashPassword(password);

    // Update in Turso
    if (isTursoEnabled) {
      try {
        await tursoUpdateEmployee(employee.id, {
          name: cleanName,
          username: cleanUsername,
          password: hashedPassword,
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
            password: hashedPassword,
            status: "active",
            inviteToken: null,
            updatedAt: new Date(),
          })
          .where(eq(employees.id, employee.id));
      } catch (dbErr) {
        console.warn("DB update error in join POST:", dbErr);
      }
    }

    // Update in shared store
    updateSharedEmployee(employee.id, {
      name: cleanName,
      username: cleanUsername,
      password: hashedPassword,
      status: "active",
      inviteToken: null,
    });

    let perms = ["view_insights"];
    try {
      const parsed = JSON.parse(employee.permissions || "[]");
      if (Array.isArray(parsed) && parsed.length > 0) perms = parsed;
    } catch {}

    const employeeSession = {
      id: employee.id,
      name: cleanName,
      email: employee.email,
      role: employee.role,
      permissions: perms,
    };

    await setEmployeeSession(employeeSession);

    return NextResponse.json({
      success: true,
      employee: employeeSession,
    }, { headers: noCacheHeaders });
  } catch (err) {
    console.error("Employee join error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: noCacheHeaders });
  }
}
