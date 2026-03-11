export const dynamic = 'force-dynamic';

import { db } from "@/db";
import * as schema from "@/db/schema";
import { gte, sql } from "drizzle-orm";
import { success, withErrorHandling } from "@/lib/api";

// GET /api/vitals/averages — Calculate rolling averages for vitals
export const GET = withErrorHandling(async (req) => {
  const url = new URL(req.url);
  const days = parseInt(url.searchParams.get("days") || "7", 10);

  // Calculate the cutoff date (N days ago)
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoff = cutoffDate.toISOString().split("T")[0];

  const result = await db
    .select({
      avgSystolic: sql<number>`avg(${schema.vitalsLog.systolic})`.as("avg_systolic"),
      avgDiastolic: sql<number>`avg(${schema.vitalsLog.diastolic})`.as("avg_diastolic"),
      avgRestingHeartRate: sql<number>`avg(${schema.vitalsLog.restingHeartRate})`.as("avg_resting_heart_rate"),
      avgSpo2: sql<number>`avg(${schema.vitalsLog.spo2})`.as("avg_spo2"),
      count: sql<number>`count(*)`.as("count"),
    })
    .from(schema.vitalsLog)
    .where(gte(schema.vitalsLog.date, cutoff));

  const row = result[0];

  return success({
    days,
    cutoffDate: cutoff,
    count: row.count,
    averages: {
      systolic: row.avgSystolic ? Math.round(row.avgSystolic * 10) / 10 : null,
      diastolic: row.avgDiastolic ? Math.round(row.avgDiastolic * 10) / 10 : null,
      restingHeartRate: row.avgRestingHeartRate ? Math.round(row.avgRestingHeartRate * 10) / 10 : null,
      spo2: row.avgSpo2 ? Math.round(row.avgSpo2 * 10) / 10 : null,
    },
  });
});
