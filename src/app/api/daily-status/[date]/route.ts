export const dynamic = 'force-dynamic';

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { success, error, withErrorHandling } from "@/lib/api";

// GET /api/daily-status/[date] — Unified daily status from all tables
export const GET = withErrorHandling(async (_req, ctx) => {
  const { date } = await ctx.params;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return error("Invalid date format. Use YYYY-MM-DD.", 400);
  }

  // Fetch all data in parallel
  const [
    dailyLogRows,
    supplementRows,
    sleepRows,
    workoutRows,
    vitalsRows,
    nutritionRows,
    weightRows,
  ] = await Promise.all([
    // Daily log
    db.select().from(schema.dailyLog).where(eq(schema.dailyLog.date, date)).limit(1),

    // Supplement compliance
    db.select().from(schema.supplementLog).where(eq(schema.supplementLog.date, date)),

    // Sleep
    db.select().from(schema.sleepLog).where(eq(schema.sleepLog.date, date)).limit(1),

    // Workouts
    db.select().from(schema.workouts).where(eq(schema.workouts.date, date)),

    // Vitals
    db.select().from(schema.vitalsLog).where(eq(schema.vitalsLog.date, date)),

    // Nutrition totals
    db.select({
      totalCalories: sql<number>`COALESCE(SUM(${schema.nutritionLog.calories}), 0)`,
      totalProtein: sql<number>`COALESCE(SUM(${schema.nutritionLog.proteinG}), 0)`,
      totalCarbs: sql<number>`COALESCE(SUM(${schema.nutritionLog.carbsG}), 0)`,
      totalFat: sql<number>`COALESCE(SUM(${schema.nutritionLog.fatG}), 0)`,
      totalFiber: sql<number>`COALESCE(SUM(${schema.nutritionLog.fiberG}), 0)`,
      mealCount: sql<number>`COUNT(*)`,
    }).from(schema.nutritionLog).where(eq(schema.nutritionLog.date, date)),

    // Weight (from body_metrics)
    db.select().from(schema.bodyMetrics).where(eq(schema.bodyMetrics.date, date)).limit(1),
  ]);

  const dailyLog = dailyLogRows[0] ?? null;
  const sleep = sleepRows[0] ?? null;
  const weight = weightRows[0] ?? null;
  const nutrition = nutritionRows[0] ?? null;

  const supplementsTaken = supplementRows.filter((s) => s.taken === 1).length;
  const supplementsTotal = supplementRows.length;

  return success({
    date,
    dailyLog,
    supplements: {
      taken: supplementsTaken,
      total: supplementsTotal,
      allComplete: supplementsTotal > 0 && supplementsTaken === supplementsTotal,
      entries: supplementRows,
    },
    sleep: {
      logged: !!sleep,
      entry: sleep,
    },
    workouts: {
      logged: workoutRows.length > 0,
      count: workoutRows.length,
      entries: workoutRows,
    },
    vitals: {
      logged: vitalsRows.length > 0,
      count: vitalsRows.length,
      entries: vitalsRows,
    },
    nutrition: {
      logged: nutrition && Number(nutrition.mealCount) > 0,
      mealCount: Number(nutrition?.mealCount ?? 0),
      totals: {
        calories: Number(nutrition?.totalCalories ?? 0),
        protein: Number(nutrition?.totalProtein ?? 0),
        carbs: Number(nutrition?.totalCarbs ?? 0),
        fat: Number(nutrition?.totalFat ?? 0),
        fiber: Number(nutrition?.totalFiber ?? 0),
      },
    },
    weight: {
      logged: !!weight,
      value: weight?.weight ?? null,
      entry: weight,
    },
  });
});
