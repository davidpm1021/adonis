export const dynamic = 'force-dynamic';

import { db } from "@/db";
import * as schema from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { success, withErrorHandling } from "@/lib/api";
import { LAB_BIOMARKERS } from "@/lib/constants";

// ---------------------------------------------------------------------------
// GET /api/trends/labs — Lab trajectory data for charting
// ---------------------------------------------------------------------------
export const GET = withErrorHandling(async (req) => {
  const url = new URL(req.url);
  const biomarkerFilter = url.searchParams.get("biomarker");

  // Build query
  const query = biomarkerFilter
    ? db
        .select()
        .from(schema.labResults)
        .where(eq(schema.labResults.testName, biomarkerFilter))
        .orderBy(asc(schema.labResults.date))
    : db
        .select()
        .from(schema.labResults)
        .orderBy(asc(schema.labResults.date));

  const rows = await query;

  // Group by testName
  const grouped: Record<
    string,
    {
      testName: string;
      unit: string;
      interpretation: string | null;
      referenceLow: number | null;
      referenceHigh: number | null;
      dataPoints: { date: string; value: number; referenceLow: number | null; referenceHigh: number | null; flag: string | null }[];
    }
  > = {};

  for (const row of rows) {
    if (!grouped[row.testName]) {
      const biomarkerInfo = LAB_BIOMARKERS[row.testName] ?? null;
      grouped[row.testName] = {
        testName: row.testName,
        unit: row.unit,
        interpretation: biomarkerInfo?.interpretation ?? null,
        referenceLow: biomarkerInfo?.low ?? row.referenceLow,
        referenceHigh: biomarkerInfo?.high ?? row.referenceHigh,
        dataPoints: [],
      };
    }
    grouped[row.testName].dataPoints.push({
      date: row.date,
      value: row.value,
      referenceLow: row.referenceLow,
      referenceHigh: row.referenceHigh,
      flag: row.flag,
    });
  }

  const biomarkers = Object.values(grouped);

  return success({
    biomarkers,
    count: biomarkers.length,
    totalDataPoints: rows.length,
  });
});
