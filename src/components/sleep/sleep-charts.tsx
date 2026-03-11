"use client";

import { useMemo } from "react";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { TrendChart } from "@/components/charts/trend-chart";
import { Clock, Star, Timer } from "lucide-react";
import type { SleepLogEntry } from "./sleep-form";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SleepChartsProps {
  logs: SleepLogEntry[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SleepCharts({ logs }: SleepChartsProps) {
  // Sort ascending by date for charts
  const sortedLogs = useMemo(
    () => [...logs].sort((a, b) => a.date.localeCompare(b.date)),
    [logs]
  );

  // Duration chart data
  const durationData = useMemo(
    () =>
      sortedLogs
        .filter((l) => l.totalHours != null)
        .map((l) => ({ date: l.date, value: l.totalHours })),
    [sortedLogs]
  );

  // Quality chart data
  const qualityData = useMemo(
    () =>
      sortedLogs
        .filter((l) => l.sleepQuality != null)
        .map((l) => ({ date: l.date, value: l.sleepQuality })),
    [sortedLogs]
  );

  // Time to fall asleep chart data
  const fallAsleepData = useMemo(
    () =>
      sortedLogs
        .filter((l) => l.timeToFallAsleepMinutes != null)
        .map((l) => ({ date: l.date, value: l.timeToFallAsleepMinutes })),
    [sortedLogs]
  );

  const hasEnoughDuration = durationData.length >= 2;
  const hasEnoughQuality = qualityData.length >= 2;
  const hasEnoughFallAsleep = fallAsleepData.length >= 2;

  if (!hasEnoughDuration && !hasEnoughQuality && !hasEnoughFallAsleep) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Duration Chart */}
      {hasEnoughDuration && (
        <Card>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-accent-teal" />
            <CardTitle>Sleep Duration</CardTitle>
          </div>
          <CardContent className="mt-3">
            <TrendChart
              data={durationData}
              color="#00e5c7"
              height={260}
              yDomain={[0, 12]}
              referenceBands={[
                { y1: 7, y2: 8, color: "#22c55e", label: "Optimal (7-8h)" },
              ]}
              yAxisLabel="hours"
            />
          </CardContent>
        </Card>
      )}

      {/* Quality Chart */}
      {hasEnoughQuality && (
        <Card>
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-accent-teal" />
            <CardTitle>Sleep Quality</CardTitle>
          </div>
          <CardContent className="mt-3">
            <TrendChart
              data={qualityData}
              color="#a78bfa"
              height={260}
              yDomain={[0, 10]}
              referenceLines={[
                { value: 7, label: "Good (7+)", color: "#22c55e", dashed: true },
              ]}
              yAxisLabel="score"
            />
          </CardContent>
        </Card>
      )}

      {/* Time to Fall Asleep Chart */}
      {hasEnoughFallAsleep && (
        <Card>
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-accent-teal" />
            <CardTitle>Time to Fall Asleep</CardTitle>
          </div>
          <CardContent className="mt-3">
            <TrendChart
              data={fallAsleepData}
              color="#f59e0b"
              height={260}
              yDomain={[0, "auto"]}
              referenceLines={[
                { value: 20, label: "Target (<20m)", color: "#22c55e", dashed: true },
              ]}
              yAxisLabel="minutes"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
