import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import {
  success,
  error,
  withErrorHandling,
} from "@/lib/api";
import { z } from "zod";

const putSchema = z.object({
  id: z.number().int().positive(),
  completed: z.number().int().min(0).max(1),
  completedDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// GET /api/environment — List all environment checklist items grouped by category
export const GET = withErrorHandling(async () => {
  const rows = await db
    .select()
    .from(schema.environmentChecklist)
    .orderBy(asc(schema.environmentChecklist.category), asc(schema.environmentChecklist.id));

  // Group by category
  const grouped: Record<string, typeof rows> = {};
  for (const row of rows) {
    if (!grouped[row.category]) {
      grouped[row.category] = [];
    }
    grouped[row.category].push(row);
  }

  return success(grouped);
});

// PUT /api/environment — Update a specific environment checklist item
export const PUT = withErrorHandling(async (req) => {
  const body = await req.json();
  const { id, ...updates } = putSchema.parse(body);

  // Check that the item exists
  const existing = await db
    .select()
    .from(schema.environmentChecklist)
    .where(eq(schema.environmentChecklist.id, id))
    .limit(1);

  if (existing.length === 0) {
    return error(`Environment checklist item with id ${id} not found.`, 404);
  }

  const result = await db
    .update(schema.environmentChecklist)
    .set({
      completed: updates.completed,
      completedDate: updates.completedDate ?? null,
      notes: updates.notes !== undefined ? updates.notes : existing[0].notes,
    })
    .where(eq(schema.environmentChecklist.id, id))
    .returning();

  return success(result[0]);
});
