import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const ADMIN_COOKIE_NAME = "permanentlink_session";
const JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.ADMIN_PASSWORD || "fallback-secret-key-change-me-32-chars-long";
const encodedSecret = new TextEncoder().encode(JWT_SECRET.padEnd(32, "#"));

export interface SessionData {
  role: string;
  username?: string;
  email?: string;
}

export async function createSessionToken(username?: string, email?: string): Promise<string> {
  return await new SignJWT({
    role: "admin",
    username: username || "admin",
    email: email || "",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(encodedSecret);
}

export async function verifySessionToken(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, encodedSecret);
    if (payload.role === "admin") {
      return {
        role: String(payload.role),
        username: payload.username ? String(payload.username) : undefined,
        email: payload.email ? String(payload.email) : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function setAdminSession(username?: string, email?: string) {
  const token = await createSessionToken(username, email);
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
}

export async function getSessionUser(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!sessionToken) return null;
  return await verifySessionToken(sessionToken);
}

export async function isAuthenticated(): Promise<boolean> {
  const user = await getSessionUser();
  return user !== null;
}

export function checkAdminPassword(password: string): boolean {
  const correctPassword = process.env.ADMIN_PASSWORD;
  if (!correctPassword) {
    return false;
  }
  return password === correctPassword;
}
