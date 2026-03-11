"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, TrendingUp as TrendingUpIcon } from "lucide-react";
import Link from "next/link";
import {
  ConsistencyScores,
  type ConsistencyPeriod,
} from "@/components/trends/consistency-scores";
import {
  StreakDisplay,
  type StreakData,
} from "@/components/trends/streak-display";
import {
  WeightTrend,
  type WeightEntry,
} from "@/components/trends/weight-trend";
import {
  LabTrajectory,
  type LabEntry,
} from "@/components/trends/lab-trajectory";
import {
  Correlations,
  type CorrelationInput,
} from "@/components/trends/correlation-card";
import {
  NutritionPatterns,
  type NutritionEntry,
} from "@/components/trends/nutrition-patterns";
import {
  MonthlySummary,
  type DailyLogEntry,
  type SleepEntry,
} from "@/components/trends/monthly-summary";

// ---------------------------------------------------------------------------
// Types for API responses
// ---------------------------------------------------------------------------

interface ConsistencyResponse {
  days: number;
  daysLogged: number;
  consistencyPct: number;
  periodStart: string;
  periodEnd: string;
}

interface WeightResponse {
  entries: { date: string; weight: number | null }[];
  referenceLines: {
    startingWeight: number;
    goalWeightLow: number;
    goalWeightHigh: number;
  };
}

