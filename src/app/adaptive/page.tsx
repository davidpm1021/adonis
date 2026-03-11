"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { TrainingEvaluation } from "@/components/adaptive/training-evaluation";
import { NutritionEvaluation } from "@/components/adaptive/nutrition-evaluation";
import { GoalEvaluation } from "@/components/adaptive/goal-evaluation";
import { InsightCards } from "@/components/adaptive/insight-cards";
import {
  Brain,
  Loader2,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types for Evaluation History
// ---------------------------------------------------------------------------

interface EvaluationHistoryEntry {
  id: number;
  feature: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  costEstimate: number | null;
  createdAt: string | null;
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function AdaptivePage() {
  const [historyEntries, setHistoryEntries] = useState<
    EvaluationHistoryEntry[]
  >([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  // Fetch evaluation history from AI usage log
  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/usage?limit=50");
      const json = await res.json();
      if (json.success) {
        // Filter to adaptive intelligence features
        const adaptiveFeatures = [
          "training_evaluate",
          "nutrition_evaluate",
          "goals_evaluate",
          "nutrition_insights",
        ];
        const filtered = (json.data as EvaluationHistoryEntry[]).filter(
          (entry) => adaptiveFeatures.includes(entry.feature)
        );
        setHistoryEntries(filtered);
      }
    } catch {
      // silent — history is non-critical
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const featureLabels: Record<string, string> = {
    training_evaluate: "Training Evaluation",
    nutrition_evaluate: "Nutrition Evaluation",
    goals_evaluate: "Goal Evaluation",
    nutrition_insights: "Nutrition Insights",
  };

  function formatCost(cost: number | null): string {
    if (cost == null) return "-";
    if (cost < 0.01) return "<$0.01";
    return `$${cost.toFixed(4)}`;
  }

  function formatDate(iso: string | null): string {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return (
    <div>
      <PageHeader
        title="Adaptive Intelligence"
        subtitle="AI-powered evaluations and recommendations requiring your approval"
        actions={
          <div className="flex items-center gap-1.5 rounded-full bg-accent-teal/10 px-3 py-1 border border-accent-teal/20">
            <Brain className="h-3.5 w-3.5 text-accent-teal" />
            <span className="font-display text-[10px] font-semibold text-accent-teal uppercase tracking-wide">
              Human-in-the-loop
            </span>
          </div>
        }
      />

      <div className="space-y-6">
        {/* Training Evaluation */}
        <TrainingEvaluation />

        {/* Nutrition Target Review */}
        <NutritionEvaluation />

        {/* Goal Status */}
        <GoalEvaluation />

        {/* Nutrition Insights */}
        <InsightCards />

        {/* Evaluation History */}
        <Card>
          <button
            onClick={() => setHistoryExpanded(!historyExpanded)}
            className="flex items-center justify-between w-full"
          >
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-text-secondary" />
              <CardTitle>Evaluation History</CardTitle>
            </div>
            {historyExpanded ? (
              <ChevronUp className="h-4 w-4 text-text-muted" />
            ) : (
              <ChevronDown className="h-4 w-4 text-text-muted" />
            )}
          </button>

          {historyExpanded && (
            <CardContent className="mt-3">
              {historyLoading && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
                </div>
              )}

              {!historyLoading && historyEntries.length === 0 && (
                <p className="text-sm text-text-muted text-center py-4">
                  No evaluation history yet. Run an evaluation to see it
                  here.
                </p>
              )}

              {!historyLoading && historyEntries.length > 0 && (
                <div>
                  {/* Table header */}
                  <div className="grid grid-cols-4 gap-2 px-2 pb-1.5 mb-1 border-b border-border">
                    <p className="font-display text-[9px] uppercase tracking-wider text-text-muted">
                      Evaluation
                    </p>
                    <p className="font-display text-[9px] uppercase tracking-wider text-text-muted">
                      Model
                    </p>
                    <p className="font-display text-[9px] uppercase tracking-wider text-text-muted">
                      Tokens
                    </p>
                    <p className="font-display text-[9px] uppercase tracking-wider text-text-muted">
                      Date
                    </p>
                  </div>

                  {/* Table rows */}
                  <div className="space-y-0.5 max-h-64 overflow-y-auto">
                    {historyEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="grid grid-cols-4 gap-2 rounded-md px-2 py-1.5 hover:bg-bg-card-hover transition-colors"
                      >
                        <span className="text-xs text-text-primary truncate">
                          {featureLabels[entry.feature] || entry.feature}
                        </span>
                        <span className="text-[10px] text-text-muted font-display tabular-nums truncate">
                          {entry.model.includes("opus")
                            ? "Opus"
                            : "Sonnet"}
                        </span>
                        <div className="text-[10px] text-text-muted tabular-nums">
                          <span>
                            {(entry.inputTokens || 0) +
                              (entry.outputTokens || 0)}
                          </span>
                          <span className="ml-1 text-text-muted/50">
                            ({formatCost(entry.costEstimate)})
                          </span>
                        </div>
                        <span className="text-[10px] text-text-muted tabular-nums">
                          {formatDate(entry.createdAt)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Total cost */}
                  <div className="mt-2 pt-2 border-t border-border flex items-center justify-between px-2">
                    <span className="font-display text-[10px] uppercase tracking-wider text-text-muted">
                      Total Cost
                    </span>
                    <span className="font-display text-xs font-semibold tabular-nums text-text-primary">
                      {formatCost(
                        historyEntries.reduce(
                          (sum, e) => sum + (e.costEstimate || 0),
                          0
                        )
                      )}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
