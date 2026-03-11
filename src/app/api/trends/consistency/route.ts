import { db } from "@/db";
import * as schema from "@/db/schema";
import { gte, desc } from "drizzle-orm";
import { success, withErrorHandling, todayET } from "@/lib/api";
import { calculateConsistency } from "@/lib/calculations";

// GET /api/trends/consistency — Calculate consistency percentage over last N days
export const GET = withErrorHandling(async (req) => {
  const url = new URL(req.url);
  const days = parseInt(url.searchParams.get("days") || "30", 10);
  const clampedDays = Math.max(1, Math.min(days, 365));

  // Calculate the start date (N days ago)
  const today = todayET();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - clampedDays);
  const startDateStr = startDate.toISOString().split("T")[0];

  const logs = await db
    .select({
      date: schema.dailyLog.date,
      morningWalk: schema.dailyLog.morningWalk,
      strengthTraining: schema.dailyLog.strengthTraining,
      ateLunchWithProtein: schema.dailyLog.ateLunchWithProtein,
      mobilityWork: schema.dailyLog.mobilityWork,
      supplementsTaken: schema.dailyLog.supplementsTaken,
    })
    .from(schema.dailyLog)
    .where(gte(schema.dailyLog.date, startDateStr))
    .orderBy(desc(schema.dailyLog.date));

  const consistency = calculateConsistency(
    logs.map((log) => ({
      date: log.date,
      morningWalk: log.morningWalk ?? 0,
      strengthTraining: log.strengthTraining ?? 0,
      ateLunchWithProtein: log.ateLunchWithProtein ?? 0,
      mobilityWork: log.mobilityWork ?? 0,
      supplementsTaken: log.supplementsTaken ?? 0,
    })),
    clampedDays,
  );

  return success({
    days: clampedDays,
    daysLogged: logs.length,
    consistencyPct: consistency,
    periodStart: startDateStr,
    periodEnd: today,
  });
});
