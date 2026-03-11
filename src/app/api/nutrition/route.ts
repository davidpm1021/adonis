import { db } from "@/db";
import * as schema from "@/db/schema";
import { desc, gte, lte, and } from "drizzle-orm";
import {
  success,
  withErrorHandling,
  parseBody,
  dateRangeParams,
  nowISO,
} from "@/lib/api";
import { nutritionLogSchema } from "@/lib/validations";

// GET /api/nutrition — List nutrition logs with optional date range & pagination
export const GET = withErrorHandling(async (req) => {
  const url = new URL(req.url);
  const { from, to, limit, offset } = dateRangeParams(url);

  const conditions = [];
  if (from) conditions.push(gte(schema.nutritionLog.date, from));
  if (to) conditions.push(lte(schema.nutritionLog.date, to));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(schema.nutritionLog)
    .where(where)
    .orderBy(desc(schema.nutritionLog.date))
    .limit(limit)
    .offset(offset);

  return success(rows);
});

// POST /api/nutrition — Create a nutrition log entry
export const POST = withErrorHandling(async (req) => {
  const data = await parseBody(req, nutritionLogSchema);

  const now = nowISO();

  const result = await db
    .insert(schema.nutritionLog)
    .values({
      date: data.date,
      mealType: data.mealType,
      description: data.description,
      calories: data.calories,
      proteinG: data.proteinG,
      carbsG: data.carbsG,
      fatG: data.fatG,
      fiberG: data.fiberG,
      source: data.source,
      aiConfidence: data.aiConfidence,
      notes: data.notes,
      createdAt: now,
    })
    .returning();

  return success(result[0], 201);
});
