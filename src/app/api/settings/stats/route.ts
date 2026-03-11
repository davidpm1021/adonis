import { sqlite } from "@/db";
import { success, withErrorHandling } from "@/lib/api";
import fs from "fs";
import path from "path";

const DB_PATH = process.env.DATABASE_URL || "./adonis.db";

// All tables to count
const TABLE_NAMES = [
  "user_profile",
  "daily_log",
  "body_metrics",
  "lab_results",
  "workouts",
  "exercises",
  "nutrition_log",
  "supplement_log",
  "sleep_log",
  "ai_conversations",
  "goals",
  "training_phases",
  "nutrition_targets",
  "goal_history",
  "weekly_reports",
  "favorite_meals",
  "nutrition_insights",
  "calculated_markers",
  "preventive_care",
  "vitals_log",
  "environment_checklist",
  "food_parse_cache",
  "ai_usage_log",
] as const;

// ---------------------------------------------------------------------------
// GET /api/settings/stats — Database statistics
// ---------------------------------------------------------------------------
export const GET = withErrorHandling(async () => {
  const tables: Record<string, number> = {};
  let totalRecords = 0;

  for (const tableName of TABLE_NAMES) {
    try {
      const result = sqlite
        .prepare(`SELECT COUNT(*) as count FROM ${tableName}`)
        .get() as { count: number } | undefined;
      const count = result?.count ?? 0;
      tables[tableName] = count;
      totalRecords += count;
    } catch {
      // Table might not exist yet
      tables[tableName] = 0;
    }
  }

  // Get database file size
  let databaseSizeBytes = 0;
  try {
    const resolvedPath = path.resolve(DB_PATH);
    if (fs.existsSync(resolvedPath)) {
      const stats = fs.statSync(resolvedPath);
      databaseSizeBytes = stats.size;

      // Include WAL file size if present
      const walPath = resolvedPath + "-wal";
      if (fs.existsSync(walPath)) {
        databaseSizeBytes += fs.statSync(walPath).size;
      }
    }
  } catch {
    // Ignore file size errors
  }

  return success({
    tables,
    totalRecords,
    databaseSizeBytes,
    tableCount: TABLE_NAMES.length,
  });
});
