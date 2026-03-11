export const dynamic = 'force-dynamic';

import { db } from "@/db";
import * as schema from "@/db/schema";
import { desc } from "drizzle-orm";
import { success, withErrorHandling, dateRangeParams } from "@/lib/api";

// GET /api/reports/weekly — List weekly reports with pagination
export const GET = withErrorHandling(async (req) => {
  const url = new URL(req.url);
  const { limit, offset } = dateRangeParams(url);

  const rows = await db
    .select()
    .from(schema.weeklyReports)
    .orderBy(desc(schema.weeklyReports.weekStart))
    .limit(limit)
    .offset(offset);

  return success(rows);
});
