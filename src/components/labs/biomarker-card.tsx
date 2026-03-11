"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Sparkline } from "@/components/charts/sparkline";
import { cn } from "@/lib/utils";

interface BiomarkerCardProps {
  testName: string;
  latestValue: number;
  unit: string;
  referenceLow: number | null;
  referenceHigh: number | null;
  flag: string | null;
  previousValue: number | null;
  sparklineData: number[];
  interpretation?: string;
  onClick?: () => void;
}

const FLAG_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  normal: {
    label: "Normal",
    color: "text-accent-green",
    bg: "bg-accent-green-dim",
  },
  borderline: {
    label: "Borderline",
    color: "text-accent-amber",
    bg: "bg-accent-amber-dim",
  },
  high: {
    label: "High",
    color: "text-accent-red",
    bg: "bg-accent-red-dim",
  },
  low: {
    label: "Low",
    color: "text-accent-red",
    bg: "bg-accent-red-dim",
  },
};

function getDelta(current: number, previous: number | null) {
  if (previous == null) return null;
  const diff = current - previous;
  const pct = previous !== 0 ? (diff / previous) * 100 : 0;
  return { diff, pct };
}

/**
 * Determine if a delta is "improving" based on the biomarker type.
 * For most markers, going down (toward normal) is good if you were high.
 * For HDL, higher is better. For most others, normal range is the goal.
 */
function isDeltaImproving(
  diff: number,
  flag: string | null,
  testName: string
): boolean | null {
  // HDL: higher is better
  const higherIsBetter = ["HDL"].includes(testName);

  if (higherIsBetter) return diff > 0;

  // For markers flagged high, decreasing is improving
  if (flag === "high" || flag === "borderline") return diff < 0;
  // For markers flagged low, increasing is improving
  if (flag === "low") return diff > 0;
  // For normal markers, staying stable is fine (no direction preference)
  return null;
}

export function BiomarkerCard({
  testName,
  latestValue,
  unit,
  referenceLow,
  referenceHigh,
  flag,
  previousValue,
  sparklineData,
  interpretation,
  onClick,
}: BiomarkerCardProps) {
  const flagConfig = FLAG_CONFIG[flag || "normal"] || FLAG_CONFIG.normal;
  const delta = getDelta(latestValue, previousValue);
  const improving = delta ? isDeltaImproving(delta.diff, flag, testName) : null;

  // Calculate position on reference range bar (0-100%)
  let barPosition: number | null = null;
  if (referenceLow != null && referenceHigh != null) {
    const range = referenceHigh - referenceLow;
    if (range > 0) {
      // Extend display range to show out-of-range values
      const extendedLow = referenceLow - range * 0.3;
      const extendedHigh = referenceHigh + range * 0.3;
      const extendedRange = extendedHigh - extendedLow;
      barPosition = Math.max(0, Math.min(100, ((latestValue - extendedLow) / extendedRange) * 100));
    }
  }

  return (
    <Card
      hover
      className={cn("cursor-pointer transition-all", onClick && "hover:teal-glow")}
      onClick={onClick}
    >
      {/* Header row: test name + flag badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="truncate font-display text-xs font-semibold uppercase tracking-wide text-text-secondary">
            {testName}
          </h4>
          {interpretation && (
            <p className="mt-0.5 text-[10px] text-text-muted truncate">
              {interpretation}
            </p>
          )}
        </div>

        <span
          className={cn(
            "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-display font-semibold uppercase tracking-wider",
            flagConfig.bg,
            flagConfig.color
          )}
        >
          {flagConfig.label}
        </span>
      </div>

      {/* Value + sparkline row */}
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-2xl font-bold tabular-nums text-text-primary">
            {latestValue % 1 === 0 ? latestValue : latestValue.toFixed(1)}
          </span>
          <span className="text-xs text-text-muted">{unit}</span>
        </div>

        {/* Sparkline */}
        {sparklineData.length >= 2 && (
          <Sparkline
            data={sparklineData}
            width={64}
            height={24}
            color={
              flag === "normal"
                ? "var(--accent-green)"
                : flag === "borderline"
                  ? "var(--accent-amber)"
                  : "var(--accent-red)"
            }
            showDots
          />
        )}
      </div>

      {/* Reference range bar */}
      {referenceLow != null && referenceHigh != null && (
        <div className="mt-3">
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-bg-card-hover">
            {/* Green zone: the in-range section */}
            {(() => {
              const range = referenceHigh - referenceLow;
              const extendedLow = referenceLow - range * 0.3;
              const extendedHigh = referenceHigh + range * 0.3;
              const extendedRange = extendedHigh - extendedLow;
              const greenStart = ((referenceLow - extendedLow) / extendedRange) * 100;
              const greenEnd = ((referenceHigh - extendedLow) / extendedRange) * 100;

              return (
                <>
                  {/* Red/amber zone before green */}
                  <div
                    className="absolute inset-y-0 bg-accent-red/30 rounded-l-full"
                    style={{ left: 0, width: `${greenStart}%` }}
                  />
                  {/* Green zone */}
                  <div
                    className="absolute inset-y-0 bg-accent-green/40"
                    style={{ left: `${greenStart}%`, width: `${greenEnd - greenStart}%` }}
                  />
                  {/* Red/amber zone after green */}
                  <div
                    className="absolute inset-y-0 bg-accent-red/30 rounded-r-full"
                    style={{ left: `${greenEnd}%`, width: `${100 - greenEnd}%` }}
                  />
                </>
              );
            })()}

            {/* Current value indicator */}
            {barPosition != null && (
              <div
                className="absolute top-1/2 -translate-y-1/2 h-3 w-1 rounded-full bg-text-primary shadow-sm"
                style={{ left: `${barPosition}%`, marginLeft: "-2px" }}
              />
            )}
          </div>

          {/* Range labels */}
          <div className="mt-1 flex justify-between text-[9px] text-text-muted font-display tabular-nums">
            <span>{referenceLow}</span>
            <span>{referenceHigh}</span>
          </div>
        </div>
      )}

      {/* Delta from previous */}
      {delta && (
        <div className="mt-2 flex items-center gap-1">
          {delta.diff > 0 ? (
            <TrendingUp
              size={11}
              className={cn(
                improving === true
                  ? "text-accent-green"
                  : improving === false
                    ? "text-accent-red"
                    : "text-text-muted"
              )}
            />
          ) : delta.diff < 0 ? (
            <TrendingDown
              size={11}
              className={cn(
                improving === true
                  ? "text-accent-green"
                  : improving === false
                    ? "text-accent-red"
                    : "text-text-muted"
              )}
            />
          ) : (
            <Minus size={11} className="text-text-muted" />
          )}
          <span
            className={cn(
              "font-display text-[10px] tabular-nums",
              improving === true
                ? "text-accent-green"
                : improving === false
                  ? "text-accent-red"
                  : "text-text-muted"
            )}
          >
            {delta.diff > 0 ? "+" : ""}
            {delta.diff % 1 === 0 ? delta.diff : delta.diff.toFixed(1)} {unit}
            {delta.pct !== 0 && (
              <span className="ml-1 opacity-70">
                ({delta.pct > 0 ? "+" : ""}
                {delta.pct.toFixed(1)}%)
              </span>
            )}
          </span>
        </div>
      )}
    </Card>
  );
}
