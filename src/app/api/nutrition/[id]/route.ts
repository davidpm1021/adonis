import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  success,
  error,
  withErrorHandling,
} from "@/lib/api";

// DELETE /api/nutrition/[id] — Delete a nutrition log entry by id
export const DELETE = withErrorHandling(async (_req, ctx) => {
  const { id } = await ctx.params;
  const entryId = parseInt(id, 10);

  if (isNaN(entryId)) {
    return error("Invalid nutrition log ID", 400);
  }

  const existing = await db
    .select()
    .from(schema.nutritionLog)
    .where(eq(schema.nutritionLog.id, entryId))
    .limit(1);

  if (existing.length === 0) {
    return error(`Nutrition log entry ${entryId} not found`, 404);
  }

  await db
    .delete(schema.nutritionLog)
    .where(eq(schema.nutritionLog.id, entryId));

  return success({ deleted: true, id: entryId });
});
