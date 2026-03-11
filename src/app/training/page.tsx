"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { WorkoutCalendar } from "@/components/training/workout-calendar";
import { PhaseBanner, type TrainingPhase } from "@/components/training/phase-banner";
import { WorkoutCard, type Workout } from "@/components/training/workout-card";
import { WorkoutForm } from "@/components/training/workout-form";
import { ExerciseProgress } from "@/components/training/exercise-progress";
import { CollapsibleSection } from "@/components/daily-log/collapsible-section";
import {
  Plus,
  Loader2,
  Dumbbell,
  CheckCircle,
  Target,
  ChevronDown,
  BookOpen,
  Cpu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  format,
  startOfMonth,
  endOfMonth,
  parseISO,
} from "date-fns";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayET(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/New_York",
  });
}

function formatDateDisplay(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    return format(date, "EEEE, MMMM d, yyyy");
  } catch {
    return dateStr;
  }
}

interface PrescribedWorkout {
  day: string;
  exercises: {
    name: string;
    sets: number;
    reps: string;
    notes?: string;
  }[];
}

interface ProgressionRule {
  rule: string;
  description?: string;
}

interface ExerciseHistoryPoint {
  date: string;
  totalVolume: number;
  maxWeight: number;
  sets: number;
  reps: number;
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function TrainingPage() {
  // Date / calendar state
  const [selectedDate, setSelectedDate] = useState(todayET);
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));

  // Data state
  const [phase, setPhase] = useState<TrainingPhase | null>(null);
  const [phaseLoading, setPhaseLoading] = useState(true);
  const [monthWorkouts, setMonthWorkouts] = useState<Workout[]>([]);
  const [monthLoading, setMonthLoading] = useState(true);
  const [allWorkouts, setAllWorkouts] = useState<Workout[]>([]);

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);

  // AI generate state
  const [generating, setGenerating] = useState(false);

  // Phase plan reference state
  const [phasePlanOpen, setPhasePlanOpen] = useState(false);

  // -------------------------------------------------------------------------
  // Fetch current training phase
  // -------------------------------------------------------------------------
  const fetchPhase = useCallback(async () => {
    setPhaseLoading(true);
    try {
      const res = await fetch("/api/training/phases/current");
      const json = await res.json();
      if (json.success) {
        setPhase(json.data);
      } else {
        setPhase(null);
      }
    } catch {
      setPhase(null);
    } finally {
      setPhaseLoading(false);
    }
  }, []);

  // -------------------------------------------------------------------------
  // Fetch workouts for the displayed month (for calendar dots)
  // -------------------------------------------------------------------------
  const fetchMonthWorkouts = useCallback(async () => {
    setMonthLoading(true);
    const from = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const to = format(endOfMonth(currentMonth), "yyyy-MM-dd");

    try {
      const res = await fetch(
        `/api/workouts?from=${from}&to=${to}&limit=200`
      );
      const json = await res.json();
      if (json.success) {
        setMonthWorkouts(json.data);
      }
    } catch {
      console.error("Failed to fetch month workouts");
    } finally {
      setMonthLoading(false);
    }
  }, [currentMonth]);

  // -------------------------------------------------------------------------
  // Fetch all workouts (for exercise progress charts)
  // -------------------------------------------------------------------------
  const fetchAllWorkouts = useCallback(async () => {
    try {
      const res = await fetch("/api/workouts?limit=500");
      const json = await res.json();
      if (json.success) {
        // For each workout, fetch exercises
        const workoutsWithExercises = await Promise.all(
          json.data.map(async (w: Workout) => {
            try {
              const detailRes = await fetch(`/api/workouts/${w.id}`);
              const detailJson = await detailRes.json();
              if (detailJson.success) {
                return detailJson.data;
              }
            } catch {
              // fallback
            }
            return { ...w, exercises: [] };
          })
        );
        setAllWorkouts(workoutsWithExercises);
      }
    } catch {
      console.error("Failed to fetch all workouts");
    }
  }, []);

  useEffect(() => {
    fetchPhase();
  }, [fetchPhase]);

  useEffect(() => {
    fetchMonthWorkouts();
  }, [fetchMonthWorkouts]);

  useEffect(() => {
    fetchAllWorkouts();
  }, [fetchAllWorkouts]);

  // -------------------------------------------------------------------------
  // Workouts for the selected date (from month data, with exercises)
  // -------------------------------------------------------------------------
  const [selectedDayWorkouts, setSelectedDayWorkouts] = useState<Workout[]>([]);
  const [selectedDayLoading, setSelectedDayLoading] = useState(false);

  const fetchSelectedDayWorkouts = useCallback(async () => {
    setSelectedDayLoading(true);
    try {
      const res = await fetch(
        `/api/workouts?from=${selectedDate}&to=${selectedDate}&limit=50`
      );
      const json = await res.json();
      if (json.success && json.data.length > 0) {
        // Fetch each workout with exercises
        const detailed = await Promise.all(
          json.data.map(async (w: Workout) => {
            try {
              const detailRes = await fetch(`/api/workouts/${w.id}`);
              const detailJson = await detailRes.json();
              if (detailJson.success) return detailJson.data;
            } catch {
              // fallback
            }
            return { ...w, exercises: [] };
          })
        );
        setSelectedDayWorkouts(detailed);
      } else {
        setSelectedDayWorkouts([]);
      }
    } catch {
      setSelectedDayWorkouts([]);
    } finally {
      setSelectedDayLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchSelectedDayWorkouts();
  }, [fetchSelectedDayWorkouts]);

  // -------------------------------------------------------------------------
  // Calendar workout day indicators
  // -------------------------------------------------------------------------
  const calendarWorkoutDays = useMemo(
    () =>
      monthWorkouts.map((w) => ({
        date: w.date,
        workoutType: w.workoutType,
        completed: w.completed,
      })),
    [monthWorkouts]
  );

  // -------------------------------------------------------------------------
  // Exercise progress data (aggregated from all workouts)
  // -------------------------------------------------------------------------
  const exerciseProgressMap = useMemo(() => {
    const map = new Map<string, ExerciseHistoryPoint[]>();

    // Sort all workouts by date ascending
    const sorted = [...allWorkouts].sort((a, b) => a.date.localeCompare(b.date));

    for (const w of sorted) {
      if (!w.exercises) continue;
      for (const ex of w.exercises) {
        const name = ex.exerciseName;
        if (!map.has(name)) map.set(name, []);
        const vol =
          (ex.sets ?? 0) * (ex.reps ?? 0) * (ex.weightLbs ?? 0);
        map.get(name)!.push({
          date: w.date,
          totalVolume: vol,
          maxWeight: ex.weightLbs ?? 0,
          sets: ex.sets ?? 0,
          reps: ex.reps ?? 0,
        });
      }
    }

    return map;
  }, [allWorkouts]);

  // Get top exercises by frequency for progress charts
  const topExercises = useMemo(() => {
    const entries = Array.from(exerciseProgressMap.entries());
    // Sort by number of data points (most trained first)
    entries.sort((a, b) => b[1].length - a[1].length);
    return entries.slice(0, 6); // Show top 6
  }, [exerciseProgressMap]);

  // -------------------------------------------------------------------------
  // Training consistency stats
  // -------------------------------------------------------------------------
  const consistencyStats = useMemo(() => {
    if (!phase?.startDate) return null;

    const phaseStart = phase.startDate;
    const phaseEnd = phase.endDate || todayET();
    const today = todayET();
    const effectiveEnd = phaseEnd < today ? phaseEnd : today;

    // Count workouts within phase date range
    const phaseWorkouts = allWorkouts.filter(
      (w) => w.date >= phaseStart && w.date <= effectiveEnd
    );

    const completedCount = phaseWorkouts.filter(
      (w) => w.completed === 1
    ).length;

    // Estimate planned workouts (3 per week for Strength plan)
    const startDate = parseISO(phaseStart);
    const endDate = parseISO(effectiveEnd);
    const daysDiff = Math.max(
      1,
      Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    );
    const weeksElapsed = Math.ceil(daysDiff / 7);
    const plannedCount = weeksElapsed * 3; // 3 workouts per week

    return {
      completed: completedCount,
      planned: plannedCount,
      total: phaseWorkouts.length,
      ratio: plannedCount > 0 ? completedCount / plannedCount : 0,
    };
  }, [phase, allWorkouts]);

  // -------------------------------------------------------------------------
  // Parse prescribed workouts from phase JSON
  // -------------------------------------------------------------------------
  const prescribedWorkouts = useMemo<PrescribedWorkout[]>(() => {
    if (!phase?.prescribedWorkouts) return [];
    try {
      return JSON.parse(phase.prescribedWorkouts);
    } catch {
      return [];
    }
  }, [phase]);

  const progressionRules = useMemo<ProgressionRule[]>(() => {
    if (!phase?.progressionRules) return [];
    try {
      return JSON.parse(phase.progressionRules);
    } catch {
      return [];
    }
  }, [phase]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  function handleRefresh() {
    fetchMonthWorkouts();
    fetchSelectedDayWorkouts();
    fetchAllWorkouts();
  }

  function handleFormSaved() {
    setFormOpen(false);
    setEditingWorkout(null);
    handleRefresh();
  }

  function handleEdit(workout: Workout) {
    setEditingWorkout(workout);
    setFormOpen(true);
  }

  async function handleDelete(id: number) {
    const res = await fetch(`/api/workouts/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      handleRefresh();
    }
  }

  function handleDateSelect(date: string) {
    setSelectedDate(date);
  }

  function handleOpenNewWorkout() {
    setEditingWorkout(null);
    setFormOpen(true);
  }

  async function handleGenerateWorkout() {
    setGenerating(true);
    try {
      const res = await fetch("/api/training/generate", { method: "POST" });
      const json = await res.json();
      if (!json.success || !json.data?.workout) {
        console.error("Generate failed:", json.error);
        return;
      }

      const gen = json.data.workout;

      // Build a synthetic Workout object to pre-fill the form
      const prefilled: Workout = {
        id: 0,
        date: todayET(),
        workoutType: gen.workoutType || "Strength",
        durationMinutes: gen.durationMinutes || null,
        rpe: gen.rpeTarget || null,
        completed: 0,
        notes: gen.notes || null,
        coachFeedback: null,
        createdAt: null,
        exercises: (gen.exercises || []).map((ex: { exerciseName: string; sets?: number; reps?: number; weightLbs?: number; notes?: string }, i: number) => ({
          id: -(i + 1),
          workoutId: 0,
          exerciseName: ex.exerciseName,
          sets: ex.sets ?? null,
          reps: ex.reps ?? null,
          weightLbs: ex.weightLbs ?? null,
          durationSeconds: null,
          distanceSteps: null,
          notes: ex.notes ?? null,
        })),
      };

      setEditingWorkout(prefilled);
      setFormOpen(true);
    } catch (err) {
      console.error("Generate error:", err);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Training"
        subtitle="Phase-based workout logging and progress tracking"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateWorkout}
              disabled={generating}
              className="flex items-center gap-1.5 rounded-lg border border-accent-amber/40 bg-accent-amber/10 px-3 py-2 text-xs font-display font-semibold text-accent-amber hover:bg-accent-amber/20 transition-all disabled:opacity-50"
            >
              {generating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Cpu className="h-3.5 w-3.5" />
              )}
              {generating ? "Generating..." : "Generate Workout"}
            </button>
            <button
              onClick={handleOpenNewWorkout}
              className="flex items-center gap-1.5 rounded-lg bg-accent-teal px-3 py-2 text-xs font-display font-semibold text-bg-primary hover:bg-accent-teal/90 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              Log Workout
            </button>
          </div>
        }
      />

      <div className="space-y-6">
        {/* Phase Banner */}
        <PhaseBanner phase={phase} loading={phaseLoading} />

        {/* Training Consistency */}
        {consistencyStats && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="h-4 w-4 text-accent-green" />
                <CardTitle className="mb-0">Training Consistency</CardTitle>
              </div>
              <CardContent>
                <div className="flex items-center gap-4 mb-2">
                  <span className="font-display text-2xl font-bold tabular-nums text-text-primary">
                    {consistencyStats.completed}
                    <span className="text-sm font-normal text-text-muted">
                      /{consistencyStats.planned}
                    </span>
                  </span>
                  <span className="font-display text-xs text-text-secondary">
                    workouts completed this phase
                  </span>
                </div>
                <div className="h-2 rounded-full bg-bg-card-hover overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Math.min(100, Math.round(consistencyStats.ratio * 100))}%`,
                    }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className={cn(
                      "h-full rounded-full",
                      consistencyStats.ratio >= 0.8
                        ? "bg-accent-green"
                        : consistencyStats.ratio >= 0.5
                        ? "bg-accent-amber"
                        : "bg-accent-red"
                    )}
                  />
                </div>
                <p className="font-display text-[10px] tabular-nums text-text-muted mt-1.5 text-right">
                  {Math.round(consistencyStats.ratio * 100)}% adherence
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Calendar */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <WorkoutCalendar
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            workoutDays={calendarWorkoutDays}
          />
        </motion.div>

        {/* Selected Day Workouts */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-display text-sm font-semibold text-text-primary">
                {formatDateDisplay(selectedDate)}
              </h2>
              <p className="text-xs text-text-muted">
                {selectedDayWorkouts.length} workout
                {selectedDayWorkouts.length !== 1 ? "s" : ""} logged
              </p>
            </div>
            <button
              onClick={handleOpenNewWorkout}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-display font-medium text-accent-teal hover:bg-accent-teal-dim hover:border-accent-teal/30 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          </div>

          {selectedDayLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
            </div>
          ) : selectedDayWorkouts.length === 0 ? (
            <Card className="py-8 text-center">
              <Dumbbell className="mx-auto h-8 w-8 text-text-muted/30 mb-2" />
              <p className="text-sm text-text-muted">
                No workouts logged for this date
              </p>
              <button
                onClick={handleOpenNewWorkout}
                className="mt-3 text-xs text-accent-teal hover:text-accent-teal/80 transition-colors"
              >
                + Log a workout
              </button>
            </Card>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {selectedDayWorkouts.map((workout) => (
                  <motion.div
                    key={workout.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <WorkoutCard
                      workout={workout}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* Exercise Progress Charts */}
        {topExercises.length > 0 && (
          <CollapsibleSection
            title="Exercise Progress"
            icon={<Target className="h-4 w-4 text-accent-teal" />}
            defaultOpen={false}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {topExercises.map(([name, history]) => (
                <ExerciseProgress
                  key={name}
                  exerciseName={name}
                  history={history}
                />
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Phase Plan Reference */}
        {(prescribedWorkouts.length > 0 || progressionRules.length > 0) && (
          <CollapsibleSection
            title="Phase Plan Reference"
            icon={<BookOpen className="h-4 w-4 text-accent-amber" />}
            defaultOpen={false}
          >
            <div className="space-y-4">
              {/* Prescribed Workouts */}
              {prescribedWorkouts.length > 0 && (
                <div>
                  <h4 className="font-display text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-2">
                    Prescribed Workouts
                  </h4>
                  <div className="space-y-3">
                    {prescribedWorkouts.map((pw, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-border bg-bg-primary p-3"
                      >
                        <h5 className="font-display text-xs font-semibold text-accent-teal mb-2">
                          {pw.day}
                        </h5>
                        <div className="space-y-1">
                          {pw.exercises?.map((ex, j) => (
                            <div
                              key={j}
                              className="flex items-center justify-between text-xs"
                            >
                              <span className="text-text-primary">
                                {ex.name}
                              </span>
                              <span className="font-display tabular-nums text-text-muted">
                                {ex.sets} x {ex.reps}
                                {ex.notes ? ` (${ex.notes})` : ""}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Progression Rules */}
              {progressionRules.length > 0 && (
                <div>
                  <h4 className="font-display text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-2">
                    Progression Rules
                  </h4>
                  <div className="space-y-1.5">
                    {progressionRules.map((rule, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 rounded-lg bg-bg-primary px-3 py-2"
                      >
                        <span className="font-display text-[10px] text-accent-amber mt-0.5 shrink-0">
                          #{i + 1}
                        </span>
                        <div>
                          <p className="text-xs text-text-primary">
                            {rule.rule}
                          </p>
                          {rule.description && (
                            <p className="text-[11px] text-text-muted mt-0.5">
                              {rule.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CollapsibleSection>
        )}
      </div>

      {/* Workout Form Modal */}
      <AnimatePresence>
        {formOpen && (
          <WorkoutForm
            date={selectedDate}
            editWorkout={editingWorkout}
            onClose={() => {
              setFormOpen(false);
              setEditingWorkout(null);
            }}
            onSaved={handleFormSaved}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
