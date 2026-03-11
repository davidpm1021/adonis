"use client";

import { CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { CollapsibleSection } from "./collapsible-section";

interface NonNegotiablesData {
  morningWalk: number;
  walkDurationMinutes: number | null;
  strengthTraining: number;
  ateLunchWithProtein: number;
  mobilityWork: number;
  supplementsTaken: number;
  alcoholFree: number;
  foamRolling: number;
  coldExposure: number;
  heatExposure: number;
}

interface NonNegotiablesSectionProps {
  data: NonNegotiablesData;
  onChange: (data: Partial<NonNegotiablesData>) => void;
  isRestDay: boolean;
}

interface ToggleItem {
  key: keyof NonNegotiablesData;
  label: string;
  note?: string;
  disabled?: boolean;
}

export function NonNegotiablesSection({
  data,
  onChange,
  isRestDay,
}: NonNegotiablesSectionProps) {
  const completedCount = [
    data.morningWalk,
    isRestDay ? 1 : data.strengthTraining,
    data.ateLunchWithProtein,
    data.mobilityWork,
    data.supplementsTaken,
    data.alcoholFree,
    data.foamRolling,
    data.coldExposure,
    data.heatExposure,
  ].filter((v) => v === 1).length;

  const totalItems = 9;

  const toggleItems: ToggleItem[] = [
    { key: "morningWalk", label: "Morning Walk" },
    {
      key: "strengthTraining",
      label: "Strength Training",
      note: isRestDay ? "Rest day" : undefined,
      disabled: isRestDay,
    },
    { key: "ateLunchWithProtein", label: "Lunch with Protein" },
    { key: "mobilityWork", label: "Mobility Work" },
    { key: "supplementsTaken", label: "Supplements Taken" },
    { key: "alcoholFree", label: "Alcohol Free" },
    { key: "foamRolling", label: "Foam Rolling" },
    { key: "coldExposure", label: "Cold Exposure" },
    { key: "heatExposure", label: "Heat Exposure" },
  ];

  const handleToggle = (key: keyof NonNegotiablesData) => {
    const current = data[key];
    if (typeof current === "number" && key !== "walkDurationMinutes") {
      onChange({ [key]: current === 1 ? 0 : 1 });
    }
  };

  return (
    <CollapsibleSection
      title="Non-Negotiables"
      icon={<CheckSquare className="h-4 w-4 text-accent-teal" />}
      defaultOpen={true}
      badge={
        <span className="ml-2 rounded-full bg-accent-teal-dim px-2 py-0.5 font-display text-xs tabular-nums text-accent-teal">
          {completedCount}/{totalItems}
        </span>
      }
    >
      <div className="space-y-2">
        {toggleItems.map((item) => {
          const isOn =
            item.key === "strengthTraining" && isRestDay
              ? true
              : data[item.key] === 1;

          return (
            <div key={item.key}>
              <button
                type="button"
                disabled={item.disabled}
                onClick={() => handleToggle(item.key)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-all duration-150",
                  isOn
                    ? "border-accent-teal/30 bg-accent-teal-dim text-accent-teal"
                    : "border-border bg-bg-primary text-text-secondary hover:border-border-hover",
                  item.disabled &&
                    "opacity-50 cursor-not-allowed hover:border-border"
                )}
              >
                <span className="font-body text-sm font-medium">
                  {item.label}
                </span>
                <div className="flex items-center gap-2">
                  {item.note && (
                    <span className="text-xs text-text-muted italic">
                      {item.note}
                    </span>
                  )}
                  <div
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold transition-colors",
                      isOn
                        ? "bg-accent-teal text-bg-primary"
                        : "bg-bg-card-hover text-text-muted"
                    )}
                  >
                    {isOn ? "\u2713" : ""}
                  </div>
                </div>
              </button>

              {/* Walk duration input appears when morning walk is toggled on */}
              {item.key === "morningWalk" && data.morningWalk === 1 && (
                <div className="mt-2 ml-4 flex items-center gap-2">
                  <label className="text-xs text-text-secondary whitespace-nowrap">
                    Duration:
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="min"
                    value={data.walkDurationMinutes ?? ""}
                    onChange={(e) =>
                      onChange({
                        walkDurationMinutes: e.target.value
                          ? parseInt(e.target.value)
                          : null,
                      })
                    }
                    className="w-20 rounded-md border border-border bg-bg-primary px-2 py-1.5 text-sm text-text-primary tabular-nums placeholder:text-text-muted focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal transition-colors"
                  />
                  <span className="text-xs text-text-muted">min</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </CollapsibleSection>
  );
}
