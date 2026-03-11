import { db } from "@/db";
import * as schema from "@/db/schema";
import { desc, gte, lte, and, sql } from "drizzle-orm";
import {
  success,
  withErrorHandling,
  validateBody,
  dateRangeParams,
  nowISO,
} from "@/lib/api";
import { sleepLogSchema } from "@/lib/validations";

// GET /api/sleep — List sleep logs with optional date range
export const GET = withErrorHandling(async (req) => {
  const url = new URL(req.url);
  const { from, to, limit, offset } = dateRangeParams(url);

  const conditions = [];
  if (from) conditions.push(gte(schema.sleepLog.date, from));
  if (to) conditions.push(lte(schema.sleepLog.date, to));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(schema.sleepLog)
    .where(where)
    .orderBy(desc(schema.sleepLog.date))
    .limit(limit)
    .offset(offset);

  return success(rows);
});

// POST /api/sleep — Create or upsert sleep log entry
export const POST = withErrorHandling(async (req) => {
  const data = await validateBody(req, sleepLogSchema);
  const now = nowISO();

  const result = await db
    .insert(schema.sleepLog)
    .values({
      date: data.date,
      bedtime: data.bedtime,
      wakeTime: data.wakeTime,
      totalHours: data.totalHours,
      sleepQuality: data.sleepQuality,
      timeToFallAsleepMinutes: data.timeToFallAsleepMinutes,
      wakeUps: data.wakeUps,
      bipapUsed: data.bipapUsed,
      notes: data.notes,
      createdAt: now,
    })
    .onConflictDoUpdate({
      target: schema.sleepLog.date,
      set: {
        bedtime: sql`excluded.bedtime`,
        wakeTime: sql`excluded.wake_time`,
        totalHours: sql`excluded.total_hours`,
        sleepQuality: sql`excluded.sleep_quality`,
        timeToFallAsleepMinutes: sql`excluded.time_to_fall_asleep_minutes`,
        wakeUps: sql`excluded.wake_ups`,
        bipapUsed: sql`excluded.bipap_used`,
        notes: sql`excluded.notes`,
      },
    })
    .returning();

  return success(result[0], 201);
});
