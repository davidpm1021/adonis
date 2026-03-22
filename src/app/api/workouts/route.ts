export const dynamic = 'force-dynamic';

import { db } from "@/db";
import * as schema from "@/db/schema";
import { desc, gte, lte, and } from "drizzle-orm";
import {
  success,
  withErrorHandling,
  parseBody,
  dateRangeParams,
  nowISO,
} from "@/lib/api";
import { workoutSchema } from "@/lib/validations";
import { syncDailyLog } from "@/lib/sync-daily-log";

// GET /api/workouts — List workouts with optional date range & pagination
export const GET = withErrorHandling(async (req) => {
  const url = new URL(req.url);
  const { from, to, limit, offset } = dateRangeParams(url);

  const conditions = [];
  if (from) conditions.push(gte(schema.workouts.date, from));
  if (to) conditions.push(lte(schema.workouts.date, to));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(schema.workouts)
    .where(where)
    .orderBy(desc(schema.workouts.date))
    .limit(limit)
    .offset(offset);

  return success(rows);
});

// POST /api/workouts — Create a workout with exercises
export const POST = withErrorHandling(async (req) => {
  const data = await parseBody(req, workoutSchema);

  const now = nowISO();

  // Insert the workout first
  const workoutResult = await db
    .insert(schema.workouts)
    .values({
      date: data.date,
      workoutType: data.workoutType,
      durationMinutes: data.durationMinutes,
      rpe: data.rpe,
      completed: data.completed,
      notes: data.notes,
      coachFeedback: data.coachFeedback,
      createdAt: now,
    })
    .returning();

  const workout = workoutResult[0];

  // Insert exercises if provided
  const exerciseRows = [];
  if (data.exercises && data.exercises.length > 0) {
    for (const exercise of data.exercises) {
      const result = await db
        .insert(schema.exercises)
        .values({
          workoutId: workout.id,
          exerciseName: exercise.exerciseName,
          sets: exercise.sets,
          reps: exercise.reps,
          weightLbs: exercise.weightLbs,
          durationSeconds: exercise.durationSeconds,
          distanceSteps: exercise.distanceSteps,
          notes: exercise.notes,
        })
        .returning();
      exerciseRows.push(result[0]);
    }
  }

  // Sync: mark strengthTraining = 1 in daily_log for this date
  if (data.workoutType === "Strength") {
    await syncDailyLog(data.date, "strengthTraining", 1);
  }

  return success({ ...workout, exercises: exerciseRows }, 201);
});
