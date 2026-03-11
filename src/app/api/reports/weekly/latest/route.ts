import { db } from "@/db";
import * as schema from "@/db/schema";
import { desc } from "drizzle-orm";
import { success, error, withErrorHandling } from "@/lib/api";

// GET /api/reports/weekly/latest — Return the most recent weekly report
export const GET = withErrorHandling(async () => {
  const rows = await db
    .select()
    .from(schema.weeklyReports)
    .orderBy(desc(schema.weeklyReports.weekStart))
    .limit(1);

  if (rows.length === 0) {
    return error("No weekly reports found.", 404);
  }

  return success(rows[0]);
});
