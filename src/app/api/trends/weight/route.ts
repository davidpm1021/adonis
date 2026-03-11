import { db } from "@/db";
import * as schema from "@/db/schema";
import { asc, isNotNull } from "drizzle-orm";
import { success, withErrorHandling } from "@/lib/api";

// GET /api/trends/weight — Return weight data for charting
export const GET = withErrorHandling(async () => {
  const rows = await db
    .select({
      date: schema.bodyMetrics.date,
      weight: schema.bodyMetrics.weight,
    })
    .from(schema.bodyMetrics)
    .where(isNotNull(schema.bodyMetrics.weight))
    .orderBy(asc(schema.bodyMetrics.date));

  return success({
    entries: rows,
    referenceLines: {
      startingWeight: 225,
      goalWeightLow: 185,
      goalWeightHigh: 195,
    },
  });
});
