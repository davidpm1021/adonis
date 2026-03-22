export const dynamic = 'force-dynamic';

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { success, error, withErrorHandling } from "@/lib/api";
import { syncSupplementsToDailyLog, syncDailyLogToSupplements } from "@/lib/sync-daily-log";
import { z } from "zod";

const syncSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  direction: z.enum(["supplements_to_daily", "daily_to_supplements"]),
  /** When direction is daily_to_supplements, whether to mark all taken (1) or untaken (0) */
  taken: z.number().int().min(0).max(1).optional(),
});

// POST /api/supplements/sync — Sync supplement status between tables
export const POST = withErrorHandling(async (req) => {
  const body = await req.json();
  const data = syncSchema.parse(body);

  if (data.direction === "supplements_to_daily") {
    // Individual supplements → daily_log.supplementsTaken
    await syncSupplementsToDailyLog(data.date);

    // Return updated compliance info
    const supplements = await db
      .select()
      .from(schema.supplementLog)
      .where(eq(schema.supplementLog.date, data.date));

    const taken = supplements.filter((s) => s.taken === 1).length;
    const total = supplements.length;

    return success({
      synced: true,
      direction: data.direction,
      compliance: { taken, total, allComplete: taken === total },
    });
  }

  if (data.direction === "daily_to_supplements") {
    if (data.taken === undefined) {
      return error("'taken' field required for daily_to_supplements direction", 400);
    }

    await syncDailyLogToSupplements(data.date, data.taken);

    return success({
      synced: true,
      direction: data.direction,
      markedAs: data.taken === 1 ? "all_taken" : "all_untaken",
    });
  }

  return error("Invalid direction", 400);
});
