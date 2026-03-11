"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { TrendChart, DualLineChart } from "@/components/charts/trend-chart";
import {
  HeartPulse,
  Activity,
  Wind,
  Save,
  Loader2,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Minus,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VitalsRow {
  id: number;
  date: string;
  timeOfDay: string | null;
  systolic: number | null;
  diastolic: number | null;
  restingHeartRate: number | null;
  spo2: number | null;
  notes: string | null;
  createdAt: string | null;
}

interface VitalsAverages {
  days: number;
  cutoffDate: string;
  count: number;
  averages: {
    systolic: number | null;
    diastolic: number | null;
    restingHeartRate: number | null;
    spo2: number | null;
  };
}

interface EntryFormData {
  date: string;
  timeOfDay: string;
  systolic: string;
  diastolic: string;
  restingHeartRate: string;
  spo2: string;
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
    timeOfDay: "morning",
    systolic: "",
    diastolic: "",
    restingHeartRate: "",
    spo2: "",
    notes: "",
  };
}

function bpCategory(systolic: number, diastolic: number): { label: string; color: string } {
  if (systolic >= 140 || diastolic >= 90)
    return { label: "Stage 2 HTN", color: "text-accent-red" };
  if (systolic >= 130 || diastolic >= 80)
    return { label: "Stage 1 HTN", color: "text-accent-red" };
  if (systolic >= 120)
    return { label: "Elevated", color: "text-accent-amber" };
  return { label: "Optimal", color: "text-accent-green" };
}

