// ADONIS Calculation Utilities
// All health-related calculations used across the app

import { differenceInDays, parseISO, addDays, format } from "date-fns";
import { SOBRIETY_MILESTONES, HOMA_IR_RANGES, STREAK_FLAME_TIERS } from "./constants";

// ---------------------------------------------------------------------------
// HOMA-IR: (fasting_insulin × fasting_glucose) / 405
// ---------------------------------------------------------------------------
export function calculateHomaIR(fastingInsulin: number, fastingGlucose: number) {
  const value = (fastingInsulin * fastingGlucose) / 405;
  const rounded = Math.round(value * 100) / 100;

  let interpretation = "Unknown";
  if (rounded < HOMA_IR_RANGES.NORMAL.max) interpretation = HOMA_IR_RANGES.NORMAL.label;
  else if (rounded < HOMA_IR_RANGES.EARLY_IR.max) interpretation = HOMA_IR_RANGES.EARLY_IR.label;
  else if (rounded < HOMA_IR_RANGES.SIGNIFICANT_IR.max) interpretation = HOMA_IR_RANGES.SIGNIFICANT_IR.label;
  else interpretation = HOMA_IR_RANGES.SEVERE_IR.label;

  return {
    value: rounded,
    formula: "(fasting_insulin × fasting_glucose) / 405",
    inputValues: { fastingInsulin, fastingGlucose },
    interpretation,
  };
}

// ---------------------------------------------------------------------------
// Free Testosterone (Vermeulen Equation)
// Inputs: total T (ng/dL), SHBG (nmol/L), albumin (g/dL, default 4.3)
// ---------------------------------------------------------------------------
export function calculateFreeTestosterone(
  totalT: number,
  shbg: number,
  albumin: number = 4.3
) {
  // Convert total T from ng/dL to nmol/L
  const totalT_nmol = totalT * 0.0347;
  // Albumin in mol/L
  const albumin_mol = albumin * 10000 / 66430;

  // Association constants
  const Kt = 1e9; // SHBG-T
  const Ka = 3.6e4; // Albumin-T

  // Quadratic solution for free T
  const a = Kt * Ka * albumin_mol + Kt;
  const b = 1 + Ka * albumin_mol + Kt * (shbg * 1e-9 - totalT_nmol * 1e-9);
  const c = -(totalT_nmol * 1e-9);

  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;

  const freeT_mol = (-b + Math.sqrt(discriminant)) / (2 * a);
  // Convert back to pg/mL
  const freeT_pgml = freeT_mol * 1e12 * 288.42;
  const rounded = Math.round(freeT_pgml * 10) / 10;

  return {
    value: rounded,
    formula: "Vermeulen equation",
    inputValues: { totalT, shbg, albumin },
    interpretation: rounded < 8.7 ? "Low" : rounded > 25.1 ? "High" : "Normal",
  };
}

// ---------------------------------------------------------------------------
// Navy Body Fat % (Male)
// 86.010 × log10(waist - neck) - 70.041 × log10(height) + 36.76
// All measurements in inches
// ---------------------------------------------------------------------------
export function calculateNavyBodyFat(
  waistInches: number,
  neckInches: number,
  heightInches: number
) {
  if (waistInches <= neckInches) return null;

  const value =
    86.01 * Math.log10(waistInches - neckInches) -
    70.041 * Math.log10(heightInches) +
    36.76;

  const rounded = Math.round(value * 10) / 10;

  let interpretation = "Unknown";
  if (rounded < 14) interpretation = "Athletic";
  else if (rounded < 18) interpretation = "Fit";
  else if (rounded < 25) interpretation = "Average";
  else if (rounded < 32) interpretation = "Above Average";
  else interpretation = "High";

  return {
    value: rounded,
    formula: "86.010 × log10(waist - neck) - 70.041 × log10(height) + 36.76",
    inputValues: { waistInches, neckInches, heightInches },
    interpretation,
  };
}

