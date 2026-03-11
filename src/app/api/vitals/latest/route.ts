export const dynamic = 'force-dynamic';

import { db } from "@/db";
import * as schema from "@/db/schema";
import { desc } from "drizzle-orm";
import { success, error, withErrorHandling } from "@/lib/api";

// GET /api/vitals/latest — Return the most recent vitals_log row
export const GET = withErrorHandling(async () => {
  const rows = await db
    .select()
    .from(schema.vitalsLog)
    .orderBy(desc(schema.vitalsLog.date), desc(schema.vitalsLog.id))
    .limit(1);

  if (rows.length === 0) {
    return error("No vitals entries found.", 404);
  }

  return success(rows[0]);
});
