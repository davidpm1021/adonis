import { db } from "@/db";
import * as schema from "@/db/schema";
import { desc } from "drizzle-orm";
import { success, error, withErrorHandling } from "@/lib/api";

// GET /api/targets/nutrition — Return the most recent nutrition targets
export const GET = withErrorHandling(async () => {
  const rows = await db
    .select()
    .from(schema.nutritionTargets)
    .orderBy(desc(schema.nutritionTargets.effectiveDate))
    .limit(1);

  if (rows.length === 0) {
    return error("No nutrition targets configured.", 404);
  }

  return success(rows[0]);
});
