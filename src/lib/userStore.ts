import { db } from "./db";
import { users, User, NewUser } from "./db/schema";
import { eq, or } from "drizzle-orm";
import crypto from "crypto";
import {
  isTursoEnabled,
  tursoFindUser,
  tursoCreateOrUpdateUser,
} from "./tursoDb";

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export function verifyPasswordHash(password: string, hash?: string | null): boolean {
  if (!hash) return false;
  // If plain text was stored or sha256
  return hash === password || hash === hashPassword(password);
}

// In-memory fallback user store for local dev
declare global {
  // eslint-disable-next-line no-var
  var fallbackUsersStore: User[] | undefined;
}

if (!global.fallbackUsersStore) {
  global.fallbackUsersStore = [];
}

let nextUserId = 1;

export async function findUserByEmailOrUsername(identifier: string): Promise<User | null> {
  const clean = identifier.trim().toLowerCase();

  // Try Turso first if configured
  if (isTursoEnabled) {
    try {
      const tursoUser = await tursoFindUser(clean);
      if (tursoUser) return tursoUser;
    } catch {}
  }

  // Try PostgreSQL / Neon if configured
  try {
    if (db) {
      const records = await db
        .select()
        .from(users)
        .where(or(eq(users.email, clean), eq(users.username, clean)))
        .limit(1);

      if (records.length > 0) return records[0];
    }
  } catch {}

  // Fallback memory store
  const local = (global.fallbackUsersStore || []).find(
    (u) => u.email.toLowerCase() === clean || u.username.toLowerCase() === clean
  );
  return local || null;
}

export async function createOrUpdateUser(
  username: string,
  email: string,
  plainPassword?: string
): Promise<User> {
  const cleanUsername = username.trim().toLowerCase();
  const cleanEmail = email.trim().toLowerCase();
  const hashedPassword = plainPassword ? hashPassword(plainPassword) : undefined;

  // Try Turso first if configured
  if (isTursoEnabled) {
    try {
      return await tursoCreateOrUpdateUser(cleanUsername, cleanEmail, hashedPassword);
    } catch {}
  }

  // Try PostgreSQL / Neon if configured
  try {
    if (db) {
      const existing = await findUserByEmailOrUsername(cleanEmail);
      if (existing) {
        const [updated] = await db
          .update(users)
          .set({
            username: cleanUsername,
            password: hashedPassword ?? existing.password,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existing.id))
          .returning();
        return updated;
      } else {
        const [created] = await db
          .insert(users)
          .values({
            username: cleanUsername,
            email: cleanEmail,
            password: hashedPassword,
          })
          .returning();
        return created;
      }
    }
  } catch {}

  // Fallback memory store
  const existingIdx = (global.fallbackUsersStore || []).findIndex(
    (u) => u.email.toLowerCase() === cleanEmail || u.username.toLowerCase() === cleanUsername
  );

  if (existingIdx >= 0 && global.fallbackUsersStore) {
    const existing = global.fallbackUsersStore[existingIdx];
    const updated: User = {
      ...existing,
      username: cleanUsername,
      password: hashedPassword ?? existing.password,
      updatedAt: new Date(),
    };
    global.fallbackUsersStore[existingIdx] = updated;
    return updated;
  } else {
    const created: User = {
      id: nextUserId++,
      username: cleanUsername,
      email: cleanEmail,
      password: hashedPassword ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    if (!global.fallbackUsersStore) global.fallbackUsersStore = [];
    global.fallbackUsersStore.push(created);
    return created;
  }
}
