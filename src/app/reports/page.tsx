"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import {
  FileText,
  Loader2,
  Calendar,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WeeklyReport {
  id: number;
  weekStart: string;
  weekEnd: string;
  reportContent: string | null;
  keyMetrics: string | null;
  aiRecommendations: string | null;
  createdAt: string | null;
}

// ---------------------------------------------------------------------------
// Markdown Renderer
// ---------------------------------------------------------------------------

function renderMarkdown(md: string): string {
  let html = md;

  // Escape HTML entities first (but not our tags we'll add)
  html = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Headers: ## before # so we don't double-match
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-sm font-display font-bold text-text-primary mt-5 mb-2">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-base font-display font-bold text-accent-teal mt-6 mb-2 flex items-center gap-2">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-xl font-display font-bold text-text-primary mb-4">$1</h1>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="text-text-primary font-semibold">$1</strong>');

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Unordered lists: convert lines starting with "- " into <li> items
  // Group consecutive list items into <ul>
  const lines = html.split("\n");
  const processed: string[] = [];
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const listMatch = line.match(/^(\s*)- (.+)$/);

    if (listMatch) {
      const indent = listMatch[1].length;
      const content = listMatch[2];
      if (!inList) {
        processed.push('<ul class="space-y-1 mb-3">');
        inList = true;
      }
      const paddingClass = indent >= 4 ? "ml-4" : indent >= 2 ? "ml-2" : "";
      processed.push(
        `<li class="flex items-start gap-2 text-sm text-text-secondary ${paddingClass}"><span class="text-accent-teal mt-1.5 shrink-0 h-1 w-1 rounded-full bg-accent-teal inline-block"></span><span>${content}</span></li>`,
      );
    } else {
      if (inList) {
        processed.push("</ul>");
        inList = false;
      }
      // Ordered lists
      const olMatch = line.match(/^(\d+)\. (.+)$/);
      if (olMatch) {
        processed.push(
          `<div class="flex items-start gap-2 text-sm text-text-secondary mb-1"><span class="text-accent-teal font-display font-bold shrink-0">${olMatch[1]}.</span><span>${olMatch[2]}</span></div>`,
        );
      } else if (line.trim() === "") {
        processed.push('<div class="h-2"></div>');
      } else if (!line.startsWith("<")) {
        // Regular paragraph
        processed.push(`<p class="text-sm text-text-secondary leading-relaxed mb-2">${line}</p>`);
      } else {
        processed.push(line);
      }
    }
  }
  if (inList) processed.push("</ul>");

  return processed.join("\n");
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function formatDateRange(start: string, end: string): string {
  const [sy, sm, sd] = start.split("-").map(Number);
  const [, em, ed] = end.split("-").map(Number);
  const startDate = new Date(sy, sm - 1, sd);
  const endDate = new Date(sy, em - 1, ed);

  const startStr = startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endStr = endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${startStr} - ${endStr}`;
}

function formatFullDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ReportsPage() {
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<WeeklyReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // -----------------------------------------------------------------------
  // Fetch reports
  // -----------------------------------------------------------------------
  const fetchReports = useCallback(async () => {
    try {
      setFetchError(null);
      const res = await fetch("/api/reports/weekly?limit=52");
      if (!res.ok) throw new Error("Failed to fetch reports");
      const json = await res.json();
      if (json.success) {
        setReports(json.data);
        // Auto-select the most recent report
        if (json.data.length > 0 && !selectedReport) {
          setSelectedReport(json.data[0]);
        }
      }
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to load reports");
    } finally {
      setIsLoading(false);
    }
  }, [selectedReport]);

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -----------------------------------------------------------------------
  // Generate report
  // -----------------------------------------------------------------------
  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch("/api/reports/weekly/generate", {
        method: "POST",
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to generate report");
      }

      const newReport = json.data.report;
      setSelectedReport(newReport);

      // Refresh report list
      await fetchReports();

      // Select the new report
      setSelectedReport(newReport);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  };

  // Parse key metrics from selected report
  const keyMetrics = selectedReport?.keyMetrics
    ? (() => {
        try {
          return JSON.parse(selectedReport.keyMetrics!) as Record<string, unknown>;
        } catch {
          return null;
        }
      })()
    : null;

  // Parse recommendations from selected report
  const recommendations = selectedReport?.aiRecommendations
    ? (() => {
        try {
          return JSON.parse(selectedReport.aiRecommendations!) as string[];
        } catch {
          return null;
        }
      })()
    : null;

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div>
      <PageHeader
        title="Weekly Reports"
        subtitle="AI-generated weekly health intelligence"
        actions={
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 font-display text-sm font-semibold transition-all",
              isGenerating
                ? "cursor-not-allowed bg-accent-teal/20 text-accent-teal/50"
                : "bg-accent-teal text-bg-primary hover:bg-accent-teal/90",
            )}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate This Week&apos;s Report
              </>
            )}
          </button>
        }
      />

      {/* Error states */}
      {generateError && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-accent-red/30 bg-accent-red/5 px-4 py-3 text-sm text-accent-red">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {generateError}
        </div>
      )}

      {fetchError && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-accent-red/30 bg-accent-red/5 px-4 py-3 text-sm text-accent-red">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {fetchError}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-accent-teal" />
          <span className="ml-2 text-sm text-text-secondary">Loading reports...</span>
        </div>
      )}

      {/* Generating indicator overlay */}
      {isGenerating && (
        <div className="mb-4 rounded-lg border border-accent-teal/20 bg-accent-teal/5 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-teal/10">
              <Loader2 className="h-5 w-5 animate-spin text-accent-teal" />
            </div>
            <div>
              <p className="font-display text-sm font-semibold text-text-primary">
                Generating weekly intelligence report...
              </p>
              <p className="text-xs text-text-secondary mt-0.5">
                Analyzing 7 days of health data with Claude Opus. This may take 15-30 seconds.
              </p>
            </div>
          </div>
        </div>
      )}

      {!isLoading && (
        <div className="flex flex-col gap-4 lg:flex-row">
          {/* Sidebar: Report History */}
          <div className="w-full shrink-0 lg:w-64">
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-accent-teal" />
                <CardTitle>Report History</CardTitle>
              </div>
              <CardContent>
                {reports.length === 0 ? (
                  <div className="py-6 text-center">
                    <FileText className="mx-auto h-8 w-8 text-text-muted/40" />
                    <p className="mt-2 text-xs text-text-muted">
                      No reports yet. Generate your first weekly report.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {reports.map((report) => (
                      <button
                        key={report.id}
                        type="button"
                        onClick={() => setSelectedReport(report)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-md px-3 py-2 text-left transition-colors",
                          selectedReport?.id === report.id
                            ? "bg-accent-teal/10 border border-accent-teal/30"
                            : "hover:bg-bg-card-hover border border-transparent",
                        )}
                      >
                        <div>
                          <p
                            className={cn(
                              "font-display text-xs font-semibold tabular-nums",
                              selectedReport?.id === report.id
                                ? "text-accent-teal"
                                : "text-text-primary",
                            )}
                          >
                            {formatDateRange(report.weekStart, report.weekEnd)}
                          </p>
                          <p className="text-[10px] text-text-muted mt-0.5">
                            Generated {report.createdAt ? formatFullDate(report.createdAt).split(",")[0] : ""}
                          </p>
                        </div>
                        <ChevronRight
                          className={cn(
                            "h-3.5 w-3.5 shrink-0",
                            selectedReport?.id === report.id
                              ? "text-accent-teal"
                              : "text-text-muted",
                          )}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main content: Selected Report */}
          <div className="min-w-0 flex-1 space-y-4">
            {selectedReport ? (
              <>
                {/* Report content */}
                <Card>
                  <CardContent>
                    {selectedReport.reportContent ? (
                      <div
                        className="report-content"
                        dangerouslySetInnerHTML={{
                          __html: renderMarkdown(selectedReport.reportContent),
                        }}
                      />
                    ) : (
                      <div className="py-8 text-center text-text-muted">
                        <FileText className="mx-auto h-8 w-8 text-text-muted/40" />
                        <p className="mt-2 text-sm">No report content available.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Key Metrics Summary */}
                {keyMetrics && (
                  <Card>
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="h-4 w-4 text-accent-teal" />
                      <CardTitle>Key Metrics</CardTitle>
                    </div>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                        <MetricTile
                          label="Avg Weight"
                          value={keyMetrics.avg_weight != null ? `${keyMetrics.avg_weight} lbs` : "N/A"}
                          delta={keyMetrics.weight_change != null ? `${Number(keyMetrics.weight_change) > 0 ? "+" : ""}${keyMetrics.weight_change} lbs` : undefined}
                          deltaColor={
                            keyMetrics.weight_change != null
                              ? Number(keyMetrics.weight_change) < 0
                                ? "text-accent-green"
                                : Number(keyMetrics.weight_change) > 0
                                  ? "text-accent-amber"
                                  : "text-text-muted"
                              : undefined
                          }
                        />
                        <MetricTile
                          label="Avg Calories"
                          value={keyMetrics.avg_calories != null ? `${keyMetrics.avg_calories}` : "N/A"}
                          unit="kcal"
                        />
                        <MetricTile
                          label="Avg Protein"
                          value={keyMetrics.avg_protein_g != null ? `${keyMetrics.avg_protein_g}` : "N/A"}
                          unit="g"
                        />
                        <MetricTile
                          label="Avg Sleep"
                          value={keyMetrics.avg_sleep_hrs != null ? `${keyMetrics.avg_sleep_hrs}` : "N/A"}
                          unit="hrs"
                        />
                        <MetricTile
                          label="Sleep Quality"
                          value={keyMetrics.avg_sleep_quality != null ? `${keyMetrics.avg_sleep_quality}` : "N/A"}
                          unit="/10"
                        />
                        <MetricTile
                          label="Workouts"
                          value={`${keyMetrics.workouts_completed ?? 0}/${keyMetrics.workouts_planned ?? 0}`}
                          unit="done"
                        />
                        <MetricTile
                          label="Energy"
                          value={keyMetrics.avg_energy != null ? `${keyMetrics.avg_energy}` : "N/A"}
                          unit="/10"
                        />
                        <MetricTile
                          label="Days Logged"
                          value={`${keyMetrics.days_logged ?? 0}`}
                          unit="/7"
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* AI Recommendations */}
                {recommendations && recommendations.length > 0 && (
                  <Card>
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="h-4 w-4 text-accent-teal" />
                      <CardTitle>AI Recommendations</CardTitle>
                    </div>
                    <CardContent>
                      <div className="space-y-2">
                        {recommendations.map((rec, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-3 rounded-md border border-border bg-bg-primary px-3 py-2.5"
                          >
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-teal/10 font-display text-[10px] font-bold text-accent-teal">
                              {i + 1}
                            </span>
                            <p className="text-sm text-text-secondary leading-relaxed">
                              {rec}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent>
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-teal/5">
                      <FileText className="h-8 w-8 text-accent-teal/40" />
                    </div>
                    <h2 className="mt-4 font-display text-lg font-semibold text-text-primary">
                      No Reports Yet
                    </h2>
                    <p className="mt-1.5 max-w-sm text-center text-sm text-text-secondary">
                      Generate your first weekly intelligence report to get AI-powered insights
                      into your health data.
                    </p>
                    <button
                      type="button"
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      className="mt-5 flex items-center gap-2 rounded-lg bg-accent-teal px-5 py-2.5 font-display text-sm font-semibold text-bg-primary transition-all hover:bg-accent-teal/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Sparkles className="h-4 w-4" />
                      Generate Report
                    </button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MetricTile sub-component
// ---------------------------------------------------------------------------

function MetricTile({
  label,
  value,
  unit,
  delta,
  deltaColor,
}: {
  label: string;
  value: string;
  unit?: string;
  delta?: string;
  deltaColor?: string;
}) {
  return (
    <div className="rounded-md border border-border bg-bg-primary px-3 py-2.5">
      <p className="font-display text-[10px] uppercase tracking-wider text-text-muted">{label}</p>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="font-display text-lg font-bold tabular-nums text-text-primary">{value}</span>
        {unit && <span className="text-xs text-text-muted">{unit}</span>}
      </div>
      {delta && (
        <p className={cn("mt-0.5 font-display text-xs tabular-nums", deltaColor || "text-text-muted")}>
          {delta}
        </p>
      )}
    </div>
  );
}
