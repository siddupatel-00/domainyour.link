import { createClient } from "@libsql/client";
import { Redirect, Bio, Employee, User, LinkGroup } from "./db/schema";

const tursoUrl =
  process.env.TURSO_DATABASE_URL ||
  (process.env.DATABASE_URL?.startsWith("libsql://") ? process.env.DATABASE_URL : "") ||
  "libsql://domainyourlink-siddu.aws-ap-south-1.turso.io";

const tursoToken = process.env.TURSO_AUTH_TOKEN || "";

export const turso = createClient({
  url: tursoUrl,
  authToken: tursoToken,
});

export const isTursoEnabled = Boolean(tursoUrl && tursoToken);

// ==========================================
// 1. REDIRECTS (Links & Sublinks)
// ==========================================

let hasEnsuredRedirectTitle = false;
let hasEnsuredUsedCodesAndRedirectCode = false;
const fallbackUsedCodes = new Set<string>();
const fallbackRedirectsList: Redirect[] = [];

export async function ensureUsedCodesAndRedirectCodeColumns() {
  // Schema is permanently migrated in Turso. No runtime DDL checks needed.
  return;
}

export async function ensureRedirectTitleColumn() {
  return;
}

export async function tursoGenerateUniqueCode(type: 'link' | 'bio' | 'group', username?: string): Promise<string> {
  await ensureUsedCodesAndRedirectCodeColumns();
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";

  if (!isTursoEnabled) {
    while (true) {
      let candidate = "";
      for (let i = 0; i < 6; i++) {
        candidate += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      if (!fallbackUsedCodes.has(candidate)) {
        fallbackUsedCodes.add(candidate);
        return candidate;
      }
    }
  }

  while (true) {
    let candidate = "";
    for (let i = 0; i < 6; i++) {
      candidate += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const check = await turso.execute({
      sql: `SELECT code FROM used_codes WHERE LOWER(code) = ?;`,
      args: [candidate],
    });
    if (check.rows.length === 0) {
      await turso.execute({
        sql: `INSERT INTO used_codes (code, type, username) VALUES (?, ?, ?);`,
        args: [candidate, type, username || null],
      });
      return candidate;
    }
  }
}

export async function tursoIsCodeUsed(code: string): Promise<boolean> {
  await ensureUsedCodesAndRedirectCodeColumns();
  const clean = code.trim().toLowerCase();
  if (!isTursoEnabled) {
    return fallbackUsedCodes.has(clean);
  }
  const check = await turso.execute({
    sql: `SELECT code FROM used_codes WHERE LOWER(code) = ?;`,
    args: [clean],
  });
  return check.rows.length > 0;
}

export async function tursoClaimCode(code: string, type: 'link' | 'bio' | 'group', username?: string): Promise<boolean> {
  await ensureUsedCodesAndRedirectCodeColumns();
  const clean = code.trim().toLowerCase();
  if (!isTursoEnabled) {
    fallbackUsedCodes.add(clean);
    return true;
  }
  try {
    await turso.execute({
      sql: `INSERT INTO used_codes (code, type, username) VALUES (?, ?, ?);`,
      args: [clean, type, username || null],
    });
    return true;
  } catch {
    return false;
  }
}

export async function tursoFindRedirectByCode(code: string): Promise<Redirect | null> {
  await ensureUsedCodesAndRedirectCodeColumns();
  const clean = code.trim().toLowerCase();
  if (!isTursoEnabled) {
    return fallbackRedirectsList.find((r) => (r.code || "").toLowerCase() === clean) || null;
  }
  const result = await turso.execute({
    sql: `SELECT * FROM redirects WHERE LOWER(code) = ? LIMIT 1;`,
    args: [clean],
  });

  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: Number(row.id),
    username: String(row.username),
    webname: String(row.webname),
    title: row.title ? String(row.title) : String(row.webname),
    destinationUrl: String(row.destination_url),
    redirectCode: Number(row.redirect_code || 307),
    code: row.code ? String(row.code) : clean,
    clickCount: Number(row.click_count || 0),
    expiredClickCount: Number(row.expired_click_count || 0),
    expiresAt: row.expires_at ? new Date(String(row.expires_at)) : null,
    parentId: row.parent_id !== null && row.parent_id !== undefined ? Number(row.parent_id) : null,
    showOnProfile: Boolean(row.show_on_profile),
    createdAt: new Date(String(row.created_at || Date.now())),
    updatedAt: new Date(String(row.updated_at || Date.now())),
  };
}

export async function tursoGetRedirects(username: string): Promise<Redirect[]> {
  await ensureUsedCodesAndRedirectCodeColumns();
  const result = await turso.execute({
    sql: `SELECT * FROM redirects WHERE LOWER(username) = LOWER(?) ORDER BY id DESC;`,
    args: [username],
  });

  return result.rows.map((row) => ({
    id: Number(row.id),
    username: String(row.username),
    webname: String(row.webname),
    title: row.title ? String(row.title) : String(row.webname),
    destinationUrl: String(row.destination_url),
    redirectCode: Number(row.redirect_code || 307),
    code: row.code ? String(row.code) : null,
    clickCount: Number(row.click_count || 0),
    expiredClickCount: Number(row.expired_click_count || 0),
    expiresAt: row.expires_at ? new Date(String(row.expires_at)) : null,
    parentId: row.parent_id !== null && row.parent_id !== undefined ? Number(row.parent_id) : null,
    showOnProfile: Boolean(row.show_on_profile),
    createdAt: new Date(String(row.created_at || Date.now())),
    updatedAt: new Date(String(row.updated_at || Date.now())),
  }));
}

export function parseTimeframeDates(
  timeframe?: string | null,
  customStart?: string | null,
  customEnd?: string | null
): { startDate: Date | null; endDate: Date } {
  const now = new Date();
  let startDate: Date | null = null;
  let endDate: Date = now;

  if (!timeframe || timeframe === "all") {
    return { startDate: null, endDate: now };
  }

  switch (timeframe) {
    case "24h":
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case "7d":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "14d":
      startDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      break;
    case "this_month":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      break;
    case "last_month":
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;
    case "custom":
      startDate = customStart ? new Date(customStart) : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      if (customEnd) endDate = new Date(new Date(customEnd).setHours(23, 59, 59, 999));
      break;
    default:
      startDate = null;
  }

  return { startDate, endDate };
}

export async function tursoGetRedirectsWithTimeframe(
  username: string,
  startDate?: Date | null,
  endDate?: Date | null
): Promise<Redirect[]> {
  const redirects = await tursoGetRedirects(username);
  if (!startDate || redirects.length === 0) return redirects;

  const startIso = startDate.toISOString();
  const endIso = (endDate || new Date()).toISOString();
  const redirectIds = redirects.map((r) => r.id);
  const placeholders = redirectIds.map(() => "?").join(", ");

  try {
    const result = await turso.execute({
      sql: `SELECT redirect_id, COUNT(*) as count
            FROM click_events
            WHERE redirect_id IN (${placeholders})
              AND datetime(created_at) >= datetime(?)
              AND datetime(created_at) <= datetime(?)
            GROUP BY redirect_id;`,
      args: [...redirectIds, startIso, endIso],
    });

    const countMap: Record<number, number> = {};
    for (const row of result.rows) {
      countMap[Number(row.redirect_id)] = Number(row.count || 0);
    }

    return redirects.map((r) => ({
      ...r,
      clickCount: countMap[r.id] ?? 0,
    }));
  } catch (err) {
    try {
      const fallbackResult = await turso.execute({
        sql: `SELECT redirect_id, COUNT(*) as count
              FROM click_events
              WHERE redirect_id IN (${placeholders})
                AND created_at >= ?
                AND created_at <= ?
              GROUP BY redirect_id;`,
        args: [...redirectIds, startIso.slice(0, 19).replace("T", " "), endIso.slice(0, 19).replace("T", " ")],
      });

      const countMap: Record<number, number> = {};
      for (const row of fallbackResult.rows) {
        countMap[Number(row.redirect_id)] = Number(row.count || 0);
      }

      return redirects.map((r) => ({
        ...r,
        clickCount: countMap[r.id] ?? 0,
      }));
    } catch {
      return redirects.map((r) => ({
        ...r,
        clickCount: 0,
      }));
    }
  }
}

export async function tursoGetClickEventsCountMap(
  startDate?: Date | null,
  endDate?: Date | null
): Promise<Record<number, number>> {
  if (!startDate) return {};

  const startIso = startDate.toISOString();
  const endIso = (endDate || new Date()).toISOString();
  const countMap: Record<number, number> = {};

  try {
    const result = await turso.execute({
      sql: `SELECT redirect_id, COUNT(*) as count
            FROM click_events
            WHERE datetime(created_at) >= datetime(?)
              AND datetime(created_at) <= datetime(?)
            GROUP BY redirect_id;`,
      args: [startIso, endIso],
    });

    for (const row of result.rows) {
      countMap[Number(row.redirect_id)] = Number(row.count || 0);
    }
    return countMap;
  } catch (err) {
    try {
      const fallbackResult = await turso.execute({
        sql: `SELECT redirect_id, COUNT(*) as count
              FROM click_events
              WHERE created_at >= ?
                AND created_at <= ?
              GROUP BY redirect_id;`,
        args: [
          startIso.slice(0, 19).replace("T", " "),
          endIso.slice(0, 19).replace("T", " "),
        ],
      });

      for (const row of fallbackResult.rows) {
        countMap[Number(row.redirect_id)] = Number(row.count || 0);
      }
      return countMap;
    } catch {
      return {};
    }
  }
}

export async function tursoGetAllRedirects(): Promise<Redirect[]> {
  await ensureUsedCodesAndRedirectCodeColumns();
  const result = await turso.execute({
    sql: `SELECT * FROM redirects ORDER BY click_count DESC, id DESC;`,
    args: [],
  });

  return result.rows.map((row) => ({
    id: Number(row.id),
    username: String(row.username),
    webname: String(row.webname),
    title: row.title ? String(row.title) : String(row.webname),
    destinationUrl: String(row.destination_url),
    redirectCode: Number(row.redirect_code || 307),
    code: row.code ? String(row.code) : null,
    clickCount: Number(row.click_count || 0),
    expiredClickCount: Number(row.expired_click_count || 0),
    expiresAt: row.expires_at ? new Date(String(row.expires_at)) : null,
    parentId: row.parent_id !== null && row.parent_id !== undefined ? Number(row.parent_id) : null,
    showOnProfile: Boolean(row.show_on_profile),
    createdAt: new Date(String(row.created_at || Date.now())),
    updatedAt: new Date(String(row.updated_at || Date.now())),
  }));
}

export async function tursoGetAllBios(): Promise<Bio[]> {
  const result = await turso.execute({
    sql: `SELECT * FROM bios ORDER BY id ASC;`,
    args: [],
  });

  return result.rows.map((row) => ({
    id: Number(row.id),
    username: String(row.username),
    bioname: String(row.bioname),
    title: row.title ? String(row.title) : null,
    description: row.description ? String(row.description) : null,
    linkIds: String(row.link_ids || "[]"),
    code: row.code ? String(row.code) : null,
    expiresAt: row.expires_at ? new Date(String(row.expires_at)) : null,
    createdAt: new Date(String(row.created_at || Date.now())),
    updatedAt: new Date(String(row.updated_at || Date.now())),
  }));
}

export async function tursoFindRedirect(username: string, webname: string): Promise<Redirect | null> {
  await ensureUsedCodesAndRedirectCodeColumns();
  const result = await turso.execute({
    sql: `SELECT * FROM redirects WHERE LOWER(username) = LOWER(?) AND LOWER(webname) = LOWER(?) LIMIT 1;`,
    args: [username, webname],
  });

  if (result.rows.length === 0) return null;
  const row = result.rows[0];

  return {
    id: Number(row.id),
    username: String(row.username),
    webname: String(row.webname),
    title: row.title ? String(row.title) : String(row.webname),
    destinationUrl: String(row.destination_url),
    redirectCode: Number(row.redirect_code || 307),
    code: row.code ? String(row.code) : null,
    clickCount: Number(row.click_count || 0),
    expiredClickCount: Number(row.expired_click_count || 0),
    expiresAt: row.expires_at ? new Date(String(row.expires_at)) : null,
    parentId: row.parent_id !== null && row.parent_id !== undefined ? Number(row.parent_id) : null,
    showOnProfile: Boolean(row.show_on_profile),
    createdAt: new Date(String(row.created_at || Date.now())),
    updatedAt: new Date(String(row.updated_at || Date.now())),
  };
}

export async function tursoCreateRedirect(data: {
  username: string;
  webname: string;
  title?: string;
  destinationUrl: string;
  redirectCode?: number;
  code?: string;
  expiresAt?: Date | null;
  parentId?: number | null;
  showOnProfile?: boolean;
}): Promise<Redirect> {
  await ensureUsedCodesAndRedirectCodeColumns();
  const expiresStr = data.expiresAt ? data.expiresAt.toISOString() : null;

  let assignedCode = data.code ? data.code.trim().toLowerCase() : "";
  if (!assignedCode) {
    assignedCode = await tursoGenerateUniqueCode("link", data.username);
  } else {
    await tursoClaimCode(assignedCode, "link", data.username);
  }

  if (!isTursoEnabled) {
    const mock: Redirect = {
      id: fallbackRedirectsList.length + 1000,
      username: data.username,
      webname: data.webname,
      title: data.title || data.webname,
      destinationUrl: data.destinationUrl,
      redirectCode: data.redirectCode || 307,
      code: assignedCode,
      clickCount: 0,
      expiredClickCount: 0,
      expiresAt: data.expiresAt || null,
      parentId: data.parentId ?? null,
      showOnProfile: data.showOnProfile !== false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    fallbackRedirectsList.push(mock);
    return mock;
  }

  const result = await turso.execute({
    sql: `INSERT INTO redirects (username, webname, title, destination_url, redirect_code, code, expires_at, parent_id, show_on_profile)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          RETURNING *;`,
    args: [
      data.username.toLowerCase(),
      data.webname.toLowerCase(),
      data.title || data.webname,
      data.destinationUrl,
      data.redirectCode || 307,
      assignedCode,
      expiresStr,
      data.parentId ?? null,
      data.showOnProfile !== false ? 1 : 0,
    ],
  });

  const row = result.rows[0];
  return {
    id: Number(row.id),
    username: String(row.username),
    webname: String(row.webname),
    title: row.title ? String(row.title) : String(row.webname),
    destinationUrl: String(row.destination_url),
    redirectCode: Number(row.redirect_code),
    code: row.code ? String(row.code) : assignedCode,
    clickCount: Number(row.click_count || 0),
    expiredClickCount: Number(row.expired_click_count || 0),
    expiresAt: row.expires_at ? new Date(String(row.expires_at)) : null,
    parentId: row.parent_id !== null && row.parent_id !== undefined ? Number(row.parent_id) : null,
    showOnProfile: Boolean(row.show_on_profile),
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at)),
  };
}

