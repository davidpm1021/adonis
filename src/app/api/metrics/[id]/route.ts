import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { success, error, withErrorHandling } from "@/lib/api";

// DELETE /api/metrics/[id] — Delete body metrics by id
export const DELETE = withErrorHandling(async (_req, ctx) => {
  const { id } = await ctx.params;
  const numericId = parseInt(id, 10);

  if (isNaN(numericId)) {
    return error("Invalid id parameter", 400);
  }

  const existing = await db
    .select()
    .from(schema.bodyMetrics)
    .where(eq(schema.bodyMetrics.id, numericId))
    .limit(1);

  if (existing.length === 0) {
    return error(`No body metrics found with id ${id}`, 404);
  }

  await db
    .delete(schema.bodyMetrics)
    .where(eq(schema.bodyMetrics.id, numericId));

  return success({ deleted: true, id: numericId });
});
