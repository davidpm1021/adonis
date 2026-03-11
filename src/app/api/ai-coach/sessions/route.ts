export const dynamic = 'force-dynamic';

import { db } from "@/db";
import * as schema from "@/db/schema";
import { sql } from "drizzle-orm";
import { success, withErrorHandling } from "@/lib/api";

// GET /api/ai-coach/sessions — List distinct sessions with metadata
export const GET = withErrorHandling(async () => {
  const rows = db
    .select({
      sessionId: schema.aiConversations.sessionId,
      firstMessage: sql<string>`MIN(${schema.aiConversations.createdAt})`,
      lastMessage: sql<string>`MAX(${schema.aiConversations.createdAt})`,
      messageCount: sql<number>`COUNT(*)`,
    })
    .from(schema.aiConversations)
    .groupBy(schema.aiConversations.sessionId)
    .orderBy(sql`MAX(${schema.aiConversations.createdAt}) DESC`)
    .all();

  return success(rows);
});
