export const dynamic = "force-dynamic";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { success, withErrorHandling, todayET } from "@/lib/api";

// POST /api/briefing/refresh — Mark today's briefing as stale (triggers regeneration on next load)
export const POST = withErrorHandling(async () => {
  const today = todayET();

  const row = (
    await db
      .select()
      .from(schema.dailyBriefings)
      .where(eq(schema.dailyBriefings.date, today))
      .orderBy(desc(schema.dailyBriefings.generatedAt))
      .limit(1)
  )[0];

  if (row) {
    await db
      .update(schema.dailyBriefings)
      .set({ stale: 1 })
      .where(eq(schema.dailyBriefings.id, row.id));
  }

  return success({ marked_stale: true });
});
