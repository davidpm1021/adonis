"use client";

import { useMemo } from "react";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { Activity, Moon, Timer, Wind } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SleepLogEntry } from "./sleep-form";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SleepStatsProps {
  logs: SleepLogEntry[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function getTodayET(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SleepStats({ logs }: SleepStatsProps) {
  const stats = useMemo(() => {
    const cutoff7 = daysAgo(7);
    const cutoff30 = daysAgo(30);

    const last7 = logs.filter((l) => l.date >= cutoff7);
    const last30 = logs.filter((l) => l.date >= cutoff30);

    const duration7 = average(last7.filter((l) => l.totalHours != null).map((l) => l.totalHours!));
    const duration30 = average(last30.filter((l) => l.totalHours != null).map((l) => l.totalHours!));

    const quality7 = average(last7.filter((l) => l.sleepQuality != null).map((l) => l.sleepQuality!));
    const quality30 = average(last30.filter((l) => l.sleepQuality != null).map((l) => l.sleepQuality!));

    const fallAsleep30 = average(
      last30.filter((l) => l.timeToFallAsleepMinutes != null).map((l) => l.timeToFallAsleepMinutes!)
    );

    const bipapEntries30 = last30.filter((l) => l.bipapUsed != null);
    const bipapUsed30 = bipapEntries30.filter((l) => l.bipapUsed === 1).length;
    const bipapPct = bipapEntries30.length > 0 ? Math.round((bipapUsed30 / bipapEntries30.length) * 100) : null;

    return {
      duration7,
      duration30,
      quality7,
      quality30,
      fallAsleep30,
      bipapPct,
    };
  }, [logs]);

  const hasStats = stats.duration7 != null || stats.duration30 != null || stats.quality7 != null;

  if (!hasStats) {
    return null;
  }

  return (
    <Card>
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-accent-teal" />
        <CardTitle>Sleep Summary</CardTitle>
      </div>
      <CardContent className="mt-3">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {/* Avg Duration */}
          <StatCard
            icon={<Moon className="h-4 w-4 text-accent-teal" />}
            label="Avg Duration"
            values={[
              { period: "7d", value: stats.duration7, format: (v) => `${v.toFixed(1)}h`, goodMin: 7, goodMax: 9 },
              { period: "30d", value: stats.duration30, format: (v) => `${v.toFixed(1)}h`, goodMin: 7, goodMax: 9 },
            ]}
          />

          {/* Avg Quality */}
          <StatCard
            icon={<Activity className="h-4 w-4 text-accent-teal" />}
            label="Avg Quality"
            values={[
              { period: "7d", value: stats.quality7, format: (v) => v.toFixed(1), goodMin: 7, goodMax: 10 },
              { period: "30d", value: stats.quality30, format: (v) => v.toFixed(1), goodMin: 7, goodMax: 10 },
            ]}
          />

          {/* Avg Fall Asleep Time */}
          <div className="rounded-lg border border-border bg-bg-primary p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Timer className="h-3.5 w-3.5 text-accent-teal" />
              <span className="font-display text-[10px] text-text-muted uppercase tracking-wide">
                Fall Asleep
              </span>
            </div>
            {stats.fallAsleep30 != null ? (
              <div>
                <span
                  className={cn(
                    "font-display text-lg font-bold tabular-nums",
                    stats.fallAsleep30 <= 20 ? "text-accent-green" : stats.fallAsleep30 <= 30 ? "text-accent-amber" : "text-accent-red"
                  )}
                >
                  {Math.round(stats.fallAsleep30)}
                </span>
                <span className="text-xs text-text-muted ml-1">min (30d)</span>
              </div>
            ) : (
              <span className="font-display text-sm text-text-muted">--</span>
            )}
          </div>

          {/* BiPAP Compliance */}
          <div className="rounded-lg border border-border bg-bg-primary p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Wind className="h-3.5 w-3.5 text-accent-teal" />
              <span className="font-display text-[10px] text-text-muted uppercase tracking-wide">
                BiPAP (30d)
              </span>
            </div>
            {stats.bipapPct != null ? (
              <div>
                <span
                  className={cn(
                    "font-display text-lg font-bold tabular-nums",
                    stats.bipapPct >= 80 ? "text-accent-green" : stats.bipapPct >= 50 ? "text-accent-amber" : "text-accent-red"
                  )}
                >
                  {stats.bipapPct}
                </span>
                <span className="text-xs text-text-muted ml-1">%</span>
              </div>
            ) : (
              <span className="font-display text-sm text-text-muted">--</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: Stat Card with 7d/30d
// ---------------------------------------------------------------------------

interface StatValue {
  period: string;
  value: number | null;
  format: (v: number) => string;
  goodMin: number;
  goodMax: number;
}

function StatCard({
  icon,
  label,
  values,
}: {
  icon: React.ReactNode;
  label: string;
  values: StatValue[];
}) {
  return (
    <div className="rounded-lg border border-border bg-bg-primary p-3">
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <span className="font-display text-[10px] text-text-muted uppercase tracking-wide">
          {label}
        </span>
      </div>
      <div className="space-y-1">
        {values.map((v) => (
          <div key={v.period} className="flex items-baseline justify-between">
            <span className="text-[10px] text-text-muted">{v.period}</span>
            {v.value != null ? (
              <span
                className={cn(
                  "font-display text-sm font-bold tabular-nums",
                  v.value >= v.goodMin && v.value <= v.goodMax
                    ? "text-accent-green"
                    : v.value >= v.goodMin - 1
                      ? "text-accent-amber"
                      : "text-accent-red"
                )}
              >
                {v.format(v.value)}
              </span>
            ) : (
              <span className="font-display text-sm text-text-muted">--</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