export async function tursoIncrementClick(id: number): Promise<void> {
  await turso.batch([
    {
      sql: `UPDATE redirects SET click_count = click_count + 1 WHERE id = ?;`,
      args: [id],
    },
    {
      sql: `INSERT INTO click_events (redirect_id) VALUES (?);`,
      args: [id],
    },
  ]);
}

export async function tursoIncrementExpiredClick(id: number): Promise<void> {
  await turso.execute({
    sql: `UPDATE redirects SET expired_click_count = expired_click_count + 1 WHERE id = ?;`,
    args: [id],
  });
}

export async function tursoUpdateRedirect(
  id: number,
  data: {
    title?: string;
    destinationUrl?: string;
    expiresAt?: Date | null;
    showOnProfile?: boolean;
    webname?: string;
  }
): Promise<Redirect | null> {
  await ensureRedirectTitleColumn();
  const sets: string[] = [];
  const args: any[] = [];

  if (data.title !== undefined) {
    sets.push("title = ?");
    args.push(data.title);
  }
  if (data.destinationUrl !== undefined) {
    sets.push("destination_url = ?");
    args.push(data.destinationUrl);
  }
  if (data.expiresAt !== undefined) {
    sets.push("expires_at = ?");
    args.push(data.expiresAt ? data.expiresAt.toISOString() : null);
  }
  if (data.showOnProfile !== undefined) {
    sets.push("show_on_profile = ?");
    args.push(data.showOnProfile ? 1 : 0);
  }
  if (data.webname !== undefined) {
    sets.push("webname = ?");
    args.push(data.webname.toLowerCase());
  }

  sets.push("updated_at = CURRENT_TIMESTAMP");
  args.push(id);

  const result = await turso.execute({
    sql: `UPDATE redirects SET ${sets.join(", ")} WHERE id = ? RETURNING *;`,
    args,
  });

  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: Number(row.id),
    username: String(row.username),
    webname: String(row.webname),
    title: row.title ? String(row.title) : String(row.webname),
    destinationUrl: String(row.destination_url),
    redirectCode: Number(row.redirect_code || 307),
    code: row.code ? String(row.code) : null,
    clickCount: Number(row.click_count || 0),
    expiredClickCount: Number(row.expired_click_count || 0),
    expiresAt: row.expires_at ? new Date(String(row.expires_at)) : null,
    parentId: row.parent_id !== null && row.parent_id !== undefined ? Number(row.parent_id) : null,
    showOnProfile: Boolean(row.show_on_profile),
    createdAt: new Date(String(row.created_at || Date.now())),
    updatedAt: new Date(String(row.updated_at || Date.now())),
  };
}

