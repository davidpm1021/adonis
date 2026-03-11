import { db } from "@/db";
import * as schema from "@/db/schema";
import { desc } from "drizzle-orm";
import { success, withErrorHandling, dateRangeParams } from "@/lib/api";

// GET /api/targets/nutrition/history — Return full nutrition targets history
export const GET = withErrorHandling(async (req) => {
  const url = new URL(req.url);
  const { limit, offset } = dateRangeParams(url);

  const rows = await db
    .select()
    .from(schema.nutritionTargets)
    .orderBy(desc(schema.nutritionTargets.effectiveDate))
    .limit(limit)
    .offset(offset);

  return success(rows);
});
