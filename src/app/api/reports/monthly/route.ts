export const dynamic = 'force-dynamic';

import { db } from "@/db";
import * as schema from "@/db/schema";
import { desc } from "drizzle-orm";
import { success, withErrorHandling, dateRangeParams } from "@/lib/api";

// GET /api/reports/monthly — List monthly reports with pagination
export const GET = withErrorHandling(async (req) => {
  const url = new URL(req.url);
  const { limit, offset } = dateRangeParams(url);

  const rows = await db
    .select()
    .from(schema.monthlyReports)
    .orderBy(desc(schema.monthlyReports.monthStart))
    .limit(limit)
    .offset(offset);

  return success(rows);
});
