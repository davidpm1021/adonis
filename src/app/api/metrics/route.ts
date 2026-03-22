export const dynamic = 'force-dynamic';

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

// POST /api/metrics — Create or update body metrics entry (upserts by date)
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

  // Check if entry already exists for this date — upsert instead of duplicate
  const existing = await db
    .select()
    .from(schema.bodyMetrics)
    .where(eq(schema.bodyMetrics.date, data.date))
    .limit(1);

  if (existing.length > 0) {
    // Build update payload from provided (non-undefined) fields
    const updateData: Record<string, unknown> = {};
    if (data.weight !== undefined) updateData.weight = data.weight;
    if (data.bodyFatPercentage !== undefined) updateData.bodyFatPercentage = data.bodyFatPercentage;
    if (data.waistInches !== undefined) updateData.waistInches = data.waistInches;
    if (data.chestInches !== undefined) updateData.chestInches = data.chestInches;
    if (data.armInches !== undefined) updateData.armInches = data.armInches;
    if (data.thighInches !== undefined) updateData.thighInches = data.thighInches;
    if (data.neckInches !== undefined) updateData.neckInches = data.neckInches;
    if (data.dexaTotalFatPct !== undefined) updateData.dexaTotalFatPct = data.dexaTotalFatPct;
    if (data.dexaLeanMassLbs !== undefined) updateData.dexaLeanMassLbs = data.dexaLeanMassLbs;
    if (data.dexaFatMassLbs !== undefined) updateData.dexaFatMassLbs = data.dexaFatMassLbs;
    if (data.dexaVisceralFatArea !== undefined) updateData.dexaVisceralFatArea = data.dexaVisceralFatArea;
    if (data.dexaBoneDensity !== undefined) updateData.dexaBoneDensity = data.dexaBoneDensity;
    if (navyBfEstimate !== null) updateData.navyBfEstimate = navyBfEstimate;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const updated = await db
      .update(schema.bodyMetrics)
      .set(updateData)
      .where(eq(schema.bodyMetrics.id, existing[0].id))
      .returning();

    return success(updated[0]);
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
