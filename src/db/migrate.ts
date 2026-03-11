import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.resolve(process.env.DATABASE_URL || "./adonis.db");
console.log(`Migrating database at: ${DB_PATH}`);

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Add setup_complete to user_profile if missing
try {
  db.exec("ALTER TABLE user_profile ADD COLUMN setup_complete INTEGER DEFAULT 0");
  console.log("  Added setup_complete column to user_profile.");
} catch {
  console.log("  setup_complete column already exists.");
}

// Mark existing profiles as setup complete
db.exec("UPDATE user_profile SET setup_complete = 1 WHERE id = 1 AND setup_complete IS NULL OR setup_complete = 0");
console.log("  Marked existing profile as setup complete.");

// Create streak tables
db.exec(`
  CREATE TABLE IF NOT EXISTS streak_freezes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    streak_type TEXT NOT NULL,
    reason TEXT,
    created_at TEXT
  );
  CREATE TABLE IF NOT EXISTS streak_milestones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    streak_type TEXT NOT NULL,
    milestone INTEGER NOT NULL,
    achieved_date TEXT NOT NULL,
    celebrated INTEGER DEFAULT 0,
    created_at TEXT
  );
`);
console.log("  Created streak_freezes + streak_milestones tables.");

db.close();
console.log("\nMigration complete!");
