"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { SleepForm, type SleepLogEntry, type SleepFormData } from "@/components/sleep/sleep-form";
import { SleepCharts } from "@/components/sleep/sleep-charts";
import { SleepStats } from "@/components/sleep/sleep-stats";
import { ChevronLeft, ChevronRight, Loader2, Moon, BedDouble, Wind } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTodayET(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

function shiftDate(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA");
}

function formatDisplayDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  const today = getTodayET();
  const yesterday = shiftDate(today, -1);

  if (dateStr === today) return "Today";
  if (dateStr === yesterday) return "Yesterday";

  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatShortDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function qualityColor(q: number | null): string {
  if (q == null) return "text-text-muted";
  if (q >= 8) return "text-accent-green";
  if (q >= 6) return "text-accent-teal";
  if (q >= 4) return "text-accent-amber";
  return "text-accent-red";
}

function durationColor(h: number | null): string {
  if (h == null) return "text-text-muted";
  if (h >= 7 && h <= 9) return "text-accent-green";
  if (h >= 6) return "text-accent-amber";
  return "text-accent-red";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SleepPage() {
  const [selectedDate, setSelectedDate] = useState(getTodayET);
  const [existingEntry, setExistingEntry] = useState<SleepLogEntry | null>(null);
  const [allLogs, setAllLogs] = useState<SleepLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Fetch existing sleep entry for selected date
  // -------------------------------------------------------------------------
  const fetchDayEntry = useCallback(async (date: string) => {
    try {
      const res = await fetch(`/api/sleep/${date}`);
      if (res.status === 404) {
        setExistingEntry(null);
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch sleep log");
      const json = await res.json();
      if (json.success) {
        setExistingEntry(json.data);
      }
    } catch {
      setExistingEntry(null);
    }
  }, []);

  // -------------------------------------------------------------------------
  // Fetch all sleep logs (last 60 days for trends)
  // -------------------------------------------------------------------------
  const fetchAllLogs = useCallback(async () => {
    try {
      const from = shiftDate(getTodayET(), -60);
      const res = await fetch(`/api/sleep?from=${from}&limit=200`);
      if (!res.ok) throw new Error("Failed to fetch sleep logs");
      const json = await res.json();
      if (json.success) {
        setAllLogs(json.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sleep data");
    }
  }, []);

  // -------------------------------------------------------------------------
  // Initial load
  // -------------------------------------------------------------------------
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      await Promise.all([fetchDayEntry(selectedDate), fetchAllLogs()]);
      setIsLoading(false);
    };
    load();
  }, [selectedDate, fetchDayEntry, fetchAllLogs]);

  // -------------------------------------------------------------------------
  // Save handler
  // -------------------------------------------------------------------------
  const handleSave = async (data: SleepFormData) => {
    const res = await fetch("/api/sleep", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(errJson?.error || `Save failed (${res.status})`);
    }

    // Refresh data
    await Promise.all([fetchDayEntry(selectedDate), fetchAllLogs()]);
  };

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------
  const goToPrevDay = () => setSelectedDate((d) => shiftDate(d, -1));
  const goToNextDay = () => {
    const today = getTodayET();
    setSelectedDate((d) => {
      const next = shiftDate(d, 1);
      return next > today ? d : next;
    });
  };
  const goToToday = () => setSelectedDate(getTodayET());

  const isToday = selectedDate === getTodayET();

  // Recent logs for table (last 14)
  const recentLogs = allLogs
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 14);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div>
      <PageHeader
        title="Sleep"
        subtitle="Sleep quality and duration tracking"
      />

      <div className="space-y-4">
        {/* Date Selector */}
        <div className="mx-auto max-w-3xl flex items-center justify-between rounded-lg border border-border bg-bg-card px-4 py-3">
          <button
            type="button"
            onClick={goToPrevDay}
            className="rounded-md p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-primary transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3">
            <span className="font-display text-sm font-semibold text-text-primary">
              {formatDisplayDate(selectedDate)}
            </span>
            <input
              type="date"
              value={selectedDate}
              max={getTodayET()}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-md border border-border bg-bg-primary px-2 py-1 font-display text-xs text-text-secondary tabular-nums focus:border-accent-teal focus:outline-none [color-scheme:dark]"
            />
            {!isToday && (
              <button
                type="button"
                onClick={goToToday}
                className="rounded-md bg-accent-teal-dim px-2 py-1 font-display text-xs text-accent-teal hover:bg-accent-teal/20 transition-colors"
              >
                Today
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={goToNextDay}
            disabled={isToday}
            className={cn(
              "rounded-md p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-primary transition-colors",
              isToday && "opacity-30 cursor-not-allowed"
            )}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-accent-teal" />
            <span className="ml-2 text-sm text-text-secondary">Loading sleep data...</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-accent-red/30 bg-accent-red-dim px-4 py-3 text-sm text-accent-red">
            {error}
          </div>
        )}

        {!isLoading && (
          <>
            {/* Sleep Form */}
            <div className="mx-auto max-w-3xl">
              <SleepForm
                date={selectedDate}
                existingEntry={existingEntry}
                onSave={handleSave}
              />
            </div>

            {/* Empty state when no sleep data exists */}
            {allLogs.length === 0 && !existingEntry && (
              <div className="mx-auto max-w-3xl rounded-lg border border-border bg-bg-card p-8 text-center">
                <Moon className="h-10 w-10 text-text-muted/30 mx-auto mb-3" />
                <p className="font-display text-sm font-semibold text-text-primary mb-1">
                  No Sleep Data Yet
                </p>
                <p className="text-xs text-text-secondary max-w-xs mx-auto">
                  Log your first night of sleep above to start tracking trends, quality patterns, and BiPAP compliance.
                </p>
              </div>
            )}

            {/* Sleep Stats */}
            {allLogs.length > 0 && (
              <SleepStats logs={allLogs} />
            )}

            {/* Sleep Trend Charts */}
            <SleepCharts logs={allLogs} />

            {/* Recent Sleep Logs Table */}
            {recentLogs.length > 0 && (
              <Card>
                <div className="flex items-center gap-2">
                  <BedDouble className="h-4 w-4 text-accent-teal" />
                  <CardTitle>Recent Sleep Logs</CardTitle>
                </div>
                <CardContent className="mt-3">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="pb-2 text-left font-display text-xs text-text-muted font-normal uppercase tracking-wide">
                            Date
                          </th>
                          <th className="pb-2 text-right font-display text-xs text-text-muted font-normal uppercase tracking-wide">
                            Bed
                          </th>
                          <th className="pb-2 text-right font-display text-xs text-text-muted font-normal uppercase tracking-wide">
                            Wake
                          </th>
                          <th className="pb-2 text-right font-display text-xs text-text-muted font-normal uppercase tracking-wide">
                            Hours
                          </th>
                          <th className="pb-2 text-right font-display text-xs text-text-muted font-normal uppercase tracking-wide">
                            Quality
                          </th>
                          <th className="pb-2 text-center font-display text-xs text-text-muted font-normal uppercase tracking-wide">
                            <span title="BiPAP"><Wind className="h-3 w-3 inline" /></span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {recentLogs.map((log) => (
                          <tr
                            key={log.id}
                            className={cn(
                              "group cursor-pointer hover:bg-bg-card-hover transition-colors",
                              log.date === selectedDate && "bg-accent-teal-dim/20"
                            )}
                            onClick={() => setSelectedDate(log.date)}
                          >
                            <td className="py-2 pr-3 font-display text-xs tabular-nums text-text-primary">
                              {formatShortDate(log.date)}
                            </td>
                            <td className="py-2 pr-3 text-right font-display text-xs tabular-nums text-text-secondary">
                              {log.bedtime ? formatTimeDisplay(log.bedtime) : "--"}
                            </td>
                            <td className="py-2 pr-3 text-right font-display text-xs tabular-nums text-text-secondary">
                              {log.wakeTime ? formatTimeDisplay(log.wakeTime) : "--"}
                            </td>
                            <td className="py-2 pr-3 text-right">
                              <span
                                className={cn(
                                  "font-display text-xs tabular-nums",
                                  durationColor(log.totalHours)
                                )}
                              >
                                {log.totalHours != null ? `${log.totalHours.toFixed(1)}h` : "--"}
                              </span>
                            </td>
                            <td className="py-2 pr-3 text-right">
                              <span
                                className={cn(
                                  "font-display text-xs tabular-nums",
                                  qualityColor(log.sleepQuality)
                                )}
                              >
                                {log.sleepQuality ?? "--"}
                              </span>
                            </td>
                            <td className="py-2 text-center">
                              {log.bipapUsed === 1 ? (
                                <span className="text-xs text-accent-green">Y</span>
                              ) : log.bipapUsed === 0 ? (
                                <span className="text-xs text-accent-amber">N</span>
                              ) : (
                                <span className="text-xs text-text-muted">--</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {allLogs.length > 14 && (
                    <p className="mt-2 text-center text-xs text-text-muted">
                      Showing 14 of {allLogs.length} entries
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper: Format "HH:MM" (24h) to "h:mm AM/PM"
// ---------------------------------------------------------------------------

function formatTimeDisplay(time24: string): string {
  const [hStr, mStr] = time24.split(":");
  const h = parseInt(hStr, 10);
  const m = mStr || "00";
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}
