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

      // Check if it's a previous username
      const { tursoFindUserByPreviousUsername } = await import("./tursoDb");
      const prevUser = await tursoFindUserByPreviousUsername(clean);
      if (prevUser) return prevUser;
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
  const local = (global.fallbackUsersStore || []).find((u) => {
    if (u.email.toLowerCase() === clean || u.username.toLowerCase() === clean) return true;
    if (u.bioCode && u.bioCode.toLowerCase() === clean) return true;
    try {
      const prevs: string[] = JSON.parse(u.previousUsernames || "[]");
      if (prevs.map((p) => p.toLowerCase()).includes(clean)) return true;
    } catch {}
    return false;
  });
  return local || null;
}

export async function findUserByBioCode(bioCode?: string | null): Promise<User | null> {
  if (!bioCode) return null;
  const clean = bioCode.trim().toLowerCase();
  if (!clean) return null;
  if (isTursoEnabled) {
    try {
      const { tursoFindUserByBioCode } = await import("./tursoDb");
      const u = await tursoFindUserByBioCode(clean);
      if (u) return u;
    } catch {}
  }

  const local = (global.fallbackUsersStore || []).find(
    (u) => (u.bioCode || "").toLowerCase() === clean
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
      bioCode: existing.bioCode || Math.random().toString(36).substring(2, 8).toLowerCase(),
      previousUsernames: existing.previousUsernames || "[]",
      updatedAt: new Date(),
    };
    global.fallbackUsersStore[existingIdx] = updated;
    return updated;
  } else {
    const bioCode = Math.random().toString(36).substring(2, 8).toLowerCase();
    const created: User = {
      id: nextUserId++,
      username: cleanUsername,
      email: cleanEmail,
      password: hashedPassword ?? null,
      avatar: null,
      bioCode,
      previousUsernames: "[]",
      recapPreference: "off",
      lastRecapSentAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    if (!global.fallbackUsersStore) global.fallbackUsersStore = [];
    global.fallbackUsersStore.push(created);
    return created;
  }
}

export async function updateUserAvatar(identifier: string, avatar: string | null): Promise<boolean> {
  const clean = identifier.trim().toLowerCase();

  // Try Turso first
  if (isTursoEnabled) {
    try {
      const ok = await (await import("./tursoDb")).tursoUpdateUserAvatar(clean, avatar);
      if (ok) return true;
    } catch {}
  }

  // Try PostgreSQL
  try {
    if (db) {
      await db
        .update(users)
        .set({ avatar, updatedAt: new Date() })
        .where(or(eq(users.email, clean), eq(users.username, clean)));
      return true;
    }
  } catch {}

  // Fallback memory store
  const user = (global.fallbackUsersStore || []).find(
    (u) => u.email.toLowerCase() === clean || u.username.toLowerCase() === clean
  );
  if (user) {
    user.avatar = avatar;
    user.updatedAt = new Date();
    return true;
  }
  return false;
}

export async function updateUsername(oldUsername: string, newUsername: string): Promise<boolean> {
  const oldU = oldUsername.trim().toLowerCase();
  const newU = newUsername.trim().toLowerCase();

  // Try Turso first
  if (isTursoEnabled) {
    try {
      const ok = await (await import("./tursoDb")).tursoUpdateUsername(oldU, newU);
      if (ok) return true;
    } catch {}
  }

  // Fallback memory store
  const user = (global.fallbackUsersStore || []).find(
    (u) => u.username.toLowerCase() === oldU
  );
  if (user) {
    let prevList: string[] = [];
    try {
      prevList = JSON.parse(user.previousUsernames || "[]");
    } catch {}
    if (!prevList.includes(oldU)) {
      prevList.push(oldU);
    }
    user.previousUsernames = JSON.stringify(prevList);
    user.username = newU;
    user.updatedAt = new Date();
    return true;
  }
  return true;
}

export async function deleteUserAccount(username: string): Promise<boolean> {
  const u = username.trim().toLowerCase();

  // Try Turso first
  if (isTursoEnabled) {
    try {
      const ok = await (await import("./tursoDb")).tursoDeleteUserAccount(u);
      if (ok) return true;
    } catch {}
  }

  // Fallback memory store
  if (global.fallbackUsersStore) {
    global.fallbackUsersStore = global.fallbackUsersStore.filter(
      (user) => user.username.toLowerCase() !== u
    );
  }
  return true;
}
