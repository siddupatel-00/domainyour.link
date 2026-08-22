import { cookies } from "next/headers";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_JWT_SECRET || "permanentlink-dev-secret-key-32chars!";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const CEO_PASSWORD = process.env.CEO_PASSWORD || "ceo123456";
const COOKIE_NAME = "permanentlink_session";
const CEO_COOKIE_NAME = "permanentlink_ceo_session";
const EMPLOYEE_COOKIE_NAME = "permanentlink_employee_session";

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

export function verifyAdminPassword(password: string): boolean {
  return password === ADMIN_PASSWORD;
}

export function checkAdminPassword(password: string): boolean {
  return password === ADMIN_PASSWORD;
}

export function verifyCeoPassword(password: string): boolean {
  return password === CEO_PASSWORD;
}

// Minimalistic Base64URL-encoded HMAC-SHA256 Token (Edge / Node.js compatible)
export function createSessionToken(payload: { username: string; email?: string } | string, maybeEmail?: string): string {
  const finalPayload = typeof payload === "string"
    ? { username: payload, email: maybeEmail, role: "admin" }
    : { ...payload, role: "admin" };

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

export function verifySessionToken(token: string): { username: string; email?: string; role?: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [header, body, signature] = parts;
    const expectedSignature = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${header}.${body}`)
      .digest("base64url");

    if (signature !== expectedSignature) return null;

    const decoded = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return { username: decoded.username, email: decoded.email, role: decoded.role || "admin" };
  } catch {
    return null;
  }
}

export async function setAdminSession(username: string, email?: string): Promise<void> {
  const token = createSessionToken({ username, email });
  const cookieStore = await cookies();
  cookieStore.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    maxAge: 0,
    path: "/",
  });
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySessionToken(token) !== null;
}

export async function getSessionUser(): Promise<{ username: string; email?: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

// CEO Master Authentication Helpers
export function createCeoSessionToken(): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(
    JSON.stringify({
      role: "ceo",
      master: true,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days master session
    })
  ).toString("base64url");

  const signature = crypto
    .createHmac("sha256", JWT_SECRET + "-ceo-master")
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
      .createHmac("sha256", JWT_SECRET + "-ceo-master")
      .update(`${header}.${body}`)
      .digest("base64url");

    if (signature !== expectedSignature) return false;

    const decoded = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      return false;
    }

    return decoded.role === "ceo" && decoded.master === true;
  } catch {
    return false;
  }
}

export async function isCeoAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CEO_COOKIE_NAME)?.value;
  if (!token) return false;
  return verifyCeoSessionToken(token);
}

// Employee Authentication Helpers
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
      type: "employee",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days employee session
    })
  ).toString("base64url");

  const signature = crypto
    .createHmac("sha256", JWT_SECRET + "-employee-secret")
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
      .createHmac("sha256", JWT_SECRET + "-employee-secret")
      .update(`${header}.${body}`)
      .digest("base64url");

    if (signature !== expectedSignature) return null;

    const decoded = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    if (decoded.type !== "employee") return null;

    return {
      id: decoded.id,
      name: decoded.name,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions || [],
    };
  } catch {
    return null;
  }
}

export async function setEmployeeSession(employee: EmployeeSessionPayload): Promise<void> {
  const token = createEmployeeSessionToken(employee);
  const cookieStore = await cookies();
  cookieStore.set({
    name: EMPLOYEE_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function clearEmployeeSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set({
    name: EMPLOYEE_COOKIE_NAME,
    value: "",
    httpOnly: true,
    maxAge: 0,
    path: "/",
  });
}

export async function getEmployeeSession(): Promise<EmployeeSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(EMPLOYEE_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyEmployeeSessionToken(token);
}

export async function isEmployeeAuthenticated(): Promise<boolean> {
  const session = await getEmployeeSession();
  return session !== null;
}

export { COOKIE_NAME, CEO_COOKIE_NAME, EMPLOYEE_COOKIE_NAME };
