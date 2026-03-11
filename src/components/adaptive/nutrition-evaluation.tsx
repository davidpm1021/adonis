"use client";

import { useState } from "react";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import {
  Utensils,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NutritionEvaluation {
  recommendation: "adjust" | "maintain";
  current_targets: {
    calories_min: number | null;
    calories_max: number | null;
    protein_min: number | null;
    protein_max: number | null;
    carbs_min: number | null;
    carbs_max: number | null;
    fat_min: number | null;
    fat_max: number | null;
    fiber_min: number | null;
    fiber_max: number | null;
  };
  proposed_targets: {
    calories_min: number;
    calories_max: number;
    protein_min: number;
    protein_max: number;
    carbs_min: number;
    carbs_max: number;
    fat_min: number;
    fat_max: number;
    fiber_min: number;
    fiber_max: number;
    rationale: string;
  };
  actual_averages: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    days_with_data: number;
  };
  weight_trend: {
    start: number | null;
    end: number | null;
    change: number;
  } | null;
  analysis: string;
  key_findings: string[];
  evaluated_at: string;
}

function DeltaIndicator({
  current,
  proposed,
}: {
  current: number | null;
  proposed: number;
}) {
  if (current == null) return null;
  const diff = proposed - current;
  if (diff === 0) return <Minus className="h-3 w-3 text-text-muted" />;
  if (diff > 0)
    return <ArrowUp className="h-3 w-3 text-accent-green" />;
  return <ArrowDown className="h-3 w-3 text-accent-red" />;
}

function MacroRow({
  label,
  currentMin,
  currentMax,
  proposedMin,
  proposedMax,
  actual,
  unit,
}: {
  label: string;
  currentMin: number | null;
  currentMax: number | null;
  proposedMin: number;
  proposedMax: number;
  actual: number;
  unit: string;
}) {
  const changed =
    currentMin !== proposedMin || currentMax !== proposedMax;

  return (
    <div
      className={cn(
        "grid grid-cols-4 gap-2 rounded-md px-2 py-1.5 text-xs",
        changed ? "bg-accent-teal/5" : ""
      )}
    >
      <div className="font-display font-semibold text-text-primary">
        {label}
      </div>
      <div className="text-text-secondary tabular-nums">
        {currentMin ?? "?"}-{currentMax ?? "?"} {unit}
      </div>
      <div
        className={cn(
          "flex items-center gap-1 font-semibold tabular-nums",
          changed ? "text-accent-teal" : "text-text-secondary"
        )}
      >
        <DeltaIndicator current={currentMin} proposed={proposedMin} />
        {proposedMin}-{proposedMax} {unit}
      </div>
      <div
        className={cn(
          "tabular-nums",
          actual >= (currentMin || 0) && actual <= (currentMax || Infinity)
            ? "text-accent-green"
            : "text-accent-amber"
        )}
      >
        {actual} {unit}
      </div>
    </div>
  );
}

