"use client";

import { useState } from "react";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import {
  Dumbbell,
  Loader2,
  CheckCircle,
  XCircle,
  ArrowRight,
  AlertTriangle,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TrainingEvaluation {
  current_phase: {
    id: number;
    phaseNumber: number;
    phaseName: string;
    startDate: string | null;
    endDate: string | null;
    weeksInPhase: number;
  };
  stats: {
    totalWorkouts: number;
    completedCount: number;
    plannedTotal: number;
    adherenceRate: number;
    avgRpe: number | null;
  };
  recommendation: "advance" | "extend" | "deload" | "maintain";
  rationale: string;
  key_observations: string[];
  proposed_phase: {
    phase_name: string;
    focus: string;
    duration_weeks: number;
    notes: string;
  } | null;
  confidence: "high" | "medium" | "low";
  evaluated_at: string;
}

export function TrainingEvaluation() {
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<TrainingEvaluation | null>(null);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [advanceResult, setAdvanceResult] = useState<string | null>(null);

  async function handleEvaluate() {
    setIsEvaluating(true);
    setEvalError(null);
    setAdvanceResult(null);
    try {
      const res = await fetch("/api/training/evaluate", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to evaluate training phase");
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

  async function handleAdvance() {
    if (!evaluation?.proposed_phase || !evaluation.current_phase) return;
    setIsAdvancing(true);
    try {
      const res = await fetch("/api/training/advance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPhaseId: evaluation.current_phase.id,
          phaseName: evaluation.proposed_phase.phase_name,
          notes: evaluation.proposed_phase.notes,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to advance phase");
      }
      setAdvanceResult(
        `Advanced to Phase ${json.data.newPhase.phaseNumber}: ${json.data.newPhase.phaseName}`
      );
      setEvaluation(null);
    } catch (err) {
      setEvalError(
        err instanceof Error ? err.message : "Failed to advance"
      );
    } finally {
      setIsAdvancing(false);
    }
  }

  function handleDismiss() {
    setEvaluation(null);
    setAdvanceResult(null);
  }

  const recommendationColors: Record<string, string> = {
    advance: "text-accent-green",
    extend: "text-accent-amber",
    deload: "text-accent-red",
    maintain: "text-accent-teal",
  };

  const recommendationIcons: Record<string, React.ReactNode> = {
    advance: <ArrowRight className="h-4 w-4" />,
    extend: <Zap className="h-4 w-4" />,
    deload: <AlertTriangle className="h-4 w-4" />,
    maintain: <CheckCircle className="h-4 w-4" />,
  };

  const confidenceColors: Record<string, string> = {
    high: "bg-accent-green/10 text-accent-green border-accent-green/30",
    medium: "bg-accent-amber/10 text-accent-amber border-accent-amber/30",
    low: "bg-accent-red/10 text-accent-red border-accent-red/30",
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Dumbbell className="h-4 w-4 text-accent-teal" />
          <CardTitle>Training Phase Evaluation</CardTitle>
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
            "Evaluate Phase"
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

        {/* Advance result */}
        {advanceResult && (
          <div className="flex items-center gap-2 rounded-lg border border-accent-green/30 bg-accent-green/5 px-3 py-2.5 text-xs text-accent-green mb-3">
            <CheckCircle className="h-3.5 w-3.5 shrink-0" />
            {advanceResult}
          </div>
        )}

        {/* Loading state */}
        {isEvaluating && (
          <div className="flex flex-col items-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-accent-teal mb-2" />
            <p className="text-xs text-text-secondary">
              Analyzing workout data with Claude Opus...
            </p>
          </div>
        )}

        {/* No evaluation yet */}
        {!evaluation && !isEvaluating && !advanceResult && (
          <div className="py-6 text-center">
            <Dumbbell className="mx-auto h-8 w-8 text-text-muted/30 mb-2" />
            <p className="text-sm text-text-muted">
              Evaluate your current training phase to see if it is time to
              progress, deload, or maintain.
            </p>
          </div>
        )}

        {/* Evaluation results */}
        {evaluation && (
          <div className="space-y-4">
            {/* Current phase info */}
            <div className="rounded-lg border border-border bg-bg-primary px-3 py-2.5">
              <p className="font-display text-[10px] uppercase tracking-wider text-text-muted mb-1">
                Current Phase
              </p>
              <p className="text-sm font-semibold text-text-primary">
                Phase {evaluation.current_phase.phaseNumber}:{" "}
                {evaluation.current_phase.phaseName}
              </p>
              <p className="text-xs text-text-secondary mt-0.5">
                {evaluation.current_phase.weeksInPhase} weeks |{" "}
                {evaluation.stats.adherenceRate}% adherence |{" "}
                {evaluation.stats.completedCount}/
                {evaluation.stats.plannedTotal} workouts
                {evaluation.stats.avgRpe != null &&
                  ` | RPE ${evaluation.stats.avgRpe}`}
              </p>
            </div>

            {/* Recommendation */}
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex items-center gap-1.5",
                  recommendationColors[evaluation.recommendation] ||
                    "text-text-primary"
                )}
              >
                {recommendationIcons[evaluation.recommendation]}
                <span className="font-display text-sm font-bold uppercase tracking-wide">
                  {evaluation.recommendation}
                </span>
              </div>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 font-display text-[10px] font-semibold",
                  confidenceColors[evaluation.confidence] ||
                    "bg-bg-card-hover text-text-muted border-border"
                )}
              >
                {evaluation.confidence} confidence
              </span>
            </div>

            {/* Rationale */}
            <p className="text-sm text-text-secondary leading-relaxed">
              {evaluation.rationale}
            </p>

            {/* Key observations */}
            {evaluation.key_observations &&
              evaluation.key_observations.length > 0 && (
                <div>
                  <p className="font-display text-[10px] uppercase tracking-wider text-text-muted mb-1.5">
                    Key Observations
                  </p>
                  <ul className="space-y-1">
                    {evaluation.key_observations.map((obs, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-xs text-text-secondary"
                      >
                        <span className="mt-1.5 h-1 w-1 rounded-full bg-accent-teal shrink-0" />
                        {obs}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            {/* Proposed phase */}
            {evaluation.proposed_phase && (
              <div className="rounded-lg border border-accent-teal/20 bg-accent-teal/5 px-3 py-2.5">
                <p className="font-display text-[10px] uppercase tracking-wider text-accent-teal mb-1">
                  Proposed Next Phase
                </p>
                <p className="text-sm font-semibold text-text-primary">
                  {evaluation.proposed_phase.phase_name}
                </p>
                <p className="text-xs text-text-secondary mt-0.5">
                  Focus: {evaluation.proposed_phase.focus} |{" "}
                  {evaluation.proposed_phase.duration_weeks} weeks
                </p>
                {evaluation.proposed_phase.notes && (
                  <p className="text-xs text-text-muted mt-1">
                    {evaluation.proposed_phase.notes}
                  </p>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-2">
              {evaluation.recommendation === "advance" &&
                evaluation.proposed_phase && (
                  <button
                    onClick={handleAdvance}
                    disabled={isAdvancing}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-4 py-2 font-display text-xs font-semibold transition-all",
                      isAdvancing
                        ? "cursor-not-allowed bg-accent-green/20 text-accent-green/50"
                        : "bg-accent-green text-bg-primary hover:bg-accent-green/90"
                    )}
                  >
                    {isAdvancing ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Advancing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-3.5 w-3.5" />
                        Accept &amp; Advance
                      </>
                    )}
                  </button>
                )}
              <button
                onClick={handleDismiss}
                className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 font-display text-xs font-medium text-text-secondary hover:bg-bg-card-hover hover:text-text-primary transition-all"
              >
                <XCircle className="h-3.5 w-3.5" />
                Dismiss
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
