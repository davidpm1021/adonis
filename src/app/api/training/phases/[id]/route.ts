import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { success, error, withErrorHandling } from "@/lib/api";
import { z } from "zod";

const trainingPhaseUpdateSchema = z.object({
  phaseNumber: z.number().int().min(1).optional(),
  phaseName: z.string().min(1).optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  status: z.enum(["active", "completed", "upcoming"]).optional(),
  prescribedWorkouts: z.string().optional().nullable(),
  progressionRules: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// PUT /api/training/phases/[id] — Update training phase by id
export const PUT = withErrorHandling(async (req, ctx) => {
  const { id } = await ctx.params;
  const numericId = parseInt(id, 10);

  if (isNaN(numericId)) {
    return error("Invalid id parameter", 400);
  }

  const body = await req.json();
  const data = trainingPhaseUpdateSchema.parse(body);

  const existing = await db
    .select()
    .from(schema.trainingPhases)
    .where(eq(schema.trainingPhases.id, numericId))
    .limit(1);

  if (existing.length === 0) {
    return error(`No training phase found with id ${id}`, 404);
  }

  const result = await db
    .update(schema.trainingPhases)
    .set(data)
    .where(eq(schema.trainingPhases.id, numericId))
    .returning();

  return success(result[0]);
});
