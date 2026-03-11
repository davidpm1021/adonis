export const dynamic = 'force-dynamic';

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { success, error, serverError, nowISO, todayET } from "@/lib/api";
import { z } from "zod";

const advanceSchema = z.object({
  currentPhaseId: z.number().int(),
  phaseName: z.string().min(1),
  startDate: z.string().optional(),
  endDate: z.string().optional().nullable(),
  prescribedWorkouts: z.string().optional().nullable(),
  progressionRules: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// POST /api/training/advance — Apply a phase advancement
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = advanceSchema.parse(body);
    const now = nowISO();
    const today = todayET();

    // 1. Verify current phase exists and is active
    const currentPhase = db
      .select()
      .from(schema.trainingPhases)
      .where(eq(schema.trainingPhases.id, data.currentPhaseId))
      .get();

    if (!currentPhase) {
      return error("Current phase not found.", 404);
    }

    if (currentPhase.status !== "active") {
      return error("Current phase is not active.", 400);
    }

    // 2. Mark current phase as completed
    db.update(schema.trainingPhases)
      .set({
        status: "completed",
        endDate: today,
      })
      .where(eq(schema.trainingPhases.id, data.currentPhaseId))
      .run();

    // 3. Create new phase
    const newPhaseNumber = currentPhase.phaseNumber + 1;
    const result = await db
      .insert(schema.trainingPhases)
      .values({
        phaseNumber: newPhaseNumber,
        phaseName: data.phaseName,
        startDate: data.startDate || today,
        endDate: data.endDate || null,
        status: "active",
        prescribedWorkouts: data.prescribedWorkouts || null,
        progressionRules: data.progressionRules || null,
        notes: data.notes || null,
        createdAt: now,
      })
      .returning();

    const newPhase = result[0];

    // 4. Log in goal history (find any training-related goal)
    const trainingGoals = db
      .select()
      .from(schema.goals)
      .where(eq(schema.goals.category, "training"))
      .all();

    for (const goal of trainingGoals) {
      db.insert(schema.goalHistory)
        .values({
          goalId: goal.id,
          eventType: "updated",
          oldValue: `Phase ${currentPhase.phaseNumber}: ${currentPhase.phaseName}`,
          newValue: `Phase ${newPhaseNumber}: ${data.phaseName}`,
          reason: "Training phase advanced via adaptive intelligence",
          eventDate: today,
          createdAt: now,
        })
        .run();
    }

    return success(
      {
        completedPhase: {
          id: currentPhase.id,
          phaseNumber: currentPhase.phaseNumber,
          phaseName: currentPhase.phaseName,
        },
        newPhase,
      },
      201
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return error(
        err.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; "),
        400
      );
    }
    return serverError(err);
  }
}
