"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface ConsistencyPeriod {
  days: number;
  label: string;
  consistencyPct: number;
  previousPct: number | null;
}

interface ConsistencyScoresProps {
  periods: ConsistencyPeriod[];
  loading?: boolean;
}

function scoreColor(pct: number): string {
  if (pct >= 80) return "text-accent-green";
  if (pct >= 60) return "text-accent-amber";
  return "text-accent-red";
}

function scoreBorderColor(pct: number): string {
  if (pct >= 80) return "border-accent-green/30";
  if (pct >= 60) return "border-accent-amber/30";
  return "border-accent-red/30";
}

function scoreBgColor(pct: number): string {
  if (pct >= 80) return "bg-accent-green/5";
  if (pct >= 60) return "bg-accent-amber/5";
  return "bg-accent-red/5";
}

export function ConsistencyScores({ periods, loading }: ConsistencyScoresProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[7, 30, 90].map((d) => (
          <Card key={d}>
            <CardTitle>{d}-Day Consistency</CardTitle>
            <CardContent>
              <div className="mt-2 h-10 w-24 animate-pulse rounded bg-border/30" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {periods.map((period, i) => {
        const delta =
          period.previousPct != null
            ? period.consistencyPct - period.previousPct
            : null;

        return (
          <motion.div
            key={period.days}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
          >
            <Card
              className={cn(
                scoreBorderColor(period.consistencyPct),
                scoreBgColor(period.consistencyPct)
              )}
            >
              <CardTitle>{period.label}</CardTitle>
              <CardContent>
                <div className="mt-2 flex items-baseline gap-2">
                  <span
                    className={cn(
                      "font-display text-4xl font-bold tabular-nums",
                      scoreColor(period.consistencyPct)
                    )}
                  >
                    {Math.round(period.consistencyPct)}
                  </span>
                  <span
                    className={cn(
                      "font-display text-lg",
                      scoreColor(period.consistencyPct)
                    )}
                  >
                    %
                  </span>
                </div>

                {delta != null && (
                  <div className="mt-1.5 flex items-center gap-1">
                    {Math.abs(delta) < 1 ? (
                      <Minus className="h-3.5 w-3.5 text-text-muted" />
                    ) : delta > 0 ? (
                      <TrendingUp className="h-3.5 w-3.5 text-accent-green" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5 text-accent-red" />
                    )}
                    <span
                      className={cn(
                        "font-display text-sm tabular-nums",
                        Math.abs(delta) < 1
                          ? "text-text-muted"
                          : delta > 0
                            ? "text-accent-green"
                            : "text-accent-red"
                      )}
                    >
                      {delta > 0 ? "+" : ""}
                      {delta.toFixed(1)}% vs prior period
                    </span>
                  </div>
                )}

                <p className="mt-1 text-xs text-text-muted">
                  Non-negotiable completion rate
                </p>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