interface NutritionTargetsResponse {
  proteinMin: number | null;
  proteinMax: number | null;
  fiberMin: number | null;
  fiberMax: number | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TrendsPage() {
  const [isLoading, setIsLoading] = useState(true);

  // Data state
  const [consistency7, setConsistency7] = useState<ConsistencyResponse | null>(
    null
  );
  const [consistency30, setConsistency30] =
    useState<ConsistencyResponse | null>(null);
  const [consistency90, setConsistency90] =
    useState<ConsistencyResponse | null>(null);
  const [prevConsistency7, setPrevConsistency7] =
    useState<ConsistencyResponse | null>(null);
  const [prevConsistency30, setPrevConsistency30] =
    useState<ConsistencyResponse | null>(null);
  const [prevConsistency90, setPrevConsistency90] =
    useState<ConsistencyResponse | null>(null);
  const [streaks, setStreaks] = useState<StreakData | null>(null);
  const [weightData, setWeightData] = useState<WeightResponse | null>(null);
  const [labs, setLabs] = useState<LabEntry[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLogEntry[]>([]);
  const [sleepEntries, setSleepEntries] = useState<SleepEntry[]>([]);
  const [nutritionEntries, setNutritionEntries] = useState<NutritionEntry[]>(
    []
  );
  const [nutritionTargets, setNutritionTargets] =
    useState<NutritionTargetsResponse | null>(null);

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    setIsLoading(true);

    const [
      c7,
      c30,
      c90,
      pc7,
      pc30,
      pc90,
      streakData,
      wData,
      labData,
      logData,
      sleepData,
      nutritionData,
      targets,
    ] = await Promise.all([
      fetchJson<ConsistencyResponse>("/api/trends/consistency?days=7"),
      fetchJson<ConsistencyResponse>("/api/trends/consistency?days=30"),
      fetchJson<ConsistencyResponse>("/api/trends/consistency?days=90"),
      fetchJson<ConsistencyResponse>("/api/trends/consistency?days=14"),
      fetchJson<ConsistencyResponse>("/api/trends/consistency?days=60"),
      fetchJson<ConsistencyResponse>("/api/trends/consistency?days=180"),
      fetchJson<StreakData>("/api/trends/streaks"),
      fetchJson<WeightResponse>("/api/trends/weight"),
      fetchJson<LabEntry[]>("/api/labs?limit=500"),
      fetchJson<DailyLogEntry[]>("/api/daily-log?limit=500"),
      fetchJson<SleepEntry[]>("/api/sleep?limit=500"),
      fetchJson<NutritionEntry[]>("/api/nutrition?limit=1000"),
      fetchJson<NutritionTargetsResponse>("/api/targets/nutrition"),
    ]);

    setConsistency7(c7);
    setConsistency30(c30);
    setConsistency90(c90);
    setPrevConsistency7(pc7);
    setPrevConsistency30(pc30);
    setPrevConsistency90(pc90);
    setStreaks(streakData);
    setWeightData(wData);
    setLabs(labData ?? []);
    setDailyLogs(logData ?? []);
    setSleepEntries(sleepData ?? []);
    setNutritionEntries(nutritionData ?? []);
    setNutritionTargets(targets);

    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // -------------------------------------------------------------------------
  // Derived: Consistency periods
  // -------------------------------------------------------------------------

  const consistencyPeriods: ConsistencyPeriod[] = useMemo(
    () => [
      {
        days: 7,
        label: "7-Day Consistency",
        consistencyPct: consistency7?.consistencyPct ?? 0,
        previousPct: prevConsistency7?.consistencyPct ?? null,
      },
      {
        days: 30,
        label: "30-Day Consistency",
        consistencyPct: consistency30?.consistencyPct ?? 0,
        previousPct: prevConsistency30?.consistencyPct ?? null,
      },
      {
        days: 90,
        label: "90-Day Consistency",
        consistencyPct: consistency90?.consistencyPct ?? 0,
        previousPct: prevConsistency90?.consistencyPct ?? null,
      },
    ],
    [
      consistency7,
      consistency30,
      consistency90,
      prevConsistency7,
      prevConsistency30,
      prevConsistency90,
    ]
  );

  // -------------------------------------------------------------------------
  // Derived: Weight entries
  // -------------------------------------------------------------------------

  const weightEntries: WeightEntry[] = useMemo(
    () => weightData?.entries ?? [],
    [weightData]
  );

  // -------------------------------------------------------------------------
  // Derived: Correlation data
  // -------------------------------------------------------------------------

  const correlations: CorrelationInput[] = useMemo(() => {
    const result: CorrelationInput[] = [];

    // Build lookup maps by date
    const logByDate: Record<string, DailyLogEntry> = {};
    for (const log of dailyLogs) {
      logByDate[log.date] = log;
    }

    const sleepByDate: Record<string, SleepEntry> = {};
    for (const s of sleepEntries) {
      sleepByDate[s.date] = s;
    }

    // 1. Sleep Quality vs Energy
    {
      const xData: number[] = [];
      const yData: number[] = [];
      for (const date of Object.keys(logByDate)) {
        const log = logByDate[date];
        const sleep = sleepByDate[date];
        if (sleep?.sleepQuality != null && log.energy != null) {
          xData.push(sleep.sleepQuality);
          yData.push(log.energy);
        }
      }
      result.push({
        label: "Sleep Quality vs Energy",
        xLabel: "Sleep Quality",
        yLabel: "Energy",
        xData,
        yData,
        color: "#00e5c7",
        interpretation: (r: number) =>
          r > 0.3
            ? `Positive correlation (r=${r.toFixed(2)}): Better sleep tends to correspond with higher energy levels.`
            : r < -0.3
              ? `Negative correlation (r=${r.toFixed(2)}): Surprisingly, sleep quality and energy appear inversely related in your data.`
              : `Weak correlation (r=${r.toFixed(2)}): Sleep quality and energy levels show limited direct association in your data.`,
      });
    }

    // 2. Training vs Mood
    {
      const xData: number[] = [];
      const yData: number[] = [];
      for (const log of dailyLogs) {
        if (log.mood != null) {
          xData.push(log.strengthTraining === 1 ? 1 : 0);
          yData.push(log.mood);
        }
      }
      result.push({
        label: "Training Days vs Mood",
        xLabel: "Trained (0/1)",
        yLabel: "Mood",
        xData,
        yData,
        color: "#f59e0b",
        interpretation: (r: number) =>
          r > 0.2
            ? `Positive correlation (r=${r.toFixed(2)}): Training days tend to have higher mood scores.`
            : r < -0.2
              ? `Negative correlation (r=${r.toFixed(2)}): Training may be associated with lower mood -- consider recovery load.`
              : `Weak correlation (r=${r.toFixed(2)}): Mood appears largely independent of whether you trained that day.`,
      });
    }

    // 3. Calorie intake vs Weight (match nutrition daily totals with nearest weight)
    {
      // Group nutrition by date
      const nutritionByDate: Record<string, number> = {};
      for (const n of nutritionEntries) {
        if (n.calories != null) {
          nutritionByDate[n.date] =
            (nutritionByDate[n.date] ?? 0) + n.calories;
        }
      }

      // Weight by date
      const weightByDate: Record<string, number> = {};
      for (const w of weightEntries) {
        if (w.weight != null) {
          weightByDate[w.date] = w.weight;
        }
      }

      const xData: number[] = [];
      const yData: number[] = [];
      for (const date of Object.keys(nutritionByDate)) {
        if (weightByDate[date] != null) {
          xData.push(nutritionByDate[date]);
          yData.push(weightByDate[date]);
        }
      }

      result.push({
        label: "Calorie Intake vs Weight",
        xLabel: "Calories",
        yLabel: "Weight (lbs)",
        xData,
        yData,
        color: "#ef4444",
        interpretation: (r: number) =>
          r > 0.3
            ? `Positive correlation (r=${r.toFixed(2)}): Higher calorie days are associated with higher weight readings.`
            : r < -0.3
              ? `Negative correlation (r=${r.toFixed(2)}): Interestingly, higher calorie days coincide with lower weight -- this may reflect timing or water retention patterns.`
              : `Weak correlation (r=${r.toFixed(2)}): Daily calorie intake shows limited direct association with same-day weight. Weight changes are more gradual.`,
      });
    }

    return result;
  }, [dailyLogs, sleepEntries, nutritionEntries, weightEntries]);

  // -------------------------------------------------------------------------
  // Derived: Monthly summary data
  // -------------------------------------------------------------------------

  const monthlySleepEntries: SleepEntry[] = useMemo(
    () =>
      sleepEntries.map((s) => ({
        date: s.date,
        totalHours: s.totalHours ?? null,
        sleepQuality: s.sleepQuality ?? null,
      })),
    [sleepEntries]
  );

  const monthlyDailyLogs: DailyLogEntry[] = useMemo(
    () =>
      dailyLogs.map((l) => ({
        date: l.date,
        morningWalk: l.morningWalk ?? null,
        strengthTraining: l.strengthTraining ?? null,
        ateLunchWithProtein: l.ateLunchWithProtein ?? null,
        mobilityWork: l.mobilityWork ?? null,
        supplementsTaken: l.supplementsTaken ?? null,
        alcoholFree: l.alcoholFree ?? null,
        energy: l.energy ?? null,
        mood: l.mood ?? null,
      })),
    [dailyLogs]
  );

  // -------------------------------------------------------------------------
  // Empty state check: no meaningful data at all
  // -------------------------------------------------------------------------
  const hasAnyData =
    dailyLogs.length > 0 ||
    weightEntries.length > 0 ||
    sleepEntries.length > 0 ||
    nutritionEntries.length > 0 ||
    labs.length > 0;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div>
        <PageHeader
          title="Trends & Analytics"
          subtitle="Data analytics and cross-metric correlations"
        />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-accent-teal" />
          <span className="ml-2 text-sm text-text-secondary">
            Loading analytics...
          </span>
        </div>
      </div>
    );
  }

