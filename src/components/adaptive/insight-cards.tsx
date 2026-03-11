"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import {
  Lightbulb,
  Loader2,
  AlertTriangle,
  TrendingUp,
  Trophy,
  AlertCircle,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NutritionInsight {
  id: number;
  insightType: string;
  content: string;
  dataRangeStart: string | null;
  dataRangeEnd: string | null;
  createdAt: string | null;
}

interface NutritionStats {
  total_days_tracked: number;
  total_entries: number;
  avg_weekday_calories: number;
  avg_weekend_calories: number;
  weekend_vs_weekday_diff: number;
  protein_by_meal: Record<
    string,
    { avg_per_meal: number; total_entries: number }
  >;
  fiber_compliance_rate: number;
  fiber_days_hit: number;
  fiber_target: number;
  top_meals: { meal: string; count: number }[];
  takeout_meals: number;
  takeout_percentage: number;
}

const insightIcons: Record<string, React.ReactNode> = {
  pattern: <TrendingUp className="h-3.5 w-3.5" />,
  achievement: <Trophy className="h-3.5 w-3.5" />,
  concern: <AlertCircle className="h-3.5 w-3.5" />,
  suggestion: <Sparkles className="h-3.5 w-3.5" />,
};

const insightColors: Record<string, string> = {
  pattern: "text-accent-teal border-accent-teal/20",
  achievement: "text-accent-green border-accent-green/20",
  concern: "text-accent-amber border-accent-amber/20",
  suggestion: "text-[#818cf8] border-[#818cf8]/20",
};

const insightBgColors: Record<string, string> = {
  pattern: "bg-accent-teal/5",
  achievement: "bg-accent-green/5",
  concern: "bg-accent-amber/5",
  suggestion: "bg-[#818cf8]/5",
};

export function InsightCards() {
  const [insights, setInsights] = useState<NutritionInsight[]>([]);
  const [stats, setStats] = useState<NutritionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Fetch existing insights
  const fetchInsights = useCallback(async () => {
    try {
      const res = await fetch("/api/insights/nutrition?limit=20");
      const json = await res.json();
      if (json.success) {
        setInsights(json.data);
      }
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  // Generate fresh insights
  async function handleGenerate() {
    setIsGenerating(true);
    setGenError(null);
    try {
      const res = await fetch("/api/insights/nutrition", {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(
          json.error || "Failed to generate nutrition insights"
        );
      }
      setInsights(json.data.insights || []);
      setStats(json.data.stats || null);
    } catch (err) {
      setGenError(
        err instanceof Error ? err.message : "Generation failed"
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-accent-teal" />
          <CardTitle>Nutrition Insights</CardTitle>
        </div>
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-display text-xs font-semibold transition-all",
            isGenerating
              ? "cursor-not-allowed bg-accent-teal/20 text-accent-teal/50"
              : "bg-accent-teal text-bg-primary hover:bg-accent-teal/90"
          )}
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <RefreshCw className="h-3.5 w-3.5" />
              Generate Insights
            </>
          )}
        </button>
      </div>
      <CardContent>
        {/* Error */}
        {genError && (
          <div className="flex items-center gap-2 rounded-lg border border-accent-red/30 bg-accent-red/5 px-3 py-2.5 text-xs text-accent-red mb-3">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {genError}
          </div>
        )}

        {/* Loading */}
        {isGenerating && (
          <div className="flex flex-col items-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-accent-teal mb-2" />
            <p className="text-xs text-text-secondary">
              Analyzing 30 days of nutrition data...
            </p>
          </div>
        )}

        {/* Stats summary */}
        {stats && !isGenerating && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            <StatTile
              label="Days Tracked"
              value={String(stats.total_days_tracked)}
              unit="days"
            />
            <StatTile
              label="Weekday Avg"
              value={String(stats.avg_weekday_calories)}
              unit="kcal"
            />
            <StatTile
              label="Weekend Avg"
              value={String(stats.avg_weekend_calories)}
              unit="kcal"
              highlight={
                Math.abs(stats.weekend_vs_weekday_diff) > 200
              }
            />
            <StatTile
              label="Fiber Hit Rate"
              value={String(stats.fiber_compliance_rate)}
              unit="%"
              highlight={stats.fiber_compliance_rate < 50}
            />
          </div>
        )}

        {/* Insight list */}
        {!isLoading && !isGenerating && insights.length > 0 && (
          <div className="space-y-2">
            {insights.slice(0, 10).map((insight) => {
              const type = insight.insightType || "pattern";
              return (
                <div
                  key={insight.id}
                  className={cn(
                    "rounded-lg border px-3 py-2.5",
                    insightColors[type] || "text-text-secondary border-border",
                    insightBgColors[type] || "bg-bg-primary"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 shrink-0">
                      {insightIcons[type] || (
                        <Lightbulb className="h-3.5 w-3.5" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-text-secondary leading-relaxed">
                        {insight.content}
                      </p>
                      {insight.dataRangeStart && insight.dataRangeEnd && (
                        <p className="text-[10px] text-text-muted mt-1 tabular-nums">
                          {insight.dataRangeStart} to{" "}
                          {insight.dataRangeEnd}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!isLoading &&
          !isGenerating &&
          insights.length === 0 &&
          !stats && (
            <div className="py-6 text-center">
              <Lightbulb className="mx-auto h-8 w-8 text-text-muted/30 mb-2" />
              <p className="text-sm text-text-muted">
                Generate insights to see AI analysis of your nutrition
                patterns over the last 30 days.
              </p>
            </div>
          )}

        {/* Top meals */}
        {stats && stats.top_meals.length > 0 && !isGenerating && (
          <div className="mt-4">
            <p className="font-display text-[10px] uppercase tracking-wider text-text-muted mb-2">
              Most Logged Meals
            </p>
            <div className="space-y-1">
              {stats.top_meals.slice(0, 5).map((meal, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-md bg-bg-primary px-2.5 py-1.5"
                >
                  <span className="text-xs text-text-secondary truncate max-w-[70%]">
                    {meal.meal}
                  </span>
                  <span className="font-display text-[10px] tabular-nums text-text-muted shrink-0">
                    {meal.count}x
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Initial loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatTile({
  label,
  value,
  unit,
  highlight,
}: {
  label: string;
  value: string;
  unit: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-md border border-border bg-bg-primary px-2.5 py-2",
        highlight && "border-accent-amber/30"
      )}
    >
      <p className="font-display text-[9px] uppercase tracking-wider text-text-muted">
        {label}
      </p>
      <div className="flex items-baseline gap-0.5 mt-0.5">
        <span
          className={cn(
            "font-display text-base font-bold tabular-nums",
            highlight ? "text-accent-amber" : "text-text-primary"
          )}
        >
          {value}
        </span>
        <span className="text-[10px] text-text-muted">{unit}</span>
      </div>
    </div>
  );
}
