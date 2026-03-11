export const dynamic = 'force-dynamic';

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import {
  success,
  error,
  withErrorHandling,
  nowISO,
} from "@/lib/api";
import { z } from "zod";

const toggleSchema = z.object({
  supplementName: z.string().min(1),
  taken: z.number().int().min(0).max(1),
});

// GET /api/supplements/log/[date] — Get supplement log for a specific date
export const GET = withErrorHandling(async (_req, ctx) => {
  const { date } = await ctx.params;

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return error("Invalid date format. Use YYYY-MM-DD.", 400);
  }

  let rows = await db
    .select()
    .from(schema.supplementLog)
    .where(eq(schema.supplementLog.date, date))
    .orderBy(schema.supplementLog.timeOfDay, schema.supplementLog.supplementName);

  // If no entries for this date, auto-populate from the stack template
  if (rows.length === 0) {
    // Get distinct supplements from any previous date as the template
    const template = await db
      .selectDistinct({
        supplementName: schema.supplementLog.supplementName,
        dose: schema.supplementLog.dose,
        timeOfDay: schema.supplementLog.timeOfDay,
      })
      .from(schema.supplementLog)
      .where(ne(schema.supplementLog.date, date));

    if (template.length > 0) {
      const now = nowISO();
      const values = template.map((t) => ({
        date,
        supplementName: t.supplementName,
        dose: t.dose,
        taken: 0,
        timeOfDay: t.timeOfDay,
        createdAt: now,
      }));

      await db.insert(schema.supplementLog).values(values);

      rows = await db
        .select()
        .from(schema.supplementLog)
        .where(eq(schema.supplementLog.date, date))
        .orderBy(schema.supplementLog.timeOfDay, schema.supplementLog.supplementName);
    }
  }

  return success(rows);
});

// POST /api/supplements/log/[date] — Toggle taken status for a supplement
export const POST = withErrorHandling(async (req, ctx) => {
  const { date } = await ctx.params;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return error("Invalid date format. Use YYYY-MM-DD.", 400);
  }

  const body = await req.json();
  const data = toggleSchema.parse(body);

  // Check if entry exists
  const existing = await db
    .select()
    .from(schema.supplementLog)
    .where(
      and(
        eq(schema.supplementLog.date, date),
        eq(schema.supplementLog.supplementName, data.supplementName)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Update existing entry
    const updated = await db
      .update(schema.supplementLog)
      .set({ taken: data.taken })
      .where(eq(schema.supplementLog.id, existing[0].id))
      .returning();

    return success(updated[0]);
  }

  // Create new entry
  const now = nowISO();
  const result = await db
    .insert(schema.supplementLog)
    .values({
      date,
      supplementName: data.supplementName,
      taken: data.taken,
      createdAt: now,
    })
    .returning();

  return success(result[0], 201);
});
