import { cookies } from "next/headers";
import crypto from "crypto";
import { db } from "@/lib/db";
import { employees } from "@/lib/db/schema";
import {
  isTursoEnabled,
  tursoFindEmployeeById,
  tursoFindEmployeeByEmailOrUsername,
} from "@/lib/tursoDb";
import { findSharedEmployeeByEmailOrUser } from "@/lib/employeeStore";
import { eq, or } from "drizzle-orm";

// Enforce required environment variables
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}
const JWT_SECRET = process.env.JWT_SECRET;
if (!process.env.CEO_PASSWORD) {
  throw new Error("CEO_PASSWORD environment variable is required");
}
const CEO_PASSWORD = process.env.CEO_PASSWORD;
export const COOKIE_NAME = "permanentlink_session";
export const CEO_COOKIE_NAME = "permanentlink_ceo_session";
export const EMPLOYEE_COOKIE_NAME = "permanentlink_employee_session";

// In-memory OTP store for email logins (email -> { code, expiresAt })
const otpStore = new Map<string, { code: string; expiresAt: number }>();

export function generateOTP(email: string): string {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000;
  otpStore.set(email.toLowerCase(), { code, expiresAt });
  return code;
}

export function verifyOTP(email: string, code: string): boolean {
  const record = otpStore.get(email.toLowerCase());
  if (!record) return false;
  if (Date.now() > record.expiresAt) {
    otpStore.delete(email.toLowerCase());
    return false;
  }
  if (record.code === code.trim()) {
    otpStore.delete(email.toLowerCase());
    return true;
  }
  return false;
}

export function verifyCeoPassword(password: string): boolean {
  if (!password) return false;
  if (process.env.NODE_ENV === "production" && !process.env.CEO_PASSWORD) {
    console.error("⚠️ SECURITY ALERT: CEO_PASSWORD environment variable must be set in production!");
    return false;
  }
  const a = Buffer.from(password);
  const b = Buffer.from(CEO_PASSWORD);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// Minimalistic Base64URL-encoded HMAC-SHA256 Token (Edge / Node.js compatible)
export function createSessionToken(payload: { username: string; email?: string } | string, maybeEmail?: string): string {
  const finalPayload = typeof payload === "string"
    ? { username: payload, email: maybeEmail, role: "creator" }
    : { ...payload, role: "creator" };

  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(
    JSON.stringify({
      ...finalPayload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 days session
    })
  ).toString("base64url");

  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${body}`)
    .digest("base64url");

  return `${header}.${body}.${signature}`;
}

export function verifySessionToken(token: string): { username: string; email?: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [header, body, signature] = parts;
    const expectedSignature = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${header}.${body}`)
      .digest("base64url");

    if (signature !== expectedSignature) return null;

    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf-8"));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      username: payload.username || "creator",
      email: payload.email,
    };
  } catch {
    return null;
  }
}

// CEO Master Session Token
export function createCeoSessionToken(): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(
    JSON.stringify({
      role: "ceo_master",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days session
    })
  ).toString("base64url");

  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${body}`)
    .digest("base64url");

  return `${header}.${body}.${signature}`;
}

export function verifyCeoSessionToken(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;

    const [header, body, signature] = parts;
    const expectedSignature = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${header}.${body}`)
      .digest("base64url");

    if (signature !== expectedSignature) return false;

    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf-8"));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return false;
    }

    return payload.role === "ceo_master";
  } catch {
    return false;
  }
}

export async function setCeoSession() {
  const token = createCeoSessionToken();
  const cookieStore = await cookies();
  cookieStore.set(CEO_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

export async function clearCeoSession() {
  const cookieStore = await cookies();
  cookieStore.delete(CEO_COOKIE_NAME);
}

export async function isCeoAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(CEO_COOKIE_NAME);
  if (!sessionCookie?.value) return false;
  return verifyCeoSessionToken(sessionCookie.value);
}

// Employee Staff Session Token
export interface EmployeeSessionPayload {
  id: number;
  name: string;
  email: string;
  role: string;
  permissions: string[];
}

export function createEmployeeSessionToken(employee: EmployeeSessionPayload): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(
    JSON.stringify({
      ...employee,
      type: "employee_staff",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days session
    })
  ).toString("base64url");

  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${body}`)
    .digest("base64url");

  return `${header}.${body}.${signature}`;
}

export function verifyEmployeeSessionToken(token: string): EmployeeSessionPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [header, body, signature] = parts;
    const expectedSignature = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${header}.${body}`)
      .digest("base64url");

    if (signature !== expectedSignature) return null;

    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf-8"));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    if (payload.type !== "employee_staff") return null;

    return {
      id: payload.id,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      permissions: payload.permissions || ["view_insights"],
    };
  } catch {
    return null;
  }
}

export async function setEmployeeSession(employee: EmployeeSessionPayload) {
  const token = createEmployeeSessionToken(employee);
  const cookieStore = await cookies();
  cookieStore.set(EMPLOYEE_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

export async function clearEmployeeSession() {
  const cookieStore = await cookies();
  cookieStore.delete(EMPLOYEE_COOKIE_NAME);
}

export async function getEmployeeSession(): Promise<EmployeeSessionPayload | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(EMPLOYEE_COOKIE_NAME);
  if (!sessionCookie?.value) return null;

  const rawSession = verifyEmployeeSessionToken(sessionCookie.value);
  if (!rawSession) return null;

  // Real-time live check: Query database to ensure employee is still valid and not suspended or revoked
  try {
    let liveEmployee: any = null;

    // 1. Try Turso
    if (isTursoEnabled) {
      try {
        if (rawSession.id) {
          liveEmployee = await tursoFindEmployeeById(rawSession.id);
        }
        if (!liveEmployee && rawSession.email) {
          liveEmployee = await tursoFindEmployeeByEmailOrUsername(rawSession.email);
        }
      } catch (err) {
        console.warn("Turso live employee check error:", err);
      }
    }

    // 2. Try PostgreSQL / Neon
    if (!liveEmployee && db) {
      try {
        const found = await db
          .select()
          .from(employees)
          .where(or(eq(employees.id, rawSession.id), eq(employees.email, rawSession.email)))
          .limit(1);
        if (found.length > 0) liveEmployee = found[0];
      } catch {}
    }

    // 3. Try In-Memory Store
    if (!liveEmployee) {
      liveEmployee = findSharedEmployeeByEmailOrUser(rawSession.email) || null;
    }

    // If employee was deleted / revoked from the database, immediately reject
    if (!liveEmployee) {
      return null;
    }

    // If employee was suspended by CEO, immediately reject
    if (liveEmployee.status === "suspended" || liveEmployee.status === "revoked") {
      return null;
    }

    let perms: string[] = ["view_insights"];
    try {
      const parsed = JSON.parse(liveEmployee.permissions || "[]");
      if (Array.isArray(parsed) && parsed.length > 0) perms = parsed;
    } catch {}

    return {
      id: liveEmployee.id,
      name: liveEmployee.name || liveEmployee.email.split("@")[0],
      email: liveEmployee.email,
      role: liveEmployee.role,
      permissions: perms,
    };
  } catch {
    return rawSession;
  }
}

// User / Creator Cookie Session
export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(COOKIE_NAME);
  if (!sessionCookie?.value) return false;
  return verifySessionToken(sessionCookie.value) !== null;
}

export async function getSessionUser(): Promise<{ username: string; email?: string } | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(COOKIE_NAME);
  if (!sessionCookie?.value) return null;
  return verifySessionToken(sessionCookie.value);
}

export async function setAdminSession(username: string = "creator", email?: string) {
  const token = createSessionToken(username, email);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
