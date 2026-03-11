"use client";

import { useState, useEffect, useCallback } from "react";
import { TestTubes, Calculator, ChevronDown, ChevronUp, Filter } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { BiomarkerCard } from "@/components/labs/biomarker-card";
import { LabEntryForm } from "@/components/labs/lab-entry-form";
import { RetestSchedule } from "@/components/labs/retest-schedule";
import { Sparkline } from "@/components/charts/sparkline";
import { LAB_BIOMARKERS } from "@/lib/constants";
import { cn } from "@/lib/utils";

// Types
interface LabResult {
  id: number;
  date: string;
  test_name: string;
  value: number;
  unit: string;
  reference_low: number | null;
  reference_high: number | null;
  flag: string | null;
  notes: string | null;
  created_at: string;
}

interface CalculatedMarker {
  id: number;
  date: string;
  marker_name: string;
  value: number;
  formula: string | null;
  input_values: string | null;
  interpretation: string | null;
  created_at: string;
}

interface BiomarkerSummary {
  testName: string;
  latestValue: number;
  unit: string;
  referenceLow: number | null;
  referenceHigh: number | null;
  flag: string | null;
  previousValue: number | null;
  sparklineData: number[];
  interpretation: string;
  allResults: LabResult[];
}

type FilterMode = "all" | "flagged" | "priority1" | "priority2";

