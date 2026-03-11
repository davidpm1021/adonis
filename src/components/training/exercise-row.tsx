"use client";

import { Trash2, GripVertical, Clock, Footprints } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ExerciseData {
  key: string;
  exerciseName: string;
  sets: number | null;
  reps: number | null;
  weightLbs: number | null;
  durationSeconds: number | null;
  distanceSteps: number | null;
  notes: string | null;
}

interface ExerciseRowProps {
  exercise: ExerciseData;
  onUpdate: (key: string, field: keyof ExerciseData, value: string | number | null) => void;
  onRemove: (key: string) => void;
  suggestions: string[];
}

const EXERCISE_INPUT_CLASS =
  "w-full rounded border border-border bg-bg-primary px-2 py-1.5 text-xs text-text-primary tabular-nums focus:outline-none focus:border-accent-teal/50 transition-colors";

export function ExerciseRow({
  exercise,
  onUpdate,
  onRemove,
  suggestions,
}: ExerciseRowProps) {
  return (
    <div className="rounded-lg border border-border bg-bg-primary p-3 space-y-2">
      {/* Exercise name + delete */}
      <div className="flex items-center gap-2">
        <GripVertical className="h-3.5 w-3.5 text-text-muted/40 shrink-0" />
        <div className="flex-1 relative">
          <input
            type="text"
            value={exercise.exerciseName}
            onChange={(e) => onUpdate(exercise.key, "exerciseName", e.target.value)}
            placeholder="Exercise name"
            list={`suggestions-${exercise.key}`}
            className="w-full rounded border border-border bg-bg-card px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-teal/50 transition-colors"
          />
          <datalist id={`suggestions-${exercise.key}`}>
            {suggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        <button
          type="button"
          onClick={() => onRemove(exercise.key)}
          className="shrink-0 flex items-center justify-center w-7 h-7 rounded-md text-text-muted hover:text-accent-red hover:bg-accent-red/10 transition-colors"
          title="Remove exercise"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Sets / Reps / Weight */}
      <div className="grid grid-cols-3 gap-2">
        <label className="space-y-1">
          <span className="font-display text-[9px] uppercase tracking-wider text-text-muted">
            Sets
          </span>
          <input
            type="number"
            min={0}
            step={1}
            value={exercise.sets ?? ""}
            onChange={(e) =>
              onUpdate(exercise.key, "sets", e.target.value ? parseInt(e.target.value) : null)
            }
            placeholder="0"
            className={EXERCISE_INPUT_CLASS}
          />
        </label>
        <label className="space-y-1">
          <span className="font-display text-[9px] uppercase tracking-wider text-text-muted">
            Reps
          </span>
          <input
            type="number"
            min={0}
            step={1}
            value={exercise.reps ?? ""}
            onChange={(e) =>
              onUpdate(exercise.key, "reps", e.target.value ? parseInt(e.target.value) : null)
            }
            placeholder="0"
            className={EXERCISE_INPUT_CLASS}
          />
        </label>
        <label className="space-y-1">
          <span className="font-display text-[9px] uppercase tracking-wider text-accent-teal">
            Weight (lbs)
          </span>
          <input
            type="number"
            min={0}
            step={2.5}
            value={exercise.weightLbs ?? ""}
            onChange={(e) =>
              onUpdate(exercise.key, "weightLbs", e.target.value ? parseFloat(e.target.value) : null)
            }
            placeholder="0"
            className={cn(EXERCISE_INPUT_CLASS, "border-accent-teal/20")}
          />
        </label>
      </div>

      {/* Duration / Distance (optional) */}
      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1">
          <span className="flex items-center gap-1 font-display text-[9px] uppercase tracking-wider text-text-muted">
            <Clock className="h-2.5 w-2.5" />
            Duration (sec)
          </span>
          <input
            type="number"
            min={0}
            step={1}
            value={exercise.durationSeconds ?? ""}
            onChange={(e) =>
              onUpdate(exercise.key, "durationSeconds", e.target.value ? parseInt(e.target.value) : null)
            }
            placeholder="--"
            className={EXERCISE_INPUT_CLASS}
          />
        </label>
        <label className="space-y-1">
          <span className="flex items-center gap-1 font-display text-[9px] uppercase tracking-wider text-text-muted">
            <Footprints className="h-2.5 w-2.5" />
            Distance / Steps
          </span>
          <input
            type="number"
            min={0}
            step={1}
            value={exercise.distanceSteps ?? ""}
            onChange={(e) =>
              onUpdate(exercise.key, "distanceSteps", e.target.value ? parseInt(e.target.value) : null)
            }
            placeholder="--"
            className={EXERCISE_INPUT_CLASS}
          />
        </label>
      </div>

      {/* Coach Notes */}
      <label className="space-y-1">
        <span className="font-display text-[9px] uppercase tracking-wider text-text-muted">
          Coach Notes
        </span>
        <textarea
          value={exercise.notes ?? ""}
          onChange={(e) =>
            onUpdate(exercise.key, "notes", e.target.value || null)
          }
          placeholder="Progression reasoning, form cues..."
          rows={2}
          className="w-full resize-y rounded border border-border bg-bg-card px-2.5 py-2 text-xs leading-relaxed text-text-secondary italic placeholder:text-text-muted/60 placeholder:not-italic focus:outline-none focus:border-accent-teal/50 transition-colors"
        />
      </label>
    </div>
  );
}
