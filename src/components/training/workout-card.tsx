"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import {
  Dumbbell,
  Clock,
  Gauge,
  Check,
  X,
  Pencil,
  Trash2,
  ChevronDown,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface WorkoutExercise {
  id: number;
  workoutId: number;
  exerciseName: string;
  sets: number | null;
  reps: number | null;
  weightLbs: number | null;
  durationSeconds: number | null;
  distanceSteps: number | null;
  notes: string | null;
}

export interface Workout {
  id: number;
  date: string;
  workoutType: string;
  durationMinutes: number | null;
  rpe: number | null;
  completed: number | null;
  notes: string | null;
  coachFeedback: string | null;
  createdAt: string | null;
  exercises: WorkoutExercise[];
}

interface WorkoutCardProps {
  workout: Workout;
  onEdit: (workout: Workout) => void;
  onDelete: (id: number) => Promise<void>;
}

const WORKOUT_TYPE_ICON_COLOR: Record<string, string> = {
  Strength: "text-accent-teal",
  Cardio: "text-accent-amber",
  Mobility: "text-accent-green",
  Other: "text-text-secondary",
};

function formatVolume(sets: number | null, reps: number | null, weight: number | null): string {
  const parts: string[] = [];
  if (sets) parts.push(`${sets}s`);
  if (reps) parts.push(`${reps}r`);
  if (weight) parts.push(`${weight}lbs`);
  return parts.join(" x ") || "--";
}

export function WorkoutCard({ workout, onEdit, onDelete }: WorkoutCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const typeColor = WORKOUT_TYPE_ICON_COLOR[workout.workoutType] || "text-text-secondary";
  const isCompleted = workout.completed === 1;

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    setDeleting(true);
    try {
      await onDelete(workout.id);
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  // Calculate total volume for the workout
  const totalVolume = workout.exercises.reduce((sum, ex) => {
    if (ex.sets && ex.reps && ex.weightLbs) {
      return sum + ex.sets * ex.reps * ex.weightLbs;
    }
    return sum;
  }, 0);

  return (
    <Card className="overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-3">
        {/* Status icon */}
        <div
          className={cn(
            "flex items-center justify-center w-9 h-9 rounded-lg shrink-0",
            isCompleted ? "bg-accent-teal-dim" : "bg-accent-red-dim"
          )}
        >
          {isCompleted ? (
            <Check className="h-4 w-4 text-accent-teal" />
          ) : (
            <AlertCircle className="h-4 w-4 text-accent-red" />
          )}
        </div>

        {/* Title + meta */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex-1 min-w-0 text-left"
        >
          <div className="flex items-center gap-2">
            <span className={cn("font-display text-sm font-semibold", typeColor)}>
              {workout.workoutType}
            </span>
            {workout.rpe && (
              <span className="rounded bg-bg-card-elevated px-1.5 py-0.5 font-display text-[9px] font-semibold uppercase tracking-wider text-text-muted">
                RPE {workout.rpe}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-text-muted">
            {workout.durationMinutes && (
              <span className="flex items-center gap-1 font-display text-[11px] tabular-nums">
                <Clock className="h-3 w-3" />
                {workout.durationMinutes}min
              </span>
            )}
            <span className="font-display text-[11px] tabular-nums">
              {workout.exercises.length} exercise{workout.exercises.length !== 1 ? "s" : ""}
            </span>
            {totalVolume > 0 && (
              <span className="font-display text-[11px] tabular-nums">
                <Gauge className="inline h-3 w-3 mr-0.5" />
                {totalVolume.toLocaleString()} lbs vol
              </span>
            )}
          </div>
        </button>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onEdit(workout)}
            className="flex items-center justify-center w-7 h-7 rounded-md text-text-muted hover:text-accent-teal hover:bg-accent-teal-dim transition-colors"
            title="Edit workout"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className={cn(
              "flex items-center justify-center w-7 h-7 rounded-md transition-colors",
              confirmDelete
                ? "bg-accent-red/20 text-accent-red"
                : "text-text-muted hover:text-accent-red hover:bg-accent-red/10"
            )}
            title={confirmDelete ? "Click again to confirm" : "Delete workout"}
          >
            {deleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </button>

          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="flex items-center justify-center w-7 h-7 rounded-md text-text-muted hover:text-text-primary transition-colors"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </motion.div>
        </div>
      </div>

      {/* Expanded exercises list */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-border space-y-1.5">
              {workout.exercises.length === 0 ? (
                <p className="text-xs text-text-muted italic py-2">
                  No exercises logged
                </p>
              ) : (
                workout.exercises.map((ex) => (
                  <div
                    key={ex.id}
                    className="flex items-center gap-3 rounded-md px-3 py-2 bg-bg-primary"
                  >
                    <Dumbbell className="h-3.5 w-3.5 text-text-muted shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary truncate">
                        {ex.exerciseName}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="font-display text-[11px] tabular-nums text-accent-teal">
                          {formatVolume(ex.sets, ex.reps, ex.weightLbs)}
                        </span>
                        {ex.durationSeconds && (
                          <span className="font-display text-[11px] tabular-nums text-text-muted">
                            {ex.durationSeconds}s
                          </span>
                        )}
                        {ex.distanceSteps && (
                          <span className="font-display text-[11px] tabular-nums text-text-muted">
                            {ex.distanceSteps} steps
                          </span>
                        )}
                      </div>
                    </div>
                    {ex.notes && (
                      <span className="text-[10px] text-text-muted italic truncate max-w-[120px]">
                        {ex.notes}
                      </span>
                    )}
                  </div>
                ))
              )}

              {/* Coach feedback */}
              {workout.coachFeedback && (
                <div className="px-3 py-2 rounded-md bg-accent-teal-dim/30 border border-accent-teal/10">
                  <span className="font-display text-[10px] uppercase tracking-wider text-accent-teal">
                    Coach Check-in
                  </span>
                  <p className="text-xs text-text-secondary mt-0.5 whitespace-pre-line">
                    {workout.coachFeedback}
                  </p>
                </div>
              )}

              {/* Workout notes */}
              {workout.notes && (
                <div className="px-3 py-2 rounded-md bg-bg-primary">
                  <span className="font-display text-[10px] uppercase tracking-wider text-text-muted">
                    Notes
                  </span>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {workout.notes}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