export async function tursoDeleteRedirect(id: number): Promise<boolean> {
  if (!isTursoEnabled) {
    const idx = fallbackRedirectsList.findIndex((r) => r.id === id);
    if (idx !== -1) {
      fallbackRedirectsList.splice(idx, 1);
      return true;
    }
    return false;
  }
  const result = await turso.execute({
    sql: `DELETE FROM redirects WHERE id = ?;`,
    args: [id],
  });
  if (result.rowsAffected > 0) {
    tursoRemoveLinkIdFromGroupsAndBios(id).catch(() => {});
  }
  return result.rowsAffected > 0;
}

export async function tursoRemoveLinkIdFromGroupsAndBios(redirectId: number): Promise<void> {
  if (!isTursoEnabled) return;
  try {
    const groupRows = await turso.execute(`SELECT id, link_ids FROM link_groups;`);
    for (const row of groupRows.rows) {
      try {
        const parsed: number[] = JSON.parse(String(row.link_ids || "[]"));
        if (Array.isArray(parsed) && parsed.includes(redirectId)) {
          const updated = parsed.filter((i) => i !== redirectId);
          await turso.execute({
            sql: `UPDATE link_groups SET link_ids = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;`,
            args: [JSON.stringify(updated), Number(row.id)],
          });
        }
      } catch {}
    }

    const bioRows = await turso.execute(`SELECT id, link_ids FROM bios;`);
    for (const row of bioRows.rows) {
      try {
        const parsed: number[] = JSON.parse(String(row.link_ids || "[]"));
        if (Array.isArray(parsed) && parsed.includes(redirectId)) {
          const updated = parsed.filter((i) => i !== redirectId);
          await turso.execute({
            sql: `UPDATE bios SET link_ids = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;`,
            args: [JSON.stringify(updated), Number(row.id)],
          });
        }
      } catch {}
    }
  } catch (err) {
    console.error("Error removing link ID from groups and bios:", err);
  }
}

