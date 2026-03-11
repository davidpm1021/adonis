"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CardTitle } from "@/components/ui/card";
import {
  X,
  Plus,
  Check,
  Loader2,
  AlertCircle,
  Dumbbell,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ExerciseRow, type ExerciseData } from "./exercise-row";
import type { Workout, WorkoutExercise } from "./workout-card";

type WorkoutType = "Strength" | "Cardio" | "Mobility" | "Other";

const WORKOUT_TYPES: WorkoutType[] = ["Strength", "Cardio", "Mobility", "Other"];

const PHASE1_EXERCISES = [
  "Goblet Squat",
  "Push-ups",
  "Dumbbell Row",
  "Kettlebell Deadlift",
  "Dead Bug",
  "Plank",
  "Farmer Carry",
];

interface WorkoutFormProps {
  date: string;
  editWorkout?: Workout | null;
  onClose: () => void;
  onSaved: () => void;
}

function todayET(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/New_York",
  });
}

function createExerciseKey(): string {
  return `ex-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function workoutExerciseToData(ex: WorkoutExercise): ExerciseData {
  return {
    key: createExerciseKey(),
    exerciseName: ex.exerciseName,
    sets: ex.sets,
    reps: ex.reps,
    weightLbs: ex.weightLbs,
    durationSeconds: ex.durationSeconds,
    distanceSteps: ex.distanceSteps,
    notes: ex.notes,
  };
}

export function WorkoutForm({
  date,
  editWorkout,
  onClose,
  onSaved,
}: WorkoutFormProps) {
  const isEditing = !!editWorkout && editWorkout.id > 0;

  // Form state
  const [formDate, setFormDate] = useState(editWorkout?.date ?? date);
  const [workoutType, setWorkoutType] = useState<WorkoutType>(
    (editWorkout?.workoutType as WorkoutType) ?? "Strength"
  );
  const [durationMinutes, setDurationMinutes] = useState(
    editWorkout?.durationMinutes?.toString() ?? ""
  );
  const [rpe, setRpe] = useState<number | null>(editWorkout?.rpe ?? null);
  const [completed, setCompleted] = useState<boolean>(
    editWorkout ? editWorkout.completed === 1 : true
  );
  const [notes, setNotes] = useState(editWorkout?.notes ?? "");
  const [coachFeedback, setCoachFeedback] = useState(editWorkout?.coachFeedback ?? "");
  const [exercises, setExercises] = useState<ExerciseData[]>(
    editWorkout?.exercises.map(workoutExerciseToData) ?? []
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add exercise row
  function addExercise() {
    setExercises((prev) => [
      ...prev,
      {
        key: createExerciseKey(),
        exerciseName: "",
        sets: null,
        reps: null,
        weightLbs: null,
        durationSeconds: null,
        distanceSteps: null,
        notes: null,
      },
    ]);
  }

  function updateExercise(
    key: string,
    field: keyof ExerciseData,
    value: string | number | null
  ) {
    setExercises((prev) =>
      prev.map((ex) => (ex.key === key ? { ...ex, [field]: value } : ex))
    );
  }

  function removeExercise(key: string) {
    setExercises((prev) => prev.filter((ex) => ex.key !== key));
  }

  // Save handler
  async function handleSave() {
    setError(null);

    // Validate
    if (!formDate) {
      setError("Date is required");
      return;
    }

    const validExercises = exercises.filter((ex) => ex.exerciseName.trim());

    const payload = {
      date: formDate,
      workoutType,
      durationMinutes: durationMinutes ? parseInt(durationMinutes) : null,
      rpe,
      completed: completed ? 1 : 0,
      notes: notes.trim() || null,
      coachFeedback: coachFeedback.trim() || null,
      exercises: validExercises.map((ex) => ({
        exerciseName: ex.exerciseName.trim(),
        sets: ex.sets,
        reps: ex.reps,
        weightLbs: ex.weightLbs,
        durationSeconds: ex.durationSeconds,
        distanceSteps: ex.distanceSteps,
        notes: ex.notes,
      })),
    };

    setSaving(true);

    try {
      const url = isEditing
        ? `/api/workouts/${editWorkout.id}`
        : "/api/workouts";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Failed to save workout");
        return;
      }

      onSaved();
    } catch {
      setError("Network error while saving");
    } finally {
      setSaving(false);
    }
  }

  // RPE button row values
  const rpeValues = Array.from({ length: 10 }, (_, i) => i + 1);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-bg-card border border-border"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-bg-card border-b border-border px-5 py-4 flex items-center justify-between">
          <div>
            <CardTitle className="mb-0">
              {isEditing ? "Edit Workout" : editWorkout && editWorkout.id === 0 ? "Generated Workout" : "Log Workout"}
            </CardTitle>
            <p className="text-[11px] text-text-muted font-display mt-0.5">
              {formDate}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-card-hover transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form body */}
        <div className="p-5 space-y-5">
          {/* Date + Workout Type row */}
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className="font-display text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                Date
              </span>
              <input
                type="date"
                value={formDate}
                max={todayET()}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-teal/50 focus:ring-1 focus:ring-accent-teal/20 transition-colors"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="font-display text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                Type
              </span>
              <select
                value={workoutType}
                onChange={(e) => setWorkoutType(e.target.value as WorkoutType)}
                className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-teal/50 focus:ring-1 focus:ring-accent-teal/20 transition-colors"
              >
                {WORKOUT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Duration */}
          <label className="block space-y-1.5">
            <span className="font-display text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
              Duration (minutes)
            </span>
            <input
              type="number"
              min={0}
              max={300}
              step={1}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              placeholder="e.g. 45"
              className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2.5 text-sm text-text-primary tabular-nums placeholder:text-text-muted focus:outline-none focus:border-accent-teal/50 focus:ring-1 focus:ring-accent-teal/20 transition-colors"
            />
          </label>

          {/* RPE */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-display text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                RPE (Rate of Perceived Exertion)
              </span>
              {rpe !== null && (
                <span className="font-display text-xs tabular-nums text-accent-teal">
                  {rpe}
                </span>
              )}
            </div>
            <div className="flex gap-1">
              {rpeValues.map((num) => {
                const isSelected = rpe === num;
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setRpe(rpe === num ? null : num)}
                    className={cn(
                      "flex h-9 w-full max-w-[36px] items-center justify-center rounded-md border text-xs font-display tabular-nums transition-all duration-100",
                      isSelected
                        ? "border-accent-teal bg-accent-teal text-bg-primary font-bold"
                        : "border-border bg-bg-primary text-text-muted hover:border-border-hover hover:text-text-secondary"
                    )}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Completed toggle */}
          <div className="flex items-center justify-between">
            <span className="font-display text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
              Completed
            </span>
            <button
              type="button"
              onClick={() => setCompleted(!completed)}
              className={cn(
                "relative w-11 h-6 rounded-full transition-colors duration-200",
                completed ? "bg-accent-teal" : "bg-bg-card-hover"
              )}
            >
              <motion.div
                animate={{ x: completed ? 20 : 2 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="absolute top-1 w-4 h-4 rounded-full bg-white shadow"
              />
            </button>
          </div>

          {/* Exercises section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-display text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                Exercises ({exercises.length})
              </span>
              <button
                type="button"
                onClick={addExercise}
                className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-display font-medium text-accent-teal hover:bg-accent-teal-dim hover:border-accent-teal/30 transition-all"
              >
                <Plus className="h-3 w-3" />
                Add
              </button>
            </div>

            <AnimatePresence mode="popLayout">
              {exercises.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-6 text-center border border-dashed border-border rounded-lg"
                >
                  <Dumbbell className="mx-auto h-6 w-6 text-text-muted/40 mb-1.5" />
                  <p className="text-xs text-text-muted">
                    No exercises added yet
                  </p>
                  <button
                    type="button"
                    onClick={addExercise}
                    className="mt-2 text-xs text-accent-teal hover:text-accent-teal/80 transition-colors"
                  >
                    + Add first exercise
                  </button>
                </motion.div>
              ) : (
                <div className="space-y-2">
                  {exercises.map((ex) => (
                    <motion.div
                      key={ex.key}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ExerciseRow
                        exercise={ex}
                        onUpdate={updateExercise}
                        onRemove={removeExercise}
                        suggestions={PHASE1_EXERCISES}
                      />
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Workout notes */}
          <label className="block space-y-1.5">
            <span className="font-display text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
              Workout Notes
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How did the workout feel? Any observations..."
              rows={2}
              className="w-full resize-y rounded-lg border border-border bg-bg-primary px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-teal/50 focus:ring-1 focus:ring-accent-teal/20 transition-colors"
            />
          </label>

          {/* Coach Check-in */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-3.5 w-3.5 text-accent-teal" />
              <span className="font-display text-[11px] font-semibold uppercase tracking-wider text-accent-teal">
                Coach Check-in
              </span>
            </div>
            <p className="text-[11px] text-text-muted leading-relaxed">
              Tell your AI coach how the workout went. Struggled with an exercise? Form issues? Energy levels? This feedback shapes your future workouts.
            </p>
            <textarea
              value={coachFeedback}
              onChange={(e) => setCoachFeedback(e.target.value)}
              placeholder={"e.g. Push-ups were really hard today, had to drop to knees after set 2. Goblet squats felt great though — could probably go heavier next time. Left Achilles was a bit tight during farmer carries."}
              rows={3}
              className="w-full resize-y rounded-lg border border-accent-teal/20 bg-accent-teal-dim/20 px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-accent-teal/50 focus:ring-1 focus:ring-accent-teal/20 transition-colors"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-accent-red-dim px-3 py-2 text-xs text-accent-red">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Save button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={cn(
              "w-full flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-display text-sm font-semibold transition-all",
              !saving
                ? "bg-accent-teal text-bg-primary hover:bg-accent-teal/90"
                : "bg-bg-card-hover text-text-muted cursor-not-allowed"
            )}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                {isEditing ? "Update Workout" : "Save Workout"}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
