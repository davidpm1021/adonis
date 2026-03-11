"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ChecklistGroup, type EnvironmentItem } from "@/components/environment/checklist-group";
import { Loader2, Leaf, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type GroupedItems = Record<string, EnvironmentItem[]>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_ORDER = ["kitchen", "personal_care", "water", "home"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTodayET(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EnvironmentPage() {
  const [grouped, setGrouped] = useState<GroupedItems>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/environment");
      if (!res.ok) throw new Error("Failed to fetch environment checklist");
      const json = await res.json();
      if (json.success) {
        setGrouped(json.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleToggle = async (id: number, completed: boolean) => {
    const today = getTodayET();

    const res = await fetch("/api/environment", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        completed: completed ? 1 : 0,
        completedDate: completed ? today : null,
      }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(errJson?.error || "Failed to update");
    }

    const json = await res.json();
    if (json.success && json.data) {
      // Update the item in its category group
      setGrouped((prev) => {
        const next: GroupedItems = {};
        for (const [cat, items] of Object.entries(prev)) {
          next[cat] = items.map((item) =>
            item.id === id ? { ...item, ...json.data } : item
          );
        }
        return next;
      });
    }
  };

  // Compute overall progress
  const allItems = Object.values(grouped).flat();
  const totalCompleted = allItems.filter((i) => i.completed === 1).length;
  const totalItems = allItems.length;
  const overallPct = totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0;

  // Order categories
  const orderedCategories = [
    ...CATEGORY_ORDER.filter((cat) => grouped[cat]),
    ...Object.keys(grouped).filter((cat) => !CATEGORY_ORDER.includes(cat)),
  ];

  return (
    <div>
      <PageHeader
        title="Environment"
        subtitle="Household swap checklist for reducing toxin exposure"
      />

      <div className="mx-auto max-w-3xl space-y-4">
        {/* Overall Progress */}
        {!isLoading && totalItems > 0 && (
          <div className="rounded-lg border border-border bg-bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Leaf className="h-4 w-4 text-accent-teal" />
                <span className="font-display text-sm font-semibold tracking-wide text-text-secondary uppercase">
                  Overall Progress
                </span>
              </div>
              <div className="flex items-center gap-2">
                {overallPct === 100 && (
                  <CheckCircle2 className="h-4 w-4 text-accent-green" />
                )}
                <span
                  className={cn(
                    "font-display text-sm font-bold tabular-nums",
                    overallPct === 100 ? "text-accent-green" : "text-accent-teal"
                  )}
                >
                  {totalCompleted}/{totalItems}
                </span>
                <span className="font-display text-xs text-text-muted tabular-nums">
                  ({overallPct}%)
                </span>
              </div>
            </div>
            <div className="h-2 w-full rounded-full bg-bg-primary overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500 ease-out",
                  overallPct === 100 ? "bg-accent-green" : "bg-accent-teal"
                )}
                style={{ width: `${overallPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-accent-teal" />
            <span className="ml-2 text-sm text-text-secondary">Loading environment checklist...</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-accent-red/30 bg-accent-red-dim px-4 py-3 text-sm text-accent-red">
            {error}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && totalItems === 0 && (
          <div className="rounded-lg border border-border bg-bg-card p-8 text-center">
            <Leaf className="h-8 w-8 text-text-muted mx-auto mb-3" />
            <p className="text-sm text-text-secondary">
              No environment checklist items found. Seed the database to populate the checklist.
            </p>
          </div>
        )}

        {/* Category Groups */}
        {!isLoading &&
          orderedCategories.map((cat) => {
            const catItems = grouped[cat];
            if (!catItems || catItems.length === 0) return null;

            return (
              <ChecklistGroup
                key={cat}
                category={cat}
                items={catItems}
                onToggle={handleToggle}
              />
            );
          })}
      </div>
    </div>
  );
}
