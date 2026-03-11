export const dynamic = 'force-dynamic';

import { db } from "@/db";
import * as schema from "@/db/schema";
import { desc } from "drizzle-orm";
import {
  success,
  error,
  withErrorHandling,
  validateBody,
  nowISO,
} from "@/lib/api";
import { nutritionTargetsSchema } from "@/lib/validations";

// GET /api/settings/targets — Return the most recent nutrition_targets row
export const GET = withErrorHandling(async () => {
  const rows = await db
    .select()
    .from(schema.nutritionTargets)
    .orderBy(desc(schema.nutritionTargets.effectiveDate))
    .limit(1);

  if (rows.length === 0) {
    return error("No nutrition targets configured.", 404);
  }

  return success(rows[0]);
});

// PUT /api/settings/targets — Create new nutrition targets entry
export const PUT = withErrorHandling(async (req) => {
  const data = await validateBody(req, nutritionTargetsSchema);
  const now = nowISO();

  const result = await db
    .insert(schema.nutritionTargets)
    .values({
      effectiveDate: data.effectiveDate,
      caloriesMin: data.caloriesMin,
      caloriesMax: data.caloriesMax,
      proteinMin: data.proteinMin,
      proteinMax: data.proteinMax,
      carbsMin: data.carbsMin,
      carbsMax: data.carbsMax,
      fatMin: data.fatMin,
      fatMax: data.fatMax,
      fiberMin: data.fiberMin,
      fiberMax: data.fiberMax,
      rationale: data.rationale,
      createdAt: now,
    })
    .returning();

  return success(result[0], 201);
});
