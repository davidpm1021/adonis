"use client";

import { useMemo } from "react";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { BarChart3, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SupplementEntry } from "./supplement-checklist";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ComplianceChartProps {
  logs: SupplementEntry[];
  last30Dates: string[];
}

interface PerSupplementCompliance {
  name: string;
  taken: number;
  total: number;
  pct: number;
}

interface DailyCompliance {
  date: string;
  taken: number;
  total: number;
  pct: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatShortDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function complianceColor(pct: number): string {
  if (pct >= 80) return "bg-accent-green";
  if (pct >= 50) return "bg-accent-amber";
  return "bg-accent-red";
}

function complianceTextColor(pct: number): string {
  if (pct >= 80) return "text-accent-green";
  if (pct >= 50) return "text-accent-amber";
  return "text-accent-red";
}

function heatmapCellColor(pct: number): string {
  if (pct < 0) return "bg-bg-primary"; // no data
  if (pct >= 80) return "bg-accent-green/60";
  if (pct >= 50) return "bg-accent-amber/60";
  return "bg-accent-red/60";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ComplianceChart({ logs, last30Dates }: ComplianceChartProps) {
  // Per-supplement 30-day compliance
  const perSupplement = useMemo<PerSupplementCompliance[]>(() => {
    const byName: Record<string, { taken: number; total: number }> = {};
    for (const log of logs) {
      if (!byName[log.supplementName]) {
        byName[log.supplementName] = { taken: 0, total: 0 };
      }
      byName[log.supplementName].total++;
      if (log.taken === 1) byName[log.supplementName].taken++;
    }

    return Object.entries(byName)
      .map(([name, stats]) => ({
        name,
        taken: stats.taken,
        total: stats.total,
        pct: stats.total > 0 ? Math.round((stats.taken / stats.total) * 100) : 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [logs]);

  // Daily compliance for heatmap
  const dailyCompliance = useMemo<DailyCompliance[]>(() => {
    const byDate: Record<string, { taken: number; total: number }> = {};
    for (const log of logs) {
      if (!byDate[log.date]) {
        byDate[log.date] = { taken: 0, total: 0 };
      }
      byDate[log.date].total++;
      if (log.taken === 1) byDate[log.date].taken++;
    }

    return last30Dates.map((date) => {
      const stats = byDate[date];
      if (!stats) return { date, taken: 0, total: 0, pct: -1 };
      return {
        date,
        taken: stats.taken,
        total: stats.total,
        pct: stats.total > 0 ? Math.round((stats.taken / stats.total) * 100) : -1,
      };
    });
  }, [logs, last30Dates]);

  if (perSupplement.length === 0) {
    return (
      <Card>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-accent-teal" />
          <CardTitle>30-Day Compliance</CardTitle>
        </div>
        <CardContent className="mt-3">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <BarChart3 className="h-8 w-8 text-text-muted mb-2" />
            <p className="text-sm text-text-secondary">No supplement data available for the last 30 days.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Per-Supplement Compliance Bars */}
      <Card>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-accent-teal" />
          <CardTitle>30-Day Compliance</CardTitle>
        </div>
        <CardContent className="mt-3">
          <div className="space-y-3">
            {perSupplement.map((supp) => (
              <div key={supp.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-body text-xs text-text-secondary truncate mr-2">
                    {supp.name}
                  </span>
                  <span className={cn("font-display text-xs tabular-nums shrink-0", complianceTextColor(supp.pct))}>
                    {supp.pct}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-bg-primary overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-300", complianceColor(supp.pct))}
                    style={{ width: `${supp.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Calendar Heatmap */}
      <Card>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-accent-teal" />
          <CardTitle>30-Day Heatmap</CardTitle>
        </div>
        <CardContent className="mt-3">
          <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-10">
            {dailyCompliance.map((day) => (
              <div
                key={day.date}
                className={cn(
                  "aspect-square rounded-md flex items-center justify-center",
                  heatmapCellColor(day.pct)
                )}
                title={`${formatShortDate(day.date)}: ${day.pct >= 0 ? `${day.pct}%` : "No data"}`}
              >
                <span className="font-display text-[9px] tabular-nums text-text-primary/80">
                  {day.date.split("-")[2]}
                </span>
              </div>
            ))}
          </div>
          {/* Legend */}
          <div className="mt-3 flex items-center justify-center gap-3 text-[10px] text-text-muted">
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-sm bg-accent-red/60" />
              <span>&lt;50%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-sm bg-accent-amber/60" />
              <span>50-79%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-sm bg-accent-green/60" />
              <span>80%+</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-sm bg-bg-primary" />
              <span>No data</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
