export const dynamic = 'force-dynamic';

import { z } from "zod";
import {
  success,
  error,
  withErrorHandling,
  validateBody,
  todayET,
} from "@/lib/api";
import { syncGarminDay } from "@/lib/garmin";

const garminSyncSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format").optional(),
});

// POST /api/garmin/sync — Trigger a Garmin sync for a given date (defaults to today)
export const POST = withErrorHandling(async (req) => {
  const data = await validateBody(req, garminSyncSchema);
  const syncDate = data.date || todayET();

  const result = await syncGarminDay(syncDate);

  if (!result.synced) {
    return error(result.error || "Sync failed", 422);
  }

  return success({ synced: true, date: syncDate });
});