export function NutritionEvaluation() {
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] =
    useState<NutritionEvaluation | null>(null);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<string | null>(null);

  async function handleEvaluate() {
    setIsEvaluating(true);
    setEvalError(null);
    setApplyResult(null);
    try {
      const res = await fetch("/api/targets/nutrition/evaluate", {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(
          json.error || "Failed to evaluate nutrition targets"
        );
      }
      setEvaluation(json.data);
    } catch (err) {
      setEvalError(
        err instanceof Error ? err.message : "Evaluation failed"
      );
    } finally {
      setIsEvaluating(false);
    }
  }

  async function handleApply() {
    if (!evaluation?.proposed_targets) return;
    setIsApplying(true);
    try {
      const res = await fetch("/api/targets/nutrition/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(evaluation.proposed_targets),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to apply targets");
      }
      setApplyResult("Nutrition targets updated successfully.");
      setEvaluation(null);
    } catch (err) {
      setEvalError(
        err instanceof Error ? err.message : "Failed to apply"
      );
    } finally {
      setIsApplying(false);
    }
  }

  function handleDismiss() {
    setEvaluation(null);
    setApplyResult(null);
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Utensils className="h-4 w-4 text-accent-teal" />
          <CardTitle>Nutrition Target Review</CardTitle>
        </div>
        <button
          onClick={handleEvaluate}
          disabled={isEvaluating}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-display text-xs font-semibold transition-all",
            isEvaluating
              ? "cursor-not-allowed bg-accent-teal/20 text-accent-teal/50"
              : "bg-accent-teal text-bg-primary hover:bg-accent-teal/90"
          )}
        >
          {isEvaluating ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Evaluating...
            </>
          ) : (
            "Evaluate Targets"
          )}
        </button>
      </div>
      <CardContent>
        {/* Error */}
        {evalError && (
          <div className="flex items-center gap-2 rounded-lg border border-accent-red/30 bg-accent-red/5 px-3 py-2.5 text-xs text-accent-red mb-3">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {evalError}
          </div>
        )}

        {/* Apply result */}
        {applyResult && (
          <div className="flex items-center gap-2 rounded-lg border border-accent-green/30 bg-accent-green/5 px-3 py-2.5 text-xs text-accent-green mb-3">
            <CheckCircle className="h-3.5 w-3.5 shrink-0" />
            {applyResult}
          </div>
        )}

        {/* Loading */}
        {isEvaluating && (
          <div className="flex flex-col items-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-accent-teal mb-2" />
            <p className="text-xs text-text-secondary">
              Analyzing 14 days of nutrition data...
            </p>
          </div>
        )}

        {/* Empty state */}
        {!evaluation && !isEvaluating && !applyResult && (
          <div className="py-6 text-center">
            <Utensils className="mx-auto h-8 w-8 text-text-muted/30 mb-2" />
            <p className="text-sm text-text-muted">
              Evaluate whether your nutrition targets need adjustment based
              on recent data.
            </p>
          </div>
        )}

        {/* Evaluation results */}
        {evaluation && (
          <div className="space-y-4">
            {/* Recommendation badge */}
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 font-display text-[10px] font-bold uppercase tracking-wider",
                  evaluation.recommendation === "adjust"
                    ? "bg-accent-amber/10 text-accent-amber border border-accent-amber/30"
                    : "bg-accent-green/10 text-accent-green border border-accent-green/30"
                )}
              >
                {evaluation.recommendation === "adjust"
                  ? "Adjustments Recommended"
                  : "Targets On Track"}
              </span>
              {evaluation.weight_trend && (
                <span className="text-xs text-text-muted">
                  Weight trend:{" "}
                  <span
                    className={cn(
                      "font-semibold tabular-nums",
                      evaluation.weight_trend.change < 0
                        ? "text-accent-green"
                        : evaluation.weight_trend.change > 0
                        ? "text-accent-amber"
                        : "text-text-secondary"
                    )}
                  >
                    {evaluation.weight_trend.change > 0 ? "+" : ""}
                    {evaluation.weight_trend.change} lbs
                  </span>
                </span>
              )}
            </div>

            {/* Analysis */}
            <p className="text-sm text-text-secondary leading-relaxed">
              {evaluation.analysis}
            </p>

            {/* Comparison table */}
            <div>
              <div className="grid grid-cols-4 gap-2 px-2 pb-1 mb-1 border-b border-border">
                <p className="font-display text-[10px] uppercase tracking-wider text-text-muted">
                  Macro
                </p>
                <p className="font-display text-[10px] uppercase tracking-wider text-text-muted">
                  Current
                </p>
                <p className="font-display text-[10px] uppercase tracking-wider text-text-muted">
                  Proposed
                </p>
                <p className="font-display text-[10px] uppercase tracking-wider text-text-muted">
                  Actual Avg
                </p>
              </div>
              <div className="space-y-0.5">
                <MacroRow
                  label="Calories"
                  currentMin={evaluation.current_targets.calories_min}
                  currentMax={evaluation.current_targets.calories_max}
                  proposedMin={evaluation.proposed_targets.calories_min}
                  proposedMax={evaluation.proposed_targets.calories_max}
                  actual={evaluation.actual_averages.calories}
                  unit="kcal"
                />
                <MacroRow
                  label="Protein"
                  currentMin={evaluation.current_targets.protein_min}
                  currentMax={evaluation.current_targets.protein_max}
                  proposedMin={evaluation.proposed_targets.protein_min}
                  proposedMax={evaluation.proposed_targets.protein_max}
                  actual={evaluation.actual_averages.protein}
                  unit="g"
                />
                <MacroRow
                  label="Carbs"
                  currentMin={evaluation.current_targets.carbs_min}
                  currentMax={evaluation.current_targets.carbs_max}
                  proposedMin={evaluation.proposed_targets.carbs_min}
                  proposedMax={evaluation.proposed_targets.carbs_max}
                  actual={evaluation.actual_averages.carbs}
                  unit="g"
                />
                <MacroRow
                  label="Fat"
                  currentMin={evaluation.current_targets.fat_min}
                  currentMax={evaluation.current_targets.fat_max}
                  proposedMin={evaluation.proposed_targets.fat_min}
                  proposedMax={evaluation.proposed_targets.fat_max}
                  actual={evaluation.actual_averages.fat}
                  unit="g"
                />
                <MacroRow
                  label="Fiber"
                  currentMin={evaluation.current_targets.fiber_min}
                  currentMax={evaluation.current_targets.fiber_max}
                  proposedMin={evaluation.proposed_targets.fiber_min}
                  proposedMax={evaluation.proposed_targets.fiber_max}
                  actual={evaluation.actual_averages.fiber}
                  unit="g"
                />
              </div>
              <p className="text-[10px] text-text-muted mt-1.5 px-2">
                Based on {evaluation.actual_averages.days_with_data} days of
                data
              </p>
            </div>

            {/* Key findings */}
            {evaluation.key_findings &&
              evaluation.key_findings.length > 0 && (
                <div>
                  <p className="font-display text-[10px] uppercase tracking-wider text-text-muted mb-1.5">
                    Key Findings
                  </p>
                  <ul className="space-y-1">
                    {evaluation.key_findings.map((finding, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-xs text-text-secondary"
                      >
                        <span className="mt-1.5 h-1 w-1 rounded-full bg-accent-teal shrink-0" />
                        {finding}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            {/* Rationale for changes */}
            {evaluation.proposed_targets.rationale && (
              <div className="rounded-lg border border-border bg-bg-primary px-3 py-2.5">
                <p className="font-display text-[10px] uppercase tracking-wider text-text-muted mb-1">
                  Rationale
                </p>
                <p className="text-xs text-text-secondary">
                  {evaluation.proposed_targets.rationale}
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-2">
              {evaluation.recommendation === "adjust" && (
                <button
                  onClick={handleApply}
                  disabled={isApplying}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-4 py-2 font-display text-xs font-semibold transition-all",
                    isApplying
                      ? "cursor-not-allowed bg-accent-green/20 text-accent-green/50"
                      : "bg-accent-green text-bg-primary hover:bg-accent-green/90"
                  )}
                >
                  {isApplying ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-3.5 w-3.5" />
                      Apply Changes
                    </>
                  )}
                </button>
              )}
              <button
                onClick={handleDismiss}
                className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 font-display text-xs font-medium text-text-secondary hover:bg-bg-card-hover hover:text-text-primary transition-all"
              >
                <XCircle className="h-3.5 w-3.5" />
                {evaluation.recommendation === "maintain"
                  ? "Dismiss"
                  : "Keep Current"}
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
