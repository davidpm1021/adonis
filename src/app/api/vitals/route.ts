export const dynamic = 'force-dynamic';

import { db } from "@/db";
import * as schema from "@/db/schema";
import { desc, gte, lte, and } from "drizzle-orm";
import {
  success,
  withErrorHandling,
  validateBody,
  dateRangeParams,
  nowISO,
} from "@/lib/api";
import { vitalsLogSchema } from "@/lib/validations";

// GET /api/vitals — List vitals with optional date range
export const GET = withErrorHandling(async (req) => {
  const url = new URL(req.url);
  const { from, to, limit, offset } = dateRangeParams(url);

  const conditions = [];
  if (from) conditions.push(gte(schema.vitalsLog.date, from));
  if (to) conditions.push(lte(schema.vitalsLog.date, to));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(schema.vitalsLog)
    .where(where)
    .orderBy(desc(schema.vitalsLog.date))
    .limit(limit)
    .offset(offset);

  return success(rows);
});

// POST /api/vitals — Create a vitals entry
export const POST = withErrorHandling(async (req) => {
  const data = await validateBody(req, vitalsLogSchema);
  const now = nowISO();

  const result = await db
    .insert(schema.vitalsLog)
    .values({
      date: data.date,
      timeOfDay: data.timeOfDay,
      systolic: data.systolic,
      diastolic: data.diastolic,
      restingHeartRate: data.restingHeartRate,
      spo2: data.spo2,
      notes: data.notes,
      createdAt: now,
    })
    .returning();

  return success(result[0], 201);
});