// ---------------------------------------------------------------------------
// BMI: (weight_lbs / height_inches²) × 703
// ---------------------------------------------------------------------------
export function calculateBMI(weightLbs: number, heightInches: number) {
  const value = (weightLbs / (heightInches * heightInches)) * 703;
  const rounded = Math.round(value * 10) / 10;

  let interpretation = "Unknown";
  if (rounded < 18.5) interpretation = "Underweight";
  else if (rounded < 25) interpretation = "Normal";
  else if (rounded < 30) interpretation = "Overweight";
  else interpretation = "Obese";

  return { value: rounded, interpretation };
}

// ---------------------------------------------------------------------------
// Sobriety Calculations
// ---------------------------------------------------------------------------
export function calculateSobriety(sobrietyStartDate: string) {
  const start = parseISO(sobrietyStartDate);
  const now = new Date();
  const days = differenceInDays(now, start);

  // Current milestone
  const currentMilestone = SOBRIETY_MILESTONES.filter(m => days >= m).pop() || 0;
  // Next milestone
  const nextMilestone = SOBRIETY_MILESTONES.find(m => m > days) || null;
  const daysToNext = nextMilestone ? nextMilestone - days : null;

  return { days, currentMilestone, nextMilestone, daysToNext };
}

export function calculateMoneySaved(days: number, weeklySpend: number) {
  return Math.round((days / 7) * weeklySpend * 100) / 100;
}

export function calculateCaloriesAvoided(days: number, weeklyCalories: number) {
  return Math.round((days / 7) * weeklyCalories);
}

export function getSobrietyHealthBenefit(days: number): string {
  if (days >= 365) return "Liver enzymes likely normalized, significant cardiovascular risk reduction, improved insulin sensitivity, reduced cancer risk";
  if (days >= 180) return "Significant liver recovery, improved sleep architecture, reduced systemic inflammation, better hormone levels";
  if (days >= 90) return "Major liver enzyme improvement, blood pressure normalizing, sleep quality significantly improved, skin health restored";
  if (days >= 60) return "Liver fat reducing, blood pressure improving, sleep cycle normalizing, immune function recovering";
  if (days >= 30) return "Liver enzymes improving, sleep quality better, blood pressure may be lower, digestion improved, skin clearer";
  if (days >= 14) return "Liver begins recovery, sleep improving, anxiety reducing, stomach lining healing, hydration improved";
  if (days >= 7) return "Sleep quality improving, better hydration, brain fog clearing, appetite normalizing";
  if (days >= 3) return "Detox complete, blood sugar stabilizing, better sleep onset, rehydration";
  if (days >= 1) return "Alcohol leaving system, body beginning recovery process";
  return "Starting the journey";
}

// ---------------------------------------------------------------------------
// Streak Calculation
// ---------------------------------------------------------------------------
export function calculateStreak(
  dates: { date: string; value: boolean }[]
): { current: number; best: number } {
  if (dates.length === 0) return { current: 0, best: 0 };

  // Sort descending
  const sorted = [...dates].sort((a, b) => b.date.localeCompare(a.date));

  let current = 0;
  for (const d of sorted) {
    if (d.value) current++;
    else break;
  }

  let best = 0;
  let running = 0;
  // Sort ascending for best calculation
  const ascending = [...dates].sort((a, b) => a.date.localeCompare(b.date));
  for (const d of ascending) {
    if (d.value) {
      running++;
      best = Math.max(best, running);
    } else {
      running = 0;
    }
  }

  return { current, best };
}

// ---------------------------------------------------------------------------
// Nutrition Totals
// ---------------------------------------------------------------------------
export function calculateNutritionTotals(
  meals: { calories: number | null; proteinG: number | null; carbsG: number | null; fatG: number | null; fiberG: number | null }[]
) {
  return {
    calories: meals.reduce((sum, m) => sum + (m.calories || 0), 0),
    protein: meals.reduce((sum, m) => sum + (m.proteinG || 0), 0),
    carbs: meals.reduce((sum, m) => sum + (m.carbsG || 0), 0),
    fat: meals.reduce((sum, m) => sum + (m.fatG || 0), 0),
    fiber: meals.reduce((sum, m) => sum + (m.fiberG || 0), 0),
  };
}

