import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { neon } from "@neondatabase/serverless";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL || "";

// Check if we are running with a Neon / Vercel Postgres URL or a standard/local Postgres URL
function createDbClient() {
  if (!connectionString) {
    // Return a dummy client that fails gracefully during build time if DB is not yet set
    const fallbackPool = new Pool({
      connectionString: "postgresql://dummy:dummy@localhost:5432/dummy",
      connectionTimeoutMillis: 500,
    });
    fallbackPool.on("error", () => {
      // Gracefully ignore local dummy pool connection errors
    });
    return drizzlePg(fallbackPool, { schema });
  }

  const isNeonOrVercel =
    connectionString.includes("neon.tech") ||
    connectionString.includes("vercel-storage.com") ||
    connectionString.includes("aws.neon.tech");

  if (isNeonOrVercel) {
    // Use neon HTTP client for ultra-fast serverless single queries with zero connection overhead
    const sql = neon(connectionString);
    return drizzleNeon(sql, { schema });
  } else {
    // Standard Node.js Postgres connection pool for local dev or standard PG servers
    const pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 1000,
    });
    pool.on("error", (err) => {
      console.warn("Postgres connection pool notice (using fallback if unavailable):", err.message);
    });
    return drizzlePg(pool, { schema });
  }
}

// Global singleton to prevent connection exhaustion in serverless/dev reload
declare global {
  // eslint-disable-next-line no-var
  var __dbInstance: ReturnType<typeof createDbClient> | undefined;
}

export const db = global.__dbInstance || (global.__dbInstance = createDbClient());
