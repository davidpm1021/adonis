import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import {
  success,
  withErrorHandling,
  todayET,
  nowISO,
} from "@/lib/api";
import { z } from "zod";
import { validateBody } from "@/lib/api";

const stackItemSchema = z.object({
  supplementName: z.string().min(1),
  dose: z.string().optional().nullable(),
  timeOfDay: z.string().optional().nullable(),
});

const stackSchema = z.array(stackItemSchema).min(1);

// GET /api/supplements/stack — Return distinct supplement names, doses, and time_of_day
export const GET = withErrorHandling(async () => {
  const rows = await db
    .selectDistinct({
      supplementName: schema.supplementLog.supplementName,
      dose: schema.supplementLog.dose,
      timeOfDay: schema.supplementLog.timeOfDay,
    })
    .from(schema.supplementLog)
    .orderBy(schema.supplementLog.timeOfDay, schema.supplementLog.supplementName);

  return success(rows);
});

// PUT /api/supplements/stack — Replace current stack for today
export const PUT = withErrorHandling(async (req) => {
  const body = await req.json();
  const items = stackSchema.parse(body);

  const today = todayET();
  const now = nowISO();

  // Delete existing entries for today
  await db
    .delete(schema.supplementLog)
    .where(eq(schema.supplementLog.date, today));

  // Insert new stack entries for today
  const values = items.map((item) => ({
    date: today,
    supplementName: item.supplementName,
    dose: item.dose ?? null,
    taken: 0,
    timeOfDay: item.timeOfDay ?? null,
    createdAt: now,
  }));

  const result = await db
    .insert(schema.supplementLog)
    .values(values)
    .returning();

  return success(result);
});
