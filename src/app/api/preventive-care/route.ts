import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, asc, sql } from "drizzle-orm";
import {
  success,
  error,
  withErrorHandling,
  nowISO,
} from "@/lib/api";
import { preventiveCareUpdateSchema } from "@/lib/validations";
import { z } from "zod";

const putSchema = z.object({
  id: z.number().int().positive(),
}).merge(preventiveCareUpdateSchema);

// GET /api/preventive-care — List all preventive care items, ordered by due_date asc (nulls last)
export const GET = withErrorHandling(async () => {
  const rows = await db
    .select()
    .from(schema.preventiveCare)
    .orderBy(
      sql`CASE WHEN ${schema.preventiveCare.dueDate} IS NULL THEN 1 ELSE 0 END`,
      asc(schema.preventiveCare.dueDate)
    );

  return success(rows);
});

// PUT /api/preventive-care — Update a specific preventive care item
export const PUT = withErrorHandling(async (req) => {
  const body = await req.json();
  const { id, ...updates } = putSchema.parse(body);

  // Check that the item exists
  const existing = await db
    .select()
    .from(schema.preventiveCare)
    .where(eq(schema.preventiveCare.id, id))
    .limit(1);

  if (existing.length === 0) {
    return error(`Preventive care item with id ${id} not found.`, 404);
  }

  const now = nowISO();

  const result = await db
    .update(schema.preventiveCare)
    .set({
      ...updates,
      updatedAt: now,
    })
    .where(eq(schema.preventiveCare.id, id))
    .returning();

  return success(result[0]);
});
