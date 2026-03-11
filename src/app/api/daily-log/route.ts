export const dynamic = 'force-dynamic';

import { db } from "@/db";
import * as schema from "@/db/schema";
import { desc, eq, gte, lte, and } from "drizzle-orm";
import {
  success,
  error,
  withErrorHandling,
  validateBody,
  dateRangeParams,
  nowISO,
} from "@/lib/api";
import { dailyLogSchema, type DailyLogInput } from "@/lib/validations";

// GET /api/daily-log — List daily logs with optional date range & pagination
export const GET = withErrorHandling(async (req) => {
  const url = new URL(req.url);
  const { from, to, limit, offset } = dateRangeParams(url);

  const conditions = [];
  if (from) conditions.push(gte(schema.dailyLog.date, from));
  if (to) conditions.push(lte(schema.dailyLog.date, to));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(schema.dailyLog)
    .where(where)
    .orderBy(desc(schema.dailyLog.date))
    .limit(limit)
    .offset(offset);

  return success(rows);
});

// POST /api/daily-log — Create a new daily log entry
export const POST = withErrorHandling(async (req) => {
  const data = (await validateBody(req, dailyLogSchema)) as DailyLogInput;

  // Check if log already exists for this date (daily_log.date is unique)
  const existing = await db
    .select()
    .from(schema.dailyLog)
    .where(eq(schema.dailyLog.date, data.date))
    .limit(1);

  if (existing.length > 0) {
    return error(`Daily log already exists for ${data.date}. Use PUT to update.`, 409);
  }

  const now = nowISO();

  const result = await db.insert(schema.dailyLog).values({
    date: data.date,
    morningWalk: data.morningWalk,
    walkDurationMinutes: data.walkDurationMinutes,
    strengthTraining: data.strengthTraining,
    ateLunchWithProtein: data.ateLunchWithProtein,
    mobilityWork: data.mobilityWork,
    supplementsTaken: data.supplementsTaken,
    alcoholFree: data.alcoholFree,
    energy: data.energy,
    mood: data.mood,
    stress: data.stress,
    soreness: data.soreness,
    anxietyLevel: data.anxietyLevel,
    alcoholCraving: data.alcoholCraving,
    alcoholTrigger: data.alcoholTrigger,
    foamRolling: data.foamRolling,
    coldExposure: data.coldExposure,
    heatExposure: data.heatExposure,
    notes: data.notes,
    wins: data.wins,
    struggles: data.struggles,
    createdAt: now,
    updatedAt: now,
  }).returning();

  return success(result[0], 201);
});
