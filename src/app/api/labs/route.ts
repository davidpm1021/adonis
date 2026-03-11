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
import { labResultSchema, type LabResultInput } from "@/lib/validations";

// Auto-detect flag based on value and reference range
function autoDetectFlag(
  value: number,
  referenceLow: number | null | undefined,
  referenceHigh: number | null | undefined
): string {
  if (referenceLow == null && referenceHigh == null) return "normal";

  if (referenceLow != null && referenceHigh != null) {
    // Calculate borderline zones (within 5% of range from boundaries)
    const range = referenceHigh - referenceLow;
    const borderlineMargin = range * 0.05;

    if (value < referenceLow) return "low";
    if (value > referenceHigh) return "high";
    if (value <= referenceLow + borderlineMargin) return "borderline";
    if (value >= referenceHigh - borderlineMargin) return "borderline";
    return "normal";
  }

  if (referenceLow != null && value < referenceLow) return "low";
  if (referenceHigh != null && value > referenceHigh) return "high";

  return "normal";
}

// GET /api/labs — List lab results with optional date range & pagination
export const GET = withErrorHandling(async (req) => {
  const url = new URL(req.url);
  const { from, to, limit, offset } = dateRangeParams(url);

  const conditions = [];
  if (from) conditions.push(gte(schema.labResults.date, from));
  if (to) conditions.push(lte(schema.labResults.date, to));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(schema.labResults)
    .where(where)
    .orderBy(desc(schema.labResults.date))
    .limit(limit)
    .offset(offset);

  return success(rows);
});

// POST /api/labs — Create lab result with auto flag detection
export const POST = withErrorHandling(async (req) => {
  const data = (await validateBody(req, labResultSchema)) as LabResultInput;

  const now = nowISO();

  // Auto-detect flag if not explicitly provided
  const flag =
    data.flag ?? autoDetectFlag(data.value, data.referenceLow, data.referenceHigh);

  const inserted = await db.insert(schema.labResults).values({
    date: data.date,
    testName: data.testName,
    value: data.value,
    unit: data.unit,
    referenceLow: data.referenceLow,
    referenceHigh: data.referenceHigh,
    flag,
    notes: data.notes,
    createdAt: now,
  }).returning();

  return success(inserted[0], 201);
});
