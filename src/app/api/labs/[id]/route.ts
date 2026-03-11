export const dynamic = 'force-dynamic';

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { success, error, withErrorHandling } from "@/lib/api";

// DELETE /api/labs/[id] — Delete lab result by id
export const DELETE = withErrorHandling(async (_req, ctx) => {
  const { id } = await ctx.params;
  const numericId = parseInt(id, 10);

  if (isNaN(numericId)) {
    return error("Invalid id parameter", 400);
  }

  const existing = await db
    .select()
    .from(schema.labResults)
    .where(eq(schema.labResults.id, numericId))
    .limit(1);

  if (existing.length === 0) {
    return error(`No lab result found with id ${id}`, 404);
  }

  await db
    .delete(schema.labResults)
    .where(eq(schema.labResults.id, numericId));

  return success({ deleted: true, id: numericId });
});
