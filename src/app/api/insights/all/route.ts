export const dynamic = 'force-dynamic';

import { db } from "@/db";
import * as schema from "@/db/schema";
import { desc } from "drizzle-orm";
import { success, withErrorHandling, dateRangeParams } from "@/lib/api";

// GET /api/insights/all — Return all insights ordered by created_at desc
// This endpoint returns nutrition insights and could be extended to include
// other insight types in the future
export const GET = withErrorHandling(async (req) => {
  const url = new URL(req.url);
  const { limit, offset } = dateRangeParams(url);

  const nutritionInsights = await db
    .select()
    .from(schema.nutritionInsights)
    .orderBy(desc(schema.nutritionInsights.createdAt))
    .limit(limit)
    .offset(offset);

  // Group by type for structured display
  const grouped: Record<string, typeof nutritionInsights> = {};
  for (const insight of nutritionInsights) {
    const type = insight.insightType || "general";
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(insight);
  }

  return success({
    insights: nutritionInsights,
    grouped,
    total: nutritionInsights.length,
  });
});
