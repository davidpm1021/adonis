import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { success, error, withErrorHandling } from "@/lib/api";

// GET /api/ai-coach/sessions/[id] — Get all messages for a session
export const GET = withErrorHandling(async (_req, ctx) => {
  const { id } = await ctx.params;

  const rows = await db
    .select()
    .from(schema.aiConversations)
    .where(eq(schema.aiConversations.sessionId, id))
    .orderBy(asc(schema.aiConversations.createdAt));

  if (rows.length === 0) {
    return error(`No session found with id ${id}`, 404);
  }

  return success(rows);
});

// DELETE /api/ai-coach/sessions/[id] — Delete all messages for a session
export const DELETE = withErrorHandling(async (_req, ctx) => {
  const { id } = await ctx.params;

  const existing = await db
    .select()
    .from(schema.aiConversations)
    .where(eq(schema.aiConversations.sessionId, id))
    .limit(1);

  if (existing.length === 0) {
    return error(`No session found with id ${id}`, 404);
  }

  await db
    .delete(schema.aiConversations)
    .where(eq(schema.aiConversations.sessionId, id));

  return success({ deleted: true, sessionId: id });
});
