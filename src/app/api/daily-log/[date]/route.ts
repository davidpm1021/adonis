export const dynamic = 'force-dynamic';

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  success,
  error,
  withErrorHandling,
  validateBody,
  nowISO,
} from "@/lib/api";
import { dailyLogSchema } from "@/lib/validations";
import type { z } from "zod";

type PartialDailyLog = z.infer<ReturnType<typeof dailyLogSchema.partial>>;

// GET /api/daily-log/[date] — Get daily log by date
export const GET = withErrorHandling(async (_req, ctx) => {
  const { date } = await ctx.params;

  const rows = await db
    .select()
    .from(schema.dailyLog)
    .where(eq(schema.dailyLog.date, date))
    .limit(1);

  if (rows.length === 0) {
    return error(`No daily log found for ${date}`, 404);
  }

  return success(rows[0]);
});

// PUT /api/daily-log/[date] — Update daily log by date
export const PUT = withErrorHandling(async (req, ctx) => {
  const { date } = await ctx.params;

  const data = (await validateBody(req, dailyLogSchema.partial())) as PartialDailyLog;

  const existing = await db
    .select()
    .from(schema.dailyLog)
    .where(eq(schema.dailyLog.date, date))
    .limit(1);

  if (existing.length === 0) {
    return error(`No daily log found for ${date}`, 404);
  }

  const result = await db
    .update(schema.dailyLog)
    .set({
      ...data,
      updatedAt: nowISO(),
    })
    .where(eq(schema.dailyLog.date, date))
    .returning();

  return success(result[0]);
});

// DELETE /api/daily-log/[date] — Delete daily log by date
export const DELETE = withErrorHandling(async (_req, ctx) => {
  const { date } = await ctx.params;

  const existing = await db
    .select()
    .from(schema.dailyLog)
    .where(eq(schema.dailyLog.date, date))
    .limit(1);

  if (existing.length === 0) {
    return error(`No daily log found for ${date}`, 404);
  }

  await db
    .delete(schema.dailyLog)
    .where(eq(schema.dailyLog.date, date));

  return success({ deleted: true, date });
});
