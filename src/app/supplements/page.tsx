"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { SupplementChecklist, type SupplementEntry } from "@/components/supplements/supplement-checklist";
import { ComplianceChart } from "@/components/supplements/compliance-chart";
import { StackManager, type StackItem } from "@/components/supplements/stack-manager";
import { ChevronLeft, ChevronRight, Loader2, Pill } from "lucide-react";
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

/** Generate array of YYYY-MM-DD dates for last N days (inclusive today) */
function getLast30Dates(): string[] {
  const dates: string[] = [];
  const today = getTodayET();
  for (let i = 29; i >= 0; i--) {
    dates.push(shiftDate(today, -i));
  }
  return dates;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SupplementsPage() {
  const [selectedDate, setSelectedDate] = useState(getTodayET);
  const [supplements, setSupplements] = useState<SupplementEntry[]>([]);
  const [stack, setStack] = useState<StackItem[]>([]);
  const [allLogs, setAllLogs] = useState<SupplementEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const last30Dates = getLast30Dates();

  // -------------------------------------------------------------------------
  // Fetch today's supplement log
  // -------------------------------------------------------------------------
  const fetchDayLog = useCallback(async (date: string) => {
    try {
      const res = await fetch(`/api/supplements/log/${date}`);
      if (!res.ok) throw new Error("Failed to fetch supplement log");
      const json = await res.json();
      if (json.success) {
        setSupplements(json.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load supplements");
    }
  }, []);

  // -------------------------------------------------------------------------
  // Fetch stack (distinct supplements)
  // -------------------------------------------------------------------------
  const fetchStack = useCallback(async () => {
    try {
      const res = await fetch("/api/supplements/stack");
      if (!res.ok) throw new Error("Failed to fetch supplement stack");
      const json = await res.json();
      if (json.success) {
        setStack(json.data);
      }
    } catch {
      // Stack fetch failure is non-critical
    }
  }, []);

  // -------------------------------------------------------------------------
  // Fetch 30-day logs for compliance chart
  // -------------------------------------------------------------------------
  const fetchAllLogs = useCallback(async () => {
    try {
      const from = last30Dates[0];
      const to = last30Dates[last30Dates.length - 1];
      // Fetch all days by iterating each date - but more efficiently,
      // we'll just fetch a large batch from supplements log.
      // The API doesn't have a multi-date endpoint, so we'll fetch each day.
      // For performance, we'll fetch them in parallel (batched).
      const fetches = last30Dates.map(async (date) => {
        try {
          const res = await fetch(`/api/supplements/log/${date}`);
          if (!res.ok) return [];
          const json = await res.json();
          return json.success ? json.data : [];
        } catch {
          return [];
        }
      });

      // Fetch in batches of 5 to avoid overwhelming the server
      const allResults: SupplementEntry[] = [];
      const batchSize = 5;
      for (let i = 0; i < fetches.length; i += batchSize) {
        const batch = fetches.slice(i, i + batchSize);
        const results = await Promise.all(batch);
        for (const result of results) {
          allResults.push(...result);
        }
      }

      setAllLogs(allResults);
    } catch {
      // Non-critical
    }
  }, [last30Dates]);

  // -------------------------------------------------------------------------
  // Initial load
  // -------------------------------------------------------------------------
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await Promise.all([fetchDayLog(selectedDate), fetchStack()]);
      setIsLoading(false);
    };
    load();
  }, [selectedDate, fetchDayLog, fetchStack]);

  // Fetch compliance data after initial load
  useEffect(() => {
    if (!isLoading) {
      fetchAllLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleToggle = async (supplementName: string, taken: number) => {
    const res = await fetch(`/api/supplements/log/${selectedDate}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supplementName, taken }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(errJson?.error || "Failed to toggle supplement");
    }

    const json = await res.json();
    if (json.success && json.data) {
      // Update the item in state
      setSupplements((prev) =>
        prev.map((s) =>
          s.supplementName === supplementName ? { ...s, taken: json.data.taken } : s
        )
      );
    }
  };

  const handleUpdateStack = async (newStack: StackItem[]) => {
    const res = await fetch("/api/supplements/stack", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newStack),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(errJson?.error || "Failed to update stack");
    }

    // Refresh stack and day log
    await Promise.all([fetchStack(), fetchDayLog(selectedDate)]);
    // Refresh compliance in background
    fetchAllLogs();
  };

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

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div>
      <PageHeader
        title="Supplements"
        subtitle="Daily supplement stack and compliance tracking"
      />

      <div className="mx-auto max-w-3xl space-y-4">
        {/* Date Selector */}
        <div className="flex items-center justify-between rounded-lg border border-border bg-bg-card px-4 py-3">
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
            <span className="ml-2 text-sm text-text-secondary">Loading supplements...</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-accent-red/30 bg-accent-red-dim px-4 py-3 text-sm text-accent-red">
            {error}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && supplements.length === 0 && (
          <div className="rounded-lg border border-border bg-bg-card p-8 text-center">
            <Pill className="h-8 w-8 text-text-muted mx-auto mb-3" />
            <p className="text-sm text-text-secondary">
              No supplements in your stack yet. Add supplements using the &quot;Manage Stack&quot; section below.
            </p>
          </div>
        )}

        {/* Daily Checklist */}
        {!isLoading && supplements.length > 0 && (
          <SupplementChecklist
            supplements={supplements}
            date={selectedDate}
            onToggle={handleToggle}
          />
        )}

        {/* Compliance Charts */}
        {!isLoading && allLogs.length > 0 && (
          <ComplianceChart logs={allLogs} last30Dates={last30Dates} />
        )}

        {/* Stack Manager */}
        {!isLoading && (
          <StackManager stack={stack} onUpdateStack={handleUpdateStack} />
        )}
      </div>
    </div>
  );
}
