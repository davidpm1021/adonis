"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Scale, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { TrendChart } from "@/components/charts/trend-chart";
import { cn } from "@/lib/utils";

export interface WeightEntry {
  date: string;
  weight: number | null;
}

interface WeightTrendProps {
  entries: WeightEntry[];
  startingWeight: number;
  goalWeightLow: number;
  goalWeightHigh: number;
  loading?: boolean;
}

export function WeightTrend({
  entries,
  startingWeight,
  goalWeightLow,
  goalWeightHigh,
  loading,
}: WeightTrendProps) {
  // Compute derived stats
  const stats = useMemo(() => {
    const validEntries = entries.filter(
      (e): e is { date: string; weight: number } => e.weight != null
    );
    if (validEntries.length === 0) return null;

    const latest = validEntries[validEntries.length - 1];
    const totalChange = latest.weight - startingWeight;
    const toGoal = latest.weight - (goalWeightLow + goalWeightHigh) / 2;

    // Rolling weekly weight change rate (last 4 weeks)
    let weeklyRate: number | null = null;
    if (validEntries.length >= 2) {
      const recentWindow = validEntries.slice(-28); // last ~4 weeks of entries
      if (recentWindow.length >= 2) {
        const first = recentWindow[0];
        const last = recentWindow[recentWindow.length - 1];
        const daysDiff =
          (new Date(last.date).getTime() - new Date(first.date).getTime()) /
          (1000 * 60 * 60 * 24);
        if (daysDiff > 0) {
          weeklyRate = ((last.weight - first.weight) / daysDiff) * 7;
        }
      }
    }

    return {
      current: latest.weight,
      totalChange,
      toGoal,
      weeklyRate,
    };
  }, [entries, startingWeight, goalWeightLow, goalWeightHigh]);

  const chartData = entries.map((e) => ({
    date: e.date,
    value: e.weight,
  }));

  if (loading) {
    return (
      <Card>
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-accent-teal" />
          <CardTitle>Weight Trend</CardTitle>
        </div>
        <CardContent className="mt-3">
          <div className="h-[320px] animate-pulse rounded bg-border/30" />
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.4 }}
    >
      <Card>
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-accent-teal" />
          <CardTitle>Body Composition Trend</CardTitle>
        </div>
        <CardContent className="mt-3">
          {/* Stats row */}
          {stats && (
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <span className="font-display text-xs text-text-muted uppercase tracking-wide">
                  Current
                </span>
                <p className="font-display text-xl font-bold tabular-nums text-text-primary">
                  {stats.current.toFixed(1)}
                  <span className="ml-1 text-xs font-normal text-text-muted">lbs</span>
                </p>
              </div>
              <div>
                <span className="font-display text-xs text-text-muted uppercase tracking-wide">
                  Total Change
                </span>
                <div className="flex items-center gap-1">
                  {stats.totalChange < 0 ? (
                    <TrendingDown className="h-3.5 w-3.5 text-accent-green" />
                  ) : stats.totalChange > 0 ? (
                    <TrendingUp className="h-3.5 w-3.5 text-accent-red" />
                  ) : (
                    <Minus className="h-3.5 w-3.5 text-text-muted" />
                  )}
                  <p
                    className={cn(
                      "font-display text-xl font-bold tabular-nums",
                      stats.totalChange < 0
                        ? "text-accent-green"
                        : stats.totalChange > 0
                          ? "text-accent-red"
                          : "text-text-muted"
                    )}
                  >
                    {stats.totalChange > 0 ? "+" : ""}
                    {stats.totalChange.toFixed(1)}
                    <span className="ml-1 text-xs font-normal text-text-muted">lbs</span>
                  </p>
                </div>
              </div>
              <div>
                <span className="font-display text-xs text-text-muted uppercase tracking-wide">
                  To Goal
                </span>
                <p
                  className={cn(
                    "font-display text-xl font-bold tabular-nums",
                    stats.toGoal <= 0 ? "text-accent-green" : "text-accent-amber"
                  )}
                >
                  {stats.toGoal > 0 ? "" : ""}
                  {stats.toGoal.toFixed(1)}
                  <span className="ml-1 text-xs font-normal text-text-muted">lbs</span>
                </p>
              </div>
              <div>
                <span className="font-display text-xs text-text-muted uppercase tracking-wide">
                  Rate
                </span>
                {stats.weeklyRate != null ? (
                  <p
                    className={cn(
                      "font-display text-xl font-bold tabular-nums",
                      stats.weeklyRate < 0
                        ? "text-accent-green"
                        : stats.weeklyRate > 0
                          ? "text-accent-red"
                          : "text-text-muted"
                    )}
                  >
                    {stats.weeklyRate > 0 ? "+" : ""}
                    {stats.weeklyRate.toFixed(2)}
                    <span className="ml-1 text-xs font-normal text-text-muted">
                      lbs/wk
                    </span>
                  </p>
                ) : (
                  <p className="font-display text-xl font-bold tabular-nums text-text-muted">
                    --
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Chart */}
          {chartData.length >= 2 ? (
            <TrendChart
              data={chartData}
              color="#00e5c7"
              height={320}
              referenceLines={[
                {
                  value: startingWeight,
                  label: `Start: ${startingWeight}`,
                  color: "#8b8b9e",
                  dashed: true,
                },
              ]}
              referenceBands={[
                {
                  y1: goalWeightLow,
                  y2: goalWeightHigh,
                  color: "#22c55e",
                  label: `Goal: ${goalWeightLow}-${goalWeightHigh}`,
                },
              ]}
              yAxisLabel="lbs"
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Scale className="h-8 w-8 text-text-muted mb-2" />
              <p className="text-sm text-text-secondary">
                Not enough data to display weight trend.
              </p>
              <p className="text-xs text-text-muted mt-1">
                Log at least 2 weight entries to see your trend.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
