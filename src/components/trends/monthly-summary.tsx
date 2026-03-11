"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { CalendarDays, Trophy } from "lucide-react";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  subMonths,
} from "date-fns";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DailyLogEntry {
  date: string;
  morningWalk: number | null;
  strengthTraining: number | null;
  ateLunchWithProtein: number | null;
  mobilityWork: number | null;
  supplementsTaken: number | null;
  alcoholFree: number | null;
  energy: number | null;
  mood: number | null;
}

export interface SleepEntry {
  date: string;
  totalHours: number | null;
  sleepQuality: number | null;
}

export interface WeightEntry {
  date: string;
  weight: number | null;
}

interface MonthlySummaryProps {
  dailyLogs: DailyLogEntry[];
  sleepEntries: SleepEntry[];
  weightEntries: WeightEntry[];
  loading?: boolean;
}

interface MonthData {
  label: string;
  consistencyPct: number;
  weightChange: number | null;
  avgSleepHours: number | null;
  avgSleepQuality: number | null;
  topAchievement: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MonthlySummary({
  dailyLogs,
  sleepEntries,
  weightEntries,
  loading,
}: MonthlySummaryProps) {
  const months = useMemo(() => {
    const now = new Date();
    const result: MonthData[] = [];

    for (let i = 0; i < 3; i++) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const monthLabel = format(monthDate, "MMMM yyyy");

      // Filter data for this month
      const monthLogs = dailyLogs.filter((log) => {
        try {
          const d = parseISO(log.date);
          return isWithinInterval(d, { start: monthStart, end: monthEnd });
        } catch {
          return false;
        }
      });

      const monthSleep = sleepEntries.filter((s) => {
        try {
          const d = parseISO(s.date);
          return isWithinInterval(d, { start: monthStart, end: monthEnd });
        } catch {
          return false;
        }
      });

      const monthWeights = weightEntries
        .filter((w) => {
          try {
            const d = parseISO(w.date);
            return (
              w.weight != null &&
              isWithinInterval(d, { start: monthStart, end: monthEnd })
            );
          } catch {
            return false;
          }
        })
        .sort((a, b) => a.date.localeCompare(b.date));

      // Consistency: non-negotiable completion
      let totalChecks = 0;
      let completedChecks = 0;
      for (const log of monthLogs) {
        const fields = [
          log.morningWalk,
          log.strengthTraining,
          log.ateLunchWithProtein,
          log.mobilityWork,
          log.supplementsTaken,
        ];
        for (const f of fields) {
          totalChecks++;
          if (f === 1) completedChecks++;
        }
      }
      const consistencyPct =
        totalChecks > 0 ? (completedChecks / totalChecks) * 100 : 0;

      // Weight change
      let weightChange: number | null = null;
      if (monthWeights.length >= 2) {
        const first = monthWeights[0].weight!;
        const last = monthWeights[monthWeights.length - 1].weight!;
        weightChange = last - first;
      }

      // Sleep averages
      const sleepHours = monthSleep
        .filter((s) => s.totalHours != null)
        .map((s) => s.totalHours!);
      const sleepQualities = monthSleep
        .filter((s) => s.sleepQuality != null)
        .map((s) => s.sleepQuality!);

      const avgSleepHours =
        sleepHours.length > 0
          ? sleepHours.reduce((a, b) => a + b, 0) / sleepHours.length
          : null;
      const avgSleepQuality =
        sleepQualities.length > 0
          ? sleepQualities.reduce((a, b) => a + b, 0) / sleepQualities.length
          : null;

      // Top achievement
      const achievements: string[] = [];
      if (consistencyPct >= 90) achievements.push("90%+ consistency");
      else if (consistencyPct >= 80) achievements.push("80%+ consistency");

      if (weightChange != null && weightChange < -2)
        achievements.push(`Lost ${Math.abs(weightChange).toFixed(1)} lbs`);

      const alcoholFreeDays = monthLogs.filter(
        (l) => l.alcoholFree === 1
      ).length;
      if (alcoholFreeDays === monthLogs.length && monthLogs.length > 0)
        achievements.push("100% alcohol-free");

      if (avgSleepQuality != null && avgSleepQuality >= 4)
        achievements.push("Excellent sleep quality");

      const topAchievement =
        achievements.length > 0
          ? achievements[0]
          : monthLogs.length > 0
            ? `${monthLogs.length} days logged`
            : "No data yet";

      result.push({
        label: monthLabel,
        consistencyPct,
        weightChange,
        avgSleepHours,
        avgSleepQuality,
        topAchievement,
      });
    }

    return result;
  }, [dailyLogs, sleepEntries, weightEntries]);

  if (loading) {
    return (
      <div>
        <div className="mb-3 flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-accent-teal" />
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-text-secondary">
            Monthly Summary
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent>
                <div className="h-[160px] animate-pulse rounded bg-border/30" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-accent-teal" />
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-text-secondary">
          Monthly Summary
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {months.map((month, i) => (
          <motion.div
            key={month.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + i * 0.1, duration: 0.4 }}
          >
            <Card>
              <CardTitle>{month.label}</CardTitle>
              <CardContent className="mt-3">
                <div className="space-y-3">
                  {/* Consistency */}
                  <div className="flex items-center justify-between">
                    <span className="font-display text-xs text-text-muted">
                      Consistency
                    </span>
                    <span
                      className={cn(
                        "font-display text-sm font-semibold tabular-nums",
                        month.consistencyPct >= 80
                          ? "text-accent-green"
                          : month.consistencyPct >= 60
                            ? "text-accent-amber"
                            : month.consistencyPct > 0
                              ? "text-accent-red"
                              : "text-text-muted"
                      )}
                    >
                      {month.consistencyPct > 0
                        ? `${month.consistencyPct.toFixed(0)}%`
                        : "--"}
                    </span>
                  </div>

                  {/* Weight change */}
                  <div className="flex items-center justify-between">
                    <span className="font-display text-xs text-text-muted">
                      Weight Change
                    </span>
                    <span
                      className={cn(
                        "font-display text-sm font-semibold tabular-nums",
                        month.weightChange == null
                          ? "text-text-muted"
                          : month.weightChange < 0
                            ? "text-accent-green"
                            : month.weightChange > 0
                              ? "text-accent-red"
                              : "text-text-muted"
                      )}
                    >
                      {month.weightChange != null
                        ? `${month.weightChange > 0 ? "+" : ""}${month.weightChange.toFixed(1)} lbs`
                        : "--"}
                    </span>
                  </div>

                  {/* Sleep */}
                  <div className="flex items-center justify-between">
                    <span className="font-display text-xs text-text-muted">
                      Avg Sleep
                    </span>
                    <span className="font-display text-sm tabular-nums text-text-primary">
                      {month.avgSleepHours != null
                        ? `${month.avgSleepHours.toFixed(1)}h`
                        : "--"}
                      {month.avgSleepQuality != null && (
                        <span className="ml-1 text-xs text-text-muted">
                          (Q: {month.avgSleepQuality.toFixed(1)}/5)
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Top achievement */}
                  <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-accent-amber/20 bg-accent-amber/5 px-2.5 py-1.5">
                    <Trophy className="h-3.5 w-3.5 text-accent-amber" />
                    <span className="font-display text-xs text-accent-amber">
                      {month.topAchievement}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
