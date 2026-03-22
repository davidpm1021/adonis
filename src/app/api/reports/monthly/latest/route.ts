export const dynamic = 'force-dynamic';

import { db } from "@/db";
import * as schema from "@/db/schema";
import { desc } from "drizzle-orm";
import { success, error, withErrorHandling } from "@/lib/api";

// GET /api/reports/monthly/latest — Return the most recent monthly report
export const GET = withErrorHandling(async () => {
  const rows = await db
    .select()
    .from(schema.monthlyReports)
    .orderBy(desc(schema.monthlyReports.monthStart))
    .limit(1);

  if (rows.length === 0) {
    return error("No monthly reports found.", 404);
  }

  return success(rows[0]);
});
