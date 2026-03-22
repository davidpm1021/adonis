export const dynamic = 'force-dynamic';

import { db } from "@/db";
import { sql } from "drizzle-orm";
import { success, withErrorHandling } from "@/lib/api";

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
      const result = await db.execute(
        sql.raw(`SELECT COUNT(*) as count FROM ${tableName}`)
      );
      const count = Number(result.rows[0]?.count ?? 0);
      tables[tableName] = count;
      totalRecords += count;
    } catch {
      // Table might not exist yet
      tables[tableName] = 0;
    }
  }

  return success({
    tables,
    totalRecords,
    databaseSizeBytes: null, // Not applicable for PostgreSQL in the same way as SQLite
    tableCount: TABLE_NAMES.length,
  });
});
