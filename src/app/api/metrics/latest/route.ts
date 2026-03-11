import { db } from "@/db";
import * as schema from "@/db/schema";
import { desc } from "drizzle-orm";
import { success, error, withErrorHandling } from "@/lib/api";

// GET /api/metrics/latest — Return the most recent body_metrics row
export const GET = withErrorHandling(async () => {
  const rows = await db
    .select()
    .from(schema.bodyMetrics)
    .orderBy(desc(schema.bodyMetrics.date))
    .limit(1);

  if (rows.length === 0) {
    return error("No body metrics found", 404);
  }

  return success(rows[0]);
});
