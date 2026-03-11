import { db } from "@/db";
import * as schema from "@/db/schema";
import { desc, gte, lte, and, eq } from "drizzle-orm";
import {
  success,
  withErrorHandling,
  validateBody,
  dateRangeParams,
  nowISO,
} from "@/lib/api";
import { bodyMetricsSchema, type BodyMetricsInput } from "@/lib/validations";
import { calculateNavyBodyFat } from "@/lib/calculations";

// GET /api/metrics — List body metrics with optional date range & pagination
export const GET = withErrorHandling(async (req) => {
  const url = new URL(req.url);
  const { from, to, limit, offset } = dateRangeParams(url);

  const conditions = [];
  if (from) conditions.push(gte(schema.bodyMetrics.date, from));
  if (to) conditions.push(lte(schema.bodyMetrics.date, to));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(schema.bodyMetrics)
    .where(where)
    .orderBy(desc(schema.bodyMetrics.date))
    .limit(limit)
    .offset(offset);

  return success(rows);
});

// POST /api/metrics — Create body metrics entry with auto Navy BF calculation
export const POST = withErrorHandling(async (req) => {
  const data = (await validateBody(req, bodyMetricsSchema)) as BodyMetricsInput;

  const now = nowISO();

  // If waist and neck are provided, calculate Navy BF estimate
  let navyBfEstimate: number | null = null;

  if (data.waistInches && data.neckInches) {
    // Fetch user profile for height
    const profile = await db
      .select()
      .from(schema.userProfile)
      .where(eq(schema.userProfile.id, 1))
      .limit(1);

    const heightInches = profile[0]?.heightInches;

    if (heightInches) {
      const result = calculateNavyBodyFat(
        data.waistInches,
        data.neckInches,
        heightInches
      );

      if (result) {
        navyBfEstimate = result.value;

        // Insert into calculated_markers table
        await db.insert(schema.calculatedMarkers).values({
          date: data.date,
          markerName: "Navy Body Fat %",
          value: result.value,
          formula: result.formula,
          inputValues: JSON.stringify(result.inputValues),
          interpretation: result.interpretation,
          createdAt: now,
        });
      }
    }
  }

  const inserted = await db.insert(schema.bodyMetrics).values({
    date: data.date,
    weight: data.weight,
    bodyFatPercentage: data.bodyFatPercentage,
    waistInches: data.waistInches,
    chestInches: data.chestInches,
    armInches: data.armInches,
    thighInches: data.thighInches,
    neckInches: data.neckInches,
    dexaTotalFatPct: data.dexaTotalFatPct,
    dexaLeanMassLbs: data.dexaLeanMassLbs,
    dexaFatMassLbs: data.dexaFatMassLbs,
    dexaVisceralFatArea: data.dexaVisceralFatArea,
    dexaBoneDensity: data.dexaBoneDensity,
    navyBfEstimate,
    notes: data.notes,
    createdAt: now,
  }).returning();

  return success(inserted[0], 201);
});
