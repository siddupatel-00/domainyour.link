import { createClient } from "@libsql/client";

export async function initTursoDatabase(url: string, authToken?: string) {
  const client = createClient({
    url: url || process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || "",
    authToken: authToken || process.env.TURSO_AUTH_TOKEN || "",
  });

  console.log(`Connecting to Turso at: ${url}...`);

  const queries = [
    // 1. Users Table
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      email TEXT NOT NULL,
      password TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS user_username_idx ON users (username);`,
    `CREATE UNIQUE INDEX IF NOT EXISTS user_email_idx ON users (email);`,

    // 2. Redirects Table (Permanent & Expiring Links)
    `CREATE TABLE IF NOT EXISTS redirects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      webname TEXT NOT NULL,
      destination_url TEXT NOT NULL,
      redirect_code INTEGER NOT NULL DEFAULT 307,
      click_count INTEGER NOT NULL DEFAULT 0,
      expired_click_count INTEGER NOT NULL DEFAULT 0,
      expires_at TEXT,
      parent_id INTEGER,
      show_on_profile INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS username_webname_idx ON redirects (username, webname);`,

    // 3. Bios Table (Sub-Bios & Profiles)
    `CREATE TABLE IF NOT EXISTS bios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      bioname TEXT NOT NULL,
      title TEXT,
      description TEXT,
      link_ids TEXT NOT NULL DEFAULT '[]',
      expires_at TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS username_bioname_idx ON bios (username, bioname);`,

    // 4. Click Events Table (Worldwide & Analytics)
    `CREATE TABLE IF NOT EXISTS click_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      redirect_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`,
    `CREATE INDEX IF NOT EXISTS click_redirect_id_idx ON click_events (redirect_id);`,
    `CREATE INDEX IF NOT EXISTS click_created_at_idx ON click_events (created_at);`,

    // 5. Employees Table (CEO Staff Invitations & Access)
    `CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT DEFAULT '',
      email TEXT NOT NULL,
      username TEXT,
      password TEXT,
      role TEXT NOT NULL DEFAULT 'Insights Viewer',
      status TEXT NOT NULL DEFAULT 'invited',
      invite_token TEXT,
      permissions TEXT NOT NULL DEFAULT '["view_insights"]',
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS employee_email_idx ON employees (email);`,
    `CREATE UNIQUE INDEX IF NOT EXISTS employee_invite_token_idx ON employees (invite_token);`,
  ];

  for (const sql of queries) {
    await client.execute(sql);
  }

  console.log("✅ Successfully initialized all Turso tables and indexes!");
}

if (process.argv[1]?.includes("init-turso")) {
  const url = process.env.TURSO_DATABASE_URL || "libsql://domainyourlink-siddu.aws-ap-south-1.turso.io";
  const token = process.env.TURSO_AUTH_TOKEN || process.argv[2] || "";
  initTursoDatabase(url, token)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Turso initialization error:", err.message);
      process.exit(1);
    });
}