// ==========================================
// 2. BIOS (Sub-Bios & Link Hubs)
// ==========================================

export async function ensureBiosAndUsersColumns() {
  // Bios and users columns are permanently migrated in Turso.
  return;
}

export async function tursoGetBios(username: string): Promise<Bio[]> {
  await ensureBiosAndUsersColumns();
  const result = await turso.execute({
    sql: `SELECT * FROM bios WHERE LOWER(username) = LOWER(?) ORDER BY id ASC;`,
    args: [username],
  });

  return result.rows.map((row) => ({
    id: Number(row.id),
    username: String(row.username),
    bioname: String(row.bioname),
    title: row.title ? String(row.title) : null,
    description: row.description ? String(row.description) : null,
    linkIds: String(row.link_ids || "[]"),
    code: row.code ? String(row.code) : null,
    expiresAt: row.expires_at ? new Date(String(row.expires_at)) : null,
    createdAt: new Date(String(row.created_at || Date.now())),
    updatedAt: new Date(String(row.updated_at || Date.now())),
  }));
}

export async function tursoFindBio(username: string, bioname: string): Promise<Bio | null> {
  await ensureBiosAndUsersColumns();
  const result = await turso.execute({
    sql: `SELECT * FROM bios WHERE LOWER(username) = LOWER(?) AND LOWER(bioname) = LOWER(?) LIMIT 1;`,
    args: [username, bioname],
  });

  if (result.rows.length === 0) return null;
  const row = result.rows[0];

  return {
    id: Number(row.id),
    username: String(row.username),
    bioname: String(row.bioname),
    title: row.title ? String(row.title) : null,
    description: row.description ? String(row.description) : null,
    linkIds: String(row.link_ids || "[]"),
    code: row.code ? String(row.code) : null,
    expiresAt: row.expires_at ? new Date(String(row.expires_at)) : null,
    createdAt: new Date(String(row.created_at || Date.now())),
    updatedAt: new Date(String(row.updated_at || Date.now())),
  };
}

export async function tursoFindBioByCode(code: string): Promise<Bio | null> {
  await ensureBiosAndUsersColumns();
  const clean = code.trim().toLowerCase();
  const result = await turso.execute({
    sql: `SELECT * FROM bios WHERE LOWER(code) = ? LIMIT 1;`,
    args: [clean],
  });

  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: Number(row.id),
    username: String(row.username),
    bioname: String(row.bioname),
    title: row.title ? String(row.title) : null,
    description: row.description ? String(row.description) : null,
    linkIds: String(row.link_ids || "[]"),
    code: row.code ? String(row.code) : null,
    expiresAt: row.expires_at ? new Date(String(row.expires_at)) : null,
    createdAt: new Date(String(row.created_at || Date.now())),
    updatedAt: new Date(String(row.updated_at || Date.now())),
  };
}

export async function tursoUpdateBio(
  id: number,
  data: {
    title?: string;
    description?: string | null;
    linkIds?: string;
    expiresAt?: Date | null;
  }
): Promise<Bio | null> {
  const sets: string[] = [];
  const args: any[] = [];

  if (data.title !== undefined) {
    sets.push("title = ?");
    args.push(data.title);
  }
  if (data.description !== undefined) {
    sets.push("description = ?");
    args.push(data.description);
  }
  if (data.linkIds !== undefined) {
    sets.push("link_ids = ?");
    args.push(data.linkIds);
  }
  if (data.expiresAt !== undefined) {
    sets.push("expires_at = ?");
    args.push(data.expiresAt ? data.expiresAt.toISOString() : null);
  }

  sets.push("updated_at = CURRENT_TIMESTAMP");
  args.push(id);

  const result = await turso.execute({
    sql: `UPDATE bios SET ${sets.join(", ")} WHERE id = ? RETURNING *;`,
    args,
  });

  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: Number(row.id),
    username: String(row.username),
    bioname: String(row.bioname),
    title: row.title ? String(row.title) : null,
    description: row.description ? String(row.description) : null,
    linkIds: String(row.link_ids || "[]"),
    code: row.code ? String(row.code) : null,
    expiresAt: row.expires_at ? new Date(String(row.expires_at)) : null,
    createdAt: new Date(String(row.created_at || Date.now())),
    updatedAt: new Date(String(row.updated_at || Date.now())),
  };
}

export async function tursoDeleteBio(id: number): Promise<boolean> {
  const result = await turso.execute({
    sql: `DELETE FROM bios WHERE id = ?;`,
    args: [id],
  });
  return result.rowsAffected > 0;
}

// ==========================================
// 3. USERS (Accounts & Passwords)
// ==========================================

export async function tursoFindUser(identifier: string): Promise<User | null> {
  await ensureBiosAndUsersColumns();
  const clean = identifier.trim().toLowerCase();
  const result = await turso.execute({
    sql: `SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(username) = ? LIMIT 1;`,
    args: [clean, clean],
  });

  if (result.rows.length === 0) return null;
  const row = result.rows[0];

  return {
    id: Number(row.id),
    username: String(row.username),
    email: String(row.email),
    password: row.password ? String(row.password) : null,
    avatar: row.avatar ? String(row.avatar) : null,
    bioCode: row.bio_code ? String(row.bio_code) : null,
    previousUsernames: row.previous_usernames ? String(row.previous_usernames) : "[]",
    recapPreference: String(row.recap_preference || "off"),
    lastRecapSentAt: row.last_recap_sent_at ? new Date(String(row.last_recap_sent_at)) : null,
    plan: row.plan ? String(row.plan) : "free",
    subscriptionId: row.subscription_id ? String(row.subscription_id) : null,
    subscriptionStatus: row.subscription_status ? String(row.subscription_status) : "active",
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at)),
  };
}

