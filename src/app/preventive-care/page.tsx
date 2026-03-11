"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { CollapsibleSection } from "@/components/daily-log/collapsible-section";
import { CareItem, type PreventiveCareItem } from "@/components/preventive-care/care-item";
import {
  Loader2,
  Heart,
  Activity,
  TestTube,
  Stethoscope,
  Eye,
  Syringe,
  Shield,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CategoryKey =
  | "cardiac"
  | "metabolic"
  | "labs"
  | "dental"
  | "cancer_screening"
  | "vision"
  | "vaccination";

interface CategoryConfig {
  label: string;
  icon: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_CONFIG: Record<CategoryKey, CategoryConfig> = {
  cardiac: { label: "Cardiac", icon: <Heart className="h-4 w-4 text-accent-red" /> },
  metabolic: { label: "Metabolic", icon: <Activity className="h-4 w-4 text-accent-amber" /> },
  labs: { label: "Labs", icon: <TestTube className="h-4 w-4 text-accent-teal" /> },
  dental: { label: "Dental", icon: <Stethoscope className="h-4 w-4 text-text-secondary" /> },
  cancer_screening: { label: "Cancer Screening", icon: <Shield className="h-4 w-4 text-accent-amber" /> },
  vision: { label: "Vision", icon: <Eye className="h-4 w-4 text-accent-teal" /> },
  vaccination: { label: "Vaccination", icon: <Syringe className="h-4 w-4 text-accent-green" /> },
};

const CATEGORY_ORDER: CategoryKey[] = [
  "cardiac",
  "metabolic",
  "labs",
  "dental",
  "cancer_screening",
  "vision",
  "vaccination",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeSummary(items: PreventiveCareItem[]) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  const todayDate = new Date(today + "T00:00:00");

  let completed = 0;
  let upcoming = 0;
  let overdue = 0;

  for (const item of items) {
    if (item.status === "completed") {
      completed++;
    } else if (item.dueDate) {
      const due = new Date(item.dueDate + "T00:00:00");
      const diffDays = Math.ceil((due.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        overdue++;
      } else {
        upcoming++;
      }
    }
  }

  return { completed, upcoming, overdue, total: items.length };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PreventiveCarePage() {
  const [items, setItems] = useState<PreventiveCareItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/preventive-care");
      if (!res.ok) throw new Error("Failed to fetch preventive care items");
      const json = await res.json();
      if (json.success) {
        setItems(json.data);
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

  const handleUpdate = async (id: number, updates: Partial<PreventiveCareItem>) => {
    const res = await fetch("/api/preventive-care", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(errJson?.error || "Failed to update");
    }

    const json = await res.json();
    if (json.success && json.data) {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...json.data } : item))
      );
    }
  };

  // Group items by category
  const grouped: Record<string, PreventiveCareItem[]> = {};
  for (const item of items) {
    const cat = item.category;
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  }

  const summary = computeSummary(items);

  return (
    <div>
      <PageHeader
        title="Preventive Care"
        subtitle="Screening schedule and health maintenance tracker"
      />

      <div className="mx-auto max-w-3xl space-y-4">
        {/* Summary Dashboard */}
        {!isLoading && items.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-accent-green/20 bg-accent-green-dim p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4 text-accent-green" />
                <span className="font-display text-xs text-accent-green uppercase tracking-wide">
                  Completed
                </span>
              </div>
              <p className="font-display text-2xl font-bold tabular-nums text-accent-green">
                {summary.completed}
              </p>
            </div>
            <div className="rounded-lg border border-accent-amber/20 bg-accent-amber-dim p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-accent-amber" />
                <span className="font-display text-xs text-accent-amber uppercase tracking-wide">
                  Upcoming
                </span>
              </div>
              <p className="font-display text-2xl font-bold tabular-nums text-accent-amber">
                {summary.upcoming}
              </p>
            </div>
            <div className="rounded-lg border border-accent-red/20 bg-accent-red-dim p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="h-4 w-4 text-accent-red" />
                <span className="font-display text-xs text-accent-red uppercase tracking-wide">
                  Overdue
                </span>
              </div>
              <p className="font-display text-2xl font-bold tabular-nums text-accent-red">
                {summary.overdue}
              </p>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-accent-teal" />
            <span className="ml-2 text-sm text-text-secondary">Loading preventive care items...</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-accent-red/30 bg-accent-red-dim px-4 py-3 text-sm text-accent-red">
            {error}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && items.length === 0 && (
          <div className="rounded-lg border border-border bg-bg-card p-8 text-center">
            <Shield className="h-8 w-8 text-text-muted mx-auto mb-3" />
            <p className="text-sm text-text-secondary">
              No preventive care items found. Seed the database to populate screening schedules.
            </p>
          </div>
        )}

        {/* Grouped Care Items */}
        {!isLoading &&
          CATEGORY_ORDER.map((catKey) => {
            const catItems = grouped[catKey];
            if (!catItems || catItems.length === 0) return null;

            const config = CATEGORY_CONFIG[catKey] ?? {
              label: catKey,
              icon: <Shield className="h-4 w-4 text-text-muted" />,
            };

            const catCompleted = catItems.filter((i) => i.status === "completed").length;

            return (
              <CollapsibleSection
                key={catKey}
                title={config.label}
                icon={config.icon}
                defaultOpen={true}
                badge={
                  <span
                    className={cn(
                      "ml-2 rounded-full px-2 py-0.5 font-display text-xs tabular-nums",
                      catCompleted === catItems.length
                        ? "bg-accent-green-dim text-accent-green"
                        : "bg-accent-teal-dim text-accent-teal"
                    )}
                  >
                    {catCompleted}/{catItems.length}
                  </span>
                }
              >
                <div className="space-y-2">
                  {catItems.map((item) => (
                    <CareItem key={item.id} item={item} onUpdate={handleUpdate} />
                  ))}
                </div>
              </CollapsibleSection>
            );
          })}

        {/* Render any unknown categories */}
        {!isLoading &&
          Object.keys(grouped)
            .filter((cat) => !CATEGORY_ORDER.includes(cat as CategoryKey))
            .map((catKey) => {
              const catItems = grouped[catKey];
              if (!catItems || catItems.length === 0) return null;

              const catCompleted = catItems.filter((i) => i.status === "completed").length;

              return (
                <CollapsibleSection
                  key={catKey}
                  title={catKey.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  icon={<Shield className="h-4 w-4 text-text-muted" />}
                  defaultOpen={true}
                  badge={
                    <span className="ml-2 rounded-full bg-accent-teal-dim px-2 py-0.5 font-display text-xs tabular-nums text-accent-teal">
                      {catCompleted}/{catItems.length}
                    </span>
                  }
                >
                  <div className="space-y-2">
                    {catItems.map((item) => (
                      <CareItem key={item.id} item={item} onUpdate={handleUpdate} />
                    ))}
                  </div>
                </CollapsibleSection>
              );
            })}
      </div>
    </div>
  );
}
