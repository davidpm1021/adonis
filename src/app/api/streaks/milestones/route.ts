export const dynamic = 'force-dynamic';

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { success, withErrorHandling, nowISO } from "@/lib/api";

// GET /api/streaks/milestones — Get uncelebrated milestones
export const GET = withErrorHandling(async () => {
  const uncelebrated = await db
    .select()
    .from(schema.streakMilestones)
    .where(eq(schema.streakMilestones.celebrated, 0))
    .orderBy(desc(schema.streakMilestones.achievedDate));

  const all = await db
    .select()
    .from(schema.streakMilestones)
    .orderBy(desc(schema.streakMilestones.achievedDate))
    .limit(50);

  return success({ uncelebrated, recent: all });
});

// PUT /api/streaks/milestones — Mark a milestone as celebrated
export const PUT = withErrorHandling(async (req) => {
  const body = await req.json();
  const { id } = body as { id: number };

  if (!id) {
    return success({ error: "id required" });
  }

  await db
    .update(schema.streakMilestones)
    .set({ celebrated: 1 })
    .where(eq(schema.streakMilestones.id, id))
    .run();

  return success({ celebrated: true });
});
