import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { success, error, withErrorHandling } from "@/lib/api";

// DELETE /api/vitals/[id] — Delete vitals entry by id
export const DELETE = withErrorHandling(async (_req, ctx) => {
  const { id } = await ctx.params;
  const numId = parseInt(id, 10);

  if (isNaN(numId)) {
    return error("Invalid id. Must be a number.", 400);
  }

  const deleted = await db
    .delete(schema.vitalsLog)
    .where(eq(schema.vitalsLog.id, numId))
    .returning();

  if (deleted.length === 0) {
    return error(`No vitals entry found with id ${numId}.`, 404);
  }

  return success({ deleted: deleted[0] });
});
