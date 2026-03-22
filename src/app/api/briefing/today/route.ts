export const dynamic = "force-dynamic";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { success, withErrorHandling, todayET } from "@/lib/api";

// GET /api/briefing/today — Return cached briefing for today (or null if stale/missing)
export const GET = withErrorHandling(async () => {
  const today = todayET();

  const row = (
    await db
      .select()
      .from(schema.dailyBriefings)
      .where(eq(schema.dailyBriefings.date, today))
      .orderBy(desc(schema.dailyBriefings.generatedAt))
      .limit(1)
  )[0];

  if (!row || row.stale === 1) {
    return success({ briefing: null, stale: row?.stale === 1 });
  }

  return success({
    briefing: JSON.parse(row.briefingJson),
    cached: true,
    generatedAt: row.generatedAt,
  });
});
