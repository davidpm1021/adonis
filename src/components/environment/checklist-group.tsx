"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EnvironmentItem {
  id: number;
  item: string;
  category: string;
  completed: number | null;
  completedDate: string | null;
  notes: string | null;
  createdAt: string | null;
}

interface ChecklistGroupProps {
  category: string;
  items: EnvironmentItem[];
  onToggle: (id: number, completed: boolean) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<string, string> = {
  kitchen: "Kitchen",
  personal_care: "Personal Care",
  water: "Water",
  home: "Home",
};

function formatCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] || category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ChecklistGroup({ category, items, onToggle }: ChecklistGroupProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set());

  const completedCount = items.filter((i) => i.completed === 1).length;
  const totalCount = items.length;
  const allDone = completedCount === totalCount;

  // Sort: incomplete items first, then completed
  const sortedItems = [...items].sort((a, b) => {
    if ((a.completed ?? 0) !== (b.completed ?? 0)) {
      return (a.completed ?? 0) - (b.completed ?? 0);
    }
    return a.id - b.id;
  });

  const handleToggle = async (item: EnvironmentItem) => {
    const id = item.id;
    setLoadingIds((prev) => new Set(prev).add(id));
    try {
      const newCompleted = item.completed !== 1;
      await onToggle(id, newCompleted);
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
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
          <h3 className="font-display text-sm font-semibold tracking-wide text-text-secondary uppercase">
            {formatCategoryLabel(category)}
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

      {/* Items List */}
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
              {sortedItems.map((item) => {
                const isCompleted = item.completed === 1;
                const isLoading = loadingIds.has(item.id);

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
                        {item.item}
                      </p>
                      {isCompleted && item.completedDate && (
                        <p className="text-xs text-text-muted mt-0.5">
                          Completed {formatDate(item.completedDate)}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-xs text-text-muted mt-0.5 italic">
                          {item.notes}
                        </p>
                      )}
                    </div>
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