  if (!hasAnyData) {
    return (
      <div>
        <PageHeader
          title="Trends & Analytics"
          subtitle="Data analytics and cross-metric correlations"
        />
        <Card>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-16">
              <TrendingUpIcon className="h-12 w-12 text-text-muted/30 mb-4" />
              <h2 className="font-display text-lg font-semibold text-text-primary">
                No Data Yet
              </h2>
              <p className="mt-2 max-w-sm text-center text-sm text-text-secondary">
                Start logging your daily activities, nutrition, and body metrics to unlock trend analysis and cross-metric correlations.
              </p>
              <Link
                href="/daily-log"
                className="mt-5 rounded-lg bg-accent-teal px-5 py-2.5 font-display text-sm font-semibold text-bg-primary transition-all hover:bg-accent-teal/90"
              >
                Start Daily Log
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Trends & Analytics"
        subtitle="Data analytics and cross-metric correlations"
      />

      <div className="space-y-6">
        {/* 1. Consistency Scores */}
        <ConsistencyScores periods={consistencyPeriods} />

        {/* 2. Streak Tracking */}
        <StreakDisplay streaks={streaks ?? {}} />

        {/* 3. Body Composition Trend (full width) */}
        <WeightTrend
          entries={weightEntries}
          startingWeight={weightData?.referenceLines.startingWeight ?? 225}
          goalWeightLow={weightData?.referenceLines.goalWeightLow ?? 185}
          goalWeightHigh={weightData?.referenceLines.goalWeightHigh ?? 195}
        />

        {/* 4. Lab Trajectory */}
        <LabTrajectory labs={labs} />

        {/* 5. AI-Powered Correlations */}
        <Correlations correlations={correlations} />

        {/* 6. Nutrition Patterns */}
        <NutritionPatterns
          entries={nutritionEntries}
          proteinTarget={nutritionTargets?.proteinMin ?? null}
          fiberTarget={nutritionTargets?.fiberMin ?? null}
        />

        {/* 7. Monthly Summary Cards */}
        <MonthlySummary
          dailyLogs={monthlyDailyLogs}
          sleepEntries={monthlySleepEntries}
          weightEntries={weightEntries}
        />
      </div>
    </div>
  );
}
