export const dynamic = 'force-dynamic';

import { db } from "@/db";
import * as schema from "@/db/schema";
import { desc, gte, lte, and } from "drizzle-orm";
import {
  success,
  withErrorHandling,
  dateRangeParams,
} from "@/lib/api";

// GET /api/calculated-markers — List calculated markers with optional date range
export const GET = withErrorHandling(async (req) => {
  const url = new URL(req.url);
  const { from, to, limit, offset } = dateRangeParams(url);

  const conditions = [];
  if (from) conditions.push(gte(schema.calculatedMarkers.date, from));
  if (to) conditions.push(lte(schema.calculatedMarkers.date, to));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(schema.calculatedMarkers)
    .where(where)
    .orderBy(desc(schema.calculatedMarkers.date))
    .limit(limit)
    .offset(offset);

  return success(rows);
});
