"use client";

import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CollapsibleSection } from "./collapsible-section";

interface ScoresData {
  energy: number | null;
  mood: number | null;
  stress: number | null;
  soreness: number | null;
  anxietyLevel: number | null;
  alcoholCraving: number;
  alcoholTrigger: string | null;
}

interface ScoresSectionProps {
  data: ScoresData;
  onChange: (data: Partial<ScoresData>) => void;
}

interface ScoreRow {
  key: keyof ScoresData;
  label: string;
  min: number;
  max: number;
  lowColor?: string;
  highColor?: string;
}

export function ScoresSection({ data, onChange }: ScoresSectionProps) {
  const scoreRows: ScoreRow[] = [
    { key: "energy", label: "Energy", min: 1, max: 10 },
    { key: "mood", label: "Mood", min: 1, max: 10 },
    { key: "stress", label: "Stress", min: 1, max: 10 },
    { key: "soreness", label: "Soreness", min: 1, max: 10 },
    { key: "anxietyLevel", label: "Anxiety", min: 1, max: 10 },
    {
      key: "alcoholCraving",
      label: "Craving",
      min: 0,
      max: 10,
    },
  ];

  return (
    <CollapsibleSection
      title="Subjective Scores"
      icon={<BarChart3 className="h-4 w-4 text-accent-amber" />}
      defaultOpen={true}
    >
      <div className="space-y-4">
        {scoreRows.map((row) => {
          const currentValue = data[row.key];
          const numbers = Array.from(
            { length: row.max - row.min + 1 },
            (_, i) => row.min + i
          );

          return (
            <div key={row.key}>
              <div className="flex items-center justify-between mb-2">
                <label className="font-body text-xs text-text-secondary">
                  {row.label}
                </label>
                {currentValue !== null && currentValue !== undefined && (
                  <span className="font-display text-xs tabular-nums text-accent-teal">
                    {currentValue}
                  </span>
                )}
              </div>
              <div className="flex gap-1">
                {numbers.map((num) => {
                  const isSelected = currentValue === num;
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() =>
                        onChange({
                          [row.key]: currentValue === num ? (row.min === 0 ? 0 : null) : num,
                        } as Partial<ScoresData>)
                      }
                      className={cn(
                        "flex h-9 w-full max-w-[36px] items-center justify-center rounded-md border text-xs font-display tabular-nums transition-all duration-100",
                        isSelected
                          ? "border-accent-teal bg-accent-teal text-bg-primary font-bold"
                          : "border-border bg-bg-primary text-text-muted hover:border-border-hover hover:text-text-secondary"
                      )}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Alcohol trigger text input */}
        {data.alcoholCraving > 0 && (
          <div className="mt-2">
            <label className="block font-body text-xs text-accent-amber mb-1.5">
              What triggered the craving?
            </label>
            <input
              type="text"
              placeholder="Describe the trigger..."
              value={data.alcoholTrigger ?? ""}
              onChange={(e) =>
                onChange({
                  alcoholTrigger: e.target.value || null,
                })
              }
              className="w-full rounded-md border border-accent-amber/30 bg-accent-amber-dim px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-amber focus:outline-none focus:ring-1 focus:ring-accent-amber transition-colors"
            />
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
}
