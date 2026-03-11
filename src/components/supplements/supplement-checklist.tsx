"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, Loader2, Pill } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SupplementEntry {
  id: number;
  date: string;
  supplementName: string;
  dose: string | null;
  taken: number | null;
  timeOfDay: string | null;
  createdAt: string | null;
}

interface SupplementChecklistProps {
  supplements: SupplementEntry[];
  date: string;
  onToggle: (supplementName: string, taken: number) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TIME_OF_DAY_ORDER = ["morning", "dinner", "before_bed"];

const TIME_LABELS: Record<string, string> = {
  morning: "Morning",
  dinner: "Dinner",
  before_bed: "Before Bed",
};

function formatTimeLabel(timeOfDay: string | null): string {
  if (!timeOfDay) return "Unscheduled";
  return TIME_LABELS[timeOfDay] || timeOfDay.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function groupByTimeOfDay(supplements: SupplementEntry[]): Record<string, SupplementEntry[]> {
  const groups: Record<string, SupplementEntry[]> = {};
  for (const supp of supplements) {
    const key = supp.timeOfDay || "unscheduled";
    if (!groups[key]) groups[key] = [];
    groups[key].push(supp);
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Time-of-Day Group
// ---------------------------------------------------------------------------

function TimeGroup({
  timeOfDay,
  items,
  onToggle,
}: {
  timeOfDay: string;
  items: SupplementEntry[];
  onToggle: (supplementName: string, taken: number) => Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [loadingNames, setLoadingNames] = useState<Set<string>>(new Set());

  const completedCount = items.filter((i) => i.taken === 1).length;
  const totalCount = items.length;
  const allDone = completedCount === totalCount;

  const handleToggle = async (item: SupplementEntry) => {
    const name = item.supplementName;
    setLoadingNames((prev) => new Set(prev).add(name));
    try {
      const newTaken = item.taken === 1 ? 0 : 1;
      await onToggle(name, newTaken);
    } finally {
      setLoadingNames((prev) => {
        const next = new Set(prev);
        next.delete(name);
        return next;
      });
    }
  };

  return (
    <div className="rounded-lg border border-border bg-bg-card overflow-hidden">
      {/* Group Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-2">
          <Pill className="h-4 w-4 text-accent-teal" />
          <h3 className="font-display text-sm font-semibold tracking-wide text-text-secondary uppercase">
            {formatTimeLabel(timeOfDay)}
          </h3>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 font-display text-xs tabular-nums",
              allDone
                ? "bg-accent-green-dim text-accent-green"
                : "bg-accent-teal-dim text-accent-teal"
            )}
          >
            {completedCount}/{totalCount}
          </span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-4 w-4 text-text-muted" />
        </motion.div>
      </button>

      {/* Progress Bar */}
      <div className="px-4 pb-2">
        <div className="h-1 w-full rounded-full bg-bg-primary overflow-hidden">
          <motion.div
            className={cn(
              "h-full rounded-full",
              allDone ? "bg-accent-green" : "bg-accent-teal"
            )}
            initial={{ width: 0 }}
            animate={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Items */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-1.5">
              {items.map((item) => {
                const isCompleted = item.taken === 1;
                const isLoading = loadingNames.has(item.supplementName);

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleToggle(item)}
                    disabled={isLoading}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all duration-150",
                      isCompleted
                        ? "border-accent-green/20 bg-accent-green-dim/50"
                        : "border-border bg-bg-primary hover:border-border-hover",
                      isLoading && "opacity-60 cursor-not-allowed"
                    )}
                  >
                    {/* Checkbox */}
                    <div
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
                        isCompleted
                          ? "border-accent-green bg-accent-green"
                          : "border-text-muted bg-transparent"
                      )}
                    >
                      {isLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin text-bg-primary" />
                      ) : isCompleted ? (
                        <Check className="h-3 w-3 text-bg-primary" />
                      ) : null}
                    </div>

                    {/* Label */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "font-body text-sm transition-colors",
                          isCompleted
                            ? "text-text-muted line-through"
                            : "text-text-primary"
                        )}
                      >
                        {item.supplementName}
                      </p>
                    </div>

                    {/* Dose */}
                    {item.dose && (
                      <span
                        className={cn(
                          "font-display text-xs tabular-nums shrink-0",
                          isCompleted ? "text-text-muted" : "text-accent-teal"
                        )}
                      >
                        {item.dose}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function SupplementChecklist({ supplements, date, onToggle }: SupplementChecklistProps) {
  const grouped = groupByTimeOfDay(supplements);

  // Sort groups by defined order
  const orderedKeys = [
    ...TIME_OF_DAY_ORDER.filter((k) => grouped[k]),
    ...Object.keys(grouped).filter((k) => !TIME_OF_DAY_ORDER.includes(k)),
  ];

  const totalTaken = supplements.filter((s) => s.taken === 1).length;
  const totalCount = supplements.length;

  return (
    <div className="space-y-4">
      {/* Overall Daily Compliance */}
      {totalCount > 0 && (
        <div className="rounded-lg border border-border bg-bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Pill className="h-4 w-4 text-accent-teal" />
              <span className="font-display text-sm font-semibold tracking-wide text-text-secondary uppercase">
                Daily Compliance
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "font-display text-sm font-bold tabular-nums",
                  totalTaken === totalCount ? "text-accent-green" : "text-accent-teal"
                )}
              >
                {totalTaken}/{totalCount}
              </span>
              <span className="font-display text-xs text-text-muted tabular-nums">
                ({totalCount > 0 ? Math.round((totalTaken / totalCount) * 100) : 0}%)
              </span>
            </div>
          </div>
          <div className="h-2 w-full rounded-full bg-bg-primary overflow-hidden">
            <motion.div
              className={cn(
                "h-full rounded-full transition-all duration-500 ease-out",
                totalTaken === totalCount ? "bg-accent-green" : "bg-accent-teal"
              )}
              initial={{ width: 0 }}
              animate={{ width: `${totalCount > 0 ? (totalTaken / totalCount) * 100 : 0}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>
      )}

      {/* Time-of-Day Groups */}
      {orderedKeys.map((key) => (
        <TimeGroup
          key={key}
          timeOfDay={key}
          items={grouped[key]}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}
