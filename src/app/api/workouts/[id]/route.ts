import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  success,
  error,
  withErrorHandling,
  parseBody,
} from "@/lib/api";
import { workoutSchema } from "@/lib/validations";

// GET /api/workouts/[id] — Get workout by id including exercises
export const GET = withErrorHandling(async (_req, ctx) => {
  const { id } = await ctx.params;
  const workoutId = parseInt(id, 10);

  if (isNaN(workoutId)) {
    return error("Invalid workout ID", 400);
  }

  const workoutRows = await db
    .select()
    .from(schema.workouts)
    .where(eq(schema.workouts.id, workoutId))
    .limit(1);

  if (workoutRows.length === 0) {
    return error(`Workout ${workoutId} not found`, 404);
  }

  const exerciseRows = await db
    .select()
    .from(schema.exercises)
    .where(eq(schema.exercises.workoutId, workoutId));

  return success({ ...workoutRows[0], exercises: exerciseRows });
});

// PUT /api/workouts/[id] — Update workout by id with optional exercises
export const PUT = withErrorHandling(async (req, ctx) => {
  const { id } = await ctx.params;
  const workoutId = parseInt(id, 10);

  if (isNaN(workoutId)) {
    return error("Invalid workout ID", 400);
  }

  const existing = await db
    .select()
    .from(schema.workouts)
    .where(eq(schema.workouts.id, workoutId))
    .limit(1);

  if (existing.length === 0) {
    return error(`Workout ${workoutId} not found`, 404);
  }

  const data = await parseBody(req, workoutSchema.partial());

  // Extract exercises from data, update workout fields separately
  const { exercises, ...workoutFields } = data;

  // Update workout fields if any provided
  if (Object.keys(workoutFields).length > 0) {
    await db
      .update(schema.workouts)
      .set({
        ...workoutFields,
        createdAt: existing[0].createdAt, // preserve original
      })
      .where(eq(schema.workouts.id, workoutId));
  }

  // If exercises array provided, replace all exercises for this workout
  if (exercises !== undefined) {
    // Delete existing exercises
    await db
      .delete(schema.exercises)
      .where(eq(schema.exercises.workoutId, workoutId));

    // Insert new exercises
    if (exercises.length > 0) {
      for (const exercise of exercises) {
        await db.insert(schema.exercises).values({
          workoutId,
          exerciseName: exercise.exerciseName,
          sets: exercise.sets,
          reps: exercise.reps,
          weightLbs: exercise.weightLbs,
          durationSeconds: exercise.durationSeconds,
          distanceSteps: exercise.distanceSteps,
          notes: exercise.notes,
        });
      }
    }
  }

  // Fetch updated workout with exercises
  const updatedWorkout = await db
    .select()
    .from(schema.workouts)
    .where(eq(schema.workouts.id, workoutId))
    .limit(1);

  const updatedExercises = await db
    .select()
    .from(schema.exercises)
    .where(eq(schema.exercises.workoutId, workoutId));

  return success({ ...updatedWorkout[0], exercises: updatedExercises });
});

// DELETE /api/workouts/[id] — Delete workout and related exercises
export const DELETE = withErrorHandling(async (_req, ctx) => {
  const { id } = await ctx.params;
  const workoutId = parseInt(id, 10);

  if (isNaN(workoutId)) {
    return error("Invalid workout ID", 400);
  }

  const existing = await db
    .select()
    .from(schema.workouts)
    .where(eq(schema.workouts.id, workoutId))
    .limit(1);

  if (existing.length === 0) {
    return error(`Workout ${workoutId} not found`, 404);
  }

  // Delete exercises first (foreign key dependency)
  await db
    .delete(schema.exercises)
    .where(eq(schema.exercises.workoutId, workoutId));

  // Delete the workout
  await db
    .delete(schema.workouts)
    .where(eq(schema.workouts.id, workoutId));

  return success({ deleted: true, id: workoutId });
});