function hrCategory(hr: number): { label: string; color: string } {
  if (hr < 58) return { label: "Excellent", color: "text-accent-green" };
  if (hr < 64) return { label: "Good", color: "text-accent-teal" };
  if (hr < 70) return { label: "Average", color: "text-text-primary" };
  if (hr < 78) return { label: "Below Avg", color: "text-accent-amber" };
  return { label: "Poor", color: "text-accent-red" };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VitalsPage() {
  const [vitals, setVitals] = useState<VitalsRow[]>([]);
  const [latest, setLatest] = useState<VitalsRow | null>(null);
  const [avg7, setAvg7] = useState<VitalsAverages | null>(null);
  const [avg30, setAvg30] = useState<VitalsAverages | null>(null);
  const [avg90, setAvg90] = useState<VitalsAverages | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<EntryFormData>(defaultFormData);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [vitalsRes, latestRes, avg7Res, avg30Res, avg90Res] = await Promise.all([
        fetch("/api/vitals?limit=200"),
        fetch("/api/vitals/latest"),
        fetch("/api/vitals/averages?days=7"),
        fetch("/api/vitals/averages?days=30"),
        fetch("/api/vitals/averages?days=90"),
      ]);

      if (vitalsRes.ok) {
        const json = await vitalsRes.json();
        if (json.success) setVitals(json.data);
      }

      if (latestRes.ok) {
        const json = await latestRes.json();
        if (json.success) setLatest(json.data);
      }

      if (avg7Res.ok) {
        const json = await avg7Res.json();
        if (json.success) setAvg7(json.data);
      }

      if (avg30Res.ok) {
        const json = await avg30Res.json();
        if (json.success) setAvg30(json.data);
      }

      if (avg90Res.ok) {
        const json = await avg90Res.json();
        if (json.success) setAvg90(json.data);
      }
    } catch {
      setErrorMessage("Failed to load vitals data");
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
      timeOfDay: formData.timeOfDay || null,
    };

    if (formData.systolic) payload.systolic = parseInt(formData.systolic, 10);
    if (formData.diastolic) payload.diastolic = parseInt(formData.diastolic, 10);
    if (formData.restingHeartRate) payload.restingHeartRate = parseInt(formData.restingHeartRate, 10);
    if (formData.spo2) payload.spo2 = parseFloat(formData.spo2);
    if (formData.notes) payload.notes = formData.notes;

    try {
      const res = await fetch("/api/vitals", {
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
      fetchData();
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (err) {
      setSaveStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Failed to save");
      setTimeout(() => setSaveStatus("idle"), 4000);
    }
  };

  // -------------------------------------------------------------------------
  // Derived chart data
  // -------------------------------------------------------------------------

  // Sort ascending by date for charts
  const sortedVitals = [...vitals].sort((a, b) => a.date.localeCompare(b.date));

  // BP chart data (dual line)
  const bpChartData = sortedVitals
    .filter((v) => v.systolic != null || v.diastolic != null)
    .map((v) => ({
      date: v.date,
      value1: v.systolic,
      value2: v.diastolic,
    }));

  // HR chart data
  const hrChartData = sortedVitals
    .filter((v) => v.restingHeartRate != null)
    .map((v) => ({
      date: v.date,
      value: v.restingHeartRate,
    }));

  // SpO2 chart data
  const spo2ChartData = sortedVitals
    .filter((v) => v.spo2 != null)
    .map((v) => ({
      date: v.date,
      value: v.spo2,
    }));

  // Check if any field has data (for form validation)
  const hasAnyValue =
    formData.systolic || formData.diastolic || formData.restingHeartRate || formData.spo2;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div>
        <PageHeader
          title="Vitals"
          subtitle="Blood pressure, heart rate, and SpO2 monitoring"
        />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-accent-teal" />
          <span className="ml-2 text-sm text-text-secondary">Loading vitals...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Vitals"
        subtitle="Blood pressure, heart rate, and SpO2 monitoring"
      />

      <div className="space-y-4">
        {/* ------- Latest Reading + Rolling Averages ------- */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Latest Reading */}
          <Card>
            <div className="flex items-center gap-2">
              <HeartPulse className="h-4 w-4 text-accent-teal" />
              <CardTitle>Latest Reading</CardTitle>
            </div>
            <CardContent className="mt-3">
              {latest ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <Clock className="h-3 w-3" />
                    <span>
                      {latest.date}
                      {latest.timeOfDay ? ` (${latest.timeOfDay})` : ""}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Blood Pressure */}
                    <div>
                      <span className="font-display text-xs text-text-secondary uppercase tracking-wide">
                        Blood Pressure
                      </span>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="font-display text-2xl font-bold tabular-nums text-text-primary">
                          {latest.systolic ?? "—"}/{latest.diastolic ?? "—"}
                        </span>
                        <span className="text-xs text-text-muted">mmHg</span>
                      </div>
                      {latest.systolic != null && latest.diastolic != null && (
                        <span
                          className={cn(
                            "mt-0.5 font-display text-xs",
                            bpCategory(latest.systolic, latest.diastolic).color
                          )}
                        >
                          {bpCategory(latest.systolic, latest.diastolic).label}
                        </span>
                      )}
                    </div>

                    {/* Heart Rate */}
                    <div>
                      <span className="font-display text-xs text-text-secondary uppercase tracking-wide">
                        Resting HR
                      </span>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="font-display text-2xl font-bold tabular-nums text-text-primary">
                          {latest.restingHeartRate ?? "—"}
                        </span>
                        <span className="text-xs text-text-muted">bpm</span>
                      </div>
                      {latest.restingHeartRate != null && (
                        <span
                          className={cn(
                            "mt-0.5 font-display text-xs",
                            hrCategory(latest.restingHeartRate).color
                          )}
                        >
                          {hrCategory(latest.restingHeartRate).label}
                        </span>
                      )}
                    </div>

                    {/* SpO2 */}
                    <div>
                      <span className="font-display text-xs text-text-secondary uppercase tracking-wide">
                        SpO2
                      </span>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="font-display text-2xl font-bold tabular-nums text-text-primary">
                          {latest.spo2 != null ? latest.spo2.toFixed(0) : "—"}
                        </span>
                        <span className="text-xs text-text-muted">%</span>
                      </div>
                      {latest.spo2 != null && (
                        <span
                          className={cn(
                            "mt-0.5 font-display text-xs",
                            latest.spo2 >= 95 ? "text-accent-green" : "text-accent-red"
                          )}
                        >
                          {latest.spo2 >= 95 ? "Normal" : "Low"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <HeartPulse className="h-8 w-8 text-text-muted mb-2" />
                  <p className="text-sm text-text-secondary">No vitals logged yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rolling Averages */}
          <Card>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-accent-teal" />
              <CardTitle>Rolling Averages</CardTitle>
            </div>
            <CardContent className="mt-3">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="pb-2 text-left font-display text-xs text-text-muted font-normal uppercase tracking-wide">
                        Metric
                      </th>
                      <th className="pb-2 text-right font-display text-xs text-text-muted font-normal uppercase tracking-wide">
                        7-Day
                      </th>
                      <th className="pb-2 text-right font-display text-xs text-text-muted font-normal uppercase tracking-wide">
                        30-Day
                      </th>
                      <th className="pb-2 text-right font-display text-xs text-text-muted font-normal uppercase tracking-wide">
                        90-Day
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    <AverageRow
                      label="Systolic"
                      unit="mmHg"
                      values={[
                        avg7?.averages.systolic ?? null,
                        avg30?.averages.systolic ?? null,
                        avg90?.averages.systolic ?? null,
                      ]}
                      goodBelow={120}
                      warnAbove={130}
                    />
                    <AverageRow
                      label="Diastolic"
                      unit="mmHg"
                      values={[
                        avg7?.averages.diastolic ?? null,
                        avg30?.averages.diastolic ?? null,
                        avg90?.averages.diastolic ?? null,
                      ]}
                      goodBelow={80}
                      warnAbove={90}
                    />
                    <AverageRow
                      label="Resting HR"
                      unit="bpm"
                      values={[
                        avg7?.averages.restingHeartRate ?? null,
                        avg30?.averages.restingHeartRate ?? null,
                        avg90?.averages.restingHeartRate ?? null,
                      ]}
                      goodBelow={64}
                      warnAbove={78}
                    />
                    <AverageRow
                      label="SpO2"
                      unit="%"
                      values={[
                        avg7?.averages.spo2 ?? null,
                        avg30?.averages.spo2 ?? null,
                        avg90?.averages.spo2 ?? null,
                      ]}
                      goodBelow={101}
                      warnAbove={95}
                      invertColor
                    />
                  </tbody>
                </table>
                <div className="mt-2 flex items-center gap-4 text-xs text-text-muted">
                  <span>Readings: 7d={avg7?.count ?? 0}, 30d={avg30?.count ?? 0}, 90d={avg90?.count ?? 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ------- Blood Pressure Chart ------- */}
        <Card>
          <div className="flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-accent-teal" />
            <CardTitle>Blood Pressure</CardTitle>
          </div>
          <CardContent className="mt-3">
            {bpChartData.length >= 2 ? (
              <>
                {/* Legend */}
                <div className="mb-2 flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-accent-red" />
                    <span className="text-text-secondary">Systolic</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full" style={{ background: "#60a5fa" }} />
                    <span className="text-text-secondary">Diastolic</span>
                  </div>
                </div>
                <DualLineChart
                  data={bpChartData}
                  line1Label="Systolic"
                  line2Label="Diastolic"
                  color1="#ef4444"
                  color2="#60a5fa"
                  height={300}
                  yDomain={[50, 180]}
                  referenceBands={[
                    { y1: 50, y2: 80, color: "#22c55e", label: "Optimal Diastolic" },
                    { y1: 80, y2: 120, color: "#22c55e", label: "Optimal Systolic" },
                    { y1: 120, y2: 130, color: "#f59e0b", label: "Elevated" },
                    { y1: 130, y2: 180, color: "#ef4444", label: "Stage 1+" },
                  ]}
                  yAxisLabel="mmHg"
                />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <HeartPulse className="h-8 w-8 text-text-muted mb-2" />
                <p className="text-sm text-text-secondary">
                  Not enough data to display blood pressure chart.
                </p>
                <p className="text-xs text-text-muted mt-1">
                  Log at least 2 blood pressure readings to see trends.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ------- Heart Rate + SpO2 Charts ------- */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Resting Heart Rate */}
          <Card>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-accent-teal" />
              <CardTitle>Resting Heart Rate</CardTitle>
            </div>
            <CardContent className="mt-3">
              {hrChartData.length >= 2 ? (
                <TrendChart
                  data={hrChartData}
                  color="#00e5c7"
                  height={240}
                  yDomain={[40, 100]}
                  referenceBands={[
                    { y1: 40, y2: 58, color: "#22c55e", label: "Excellent" },
                    { y1: 58, y2: 64, color: "#00e5c7", label: "Good" },
                    { y1: 64, y2: 70, color: "#f5f5f5", label: "Average" },
                    { y1: 70, y2: 78, color: "#f59e0b", label: "Below Avg" },
                    { y1: 78, y2: 100, color: "#ef4444", label: "Poor" },
                  ]}
                  yAxisLabel="bpm"
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Activity className="h-6 w-6 text-text-muted mb-2" />
                  <p className="text-sm text-text-secondary">Need 2+ HR readings</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* SpO2 */}
          <Card>
            <div className="flex items-center gap-2">
              <Wind className="h-4 w-4 text-accent-teal" />
              <CardTitle>Blood Oxygen (SpO2)</CardTitle>
            </div>
            <CardContent className="mt-3">
              {spo2ChartData.length >= 2 ? (
                <TrendChart
                  data={spo2ChartData}
                  color="#60a5fa"
                  height={240}
                  yDomain={[90, 100]}
                  referenceLines={[
                    {
                      value: 95,
                      label: "Alert: 95%",
                      color: "#ef4444",
                      dashed: true,
                    },
                  ]}
                  referenceBands={[
                    { y1: 95, y2: 100, color: "#22c55e", label: "Normal" },
                    { y1: 90, y2: 95, color: "#ef4444", label: "Low" },
                  ]}
                  yAxisLabel="%"
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Wind className="h-6 w-6 text-text-muted mb-2" />
                  <p className="text-sm text-text-secondary">Need 2+ SpO2 readings</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ------- Entry Form ------- */}
        <Card>
          <div className="flex items-center gap-2">
            <Save className="h-4 w-4 text-accent-teal" />
            <CardTitle>Log Vitals</CardTitle>
          </div>
          <CardContent className="mt-3">
            {errorMessage && saveStatus !== "saving" && (
              <div className="mb-3 rounded-lg border border-accent-red/30 bg-accent-red-dim px-4 py-3 text-sm text-accent-red">
                {errorMessage}
              </div>
            )}

            <div className="space-y-4">
              {/* Date + Time of Day */}
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
                    Time of Day
                  </label>
                  <select
                    value={formData.timeOfDay}
                    onChange={(e) => setFormData((p) => ({ ...p, timeOfDay: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-bg-card px-3 py-2.5 font-display text-sm text-text-primary focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal transition-colors [color-scheme:dark]"
                  >
                    <option value="morning">Morning</option>
                    <option value="afternoon">Afternoon</option>
                    <option value="evening">Evening</option>
                    <option value="night">Night</option>
                  </select>
                </div>
              </div>

              {/* BP + HR + SpO2 */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <label className="mb-1 block font-display text-xs text-text-secondary">
                    Systolic
                  </label>
                  <input
                    type="number"
                    placeholder="120"
                    value={formData.systolic}
                    onChange={(e) => setFormData((p) => ({ ...p, systolic: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-bg-card px-3 py-2.5 font-display text-sm text-text-primary tabular-nums placeholder:text-text-muted focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal transition-colors"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-display text-xs text-text-secondary">
                    Diastolic
                  </label>
                  <input
                    type="number"
                    placeholder="80"
                    value={formData.diastolic}
                    onChange={(e) => setFormData((p) => ({ ...p, diastolic: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-bg-card px-3 py-2.5 font-display text-sm text-text-primary tabular-nums placeholder:text-text-muted focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal transition-colors"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-display text-xs text-text-secondary">
                    Resting HR
                  </label>
                  <input
                    type="number"
                    placeholder="68"
                    value={formData.restingHeartRate}
                    onChange={(e) => setFormData((p) => ({ ...p, restingHeartRate: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-bg-card px-3 py-2.5 font-display text-sm text-text-primary tabular-nums placeholder:text-text-muted focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal transition-colors"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-display text-xs text-text-secondary">
                    SpO2 %
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="98"
                    value={formData.spo2}
                    onChange={(e) => setFormData((p) => ({ ...p, spo2: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-bg-card px-3 py-2.5 font-display text-sm text-text-primary tabular-nums placeholder:text-text-muted focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal transition-colors"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1 block font-display text-xs text-text-secondary">
                  Notes (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. After 5 min rest, seated, left arm"
                  value={formData.notes}
                  onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-bg-card px-3 py-2.5 font-display text-sm text-text-primary placeholder:text-text-muted focus:border-accent-teal focus:outline-none focus:ring-1 focus:ring-accent-teal transition-colors"
                />
              </div>

              {/* Save Button */}
              <button
                type="button"
                onClick={handleSave}
                disabled={saveStatus === "saving" || !hasAnyValue}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 font-display text-sm font-semibold tracking-wide transition-all duration-150",
                  saveStatus === "saved"
                    ? "bg-accent-green/20 border border-accent-green/30 text-accent-green"
                    : saveStatus === "error"
                      ? "bg-accent-red/20 border border-accent-red/30 text-accent-red"
                      : "bg-accent-teal border border-accent-teal text-bg-primary hover:bg-accent-teal/90 active:scale-[0.98]",
                  (saveStatus === "saving" || !hasAnyValue) &&
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
                    Save Vitals
                  </>
                )}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* ------- Recent History ------- */}
        {vitals.length > 0 && (
          <Card>
            <CardTitle>Recent Readings</CardTitle>
            <CardContent className="mt-3">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="pb-2 text-left font-display text-xs text-text-muted font-normal uppercase tracking-wide">
                        Date
                      </th>
                      <th className="pb-2 text-left font-display text-xs text-text-muted font-normal uppercase tracking-wide">
                        Time
                      </th>
                      <th className="pb-2 text-right font-display text-xs text-text-muted font-normal uppercase tracking-wide">
                        BP
                      </th>
                      <th className="pb-2 text-right font-display text-xs text-text-muted font-normal uppercase tracking-wide">
                        HR
                      </th>
                      <th className="pb-2 text-right font-display text-xs text-text-muted font-normal uppercase tracking-wide">
                        SpO2
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {vitals.slice(0, 15).map((v) => {
                      const bp =
                        v.systolic != null && v.diastolic != null
                          ? bpCategory(v.systolic, v.diastolic)
                          : null;

                      return (
                        <tr key={v.id} className="group">
                          <td className="py-2 pr-3 font-display text-xs tabular-nums text-text-primary">
                            {v.date}
                          </td>
                          <td className="py-2 pr-3 text-xs text-text-muted capitalize">
                            {v.timeOfDay ?? "—"}
                          </td>
                          <td className="py-2 pr-3 text-right">
                            {v.systolic != null && v.diastolic != null ? (
                              <span
                                className={cn(
                                  "font-display text-xs tabular-nums",
                                  bp?.color
                                )}
                              >
                                {v.systolic}/{v.diastolic}
                              </span>
                            ) : (
                              <span className="text-xs text-text-muted">—</span>
                            )}
                          </td>
                          <td className="py-2 pr-3 text-right">
                            {v.restingHeartRate != null ? (
                              <span
                                className={cn(
                                  "font-display text-xs tabular-nums",
                                  hrCategory(v.restingHeartRate).color
                                )}
                              >
                                {v.restingHeartRate}
                              </span>
                            ) : (
                              <span className="text-xs text-text-muted">—</span>
                            )}
                          </td>
                          <td className="py-2 text-right">
                            {v.spo2 != null ? (
                              <span
                                className={cn(
                                  "font-display text-xs tabular-nums",
                                  v.spo2 >= 95
                                    ? "text-accent-green"
                                    : "text-accent-red"
                                )}
                              >
                                {v.spo2.toFixed(0)}%
                              </span>
                            ) : (
                              <span className="text-xs text-text-muted">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {vitals.length > 15 && (
                <p className="mt-2 text-center text-xs text-text-muted">
                  Showing 15 of {vitals.length} readings
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Averages Table Row Sub-Component
// ---------------------------------------------------------------------------

function AverageRow({
  label,
  unit,
  values,
  goodBelow,
  warnAbove,
  invertColor = false,
}: {
  label: string;
  unit: string;
  values: [number | null, number | null, number | null];
  goodBelow: number;
  warnAbove: number;
  invertColor?: boolean;
}) {
  const colorFor = (val: number | null) => {
    if (val == null) return "text-text-muted";
    if (invertColor) {
      // For SpO2: lower is bad
      return val < warnAbove ? "text-accent-red" : "text-accent-green";
    }
    if (val < goodBelow) return "text-accent-green";
    if (val < warnAbove) return "text-accent-amber";
    return "text-accent-red";
  };

  // Determine trend from 7-day vs 30-day
  const trend =
    values[0] != null && values[1] != null
      ? values[0] - values[1]
      : null;

  return (
    <tr>
      <td className="py-2.5 pr-3">
        <div className="flex items-center gap-1.5">
          <span className="font-display text-xs text-text-secondary">{label}</span>
          {trend != null && (
            <>
              {Math.abs(trend) < 0.5 ? (
                <Minus className="h-3 w-3 text-text-muted" />
              ) : trend < 0 ? (
                <TrendingDown className="h-3 w-3 text-accent-green" />
              ) : (
                <TrendingUp className="h-3 w-3 text-accent-amber" />
              )}
            </>
          )}
        </div>
      </td>
      {values.map((val, i) => (
        <td key={i} className="py-2.5 text-right">
          <span className={cn("font-display text-sm tabular-nums", colorFor(val))}>
            {val != null ? val.toFixed(1) : "—"}
          </span>
          {val != null && (
            <span className="ml-0.5 text-[10px] text-text-muted">{unit}</span>
          )}
        </td>
      ))}
    </tr>
  );
}