// ---------------------------------------------------------------------------
// Consistency Score
// ---------------------------------------------------------------------------
export function calculateConsistency(
  logs: { date: string; morningWalk: number; strengthTraining: number; ateLunchWithProtein: number; mobilityWork: number; supplementsTaken: number }[],
  days: number
): number {
  if (logs.length === 0) return 0;
  const total = logs.length * 5; // 5 non-negotiables per day
  const completed = logs.reduce((sum, log) => {
    return sum + log.morningWalk + log.strengthTraining + log.ateLunchWithProtein + log.mobilityWork + log.supplementsTaken;
  }, 0);
  return Math.round((completed / total) * 100);
}

// ---------------------------------------------------------------------------
// Streak with Freeze Support
// ---------------------------------------------------------------------------

/** Apply streak freezes: skip frozen days in streak calculation */
export function applyStreakFreezes(
  dates: { date: string; value: boolean }[],
  freezes: { date: string; streakType: string }[],
  streakType: string
): { date: string; value: boolean }[] {
  const frozenDates = new Set(
    freezes.filter((f) => f.streakType === streakType).map((f) => f.date)
  );

  return dates.map((d) => {
    if (frozenDates.has(d.date) && !d.value) {
      return { ...d, value: true }; // Freeze preserves the streak
    }
    return d;
  });
}

/** Calculate streak for daily log entries (consecutive days with a daily_log entry) */
export function calculateDailyLogStreak(
  logDates: string[]
): { current: number; best: number } {
  if (logDates.length === 0) return { current: 0, best: 0 };

  const sorted = [...logDates].sort((a, b) => b.localeCompare(a));
  const today = format(new Date(), "yyyy-MM-dd");

  // Current streak: count from today backwards
  let current = 0;
  let checkDate = today;
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i] === checkDate) {
      current++;
      checkDate = format(addDays(parseISO(checkDate), -1), "yyyy-MM-dd");
    } else if (sorted[i] < checkDate) {
      break;
    }
  }

  // Best streak
  const ascending = [...logDates].sort();
  let best = 0;
  let running = 1;
  for (let i = 1; i < ascending.length; i++) {
    const prev = parseISO(ascending[i - 1]);
    const curr = parseISO(ascending[i]);
    if (differenceInDays(curr, prev) === 1) {
      running++;
      best = Math.max(best, running);
    } else {
      running = 1;
    }
  }
  best = Math.max(best, running);
  if (logDates.length === 1) best = 1;

  return { current, best };
}

/** Calculate protein streak (days where protein intake >= target min) */
export function calculateProteinStreak(
  dailyProtein: { date: string; totalProtein: number }[],
  proteinMin: number
): { current: number; best: number } {
  const dates = dailyProtein.map((d) => ({
    date: d.date,
    value: d.totalProtein >= proteinMin,
  }));
  return calculateStreak(dates);
}

/** Calculate sleep logged streak (consecutive days with a sleep_log entry) */
export function calculateSleepLoggedStreak(
  sleepDates: string[]
): { current: number; best: number } {
  return calculateDailyLogStreak(sleepDates); // Same logic as daily log streak
}

/** Calculate overall consistency streak (80%+ of 7 behaviors per day) */
export function calculateOverallStreak(
  dailyScores: { date: string; completedCount: number; totalCount: number }[]
): { current: number; best: number } {
  const dates = dailyScores.map((d) => ({
    date: d.date,
    value: d.totalCount > 0 && d.completedCount / d.totalCount >= 0.8,
  }));
  return calculateStreak(dates);
}

/** Get the flame tier for a given streak count */
export function getStreakFlameTier(days: number) {
  return (
    STREAK_FLAME_TIERS.find(
      (t) => days >= t.min && days <= t.max
    ) || STREAK_FLAME_TIERS[0]
  );
}
