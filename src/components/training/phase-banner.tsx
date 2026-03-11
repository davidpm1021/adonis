"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Target, Calendar, TrendingUp } from "lucide-react";
import { differenceInDays, differenceInWeeks, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

export interface TrainingPhase {
  id: number;
  phaseNumber: number;
  phaseName: string;
  startDate: string | null;
  endDate: string | null;
  status: string | null;
  prescribedWorkouts: string | null;
  progressionRules: string | null;
  notes: string | null;
  createdAt: string | null;
}

interface PhaseBannerProps {
  phase: TrainingPhase | null;
  loading?: boolean;
}

export function PhaseBanner({ phase, loading }: PhaseBannerProps) {
  const stats = useMemo(() => {
    if (!phase?.startDate) return null;

    const start = parseISO(phase.startDate);
    const now = new Date();
    const weekNumber = Math.max(1, differenceInWeeks(now, start) + 1);
    const daysSinceStart = differenceInDays(now, start);

    let daysRemaining: number | null = null;
    let totalDays: number | null = null;
    if (phase.endDate) {
      const end = parseISO(phase.endDate);
      daysRemaining = Math.max(0, differenceInDays(end, now));
      totalDays = differenceInDays(end, start);
    }

    return { weekNumber, daysSinceStart, daysRemaining, totalDays };
  }, [phase]);

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-bg-card p-4">
        <div className="skeleton h-5 w-40 mb-2" />
        <div className="skeleton h-4 w-64" />
      </div>
    );
  }

  if (!phase) {
    return (
      <div className="rounded-lg border border-border bg-bg-card p-4">
        <div className="flex items-center gap-2 text-text-muted">
          <Target className="h-4 w-4" />
          <span className="font-display text-sm">No active training phase</span>
        </div>
        <p className="text-xs text-text-muted mt-1">
          Create a training phase to start tracking your program.
        </p>
      </div>
    );
  }

  const progressPct =
    stats?.totalDays && stats.totalDays > 0
      ? Math.min(100, Math.round((stats.daysSinceStart / stats.totalDays) * 100))
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-accent-teal/20 bg-gradient-to-br from-accent-teal/5 to-transparent p-4"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Target className="h-4 w-4 text-accent-teal" />
            <h3 className="font-display text-sm font-bold tracking-wide text-text-primary">
              Phase {phase.phaseNumber}: {phase.phaseName}
            </h3>
          </div>

          <div className="flex items-center gap-4 text-xs text-text-secondary">
            {stats && (
              <>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Week {stats.weekNumber}
                </span>
                {stats.daysRemaining !== null && (
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {stats.daysRemaining} days remaining
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {phase.status && (
          <span
            className={cn(
              "shrink-0 rounded-full px-2.5 py-0.5 font-display text-[10px] font-semibold uppercase tracking-wider",
              phase.status === "active"
                ? "bg-accent-teal-dim text-accent-teal"
                : phase.status === "completed"
                ? "bg-accent-green-dim text-accent-green"
                : "bg-bg-card-hover text-text-muted"
            )}
          >
            {phase.status}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {progressPct !== null && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="font-display text-[10px] text-text-muted uppercase tracking-wider">
              Phase Progress
            </span>
            <span className="font-display text-[10px] tabular-nums text-accent-teal">
              {progressPct}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-bg-card-hover overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="h-full rounded-full bg-accent-teal"
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}
