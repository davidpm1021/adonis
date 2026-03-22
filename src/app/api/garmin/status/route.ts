export const dynamic = 'force-dynamic';

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { success, withErrorHandling } from "@/lib/api";

// GET /api/garmin/status — Get Garmin connection status
export const GET = withErrorHandling(async () => {
  const rows = await db
    .select()
    .from(schema.garminSyncConfig)
    .where(eq(schema.garminSyncConfig.id, 1))
    .limit(1);

  const config = rows[0];

  if (!config) {
    return success({
      connected: false,
      enabled: false,
      email: null,
      lastSyncAt: null,
      syncIntervalMinutes: 15,
    });
  }

  return success({
    connected: !!config.enabled && !!config.garminEmail,
    enabled: !!config.enabled,
    email: config.garminEmail,
    lastSyncAt: config.lastSyncAt,
    syncIntervalMinutes: config.syncIntervalMinutes,
  });
});
