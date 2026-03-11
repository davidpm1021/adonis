"use client";

import { motion } from "framer-motion";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, Target } from "lucide-react";

interface MetricsSnapshotProps {
  currentWeight: number | null;
  startingWeight: number;
  previousWeight: number | null;
  todayNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  nutritionTargets: {
    caloriesMin: number | null;
    caloriesMax: number | null;
    proteinMin: number | null;
    proteinMax: number | null;
    carbsMin: number | null;
    carbsMax: number | null;
    fatMin: number | null;
    fatMax: number | null;
    fiberMin: number | null;
    fiberMax: number | null;
  } | null;
  consistency7d: number;
  consistency30d: number;
}

function MacroBar({
  label,
  current,
  min,
  max,
  unit,
  color,
  prominent,
}: {
  label: string;
  current: number;
  min: number | null;
  max: number | null;
  unit: string;
  color: string;
  prominent?: boolean;
}) {
  const target = max || min || 0;
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const isOver = target > 0 && current > target;

  return (
    <div className={prominent ? "col-span-2 sm:col-span-1" : ""}>
      <div className="flex items-baseline justify-between mb-1">
        <span
          className={`font-display text-[11px] font-semibold uppercase tracking-wide ${
            prominent ? "text-accent-teal" : "text-text-secondary"
          }`}
        >
          {label}
        </span>
        <span className="font-display text-xs tabular-nums text-text-muted">
          {min && max ? `${min}-${max}${unit}` : target > 0 ? `${target}${unit}` : ""}
        </span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span
          className={`font-display tabular-nums font-bold ${
            prominent ? "text-2xl text-text-primary" : "text-lg text-text-primary"
          }`}
        >
          {Math.round(current)}
        </span>
        <span className="text-xs text-text-muted">{unit}</span>
      </div>
      {/* Progress bar */}
      <div className="mt-1.5 h-1.5 w-full rounded-full bg-bg-card-hover overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          className={`h-full rounded-full ${isOver ? "bg-accent-amber" : ""}`}
          style={!isOver ? { backgroundColor: color } : undefined}
        />
      </div>
    </div>
  );
}

export function MetricsSnapshot({
  currentWeight,
  startingWeight,
  previousWeight,
  todayNutrition,
  nutritionTargets,
  consistency7d,
  consistency30d,
}: MetricsSnapshotProps) {
  // Weight calculations
  const weight = currentWeight ?? startingWeight;
  const delta = previousWeight ? weight - previousWeight : null;
  const totalChange = weight - startingWeight;

  return (
    <Card>
      <CardTitle>Metrics Snapshot</CardTitle>
      <CardContent>
        <div className="space-y-5">
          {/* Weight section */}
          <div>
            <div className="flex items-center gap-3">
              <span className="font-display text-3xl font-bold tabular-nums text-text-primary">
                {weight.toFixed(1)}
              </span>
              <span className="text-sm text-text-muted">lbs</span>

              {delta !== null && (
                <div
                  className={`ml-auto flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-display tabular-nums ${
                    delta < 0
                      ? "bg-accent-green/10 text-accent-green"
                      : delta > 0
                      ? "bg-accent-red/10 text-accent-red"
                      : "bg-bg-card-hover text-text-muted"
                  }`}
                >
                  {delta < 0 ? (
                    <TrendingDown className="h-3 w-3" />
                  ) : delta > 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <Minus className="h-3 w-3" />
                  )}
                  {delta > 0 ? "+" : ""}
                  {delta.toFixed(1)}
                </div>
              )}
            </div>
            <p className="mt-0.5 text-[11px] text-text-muted">
              {totalChange < 0 ? "" : "+"}
              {totalChange.toFixed(1)} lbs from {startingWeight} start
            </p>
          </div>

          {/* Macros grid */}
          <div>
            <div className="mb-2 flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 text-text-muted" />
              <span className="font-display text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                Today&apos;s Macros
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <MacroBar
                label="Protein"
                current={todayNutrition.protein}
                min={nutritionTargets?.proteinMin ?? null}
                max={nutritionTargets?.proteinMax ?? null}
                unit="g"
                color="#00e5c7"
                prominent
              />
              <MacroBar
                label="Calories"
                current={todayNutrition.calories}
                min={nutritionTargets?.caloriesMin ?? null}
                max={nutritionTargets?.caloriesMax ?? null}
                unit=""
                color="#8b8b9e"
              />
              <MacroBar
                label="Carbs"
                current={todayNutrition.carbs}
                min={nutritionTargets?.carbsMin ?? null}
                max={nutritionTargets?.carbsMax ?? null}
                unit="g"
                color="#f59e0b"
              />
              <MacroBar
                label="Fat"
                current={todayNutrition.fat}
                min={nutritionTargets?.fatMin ?? null}
                max={nutritionTargets?.fatMax ?? null}
                unit="g"
                color="#ef4444"
              />
              <MacroBar
                label="Fiber"
                current={todayNutrition.fiber}
                min={nutritionTargets?.fiberMin ?? null}
                max={nutritionTargets?.fiberMax ?? null}
                unit="g"
                color="#22c55e"
              />
            </div>
          </div>

          {/* Consistency */}
          <div className="flex gap-4 border-t border-border pt-3">
            <div className="flex-1">
              <p className="font-display text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                7-Day
              </p>
              <p className="font-display text-xl font-bold tabular-nums text-text-primary">
                {consistency7d}
                <span className="text-sm text-text-muted">%</span>
              </p>
            </div>
            <div className="flex-1">
              <p className="font-display text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                30-Day
              </p>
              <p className="font-display text-xl font-bold tabular-nums text-text-primary">
                {consistency30d}
                <span className="text-sm text-text-muted">%</span>
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
