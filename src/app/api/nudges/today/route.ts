export const dynamic = 'force-dynamic';

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { success, withErrorHandling, todayET } from "@/lib/api";

// ---------------------------------------------------------------------------
// GET /api/nudges/today — Return today's non-dismissed nudges
// ---------------------------------------------------------------------------
export const GET = withErrorHandling(async () => {
  const today = todayET();

  const nudges = await db
    .select()
    .from(schema.dailyNudges)
    .where(
      and(
        eq(schema.dailyNudges.date, today),
        eq(schema.dailyNudges.dismissed, 0)
      )
    )
    .orderBy(asc(schema.dailyNudges.priority));

  return success({ nudges });
});
