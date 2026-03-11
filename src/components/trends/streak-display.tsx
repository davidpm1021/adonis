"use client";

import { motion } from "framer-motion";
import { Flame, Trophy } from "lucide-react";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface StreakData {
  [key: string]: { current: number; best: number };
}

interface StreakDisplayProps {
  streaks: StreakData;
  loading?: boolean;
}

const STREAK_LABELS: Record<string, { label: string; icon: string }> = {
  morningWalk: { label: "Morning Walk", icon: "walk" },
  strengthTraining: { label: "Strength Training", icon: "strength" },
  ateLunchWithProtein: { label: "Protein Lunch", icon: "protein" },
  mobilityWork: { label: "Mobility Work", icon: "mobility" },
  supplementsTaken: { label: "Supplements", icon: "supplements" },
  alcoholFree: { label: "Alcohol-Free", icon: "alcohol" },
};

export function StreakDisplay({ streaks, loading }: StreakDisplayProps) {
  if (loading) {
    return (
      <Card>
        <CardTitle>Current Streaks</CardTitle>
        <CardContent className="mt-3">
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-border/30" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const entries = Object.entries(streaks);

  return (
    <Card>
      <div className="flex items-center gap-2">
        <Flame className="h-4 w-4 text-accent-amber" />
        <CardTitle>Streaks</CardTitle>
      </div>
      <CardContent className="mt-3">
        <div className="space-y-3">
          {entries.map(([key, data], i) => {
            const label = STREAK_LABELS[key]?.label ?? key;
            const maxBar = Math.max(data.best, 1);
            const currentPct = Math.min((data.current / maxBar) * 100, 100);

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06, duration: 0.35 }}
                className="rounded-lg border border-border bg-bg-card-hover/30 px-3 py-2.5"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-display text-sm text-text-secondary">
                    {label}
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Flame
                        className={cn(
                          "h-3.5 w-3.5",
                          data.current > 0
                            ? "text-accent-amber"
                            : "text-text-muted"
                        )}
                      />
                      <span
                        className={cn(
                          "font-display text-sm font-semibold tabular-nums",
                          data.current > 0
                            ? "text-accent-amber"
                            : "text-text-muted"
                        )}
                      >
                        {data.current}d
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Trophy className="h-3 w-3 text-text-muted" />
                      <span className="font-display text-xs tabular-nums text-text-muted">
                        {data.best}d
                      </span>
                    </div>
                  </div>
                </div>

                {/* Streak progress bar */}
                <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-border/50">
                  <motion.div
                    className={cn(
                      "absolute left-0 top-0 h-full rounded-full",
                      data.current > 0
                        ? "bg-accent-amber"
                        : "bg-text-muted/30"
                    )}
                    initial={{ width: 0 }}
                    animate={{ width: `${currentPct}%` }}
                    transition={{ delay: i * 0.06 + 0.2, duration: 0.5, ease: "easeOut" }}
                  />
                  {/* Best marker */}
                  {data.best > 0 && data.current < data.best && (
                    <div
                      className="absolute top-0 h-full w-px bg-text-muted/50"
                      style={{ left: "100%" }}
                    />
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-3 flex items-center gap-4 text-xs text-text-muted">
          <div className="flex items-center gap-1">
            <Flame className="h-3 w-3 text-accent-amber" />
            <span>Current</span>
          </div>
          <div className="flex items-center gap-1">
            <Trophy className="h-3 w-3 text-text-muted" />
            <span>Record</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
