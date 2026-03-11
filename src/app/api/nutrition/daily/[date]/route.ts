export const dynamic = 'force-dynamic';

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import {
  success,
  withErrorHandling,
} from "@/lib/api";

// GET /api/nutrition/daily/[date] — Get all nutrition entries for a date with totals
export const GET = withErrorHandling(async (_req, ctx) => {
  const { date } = await ctx.params;

  // Fetch all meals for the given date
  const meals = await db
    .select()
    .from(schema.nutritionLog)
    .where(eq(schema.nutritionLog.date, date));

  // Calculate totals by summing across all entries
  const totalsResult = await db
    .select({
      calories: sql<number>`COALESCE(SUM(${schema.nutritionLog.calories}), 0)`,
      protein: sql<number>`COALESCE(SUM(${schema.nutritionLog.proteinG}), 0)`,
      carbs: sql<number>`COALESCE(SUM(${schema.nutritionLog.carbsG}), 0)`,
      fat: sql<number>`COALESCE(SUM(${schema.nutritionLog.fatG}), 0)`,
      fiber: sql<number>`COALESCE(SUM(${schema.nutritionLog.fiberG}), 0)`,
    })
    .from(schema.nutritionLog)
    .where(eq(schema.nutritionLog.date, date));

  const totals = totalsResult[0] ?? {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
  };

  return success({
    date,
    meals,
    totals: {
      calories: Math.round(totals.calories * 10) / 10,
      protein: Math.round(totals.protein * 10) / 10,
      carbs: Math.round(totals.carbs * 10) / 10,
      fat: Math.round(totals.fat * 10) / 10,
      fiber: Math.round(totals.fiber * 10) / 10,
    },
  });
});