export default function LabsPage() {
  const [summaryData, setSummaryData] = useState<LabResult[]>([]);
  const [allLabs, setAllLabs] = useState<LabResult[]>([]);
  const [calculatedMarkers, setCalculatedMarkers] = useState<CalculatedMarker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedBiomarker, setExpandedBiomarker] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [summaryRes, allRes, markersRes] = await Promise.all([
        fetch("/api/labs/summary"),
        fetch("/api/labs?limit=500"),
        fetch("/api/calculated-markers"),
      ]);

      const [summaryJson, allJson, markersJson] = await Promise.all([
        summaryRes.json(),
        allRes.json(),
        markersRes.json(),
      ]);

      if (summaryJson.success) setSummaryData(summaryJson.data || []);
      if (allJson.success) setAllLabs(allJson.data || []);
      if (markersJson.success) setCalculatedMarkers(markersJson.data || []);
    } catch (err) {
      console.error("Failed to fetch lab data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Build biomarker summaries from allLabs
  const biomarkerSummaries: BiomarkerSummary[] = (() => {
    // Group all labs by test_name
    const grouped: Record<string, LabResult[]> = {};
    for (const lab of allLabs) {
      if (!grouped[lab.test_name]) grouped[lab.test_name] = [];
      grouped[lab.test_name].push(lab);
    }

    // Build summary for each test that appears in summaryData
    const summaries: BiomarkerSummary[] = summaryData.map((latest) => {
      const testResults = grouped[latest.test_name] || [latest];
      // Sort by date ascending for sparkline
      const sorted = [...testResults].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      const sparklineData = sorted.map((r) => r.value);
      const previousValue =
        sorted.length >= 2 ? sorted[sorted.length - 2].value : null;

      const bioInfo = LAB_BIOMARKERS[latest.test_name];

      return {
        testName: latest.test_name,
        latestValue: latest.value,
        unit: latest.unit,
        referenceLow: latest.reference_low,
        referenceHigh: latest.reference_high,
        flag: latest.flag,
        previousValue,
        sparklineData,
        interpretation: bioInfo?.interpretation || "",
        allResults: sorted,
      };
    });

    return summaries;
  })();

  // Filter biomarkers
  const filteredSummaries = biomarkerSummaries.filter((s) => {
    if (filterMode === "all") return true;
    if (filterMode === "flagged")
      return s.flag === "high" || s.flag === "low" || s.flag === "borderline";
    if (filterMode === "priority1") {
      const bio = LAB_BIOMARKERS[s.testName];
      return bio?.priority === 1;
    }
    if (filterMode === "priority2") {
      const bio = LAB_BIOMARKERS[s.testName];
      return bio?.priority === 2;
    }
    return true;
  });

  // Stats
  const totalBiomarkers = biomarkerSummaries.length;
  const flaggedCount = biomarkerSummaries.filter(
    (s) => s.flag === "high" || s.flag === "low" || s.flag === "borderline"
  ).length;
  const normalCount = biomarkerSummaries.filter((s) => s.flag === "normal").length;

  const handleLabSubmit = async (entry: {
    date: string;
    testName: string;
    value: number;
    unit: string;
    referenceLow: number | null;
    referenceHigh: number | null;
    notes: string;
  }) => {
    const res = await fetch("/api/labs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      throw new Error(errData?.error || "Failed to save");
    }

    // Refresh data
    await fetchData();
  };

  return (
    <div>
      <PageHeader
        title="Lab Results"
        subtitle="Biomarker tracking with reference ranges and trends"
        actions={
          <div className="flex items-center gap-2">
            <TestTubes size={14} className="text-accent-teal" />
            {!isLoading && totalBiomarkers > 0 && (
              <span className="font-display text-xs tabular-nums text-text-secondary">
                {totalBiomarkers} tracked
                {flaggedCount > 0 && (
                  <span className="ml-1.5 text-accent-amber">
                    {flaggedCount} flagged
                  </span>
                )}
              </span>
            )}
          </div>
        }
      />

      {/* Lab Entry Form */}
      <div className="mb-6">
        <LabEntryForm onSubmit={handleLabSubmit} />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-40 rounded-lg" />
          ))}
        </div>
      ) : totalBiomarkers === 0 ? (
        /* Empty state */
        <Card>
          <div className="flex flex-col items-center gap-4 py-12">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-teal-dim">
              <TestTubes size={24} className="text-accent-teal" />
            </div>
            <div className="text-center">
              <h3 className="font-display text-sm font-semibold text-text-primary">
                No lab results yet
              </h3>
              <p className="mt-1 max-w-sm text-xs text-text-secondary">
                Add your first lab results using the form above. Your baseline
                labs from October 2025 are a great place to start.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="text-center">
              <p className="font-display text-2xl font-bold tabular-nums text-text-primary">
                {totalBiomarkers}
              </p>
              <p className="text-[10px] text-text-muted uppercase tracking-wider font-display">
                Tracked
              </p>
            </Card>
            <Card className="text-center">
              <p className="font-display text-2xl font-bold tabular-nums text-accent-green">
                {normalCount}
              </p>
              <p className="text-[10px] text-text-muted uppercase tracking-wider font-display">
                Normal
              </p>
            </Card>
            <Card className="text-center">
              <p
                className={cn(
                  "font-display text-2xl font-bold tabular-nums",
                  flaggedCount > 0 ? "text-accent-amber" : "text-text-primary"
                )}
              >
                {flaggedCount}
              </p>
              <p className="text-[10px] text-text-muted uppercase tracking-wider font-display">
                Flagged
              </p>
            </Card>
          </div>

          {/* Filter buttons */}
          <div className="flex items-center gap-2">
            <Filter size={12} className="text-text-muted" />
            {(
              [
                { key: "all", label: "All" },
                { key: "flagged", label: "Flagged" },
                { key: "priority1", label: "Priority 1" },
                { key: "priority2", label: "Priority 2" },
              ] as { key: FilterMode; label: string }[]
            ).map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilterMode(f.key)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-display transition-colors",
                  filterMode === f.key
                    ? "bg-accent-teal-dim text-accent-teal border border-accent-teal/20"
                    : "bg-bg-card text-text-muted border border-border hover:text-text-secondary"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Biomarker cards grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSummaries.map((bio) => (
              <div key={bio.testName}>
                <BiomarkerCard
                  testName={bio.testName}
                  latestValue={bio.latestValue}
                  unit={bio.unit}
                  referenceLow={bio.referenceLow}
                  referenceHigh={bio.referenceHigh}
                  flag={bio.flag}
                  previousValue={bio.previousValue}
                  sparklineData={bio.sparklineData}
                  interpretation={bio.interpretation}
                  onClick={() =>
                    setExpandedBiomarker(
                      expandedBiomarker === bio.testName ? null : bio.testName
                    )
                  }
                />

                {/* Expanded timeline view */}
                {expandedBiomarker === bio.testName && (
                  <Card className="mt-2 animate-fade-in">
                    <div className="flex items-center justify-between mb-3">
                      <CardTitle>{bio.testName} Timeline</CardTitle>
                      <button
                        type="button"
                        onClick={() => setExpandedBiomarker(null)}
                        className="text-text-muted hover:text-text-secondary"
                      >
                        <ChevronUp size={14} />
                      </button>
                    </div>
                    <CardContent>
                      {/* Larger sparkline */}
                      {bio.sparklineData.length >= 2 && (
                        <div className="mb-4 flex justify-center">
                          <Sparkline
                            data={bio.sparklineData}
                            width={300}
                            height={60}
                            color={
                              bio.flag === "normal"
                                ? "var(--accent-green)"
                                : bio.flag === "borderline"
                                  ? "var(--accent-amber)"
                                  : "var(--accent-red)"
                            }
                            showDots
                            referenceLow={bio.referenceLow ?? undefined}
                            referenceHigh={bio.referenceHigh ?? undefined}
                          />
                        </div>
                      )}

                      {/* Reference band info */}
                      {bio.referenceLow != null && bio.referenceHigh != null && (
                        <div className="mb-3 flex items-center gap-2 text-[10px] text-text-muted">
                          <div className="h-2 w-2 rounded-sm bg-accent-green/40" />
                          <span>
                            Reference range: {bio.referenceLow} - {bio.referenceHigh}{" "}
                            {bio.unit}
                          </span>
                        </div>
                      )}

                      {/* Results table */}
                      <div className="space-y-1">
                        {[...bio.allResults].reverse().map((r) => (
                          <div
                            key={r.id}
                            className="flex items-center justify-between rounded px-2 py-1.5 text-xs hover:bg-bg-card-hover transition-colors"
                          >
                            <span className="text-text-muted font-display tabular-nums">
                              {new Date(r.date + "T12:00:00").toLocaleDateString(
                                "en-US",
                                { month: "short", day: "numeric", year: "numeric" }
                              )}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-display font-semibold tabular-nums text-text-primary">
                                {r.value % 1 === 0
                                  ? r.value
                                  : r.value.toFixed(1)}
                              </span>
                              <span className="text-text-muted">{r.unit}</span>
                              {r.flag && r.flag !== "normal" && (
                                <span
                                  className={cn(
                                    "rounded px-1 py-0.5 text-[9px] font-display uppercase",
                                    r.flag === "borderline"
                                      ? "bg-accent-amber-dim text-accent-amber"
                                      : "bg-accent-red-dim text-accent-red"
                                  )}
                                >
                                  {r.flag}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ))}
          </div>

          {/* Calculated Markers Section */}
          {calculatedMarkers.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Calculator size={14} className="text-accent-teal" />
                <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-text-secondary">
                  Calculated Markers
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {(() => {
                  // Group by marker_name, show latest
                  const grouped: Record<string, CalculatedMarker[]> = {};
                  for (const m of calculatedMarkers) {
                    if (!grouped[m.marker_name]) grouped[m.marker_name] = [];
                    grouped[m.marker_name].push(m);
                  }

                  return Object.entries(grouped).map(([name, markers]) => {
                    const sorted = [...markers].sort(
                      (a, b) =>
                        new Date(a.date).getTime() - new Date(b.date).getTime()
                    );
                    const latest = sorted[sorted.length - 1];
                    let inputs: Record<string, number> = {};
                    try {
                      inputs = latest.input_values
                        ? JSON.parse(latest.input_values)
                        : {};
                    } catch {
                      // ignore
                    }

                    return (
                      <Card key={name}>
                        <CardTitle>
                          <div className="flex items-center gap-2">
                            <Calculator size={12} className="text-accent-teal" />
                            {name}
                          </div>
                        </CardTitle>
                        <CardContent>
                          <div className="flex items-baseline gap-2">
                            <span className="font-display text-xl font-bold tabular-nums text-text-primary">
                              {latest.value % 1 === 0
                                ? latest.value
                                : latest.value.toFixed(2)}
                            </span>
                          </div>

                          {latest.interpretation && (
                            <p className="mt-1.5 text-xs text-text-secondary">
                              {latest.interpretation}
                            </p>
                          )}

                          {latest.formula && (
                            <div className="mt-2 rounded bg-bg-primary px-2 py-1.5 text-[10px] font-display text-text-muted">
                              Formula: {latest.formula}
                            </div>
                          )}

                          {Object.keys(inputs).length > 0 && (
                            <div className="mt-2 space-y-0.5">
                              {Object.entries(inputs).map(([key, val]) => (
                                <div
                                  key={key}
                                  className="flex justify-between text-[10px]"
                                >
                                  <span className="text-text-muted">{key}</span>
                                  <span className="font-display tabular-nums text-text-secondary">
                                    {typeof val === "number" && val % 1 !== 0
                                      ? val.toFixed(1)
                                      : val}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="mt-2 text-[10px] text-text-muted">
                            Calculated:{" "}
                            {new Date(latest.date + "T12:00:00").toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {/* Retest Schedule */}
          <RetestSchedule />
        </div>
      )}
    </div>
  );
}