export async function tursoFindUserByBioCode(bioCode: string): Promise<User | null> {
  await ensureBiosAndUsersColumns();
  const clean = bioCode.trim().toLowerCase();
  const result = await turso.execute({
    sql: `SELECT * FROM users WHERE LOWER(bio_code) = ? LIMIT 1;`,
    args: [clean],
  });

  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: Number(row.id),
    username: String(row.username),
    email: String(row.email),
    password: row.password ? String(row.password) : null,
    avatar: row.avatar ? String(row.avatar) : null,
    bioCode: row.bio_code ? String(row.bio_code) : null,
    previousUsernames: row.previous_usernames ? String(row.previous_usernames) : "[]",
    recapPreference: String(row.recap_preference || "off"),
    lastRecapSentAt: row.last_recap_sent_at ? new Date(String(row.last_recap_sent_at)) : null,
    plan: row.plan ? String(row.plan) : "free",
    subscriptionId: row.subscription_id ? String(row.subscription_id) : null,
    subscriptionStatus: row.subscription_status ? String(row.subscription_status) : "active",
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at)),
  };
}

export async function tursoFindUserByPreviousUsername(oldUsername: string): Promise<User | null> {
  await ensureBiosAndUsersColumns();
  const clean = oldUsername.trim().toLowerCase();
  const result = await turso.execute({
    sql: `SELECT * FROM users WHERE previous_usernames LIKE ? LIMIT 1;`,
    args: [`%"${clean}"%`],
  });

  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: Number(row.id),
    username: String(row.username),
    email: String(row.email),
    password: row.password ? String(row.password) : null,
    avatar: row.avatar ? String(row.avatar) : null,
    bioCode: row.bio_code ? String(row.bio_code) : null,
    previousUsernames: row.previous_usernames ? String(row.previous_usernames) : "[]",
    recapPreference: String(row.recap_preference || "off"),
    lastRecapSentAt: row.last_recap_sent_at ? new Date(String(row.last_recap_sent_at)) : null,
    plan: row.plan ? String(row.plan) : "free",
    subscriptionId: row.subscription_id ? String(row.subscription_id) : null,
    subscriptionStatus: row.subscription_status ? String(row.subscription_status) : "active",
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at)),
  };
}

export async function tursoCreateOrUpdateUser(username: string, email: string, hashedPassword?: string): Promise<User> {
  await ensureBiosAndUsersColumns();
  const cleanUsername = username.trim().toLowerCase();
  const cleanEmail = email.trim().toLowerCase();

  const existing = await tursoFindUser(cleanEmail);
  if (existing) {
    const finalPass = hashedPassword ?? existing.password;
    const result = await turso.execute({
      sql: `UPDATE users SET username = ?, password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? RETURNING *;`,
      args: [cleanUsername, finalPass, existing.id],
    });
    const row = result.rows[0];
    return {
      id: Number(row.id),
      username: String(row.username),
      email: String(row.email),
      password: row.password ? String(row.password) : null,
      avatar: row.avatar ? String(row.avatar) : null,
      bioCode: row.bio_code ? String(row.bio_code) : null,
      previousUsernames: row.previous_usernames ? String(row.previous_usernames) : "[]",
      recapPreference: String(row.recap_preference || "off"),
      lastRecapSentAt: row.last_recap_sent_at ? new Date(String(row.last_recap_sent_at)) : null,
      plan: row.plan ? String(row.plan) : "free",
      subscriptionId: row.subscription_id ? String(row.subscription_id) : null,
      subscriptionStatus: row.subscription_status ? String(row.subscription_status) : "active",
      createdAt: new Date(String(row.created_at)),
      updatedAt: new Date(String(row.updated_at)),
    };
  } else {
    const bioCode = Math.random().toString(36).substring(2, 8).toLowerCase();
    const result = await turso.execute({
      sql: `INSERT INTO users (username, email, password, bio_code, previous_usernames) VALUES (?, ?, ?, ?, '[]') RETURNING *;`,
      args: [cleanUsername, cleanEmail, hashedPassword ?? null, bioCode],
    });
    const row = result.rows[0];
    return {
      id: Number(row.id),
      username: String(row.username),
      email: String(row.email),
      password: row.password ? String(row.password) : null,
      avatar: row.avatar ? String(row.avatar) : null,
      bioCode: row.bio_code ? String(row.bio_code) : bioCode,
      previousUsernames: row.previous_usernames ? String(row.previous_usernames) : "[]",
      recapPreference: String(row.recap_preference || "off"),
      lastRecapSentAt: row.last_recap_sent_at ? new Date(String(row.last_recap_sent_at)) : null,
      plan: row.plan ? String(row.plan) : "free",
      subscriptionId: row.subscription_id ? String(row.subscription_id) : null,
      subscriptionStatus: row.subscription_status ? String(row.subscription_status) : "active",
      createdAt: new Date(String(row.created_at)),
      updatedAt: new Date(String(row.updated_at)),
    };
  }
}

// ==========================================
// 4. EMPLOYEES (CEO Portal Management)
// ==========================================

export async function tursoGetEmployees(): Promise<Employee[]> {
  const result = await turso.execute({
    sql: `SELECT * FROM employees ORDER BY id DESC;`,
    args: [],
  });

  return result.rows.map((row) => ({
    id: Number(row.id),
    name: row.name ? String(row.name) : "",
    email: String(row.email),
    username: row.username ? String(row.username) : null,
    password: row.password ? String(row.password) : null,
    role: String(row.role || "Insights Viewer"),
    status: String(row.status || "invited"),
    inviteToken: row.invite_token ? String(row.invite_token) : null,
    permissions: String(row.permissions || "[\"view_insights\"]"),
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at)),
  }));
}

export async function tursoFindEmployeeByEmailOrUsername(identifier: string): Promise<Employee | null> {
  const clean = identifier.trim().toLowerCase();
  const result = await turso.execute({
    sql: `SELECT * FROM employees WHERE LOWER(email) = ? OR LOWER(username) = ? LIMIT 1;`,
    args: [clean, clean],
  });

  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: Number(row.id),
    name: row.name ? String(row.name) : "",
    email: String(row.email),
    username: row.username ? String(row.username) : null,
    password: row.password ? String(row.password) : null,
    role: String(row.role || "Insights Viewer"),
    status: String(row.status || "invited"),
    inviteToken: row.invite_token ? String(row.invite_token) : null,
    permissions: String(row.permissions || "[\"view_insights\"]"),
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at)),
  };
}

