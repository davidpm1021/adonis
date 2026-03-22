export const dynamic = 'force-dynamic';

import { db } from "@/db";
import * as schema from "@/db/schema";
import { desc } from "drizzle-orm";
import { success, withErrorHandling, dateRangeParams } from "@/lib/api";

// GET /api/ai/usage — Return AI usage log ordered by created_at desc
export const GET = withErrorHandling(async (req) => {
  const url = new URL(req.url);
  const { limit, offset } = dateRangeParams(url);

  const rows = await db
    .select()
    .from(schema.aiUsageLog)
    .orderBy(desc(schema.aiUsageLog.createdAt))
    .limit(limit)
    .offset(offset);

  return success(rows);
});
