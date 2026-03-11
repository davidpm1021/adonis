"use client";

import { Heart } from "lucide-react";
import { CollapsibleSection } from "./collapsible-section";

interface VitalsData {
  weight: number | null;
  systolic: number | null;
  diastolic: number | null;
  restingHeartRate: number | null;
  spo2: number | null;
}

interface VitalsSectionProps {
  data: VitalsData;
  onChange: (data: Partial<VitalsData>) => void;
}

export function VitalsSection({ data, onChange }: VitalsSectionProps) {
  return (
    <CollapsibleSection
      title="Morning Vitals"
      icon={<Heart className="h-4 w-4 text-accent-red" />}
      defaultOpen={true}
    >
      <div className="space-y-4">
        {/* Weight */}
        <div>
          <label className="block font-body text-xs text-text-secondary mb-1.5">
            Weight (lbs)
          </label>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder="e.g. 215.4"
            value={data.weight ?? ""}
            onChange={(e) =>
              onChange({
                weight: e.target.value ? parseFloat(e.target.value) : null,
              })
            }
            className="w-full rounded-md border border-border bg-bg-primary px-3 py-2.5 text-sm text-text-primary tabular-nums placeholder:text-text-muted focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal transition-colors"
          />
        </div>

        {/* Blood Pressure */}
        <div>
          <label className="block font-body text-xs text-text-secondary mb-1.5">
            Blood Pressure
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              placeholder="SYS"
              value={data.systolic ?? ""}
              onChange={(e) =>
                onChange({
                  systolic: e.target.value ? parseInt(e.target.value) : null,
                })
              }
              className="w-full rounded-md border border-border bg-bg-primary px-3 py-2.5 text-sm text-text-primary tabular-nums placeholder:text-text-muted focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal transition-colors"
            />
            <span className="text-text-muted font-display text-sm">/</span>
            <input
              type="number"
              inputMode="numeric"
              placeholder="DIA"
              value={data.diastolic ?? ""}
              onChange={(e) =>
                onChange({
                  diastolic: e.target.value ? parseInt(e.target.value) : null,
                })
              }
              className="w-full rounded-md border border-border bg-bg-primary px-3 py-2.5 text-sm text-text-primary tabular-nums placeholder:text-text-muted focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal transition-colors"
            />
            <span className="text-text-muted text-xs whitespace-nowrap">
              mmHg
            </span>
          </div>
        </div>

        {/* Heart Rate + SpO2 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-body text-xs text-text-secondary mb-1.5">
              Resting HR (bpm)
            </label>
            <input
              type="number"
              inputMode="numeric"
              placeholder="e.g. 62"
              value={data.restingHeartRate ?? ""}
              onChange={(e) =>
                onChange({
                  restingHeartRate: e.target.value
                    ? parseInt(e.target.value)
                    : null,
                })
              }
              className="w-full rounded-md border border-border bg-bg-primary px-3 py-2.5 text-sm text-text-primary tabular-nums placeholder:text-text-muted focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal transition-colors"
            />
          </div>
          <div>
            <label className="block font-body text-xs text-text-secondary mb-1.5">
              SpO2 (%)
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              placeholder="e.g. 97"
              value={data.spo2 ?? ""}
              onChange={(e) =>
                onChange({
                  spo2: e.target.value ? parseFloat(e.target.value) : null,
                })
              }
              className="w-full rounded-md border border-border bg-bg-primary px-3 py-2.5 text-sm text-text-primary tabular-nums placeholder:text-text-muted focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal transition-colors"
            />
          </div>
        </div>
      </div>
    </CollapsibleSection>
  );
}