export async function tursoFindEmployeeById(id: number): Promise<Employee | null> {
  const result = await turso.execute({
    sql: `SELECT * FROM employees WHERE id = ? LIMIT 1;`,
    args: [id],
  });

  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: Number(row.id),
    name: row.name ? String(row.name) : "",
    email: String(row.email),
    username: row.username ? String(row.username) : null,
    password: row.password ? String(row.password) : null,
    role: String(row.role || "Insights Viewer"),
    status: String(row.status || "invited"),
    inviteToken: row.invite_token ? String(row.invite_token) : null,
    permissions: String(row.permissions || "[\"view_insights\"]"),
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at)),
  };
}

export async function tursoFindEmployeeByToken(token: string): Promise<Employee | null> {
  const result = await turso.execute({
    sql: `SELECT * FROM employees WHERE invite_token = ? LIMIT 1;`,
    args: [token],
  });

  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: Number(row.id),
    name: row.name ? String(row.name) : "",
    email: String(row.email),
    username: row.username ? String(row.username) : null,
    password: row.password ? String(row.password) : null,
    role: String(row.role || "Insights Viewer"),
    status: String(row.status || "invited"),
    inviteToken: row.invite_token ? String(row.invite_token) : null,
    permissions: String(row.permissions || "[\"view_insights\"]"),
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at)),
  };
}

export async function tursoCreateEmployee(data: {
  email: string;
  role: string;
  inviteToken: string;
  permissions?: string;
}): Promise<Employee> {
  const result = await turso.execute({
    sql: `INSERT INTO employees (email, role, status, invite_token, permissions)
          VALUES (?, ?, 'invited', ?, ?)
          RETURNING *;`,
    args: [
      data.email.toLowerCase(),
      data.role,
      data.inviteToken,
      data.permissions || JSON.stringify(["view_insights"]),
    ],
  });

  const row = result.rows[0];
  return {
    id: Number(row.id),
    name: "",
    email: String(row.email),
    username: null,
    password: null,
    role: String(row.role),
    status: "invited",
    inviteToken: String(row.invite_token),
    permissions: String(row.permissions),
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at)),
  };
}

export async function tursoUpdateEmployee(
  id: number,
  data: Partial<Employee>
): Promise<Employee | null> {
  const sets: string[] = [];
  const args: any[] = [];

  if (data.name !== undefined) {
    sets.push("name = ?");
    args.push(data.name);
  }
  if (data.username !== undefined) {
    sets.push("username = ?");
    args.push(data.username);
  }
  if (data.password !== undefined) {
    sets.push("password = ?");
    args.push(data.password);
  }
  if (data.role !== undefined) {
    sets.push("role = ?");
    args.push(data.role);
  }
  if (data.status !== undefined) {
    sets.push("status = ?");
    args.push(data.status);
  }
  if (data.inviteToken !== undefined) {
    sets.push("invite_token = ?");
    args.push(data.inviteToken);
  }
  if (data.permissions !== undefined) {
    sets.push("permissions = ?");
    args.push(data.permissions);
  }

  sets.push("updated_at = CURRENT_TIMESTAMP");
  args.push(id);

  const result = await turso.execute({
    sql: `UPDATE employees SET ${sets.join(", ")} WHERE id = ? RETURNING *;`,
    args,
  });

  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: Number(row.id),
    name: row.name ? String(row.name) : "",
    email: String(row.email),
    username: row.username ? String(row.username) : null,
    password: row.password ? String(row.password) : null,
    role: String(row.role || "Insights Viewer"),
    status: String(row.status || "invited"),
    inviteToken: row.invite_token ? String(row.invite_token) : null,
    permissions: String(row.permissions || "[\"view_insights\"]"),
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at)),
  };
}

export async function tursoDeleteEmployee(id: number): Promise<boolean> {
  const result = await turso.execute({
    sql: `DELETE FROM employees WHERE id = ?;`,
    args: [id],
  });
  return result.rowsAffected > 0;
}

// ==========================================
// 4. RESET ANALYTICS (SET CLICKS TO 0)
// ==========================================

export async function tursoResetRedirectClicks(id: number): Promise<boolean> {
  try {
    await turso.execute({
      sql: `UPDATE redirects SET click_count = 0, expired_click_count = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?;`,
      args: [id],
    });
    await turso.execute({
      sql: `DELETE FROM click_events WHERE redirect_id = ?;`,
      args: [id],
    });
    return true;
  } catch (err) {
    console.error("Turso reset redirect clicks error:", err);
    return false;
  }
}

export async function tursoResetAllUserClicks(username: string): Promise<boolean> {
  try {
    const userLinks = await tursoGetRedirects(username);
    const linkIds = userLinks.map((l) => l.id);
    if (linkIds.length === 0) return true;

    await turso.execute({
      sql: `UPDATE redirects SET click_count = 0, expired_click_count = 0, updated_at = CURRENT_TIMESTAMP WHERE LOWER(username) = LOWER(?);`,
      args: [username],
    });

    const placeholders = linkIds.map(() => "?").join(",");
    await turso.execute({
      sql: `DELETE FROM click_events WHERE redirect_id IN (${placeholders});`,
      args: linkIds,
    });
    return true;
  } catch (err) {
    console.error("Turso reset all user clicks error:", err);
    return false;
  }
}

// ==========================================
// 5. LINK GROUPS (ORGANIZER BOXES)
// ==========================================

export async function ensureLinkGroupsTable() {
  // link_groups table is permanently migrated in Turso.
  return;
}

