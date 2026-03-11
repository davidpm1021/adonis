"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { TrendChart } from "@/components/charts/trend-chart";
import { Sparkline } from "@/components/charts/sparkline";
import { calculateBMI, calculateNavyBodyFat } from "@/lib/calculations";
import {
  Scale,
  Ruler,
  TrendingDown,
  TrendingUp,
  Minus,
  Save,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BodyMetricRow {
  id: number;
  date: string;
  weight: number | null;
  bodyFatPercentage: number | null;
  waistInches: number | null;
  chestInches: number | null;
  armInches: number | null;
  thighInches: number | null;
  neckInches: number | null;
  dexaTotalFatPct: number | null;
  dexaLeanMassLbs: number | null;
  dexaFatMassLbs: number | null;
  dexaVisceralFatArea: number | null;
  dexaBoneDensity: number | null;
  navyBfEstimate: number | null;
  notes: string | null;
  createdAt: string | null;
}

interface UserProfile {
  heightInches: number | null;
  startingWeight: number | null;
  goalWeightLow: number | null;
  goalWeightHigh: number | null;
}

interface WeightTrendData {
  entries: { date: string; weight: number | null }[];
  referenceLines: {
    startingWeight: number;
    goalWeightLow: number;
    goalWeightHigh: number;
  };
}

interface EntryFormData {
  date: string;
  weight: string;
  waistInches: string;
  chestInches: string;
  armInches: string;
  thighInches: string;
  neckInches: string;
  notes: string;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTodayET(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

function defaultFormData(): EntryFormData {
  return {
    date: getTodayET(),
    weight: "",
    waistInches: "",
    chestInches: "",
    armInches: "",
    thighInches: "",
    neckInches: "",
    notes: "",
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BodyMetricsPage() {
  const [metrics, setMetrics] = useState<BodyMetricRow[]>([]);
  const [latest, setLatest] = useState<BodyMetricRow | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [weightTrend, setWeightTrend] = useState<WeightTrendData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<EntryFormData>(defaultFormData);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showMeasurements, setShowMeasurements] = useState(false);

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [metricsRes, latestRes, profileRes, weightRes] = await Promise.all([
        fetch("/api/metrics?limit=200"),
        fetch("/api/metrics/latest"),
        fetch("/api/settings/profile"),
        fetch("/api/trends/weight"),
      ]);

      if (metricsRes.ok) {
        const json = await metricsRes.json();
        if (json.success) setMetrics(json.data);
      }

      if (latestRes.ok) {
        const json = await latestRes.json();
        if (json.success) setLatest(json.data);
      }

      if (profileRes.ok) {
        const json = await profileRes.json();
        if (json.success) setProfile(json.data);
      }

      if (weightRes.ok) {
        const json = await weightRes.json();
        if (json.success) setWeightTrend(json.data);
      }
    } catch {
      setErrorMessage("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // -------------------------------------------------------------------------
  // Save handler
  // -------------------------------------------------------------------------

  const handleSave = async () => {
    setSaveStatus("saving");
    setErrorMessage(null);

    const payload: Record<string, unknown> = {
      date: formData.date,
    };

    if (formData.weight) payload.weight = parseFloat(formData.weight);
    if (formData.waistInches) payload.waistInches = parseFloat(formData.waistInches);
    if (formData.chestInches) payload.chestInches = parseFloat(formData.chestInches);
    if (formData.armInches) payload.armInches = parseFloat(formData.armInches);
    if (formData.thighInches) payload.thighInches = parseFloat(formData.thighInches);
    if (formData.neckInches) payload.neckInches = parseFloat(formData.neckInches);
    if (formData.notes) payload.notes = formData.notes;

    try {
      const res = await fetch("/api/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || `Save failed (${res.status})`);
      }

      setSaveStatus("saved");
      setFormData(defaultFormData());
      // Refresh data
      fetchData();
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (err) {
      setSaveStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Failed to save");
      setTimeout(() => setSaveStatus("idle"), 4000);
    }
  };

  // -------------------------------------------------------------------------
  // Derived data
  // -------------------------------------------------------------------------

  const startingWeight = profile?.startingWeight ?? 225;
  const goalWeightLow = profile?.goalWeightLow ?? 185;
  const goalWeightHigh = profile?.goalWeightHigh ?? 195;
  const heightInches = profile?.heightInches ?? 72; // default 6'0"

  const currentWeight = latest?.weight ?? null;
  const weightDelta = currentWeight ? currentWeight - startingWeight : null;

  // BMI calculation
  const bmi = currentWeight ? calculateBMI(currentWeight, heightInches) : null;

  // Navy body fat (from latest entry if available)
  const navyBf = latest?.navyBfEstimate ?? null;

  // Computed Navy BF if we have enough data in the latest entry
  const computedNavyBf =
    latest?.waistInches && latest?.neckInches
      ? calculateNavyBodyFat(latest.waistInches, latest.neckInches, heightInches)
      : null;

  // Weight chart data
  const weightChartData =
    weightTrend?.entries.map((e) => ({
      date: e.date,
      value: e.weight,
    })) ?? [];

  // Build measurement history data for sparklines
  const sortedMetrics = [...metrics].sort((a, b) => a.date.localeCompare(b.date));

  const measurementData = {
    waist: sortedMetrics.filter((m) => m.waistInches != null).map((m) => m.waistInches as number),
    chest: sortedMetrics.filter((m) => m.chestInches != null).map((m) => m.chestInches as number),
    arm: sortedMetrics.filter((m) => m.armInches != null).map((m) => m.armInches as number),
    thigh: sortedMetrics.filter((m) => m.thighInches != null).map((m) => m.thighInches as number),
    neck: sortedMetrics.filter((m) => m.neckInches != null).map((m) => m.neckInches as number),
  };

  // Measurement charts for detailed view
  const measurementCharts = {
    waist: sortedMetrics
      .filter((m) => m.waistInches != null)
      .map((m) => ({ date: m.date, value: m.waistInches })),
    chest: sortedMetrics
      .filter((m) => m.chestInches != null)
      .map((m) => ({ date: m.date, value: m.chestInches })),
    arm: sortedMetrics
      .filter((m) => m.armInches != null)
      .map((m) => ({ date: m.date, value: m.armInches })),
    thigh: sortedMetrics
      .filter((m) => m.thighInches != null)
      .map((m) => ({ date: m.date, value: m.thighInches })),
    neck: sortedMetrics
      .filter((m) => m.neckInches != null)
      .map((m) => ({ date: m.date, value: m.neckInches })),
  };

  // DEXA data
  const dexaEntries = sortedMetrics.filter(
    (m) => m.dexaTotalFatPct != null || m.dexaLeanMassLbs != null
  );
  const latestDexa = dexaEntries.length > 0 ? dexaEntries[dexaEntries.length - 1] : null;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div>
        <PageHeader
          title="Body Metrics"
          subtitle="Weight, body composition, and measurement tracking"
        />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-accent-teal" />
          <span className="ml-2 text-sm text-text-secondary">Loading metrics...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Body Metrics"
        subtitle="Weight, body composition, and measurement tracking"
      />

      <div className="space-y-4">
        {/* ------- Top Stats Row ------- */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Current Weight */}
          <Card>
            <CardTitle>Current Weight</CardTitle>
            <CardContent>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-3xl font-bold tabular-nums text-text-primary">
                  {currentWeight != null ? currentWeight.toFixed(1) : "—"}
                </span>
                <span className="text-sm text-text-muted">lbs</span>
              </div>
              {weightDelta != null && (
                <div className="mt-1 flex items-center gap-1">
                  {weightDelta < 0 ? (
                    <TrendingDown className="h-3.5 w-3.5 text-accent-green" />
                  ) : weightDelta > 0 ? (
                    <TrendingUp className="h-3.5 w-3.5 text-accent-red" />
                  ) : (
                    <Minus className="h-3.5 w-3.5 text-text-muted" />
                  )}
                  <span
                    className={cn(
                      "font-display text-sm tabular-nums",
                      weightDelta < 0
                        ? "text-accent-green"
                        : weightDelta > 0
                          ? "text-accent-red"
                          : "text-text-muted"
                    )}
                  >
                    {weightDelta > 0 ? "+" : ""}
                    {weightDelta.toFixed(1)} lbs from start
                  </span>
                </div>
              )}
              <p className="mt-1 text-xs text-text-muted">
                Starting: {startingWeight} lbs | Goal: {goalWeightLow}-{goalWeightHigh} lbs
              </p>
            </CardContent>
          </Card>

          {/* BMI */}
          <Card>
            <div className="flex items-center gap-2">
              <CardTitle>BMI</CardTitle>
              <span className="rounded bg-accent-amber-dim px-1.5 py-0.5 font-display text-[10px] text-accent-amber">
                CRUDE
              </span>
            </div>
            <CardContent>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-3xl font-bold tabular-nums text-text-primary">
                  {bmi ? bmi.value.toFixed(1) : "—"}
                </span>
              </div>
              {bmi && (
                <p
                  className={cn(
                    "mt-1 font-display text-sm",
                    bmi.interpretation === "Normal"
                      ? "text-accent-green"
                      : bmi.interpretation === "Overweight"
                        ? "text-accent-amber"
                        : bmi.interpretation === "Obese"
                          ? "text-accent-red"
                          : "text-text-secondary"
                  )}
                >
                  {bmi.interpretation}
                </p>
              )}
              <p className="mt-1 text-xs text-text-muted">
                Reference only — does not account for muscle mass
              </p>
            </CardContent>
          </Card>

          {/* Navy Body Fat */}
          <Card>
            <CardTitle>Navy Body Fat</CardTitle>
            <CardContent>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-3xl font-bold tabular-nums text-text-primary">
                  {navyBf != null
                    ? navyBf.toFixed(1)
                    : computedNavyBf
                      ? computedNavyBf.value.toFixed(1)
                      : "—"}
                </span>
                {(navyBf != null || computedNavyBf) && (
                  <span className="text-sm text-text-muted">%</span>
                )}
              </div>
              {(navyBf != null || computedNavyBf) && (
                <p
                  className={cn(
                    "mt-1 font-display text-sm",
                    (computedNavyBf?.interpretation ?? "Average") === "Athletic"
                      ? "text-accent-teal"
                      : (computedNavyBf?.interpretation ?? "Average") === "Fit"
                        ? "text-accent-green"
                        : (computedNavyBf?.interpretation ?? "Average") === "Average"
                          ? "text-accent-amber"
                          : "text-accent-red"
                  )}
                >
                  {computedNavyBf?.interpretation ?? "—"}
                </p>
              )}
              <p className="mt-1 text-xs text-text-muted">
                Requires waist + neck measurements
              </p>
            </CardContent>
          </Card>

          {/* DEXA (if available) */}
          <Card>
            <CardTitle>DEXA Scan</CardTitle>
            <CardContent>
              {latestDexa ? (
                <>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="font-display text-3xl font-bold tabular-nums text-text-primary">
                      {latestDexa.dexaTotalFatPct != null
                        ? latestDexa.dexaTotalFatPct.toFixed(1)
                        : "—"}
                    </span>
                    <span className="text-sm text-text-muted">% body fat</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-text-muted">Lean Mass</span>
                      <p className="font-display tabular-nums text-text-primary">
                        {latestDexa.dexaLeanMassLbs != null
                          ? `${latestDexa.dexaLeanMassLbs.toFixed(1)} lbs`
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <span className="text-text-muted">Fat Mass</span>
                      <p className="font-display tabular-nums text-text-primary">
                        {latestDexa.dexaFatMassLbs != null
                          ? `${latestDexa.dexaFatMassLbs.toFixed(1)} lbs`
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <span className="text-text-muted">Visceral Fat</span>
                      <p className="font-display tabular-nums text-text-primary">
                        {latestDexa.dexaVisceralFatArea != null
                          ? `${latestDexa.dexaVisceralFatArea.toFixed(0)} cm²`
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <span className="text-text-muted">Bone Density</span>
                      <p className="font-display tabular-nums text-text-primary">
                        {latestDexa.dexaBoneDensity != null
                          ? `${latestDexa.dexaBoneDensity.toFixed(3)}`
                          : "—"}
                      </p>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-text-muted">
                    Last scan: {latestDexa.date}
                  </p>
                </>
              ) : (
                <>
                  <div className="mt-2 flex items-center gap-2 text-text-muted">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">No DEXA data</span>
                  </div>
                  <p className="mt-1 text-xs text-text-muted">
                    DEXA results will appear here after your first scan
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ------- Weight Trend Chart ------- */}
        <Card>
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-accent-teal" />
            <CardTitle>Weight Trend</CardTitle>
          </div>
          <CardContent className="mt-3">
            {weightChartData.length >= 2 ? (
              <TrendChart
                data={weightChartData}
                color="#00e5c7"
                height={320}
                referenceLines={[
                  {
                    value: weightTrend?.referenceLines.startingWeight ?? startingWeight,
                    label: `Start: ${weightTrend?.referenceLines.startingWeight ?? startingWeight}`,
                    color: "#8b8b9e",
                    dashed: true,
                  },
                ]}
                referenceBands={[
                  {
                    y1: weightTrend?.referenceLines.goalWeightLow ?? goalWeightLow,
                    y2: weightTrend?.referenceLines.goalWeightHigh ?? goalWeightHigh,
                    color: "#22c55e",
                    label: `Goal: ${goalWeightLow}-${goalWeightHigh}`,
                  },
                ]}
                yAxisLabel="lbs"
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Scale className="h-8 w-8 text-text-muted mb-2" />
                <p className="text-sm text-text-secondary">
                  Not enough data to display a weight trend chart.
                </p>
                <p className="text-xs text-text-muted mt-1">
                  Log at least 2 weight entries to see your trend.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ------- Body Measurements ------- */}
        <Card>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ruler className="h-4 w-4 text-accent-teal" />
              <CardTitle>Body Measurements</CardTitle>
            </div>
            <button
              type="button"
              onClick={() => setShowMeasurements(!showMeasurements)}
              className="flex items-center gap-1 rounded-lg px-2 py-1 font-display text-xs text-text-secondary hover:text-accent-teal transition-colors"
            >
              {showMeasurements ? "Hide Charts" : "Show Charts"}
              {showMeasurements ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
          <CardContent className="mt-3">
            {/* Summary Table */}
            <div className="space-y-3">
              {[
                { label: "Waist", data: measurementData.waist, unit: "in", icon: "waist" },
                { label: "Chest", data: measurementData.chest, unit: "in", icon: "chest" },
                { label: "Arm", data: measurementData.arm, unit: "in", icon: "arm" },
                { label: "Thigh", data: measurementData.thigh, unit: "in", icon: "thigh" },
                { label: "Neck", data: measurementData.neck, unit: "in", icon: "neck" },
              ].map((measurement) => {
                const latest = measurement.data.length > 0
                  ? measurement.data[measurement.data.length - 1]
                  : null;
                const previous = measurement.data.length > 1
                  ? measurement.data[measurement.data.length - 2]
                  : null;
                const delta = latest != null && previous != null ? latest - previous : null;

                return (
                  <div
                    key={measurement.label}
                    className="flex items-center justify-between rounded-lg border border-border bg-bg-card-hover/30 px-3 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-display text-sm text-text-secondary w-14">
                        {measurement.label}
                      </span>
                      <Sparkline
                        data={measurement.data}
                        color="var(--accent-teal)"
                        width={80}
                        height={24}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-display text-sm tabular-nums text-text-primary">
                        {latest != null ? latest.toFixed(1) : "—"}
                      </span>
                      <span className="text-xs text-text-muted">{measurement.unit}</span>
                      {delta != null && (
                        <span
                          className={cn(
                            "font-display text-xs tabular-nums",
                            delta < 0 ? "text-accent-green" : delta > 0 ? "text-accent-amber" : "text-text-muted"
                          )}
                        >
                          {delta > 0 ? "+" : ""}
                          {delta.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Expanded Measurement Charts */}
            {showMeasurements && (
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                {[
                  { label: "Waist", data: measurementCharts.waist, color: "#00e5c7" },
                  { label: "Chest", data: measurementCharts.chest, color: "#f59e0b" },
                  { label: "Arm", data: measurementCharts.arm, color: "#22c55e" },
                  { label: "Thigh", data: measurementCharts.thigh, color: "#ef4444" },
                  { label: "Neck", data: measurementCharts.neck, color: "#8b8b9e" },
                ].map((chart) =>
                  chart.data.length >= 2 ? (
                    <div key={chart.label}>
                      <p className="mb-2 font-display text-xs text-text-secondary uppercase tracking-wide">
                        {chart.label} (inches)
                      </p>
                      <TrendChart
                        data={chart.data}
                        color={chart.color}
                        height={180}
                        yAxisLabel="in"
                        showDots
                      />
                    </div>
                  ) : (
                    <div
                      key={chart.label}
                      className="flex items-center justify-center rounded-lg border border-border py-8"
                    >
                      <p className="text-xs text-text-muted">
                        {chart.label}: Need 2+ measurements to chart
                      </p>
                    </div>
                  )
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ------- Entry Form ------- */}
        <Card>
          <div className="flex items-center gap-2">
            <Save className="h-4 w-4 text-accent-teal" />
            <CardTitle>Log New Entry</CardTitle>
          </div>
          <CardContent className="mt-3">
            {errorMessage && saveStatus !== "saving" && (
              <div className="mb-3 rounded-lg border border-accent-red/30 bg-accent-red-dim px-4 py-3 text-sm text-accent-red">
                {errorMessage}
              </div>
            )}

            <div className="space-y-4">
              {/* Date + Weight Row */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-display text-xs text-text-secondary">
                    Date
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData((p) => ({ ...p, date: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-bg-card px-3 py-2.5 font-display text-sm text-text-primary tabular-nums focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal transition-colors [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-display text-xs text-text-secondary">
                    Weight (lbs)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 215.4"
                    value={formData.weight}
                    onChange={(e) => setFormData((p) => ({ ...p, weight: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-bg-card px-3 py-2.5 font-display text-sm text-text-primary tabular-nums placeholder:text-text-muted focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal transition-colors"
                  />
                </div>
              </div>

              {/* Measurements Grid */}
              <div>
                <p className="mb-2 font-display text-xs text-text-secondary uppercase tracking-wide">
                  Measurements (inches) — optional
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {[
                    { key: "waistInches" as const, label: "Waist" },
                    { key: "chestInches" as const, label: "Chest" },
                    { key: "armInches" as const, label: "Arm" },
                    { key: "thighInches" as const, label: "Thigh" },
                    { key: "neckInches" as const, label: "Neck" },
                  ].map((field) => (
                    <div key={field.key}>
                      <label className="mb-1 block font-display text-xs text-text-muted">
                        {field.label}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="—"
                        value={formData[field.key]}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, [field.key]: e.target.value }))
                        }
                        className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 font-display text-sm text-text-primary tabular-nums placeholder:text-text-muted focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal transition-colors"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1 block font-display text-xs text-text-secondary">
                  Notes (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Morning weigh-in, post-workout"
                  value={formData.notes}
                  onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-bg-card px-3 py-2.5 font-display text-sm text-text-primary placeholder:text-text-muted focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal transition-colors"
                />
              </div>

              {/* Save Button */}
              <button
                type="button"
                onClick={handleSave}
                disabled={saveStatus === "saving" || !formData.weight}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 font-display text-sm font-semibold tracking-wide transition-all duration-150",
                  saveStatus === "saved"
                    ? "bg-accent-green/20 border border-accent-green/30 text-accent-green"
                    : saveStatus === "error"
                      ? "bg-accent-red/20 border border-accent-red/30 text-accent-red"
                      : "bg-accent-teal border border-accent-teal text-bg-primary hover:bg-accent-teal/90 active:scale-[0.98]",
                  (saveStatus === "saving" || !formData.weight) &&
                    "opacity-50 cursor-not-allowed"
                )}
              >
                {saveStatus === "saving" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : saveStatus === "saved" ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Saved
                  </>
                ) : saveStatus === "error" ? (
                  "Save Failed — Tap to Retry"
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Entry
                  </>
                )}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
