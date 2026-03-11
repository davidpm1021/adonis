import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { ensureTables } from "./tables";
import path from "path";

const DB_PATH = process.env.DATABASE_URL || "./adonis.db";

// Resolve to absolute path
const resolvedPath = path.resolve(DB_PATH);

// Singleton pattern for Next.js dev hot-reload
const globalForDb = globalThis as unknown as {
  __db: ReturnType<typeof Database> | undefined;
};

function getDatabase() {
  if (!globalForDb.__db) {
    globalForDb.__db = new Database(resolvedPath);
    // Enable WAL mode for better concurrent read performance
    globalForDb.__db.pragma("journal_mode = WAL");
    globalForDb.__db.pragma("foreign_keys = ON");
    // Ensure all tables exist (safe with IF NOT EXISTS)
    ensureTables(globalForDb.__db);
  }
  return globalForDb.__db;
}

const sqlite = getDatabase();
export const db = drizzle(sqlite, { schema });
export { sqlite };