export async function tursoGetLinkGroups(username: string): Promise<LinkGroup[]> {
  await ensureLinkGroupsTable();
  const result = await turso.execute({
    sql: `SELECT * FROM link_groups WHERE LOWER(username) = LOWER(?) ORDER BY COALESCE(sort_order, 0) ASC, id ASC;`,
    args: [username],
  });

  return result.rows.map((row) => ({
    id: Number(row.id),
    username: String(row.username),
    name: String(row.name),
    color: row.color ? String(row.color) : "#000000",
    linkIds: String(row.link_ids || "[]"),
    shareCode: row.share_code ? String(row.share_code) : null,
    isShared: row.is_shared !== null && row.is_shared !== undefined ? Boolean(row.is_shared) : true,
    expiresAt: row.expires_at ? new Date(String(row.expires_at)) : null,
    sortOrder: Number(row.sort_order || 0),
    createdAt: new Date(String(row.created_at || Date.now())),
    updatedAt: new Date(String(row.updated_at || Date.now())),
  }));
}

export async function tursoFindGroupByShareCode(shareCode: string): Promise<LinkGroup | null> {
  await ensureLinkGroupsTable();
  const cleanCode = shareCode.trim().toLowerCase();
  const result = await turso.execute({
    sql: `SELECT * FROM link_groups WHERE LOWER(share_code) = LOWER(?) LIMIT 1;`,
    args: [cleanCode],
  });

  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: Number(row.id),
    username: String(row.username),
    name: String(row.name),
    color: row.color ? String(row.color) : "#000000",
    linkIds: String(row.link_ids || "[]"),
    shareCode: row.share_code ? String(row.share_code) : cleanCode,
    isShared: row.is_shared !== null && row.is_shared !== undefined ? Boolean(row.is_shared) : true,
    expiresAt: row.expires_at ? new Date(String(row.expires_at)) : null,
    sortOrder: Number(row.sort_order || 0),
    createdAt: new Date(String(row.created_at || Date.now())),
    updatedAt: new Date(String(row.updated_at || Date.now())),
  };
}

export async function tursoCreateLinkGroup(data: {
  username: string;
  name: string;
  color?: string;
  linkIds?: string;
  shareCode?: string;
  isShared?: boolean;
  expiresAt?: Date | null;
}): Promise<LinkGroup> {
  await ensureLinkGroupsTable();
  const code = data.shareCode || Math.random().toString(36).substring(2, 8).toLowerCase();
  const expiresStr = data.expiresAt ? data.expiresAt.toISOString() : null;

  const result = await turso.execute({
    sql: `INSERT INTO link_groups (username, name, color, link_ids, share_code, is_shared, expires_at)
          VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *;`,
    args: [
      data.username,
      data.name,
      data.color || "#000000",
      data.linkIds || "[]",
      code,
      data.isShared !== false ? 1 : 0,
      expiresStr,
    ],
  });

  const row = result.rows[0];
  return {
    id: Number(row.id),
    username: String(row.username),
    name: String(row.name),
    color: row.color ? String(row.color) : "#000000",
    linkIds: String(row.link_ids || "[]"),
    shareCode: row.share_code ? String(row.share_code) : code,
    isShared: row.is_shared !== null && row.is_shared !== undefined ? Boolean(row.is_shared) : true,
    expiresAt: row.expires_at ? new Date(String(row.expires_at)) : null,
    sortOrder: Number(row.sort_order || 0),
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at)),
  };
}

export async function tursoUpdateLinkGroup(
  id: number,
  data: Partial<LinkGroup>
): Promise<LinkGroup | null> {
  await ensureLinkGroupsTable();
  const sets: string[] = [];
  const args: any[] = [];

  if (data.name !== undefined) {
    sets.push("name = ?");
    args.push(data.name);
  }
  if (data.color !== undefined) {
    sets.push("color = ?");
    args.push(data.color);
  }
  if (data.linkIds !== undefined) {
    sets.push("link_ids = ?");
    args.push(data.linkIds);
  }
  if (data.shareCode !== undefined) {
    sets.push("share_code = ?");
    args.push(data.shareCode);
  }
  if (data.isShared !== undefined) {
    sets.push("is_shared = ?");
    args.push(data.isShared ? 1 : 0);
  }
  if (data.expiresAt !== undefined) {
    sets.push("expires_at = ?");
    args.push(data.expiresAt ? data.expiresAt.toISOString() : null);
  }

  sets.push("updated_at = CURRENT_TIMESTAMP");
  args.push(id);

  const result = await turso.execute({
    sql: `UPDATE link_groups SET ${sets.join(", ")} WHERE id = ? RETURNING *;`,
    args,
  });

  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: Number(row.id),
    username: String(row.username),
    name: String(row.name),
    color: row.color ? String(row.color) : "#000000",
    linkIds: String(row.link_ids || "[]"),
    shareCode: row.share_code ? String(row.share_code) : null,
    isShared: row.is_shared !== null && row.is_shared !== undefined ? Boolean(row.is_shared) : true,
    expiresAt: row.expires_at ? new Date(String(row.expires_at)) : null,
    sortOrder: Number(row.sort_order || 0),
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at)),
  };
}

export async function tursoDeleteLinkGroup(id: number): Promise<boolean> {
  await ensureLinkGroupsTable();
  const result = await turso.execute({
    sql: `DELETE FROM link_groups WHERE id = ?;`,
    args: [id],
  });
  return result.rowsAffected > 0;
}

export async function tursoReorderLinkGroups(
  username: string,
  orderedIds: number[]
): Promise<boolean> {
  await ensureLinkGroupsTable();
  try {
    for (let i = 0; i < orderedIds.length; i++) {
      await turso.execute({
        sql: `UPDATE link_groups SET sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND LOWER(username) = LOWER(?);`,
        args: [i, orderedIds[i], username],
      });
    }
    return true;
  } catch (err) {
    console.error("Turso reorder link groups error:", err);
    return false;
  }
}

// ==========================================
// 6. USER RECAP PREFERENCES & DIGESTS
// ==========================================

export async function ensureUserRecapColumns() {
  // recap_preference columns are permanently migrated in Turso.
  return;
}

export async function tursoUpdateUserRecapPreference(
  username: string,
  preference: "off" | "weekly" | "monthly" | "both"
): Promise<boolean> {
  await ensureUserRecapColumns();
  try {
    await turso.execute({
      sql: `UPDATE users SET recap_preference = ?, updated_at = CURRENT_TIMESTAMP WHERE LOWER(username) = LOWER(?);`,
      args: [preference, username],
    });
    return true;
  } catch (err) {
    console.error("Turso update recap preference error:", err);
    return false;
  }
}

