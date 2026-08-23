import { createClient } from "@libsql/client";
import { Redirect, Bio, Employee, User } from "./db/schema";

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

export async function tursoGetRedirects(username: string): Promise<Redirect[]> {
  const result = await turso.execute({
    sql: `SELECT * FROM redirects WHERE LOWER(username) = LOWER(?) ORDER BY id DESC;`,
    args: [username],
  });

  return result.rows.map((row) => ({
    id: Number(row.id),
    username: String(row.username),
    webname: String(row.webname),
    destinationUrl: String(row.destination_url),
    redirectCode: Number(row.redirect_code || 307),
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
  const result = await turso.execute({
    sql: `SELECT * FROM redirects ORDER BY click_count DESC, id DESC;`,
    args: [],
  });

  return result.rows.map((row) => ({
    id: Number(row.id),
    username: String(row.username),
    webname: String(row.webname),
    destinationUrl: String(row.destination_url),
    redirectCode: Number(row.redirect_code || 307),
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
    expiresAt: row.expires_at ? new Date(String(row.expires_at)) : null,
    createdAt: new Date(String(row.created_at || Date.now())),
    updatedAt: new Date(String(row.updated_at || Date.now())),
  }));
}

export async function tursoFindRedirect(username: string, webname: string): Promise<Redirect | null> {
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
    destinationUrl: String(row.destination_url),
    redirectCode: Number(row.redirect_code || 307),
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
  destinationUrl: string;
  redirectCode?: number;
  expiresAt?: Date | null;
  parentId?: number | null;
  showOnProfile?: boolean;
}): Promise<Redirect> {
  const expiresStr = data.expiresAt ? data.expiresAt.toISOString() : null;
  const result = await turso.execute({
    sql: `INSERT INTO redirects (username, webname, destination_url, redirect_code, expires_at, parent_id, show_on_profile)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          RETURNING *;`,
    args: [
      data.username.toLowerCase(),
      data.webname.toLowerCase(),
      data.destinationUrl,
      data.redirectCode || 307,
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
    destinationUrl: String(row.destination_url),
    redirectCode: Number(row.redirect_code),
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
    destinationUrl?: string;
    expiresAt?: Date | null;
    showOnProfile?: boolean;
    webname?: string;
  }
): Promise<Redirect | null> {
  const sets: string[] = [];
  const args: any[] = [];

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
    destinationUrl: String(row.destination_url),
    redirectCode: Number(row.redirect_code || 307),
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
  const result = await turso.execute({
    sql: `DELETE FROM redirects WHERE id = ?;`,
    args: [id],
  });
  return result.rowsAffected > 0;
}

// ==========================================
// 2. BIOS (Sub-Bios & Link Hubs)
// ==========================================

export async function tursoGetBios(username: string): Promise<Bio[]> {
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
    expiresAt: row.expires_at ? new Date(String(row.expires_at)) : null,
    createdAt: new Date(String(row.created_at || Date.now())),
    updatedAt: new Date(String(row.updated_at || Date.now())),
  }));
}

export async function tursoFindBio(username: string, bioname: string): Promise<Bio | null> {
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
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at)),
  };
}

export async function tursoCreateOrUpdateUser(username: string, email: string, hashedPassword?: string): Promise<User> {
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
      createdAt: new Date(String(row.created_at)),
      updatedAt: new Date(String(row.updated_at)),
    };
  } else {
    const result = await turso.execute({
      sql: `INSERT INTO users (username, email, password) VALUES (?, ?, ?) RETURNING *;`,
      args: [cleanUsername, cleanEmail, hashedPassword ?? null],
    });
    const row = result.rows[0];
    return {
      id: Number(row.id),
      username: String(row.username),
      email: String(row.email),
      password: row.password ? String(row.password) : null,
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
