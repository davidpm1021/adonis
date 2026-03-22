export const dynamic = 'force-dynamic';

import { db } from "@/db";
import * as schema from "@/db/schema";
import { gte, and, lte } from "drizzle-orm";
import { success, withErrorHandling, todayET } from "@/lib/api";
import { pearsonCorrelation, isSignificant, interpretCorrelation } from "@/lib/stats";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get a date N days ago in ET as YYYY-MM-DD */
function daysAgo(n: number): string {
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
  );
  now.setDate(now.getDate() - n);
  return now.toLocaleDateString("en-CA");
}

interface CorrelationResult {
  pair: string;
  r: number;
  n: number;
  significant: boolean;
  interpretation: string;
}

// ---------------------------------------------------------------------------
// GET /api/trends/correlations
// ---------------------------------------------------------------------------
export const GET = withErrorHandling(async () => {
  const startDate = daysAgo(90);
  const today = todayET();

  // Fetch all data sources in parallel
  const [dailyLogs, sleepLogs, nutritionRows, workoutRows] = await Promise.all([
    db
      .select({
        date: schema.dailyLog.date,
        energy: schema.dailyLog.energy,
        mood: schema.dailyLog.mood,
        soreness: schema.dailyLog.soreness,
      })
      .from(schema.dailyLog)
      .where(and(gte(schema.dailyLog.date, startDate), lte(schema.dailyLog.date, today))),

    db
      .select({
        date: schema.sleepLog.date,
        sleepQuality: schema.sleepLog.sleepQuality,
      })
      .from(schema.sleepLog)
      .where(and(gte(schema.sleepLog.date, startDate), lte(schema.sleepLog.date, today))),

    db
      .select({
        date: schema.nutritionLog.date,
        proteinG: schema.nutritionLog.proteinG,
      })
      .from(schema.nutritionLog)
      .where(and(gte(schema.nutritionLog.date, startDate), lte(schema.nutritionLog.date, today))),

    db
      .select({
        date: schema.workouts.date,
      })
      .from(schema.workouts)
      .where(and(gte(schema.workouts.date, startDate), lte(schema.workouts.date, today))),
  ]);

  // Build lookup maps by date
  const dailyByDate = new Map<string, { energy: number | null; mood: number | null; soreness: number | null }>();
  for (const log of dailyLogs) {
    dailyByDate.set(log.date, { energy: log.energy, mood: log.mood, soreness: log.soreness });
  }

  const sleepByDate = new Map<string, number>();
  for (const log of sleepLogs) {
    if (log.sleepQuality != null) {
      sleepByDate.set(log.date, log.sleepQuality);
    }
  }

  // Aggregate protein by date
  const proteinByDate = new Map<string, number>();
  for (const row of nutritionRows) {
    const current = proteinByDate.get(row.date) ?? 0;
    proteinByDate.set(row.date, current + (row.proteinG ?? 0));
  }

  // Count workouts in 7-day rolling window for each date that has a daily log
  const workoutDates = workoutRows.map((w) => w.date);
  const workoutCountByDate = new Map<string, number>();
  for (const date of dailyByDate.keys()) {
    const d = new Date(date);
    let count = 0;
    for (const wd of workoutDates) {
      const diff = (d.getTime() - new Date(wd).getTime()) / (1000 * 60 * 60 * 24);
      if (diff >= 0 && diff < 7) count++;
    }
    workoutCountByDate.set(date, count);
  }

  // ---------------------------------------------------------------------------
  // Compute correlations by aligning data on shared dates
  // ---------------------------------------------------------------------------
  const correlations: CorrelationResult[] = [];

  // 1. Sleep quality vs energy
  {
    const x: number[] = [];
    const y: number[] = [];
    for (const [date, sq] of sleepByDate) {
      const daily = dailyByDate.get(date);
      if (daily?.energy != null) {
        x.push(sq);
        y.push(daily.energy);
      }
    }
    const r = pearsonCorrelation(x, y);
    correlations.push({
      pair: "Sleep Quality vs Energy",
      r: round3(r),
      n: Math.min(x.length, y.length),
      significant: isSignificant(r, Math.min(x.length, y.length)),
      interpretation: interpretCorrelation(r),
    });
  }

  // 2. Training frequency (7-day window) vs mood
  {
    const x: number[] = [];
    const y: number[] = [];
    for (const [date, daily] of dailyByDate) {
      const wc = workoutCountByDate.get(date);
      if (wc != null && daily.mood != null) {
        x.push(wc);
        y.push(daily.mood);
      }
    }
    const r = pearsonCorrelation(x, y);
    correlations.push({
      pair: "Training Frequency vs Mood",
      r: round3(r),
      n: Math.min(x.length, y.length),
      significant: isSignificant(r, Math.min(x.length, y.length)),
      interpretation: interpretCorrelation(r),
    });
  }

  // 3. Protein intake vs energy
  {
    const x: number[] = [];
    const y: number[] = [];
    for (const [date, protein] of proteinByDate) {
      const daily = dailyByDate.get(date);
      if (daily?.energy != null && protein > 0) {
        x.push(protein);
        y.push(daily.energy);
      }
    }
    const r = pearsonCorrelation(x, y);
    correlations.push({
      pair: "Protein Intake vs Energy",
      r: round3(r),
      n: Math.min(x.length, y.length),
      significant: isSignificant(r, Math.min(x.length, y.length)),
      interpretation: interpretCorrelation(r),
    });
  }

  // 4. Sleep quality vs mood
  {
    const x: number[] = [];
    const y: number[] = [];
    for (const [date, sq] of sleepByDate) {
      const daily = dailyByDate.get(date);
      if (daily?.mood != null) {
        x.push(sq);
        y.push(daily.mood);
      }
    }
    const r = pearsonCorrelation(x, y);
    correlations.push({
      pair: "Sleep Quality vs Mood",
      r: round3(r),
      n: Math.min(x.length, y.length),
      significant: isSignificant(r, Math.min(x.length, y.length)),
      interpretation: interpretCorrelation(r),
    });
  }

  // 5. Soreness vs sleep quality
  {
    const x: number[] = [];
    const y: number[] = [];
    for (const [date, sq] of sleepByDate) {
      const daily = dailyByDate.get(date);
      if (daily?.soreness != null) {
        x.push(daily.soreness);
        y.push(sq);
      }
    }
    const r = pearsonCorrelation(x, y);
    correlations.push({
      pair: "Soreness vs Sleep Quality",
      r: round3(r),
      n: Math.min(x.length, y.length),
      significant: isSignificant(r, Math.min(x.length, y.length)),
      interpretation: interpretCorrelation(r),
    });
  }

  return success(correlations);
});

function round3(n: number): number {
  if (isNaN(n)) return NaN;
  return Math.round(n * 1000) / 1000;
}