export async function tursoGetUserRecapPreference(
  username: string
): Promise<{ preference: "off" | "weekly" | "monthly" | "both"; email: string } | null> {
  await ensureUserRecapColumns();
  try {
    const result = await turso.execute({
      sql: `SELECT email, recap_preference FROM users WHERE LOWER(username) = LOWER(?) LIMIT 1;`,
      args: [username],
    });
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    const rawPref = String(row.recap_preference || "off").toLowerCase();
    const preference = ["off", "weekly", "monthly", "both"].includes(rawPref)
      ? (rawPref as "off" | "weekly" | "monthly" | "both")
      : "off";

    return {
      email: String(row.email),
      preference,
    };
  } catch (err) {
    console.error("Turso get recap preference error:", err);
    return null;
  }
}

export async function tursoGetUsersWithRecapEnabled(
  frequency: "weekly" | "monthly"
): Promise<Array<{ username: string; email: string; lastRecapSentAt: Date | null }>> {
  await ensureUserRecapColumns();
  try {
    const result = await turso.execute({
      sql: `SELECT username, email, last_recap_sent_at FROM users WHERE LOWER(recap_preference) = LOWER(?) OR LOWER(recap_preference) IN ('both', 'weekly,monthly');`,
      args: [frequency],
    });
    return result.rows.map((row) => ({
      username: String(row.username),
      email: String(row.email),
      lastRecapSentAt: row.last_recap_sent_at ? new Date(String(row.last_recap_sent_at)) : null,
    }));
  } catch (err) {
    console.error("Turso get users with recap error:", err);
    return [];
  }
}

export async function ensureUserAvatarColumn(): Promise<void> {
  // avatar column is permanently migrated in Turso.
  return;
}

export async function tursoGetUserAvatar(username: string): Promise<string | null> {
  await ensureUserAvatarColumn();
  try {
    const result = await turso.execute({
      sql: `SELECT avatar FROM users WHERE LOWER(username) = LOWER(?) LIMIT 1;`,
      args: [username],
    });
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return row.avatar ? String(row.avatar) : null;
  } catch (err) {
    console.error("Turso get user avatar error:", err);
    return null;
  }
}

export async function tursoUpdateUserAvatar(username: string, avatar: string | null): Promise<boolean> {
  await ensureUserAvatarColumn();
  try {
    await turso.execute({
      sql: `UPDATE users SET avatar = ?, updated_at = CURRENT_TIMESTAMP WHERE LOWER(username) = LOWER(?);`,
      args: [avatar, username],
    });
    return true;
  } catch (err) {
    console.error("Turso update user avatar error:", err);
    return false;
  }
}

// Find redirect directly by webname/shortcode across any user (for short links like /37c738)
export async function tursoFindRedirectByWebnameOnly(webname: string): Promise<Redirect | null> {
  const cleanWebname = webname.trim().toLowerCase();
  try {
    const result = await turso.execute({
      sql: `SELECT * FROM redirects WHERE LOWER(webname) = ? ORDER BY id DESC LIMIT 1;`,
      args: [cleanWebname],
    });
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      id: Number(row.id),
      username: String(row.username),
      webname: String(row.webname),
      title: row.title ? String(row.title) : String(row.webname),
      destinationUrl: String(row.destination_url),
      redirectCode: Number(row.redirect_code || 307),
      code: row.code ? String(row.code) : null,
      clickCount: Number(row.click_count || 0),
      expiredClickCount: Number(row.expired_click_count || 0),
      expiresAt: row.expires_at ? new Date(String(row.expires_at)) : null,
      parentId: row.parent_id !== null && row.parent_id !== undefined ? Number(row.parent_id) : null,
      showOnProfile: Boolean(row.show_on_profile),
      createdAt: new Date(String(row.created_at || Date.now())),
      updatedAt: new Date(String(row.updated_at || Date.now())),
    };
  } catch (err) {
    console.error("Turso find redirect by webname error:", err);
    return null;
  }
}

// Update username across all tables
export async function tursoUpdateUsername(oldUsername: string, newUsername: string): Promise<boolean> {
  await ensureBiosAndUsersColumns();
  const oldU = oldUsername.trim().toLowerCase();
  const newU = newUsername.trim().toLowerCase();
  try {
    let prevList: string[] = [];
    try {
      const userRes = await turso.execute({
        sql: `SELECT previous_usernames FROM users WHERE LOWER(username) = ? LIMIT 1;`,
        args: [oldU],
      });
      if (userRes.rows.length > 0 && userRes.rows[0].previous_usernames) {
        prevList = JSON.parse(String(userRes.rows[0].previous_usernames));
      }
    } catch {}

    if (!prevList.includes(oldU)) {
      prevList.push(oldU);
    }
    const prevJson = JSON.stringify(prevList);

    await turso.execute({
      sql: `UPDATE users SET username = ?, previous_usernames = ?, updated_at = CURRENT_TIMESTAMP WHERE LOWER(username) = ?;`,
      args: [newU, prevJson, oldU],
    });
    await turso.execute({
      sql: `UPDATE redirects SET username = ?, updated_at = CURRENT_TIMESTAMP WHERE LOWER(username) = ?;`,
      args: [newU, oldU],
    });
    await turso.execute({
      sql: `UPDATE bios SET username = ?, updated_at = CURRENT_TIMESTAMP WHERE LOWER(username) = ?;`,
      args: [newU, oldU],
    });
    await turso.execute({
      sql: `UPDATE link_groups SET username = ?, updated_at = CURRENT_TIMESTAMP WHERE LOWER(username) = ?;`,
      args: [newU, oldU],
    });
    return true;
  } catch (err) {
    console.error("Turso update username error:", err);
    return false;
  }
}

// Delete user account and all associated records
export async function tursoDeleteUserAccount(username: string): Promise<boolean> {
  const u = username.trim().toLowerCase();
  try {
    await turso.execute({
      sql: `DELETE FROM redirects WHERE LOWER(username) = ?;`,
      args: [u],
    });
    await turso.execute({
      sql: `DELETE FROM bios WHERE LOWER(username) = ?;`,
      args: [u],
    });
    await turso.execute({
      sql: `DELETE FROM link_groups WHERE LOWER(username) = ?;`,
      args: [u],
    });
    await turso.execute({
      sql: `DELETE FROM users WHERE LOWER(username) = ?;`,
      args: [u],
    });
    return true;
  } catch (err) {
    console.error("Turso delete user account error:", err);
    return false;
  }
}


