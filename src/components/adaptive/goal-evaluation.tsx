"use client";

import { useState } from "react";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import {
  Target,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Archive,
  Plus,
  Trophy,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AchievedGoal {
  goal_id: number;
  description: string;
  category: string;
  achievement_details: string;
}

interface StalledGoal {
  goal_id: number;
  description: string;
  category: string;
  days_since_progress: number;
  suggestion: string;
}

interface ProposedGoal {
  category: string;
  description: string;
  target_value: number | null;
  target_unit: string | null;
  rationale: string;
}

interface GoalEvaluationData {
  achieved: AchievedGoal[];
  stalled: StalledGoal[];
  proposed_new_goals: ProposedGoal[];
  total_active_goals: number;
  evaluated_at: string;
  message?: string;
}

export function GoalEvaluation() {
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] =
    useState<GoalEvaluationData | null>(null);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [processingIds, setProcessingIds] = useState<Set<number>>(
    new Set()
  );
  const [creatingGoals, setCreatingGoals] = useState<Set<number>>(
    new Set()
  );

  async function handleEvaluate() {
    setIsEvaluating(true);
    setEvalError(null);
    setActionMessage(null);
    try {
      const res = await fetch("/api/goals/evaluate", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to evaluate goals");
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

  async function handleArchive(goalId: number, reason?: string) {
    setProcessingIds((prev) => new Set(prev).add(goalId));
    try {
      const res = await fetch("/api/goals/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalId, reason }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to archive goal");
      }
      setActionMessage(`Goal archived successfully.`);

      // Remove from stalled list
      if (evaluation) {
        setEvaluation({
          ...evaluation,
          stalled: evaluation.stalled.filter(
            (g) => g.goal_id !== goalId
          ),
          achieved: evaluation.achieved.filter(
            (g) => g.goal_id !== goalId
          ),
        });
      }
    } catch (err) {
      setEvalError(
        err instanceof Error ? err.message : "Failed to archive"
      );
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(goalId);
        return next;
      });
    }
  }

  async function handleCreateGoal(index: number, goal: ProposedGoal) {
    setCreatingGoals((prev) => new Set(prev).add(index));
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: goal.category,
          description: goal.description,
          targetValue: goal.target_value,
          targetUnit: goal.target_unit,
          status: "active",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to create goal");
      }
      setActionMessage(`Goal "${goal.description}" created.`);

      // Remove from proposed list
      if (evaluation) {
        setEvaluation({
          ...evaluation,
          proposed_new_goals: evaluation.proposed_new_goals.filter(
            (_, i) => i !== index
          ),
        });
      }
    } catch (err) {
      setEvalError(
        err instanceof Error ? err.message : "Failed to create goal"
      );
    } finally {
      setCreatingGoals((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }
  }

  const categoryColors: Record<string, string> = {
    weight: "text-accent-amber",
    training: "text-accent-teal",
    nutrition: "text-accent-green",
    sleep: "text-[#818cf8]",
    health: "text-accent-red",
    body_composition: "text-accent-amber",
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-accent-teal" />
          <CardTitle>Goal Status</CardTitle>
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
            "Evaluate Goals"
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

        {/* Action message */}
        {actionMessage && (
          <div className="flex items-center gap-2 rounded-lg border border-accent-green/30 bg-accent-green/5 px-3 py-2.5 text-xs text-accent-green mb-3">
            <CheckCircle className="h-3.5 w-3.5 shrink-0" />
            {actionMessage}
          </div>
        )}

        {/* Loading */}
        {isEvaluating && (
          <div className="flex flex-col items-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-accent-teal mb-2" />
            <p className="text-xs text-text-secondary">
              Scanning goals for achievements and staleness...
            </p>
          </div>
        )}

        {/* Empty state */}
        {!evaluation && !isEvaluating && (
          <div className="py-6 text-center">
            <Target className="mx-auto h-8 w-8 text-text-muted/30 mb-2" />
            <p className="text-sm text-text-muted">
              Scan your active goals to detect achievements, stalled
              progress, and AI-suggested new goals.
            </p>
          </div>
        )}

        {/* Evaluation results */}
        {evaluation && (
          <div className="space-y-5">
            {/* Summary */}
            <div className="flex items-center gap-4 text-xs text-text-muted">
              <span>{evaluation.total_active_goals} active goals</span>
              {evaluation.achieved.length > 0 && (
                <span className="text-accent-green">
                  {evaluation.achieved.length} achieved
                </span>
              )}
              {evaluation.stalled.length > 0 && (
                <span className="text-accent-amber">
                  {evaluation.stalled.length} stalled
                </span>
              )}
            </div>

            {/* Achieved goals */}
            {evaluation.achieved.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Trophy className="h-3.5 w-3.5 text-accent-green" />
                  <p className="font-display text-[10px] uppercase tracking-wider text-accent-green font-semibold">
                    Achievements Detected
                  </p>
                </div>
                <div className="space-y-2">
                  {evaluation.achieved.map((goal) => (
                    <div
                      key={goal.goal_id}
                      className="rounded-lg border border-accent-green/20 bg-accent-green/5 px-3 py-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-text-primary">
                            {goal.description}
                          </p>
                          <span
                            className={cn(
                              "text-[10px] font-display font-semibold uppercase",
                              categoryColors[goal.category] ||
                                "text-text-muted"
                            )}
                          >
                            {goal.category}
                          </span>
                          <p className="text-xs text-text-secondary mt-1">
                            {goal.achievement_details}
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            handleArchive(goal.goal_id, "Goal achieved")
                          }
                          disabled={processingIds.has(goal.goal_id)}
                          className="flex items-center gap-1 shrink-0 rounded-md px-2 py-1 text-[10px] font-display font-semibold text-accent-green hover:bg-accent-green/10 transition-colors"
                        >
                          {processingIds.has(goal.goal_id) ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Archive className="h-3 w-3" />
                          )}
                          Archive
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stalled goals */}
            {evaluation.stalled.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Clock className="h-3.5 w-3.5 text-accent-amber" />
                  <p className="font-display text-[10px] uppercase tracking-wider text-accent-amber font-semibold">
                    Stalled Progress
                  </p>
                </div>
                <div className="space-y-2">
                  {evaluation.stalled.map((goal) => (
                    <div
                      key={goal.goal_id}
                      className="rounded-lg border border-accent-amber/20 bg-accent-amber/5 px-3 py-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-text-primary">
                            {goal.description}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className={cn(
                                "text-[10px] font-display font-semibold uppercase",
                                categoryColors[goal.category] ||
                                  "text-text-muted"
                              )}
                            >
                              {goal.category}
                            </span>
                            <span className="text-[10px] text-accent-amber tabular-nums">
                              {goal.days_since_progress}d no progress
                            </span>
                          </div>
                          <p className="text-xs text-text-secondary mt-1">
                            {goal.suggestion}
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            handleArchive(
                              goal.goal_id,
                              "Archived due to stalled progress"
                            )
                          }
                          disabled={processingIds.has(goal.goal_id)}
                          className="flex items-center gap-1 shrink-0 rounded-md px-2 py-1 text-[10px] font-display font-semibold text-text-secondary hover:text-accent-amber hover:bg-accent-amber/10 transition-colors"
                        >
                          {processingIds.has(goal.goal_id) ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Archive className="h-3 w-3" />
                          )}
                          Archive
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Proposed new goals */}
            {evaluation.proposed_new_goals.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Plus className="h-3.5 w-3.5 text-accent-teal" />
                  <p className="font-display text-[10px] uppercase tracking-wider text-accent-teal font-semibold">
                    AI-Suggested Goals
                  </p>
                </div>
                <div className="space-y-2">
                  {evaluation.proposed_new_goals.map((goal, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-accent-teal/20 bg-accent-teal/5 px-3 py-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-text-primary">
                            {goal.description}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className={cn(
                                "text-[10px] font-display font-semibold uppercase",
                                categoryColors[goal.category] ||
                                  "text-text-muted"
                              )}
                            >
                              {goal.category}
                            </span>
                            {goal.target_value != null && (
                              <span className="text-[10px] text-text-muted tabular-nums">
                                Target: {goal.target_value}{" "}
                                {goal.target_unit || ""}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-text-secondary mt-1">
                            {goal.rationale}
                          </p>
                        </div>
                        <button
                          onClick={() => handleCreateGoal(i, goal)}
                          disabled={creatingGoals.has(i)}
                          className={cn(
                            "flex items-center gap-1 shrink-0 rounded-md px-2 py-1 text-[10px] font-display font-semibold transition-colors",
                            creatingGoals.has(i)
                              ? "text-accent-teal/50"
                              : "text-accent-teal hover:bg-accent-teal/10"
                          )}
                        >
                          {creatingGoals.has(i) ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Plus className="h-3 w-3" />
                          )}
                          Add Goal
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No issues found */}
            {evaluation.achieved.length === 0 &&
              evaluation.stalled.length === 0 &&
              evaluation.proposed_new_goals.length === 0 && (
                <div className="py-4 text-center">
                  <CheckCircle className="mx-auto h-6 w-6 text-accent-green/40 mb-2" />
                  <p className="text-sm text-text-muted">
                    All goals are on track. No achievements, stalled
                    progress, or new suggestions at this time.
                  </p>
                </div>
              )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
