export const dynamic = 'force-dynamic';

import { db } from "@/db";
import * as schema from "@/db/schema";
import { asc } from "drizzle-orm";
import { success, withErrorHandling, parseBody, nowISO } from "@/lib/api";
import { z } from "zod";

const trainingPhaseSchema = z.object({
  phaseNumber: z.number().int().min(1),
  phaseName: z.string().min(1),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  status: z.enum(["active", "completed", "upcoming"]).optional().default("active"),
  prescribedWorkouts: z.string().optional().nullable(), // JSON string
  progressionRules: z.string().optional().nullable(), // JSON string
  notes: z.string().optional().nullable(),
});

// GET /api/training/phases — List all training phases ordered by phase_number asc
export const GET = withErrorHandling(async () => {
  const rows = await db
    .select()
    .from(schema.trainingPhases)
    .orderBy(asc(schema.trainingPhases.phaseNumber));

  return success(rows);
});

// POST /api/training/phases — Create a new training phase
export const POST = withErrorHandling(async (req) => {
  const data = await parseBody(req, trainingPhaseSchema);
  const now = nowISO();

  const result = await db
    .insert(schema.trainingPhases)
    .values({
      phaseNumber: data.phaseNumber,
      phaseName: data.phaseName,
      startDate: data.startDate,
      endDate: data.endDate,
      status: data.status,
      prescribedWorkouts: data.prescribedWorkouts,
      progressionRules: data.progressionRules,
      notes: data.notes,
      createdAt: now,
    })
    .returning();

  return success(result[0], 201);
});
