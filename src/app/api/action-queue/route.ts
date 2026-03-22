export const dynamic = 'force-dynamic';

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { success, withErrorHandling, todayET } from "@/lib/api";
import type { ActionItem } from "@/lib/types/action-queue";

// GET /api/action-queue — Contextual "what to do next" action items
export const GET = withErrorHandling(async () => {
  const today = todayET();

  // Determine current Eastern Time hour
  const etHour = parseInt(
    new Date().toLocaleString("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      hour12: false,
    }),
    10
  );

  // Determine day of week for training day check
  const dayOfWeek = new Date().toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
  });
  const isTrainingDay = ["Tuesday", "Thursday", "Saturday"].includes(dayOfWeek);

  // Fetch all today's data in parallel
  const [
    dailyLogRows,
    supplementRows,
    sleepRows,
    workoutRows,
    vitalsRows,
    nutritionTotals,
    weightRows,
    nutritionTargetRows,
    trainingPhaseRows,
    userProfileRows,
  ] = await Promise.all([
    // Daily log for today
    db.select().from(schema.dailyLog).where(eq(schema.dailyLog.date, today)).limit(1),

    // Supplement log for today
    db.select().from(schema.supplementLog).where(eq(schema.supplementLog.date, today)),

    // Sleep log for today
    db.select().from(schema.sleepLog).where(eq(schema.sleepLog.date, today)).limit(1),

    // Workouts for today
    db.select().from(schema.workouts).where(eq(schema.workouts.date, today)),

    // Vitals for today
    db.select().from(schema.vitalsLog).where(eq(schema.vitalsLog.date, today)),

    // Nutrition totals for today
    db.select({
      totalCalories: sql<number>`COALESCE(SUM(${schema.nutritionLog.calories}), 0)`,
      totalProtein: sql<number>`COALESCE(SUM(${schema.nutritionLog.proteinG}), 0)`,
      totalCarbs: sql<number>`COALESCE(SUM(${schema.nutritionLog.carbsG}), 0)`,
      totalFat: sql<number>`COALESCE(SUM(${schema.nutritionLog.fatG}), 0)`,
      totalFiber: sql<number>`COALESCE(SUM(${schema.nutritionLog.fiberG}), 0)`,
      mealCount: sql<number>`COUNT(*)`,
    }).from(schema.nutritionLog).where(eq(schema.nutritionLog.date, today)),

    // Body metrics (weight) for today
    db.select().from(schema.bodyMetrics).where(eq(schema.bodyMetrics.date, today)).limit(1),

    // Current nutrition targets (most recent)
    db.select().from(schema.nutritionTargets).orderBy(desc(schema.nutritionTargets.effectiveDate)).limit(1),

    // Active training phase
    db.select().from(schema.trainingPhases).where(eq(schema.trainingPhases.status, "active")).limit(1),

    // User profile (for sobriety date)
    db.select().from(schema.userProfile).limit(1),
  ]);

  const dailyLog = dailyLogRows[0] ?? null;
  const sleep = sleepRows[0] ?? null;
  const weight = weightRows[0] ?? null;
  const nutrition = nutritionTotals[0] ?? null;
  const targets = nutritionTargetRows[0] ?? null;
  const profile = userProfileRows[0] ?? null;

  const mealCount = Number(nutrition?.mealCount ?? 0);
  const totalProtein = Number(nutrition?.totalProtein ?? 0);
  const totalCalories = Number(nutrition?.totalCalories ?? 0);
  const proteinTarget = targets?.proteinMin ?? 0;

  // Supplement breakdown by time of day
  const morningSupps = supplementRows.filter((s) => s.timeOfDay === "morning");
  const eveningSupps = supplementRows.filter((s) => s.timeOfDay === "dinner" || s.timeOfDay === "evening");
  const bedSupps = supplementRows.filter((s) => s.timeOfDay === "before_bed");

  const morningTaken = morningSupps.filter((s) => s.taken === 1).length;
  const eveningTaken = eveningSupps.filter((s) => s.taken === 1).length;
  const bedTaken = bedSupps.filter((s) => s.taken === 1).length;

  const items: ActionItem[] = [];
  let priorityCounter = 1;

  // -------------------------------------------------------------------------
  // Morning items (before 12 ET)
  // -------------------------------------------------------------------------
  if (etHour < 12) {
    // Log your weight
    items.push({
      id: "morning-weight",
      priority: priorityCounter++,
      type: "weight",
      title: "Log your weight",
      status: weight ? "completed" : "pending",
      timeWindow: "morning",
      component: "WeightForm",
      data: weight ? { weight: weight.weight } : undefined,
    });

    // Morning supplements
    items.push({
      id: "morning-supplements",
      priority: priorityCounter++,
      type: "supplements",
      title: "Morning supplements",
      subtitle: morningSupps.length > 0
        ? `${morningTaken}/${morningSupps.length} taken`
        : undefined,
      status: morningSupps.length > 0 && morningTaken === morningSupps.length ? "completed" : "pending",
      timeWindow: "morning",
      component: "SupplementChecklist",
      data: { timeOfDay: "morning", taken: morningTaken, total: morningSupps.length },
    });

    // Morning walk
    items.push({
      id: "morning-walk",
      priority: priorityCounter++,
      type: "walk",
      title: "Morning walk",
      status: dailyLog?.morningWalk === 1 ? "completed" : "pending",
      timeWindow: "morning",
      component: "MorningWalkToggle",
      data: dailyLog ? { duration: dailyLog.walkDurationMinutes } : undefined,
    });

    // Log vitals
    items.push({
      id: "morning-vitals",
      priority: priorityCounter++,
      type: "vitals",
      title: "Log vitals",
      status: vitalsRows.length > 0 ? "completed" : "pending",
      timeWindow: "morning",
      component: "VitalsForm",
    });
  }

  // -------------------------------------------------------------------------
  // Midday items (12-17 ET)
  // -------------------------------------------------------------------------
  if (etHour >= 12 && etHour < 17) {
    // Log lunch
    items.push({
      id: "midday-lunch",
      priority: priorityCounter++,
      type: "meal",
      title: "Log lunch",
      status: mealCount >= 2 ? "completed" : "pending",
      timeWindow: "midday",
      component: "MealLogForm",
      data: { mealType: "lunch", mealCount },
    });

    // Protein check
    items.push({
      id: "midday-protein",
      priority: priorityCounter++,
      type: "meal",
      title: "Protein check",
      subtitle: `${Math.round(totalProtein)}g / ${proteinTarget}g`,
      status: totalProtein >= proteinTarget ? "completed" : "pending",
      timeWindow: "midday",
      component: "ProteinProgress",
      data: {
        current: Math.round(totalProtein),
        target: proteinTarget,
        calories: Math.round(totalCalories),
      },
    });

    // Training day workout (Tue/Thu/Sat only)
    if (isTrainingDay) {
      items.push({
        id: "midday-workout",
        priority: priorityCounter++,
        type: "workout",
        title: "Training day workout",
        subtitle: dayOfWeek,
        status: workoutRows.length > 0 ? "completed" : "pending",
        timeWindow: "midday",
        component: "WorkoutLogForm",
        data: trainingPhaseRows[0]
          ? { phaseId: trainingPhaseRows[0].id, phaseName: trainingPhaseRows[0].phaseName }
          : undefined,
      });
    }
  }

  // -------------------------------------------------------------------------
  // Evening items (17-22 ET)
  // -------------------------------------------------------------------------
  if (etHour >= 17 && etHour < 22) {
    // Log dinner
    items.push({
      id: "evening-dinner",
      priority: priorityCounter++,
      type: "meal",
      title: "Log dinner",
      status: mealCount >= 3 ? "completed" : "pending",
      timeWindow: "evening",
      component: "MealLogForm",
      data: { mealType: "dinner", mealCount },
    });

    // Evening supplements
    items.push({
      id: "evening-supplements",
      priority: priorityCounter++,
      type: "supplements",
      title: "Evening supplements",
      subtitle: eveningSupps.length > 0
        ? `${eveningTaken}/${eveningSupps.length} taken`
        : undefined,
      status: eveningSupps.length > 0 && eveningTaken === eveningSupps.length ? "completed" : "pending",
      timeWindow: "evening",
      component: "SupplementChecklist",
      data: { timeOfDay: "evening", taken: eveningTaken, total: eveningSupps.length },
    });

    // Daily check-in
    items.push({
      id: "evening-checkin",
      priority: priorityCounter++,
      type: "checkin",
      title: "Daily check-in",
      subtitle: dailyLog?.energy != null ? "Energy & mood logged" : "How are you feeling?",
      status: dailyLog?.energy != null && dailyLog?.mood != null ? "completed" : "pending",
      timeWindow: "evening",
      component: "DailyCheckinForm",
    });
  }

  // -------------------------------------------------------------------------
  // Night items (22+ ET)
  // -------------------------------------------------------------------------
  if (etHour >= 22) {
    // Log sleep
    items.push({
      id: "night-sleep",
      priority: priorityCounter++,
      type: "sleep",
      title: "Log sleep",
      status: sleep ? "completed" : "pending",
      timeWindow: "night",
      component: "SleepLogForm",
    });

    // Before bed supplements
    items.push({
      id: "night-supplements",
      priority: priorityCounter++,
      type: "supplements",
      title: "Before bed supplements",
      subtitle: bedSupps.length > 0
        ? `${bedTaken}/${bedSupps.length} taken`
        : undefined,
      status: bedSupps.length > 0 && bedTaken === bedSupps.length ? "completed" : "pending",
      timeWindow: "night",
      component: "SupplementChecklist",
      data: { timeOfDay: "before_bed", taken: bedTaken, total: bedSupps.length },
    });
  }

  // -------------------------------------------------------------------------
  // Anytime items
  // -------------------------------------------------------------------------
  if (profile?.sobrietyStartDate) {
    const sobrietyStart = new Date(profile.sobrietyStartDate);
    const now = new Date(today);
    const diffMs = now.getTime() - sobrietyStart.getTime();
    const sobrietyDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    items.push({
      id: "anytime-sobriety",
      priority: 999, // always at end
      type: "motivation",
      title: `${sobrietyDays} days sober`,
      subtitle: "Keep going, David. Every day counts.",
      status: "completed",
      timeWindow: "anytime",
      component: "SobrietyCounter",
      data: { days: sobrietyDays, startDate: profile.sobrietyStartDate },
    });
  }

  // -------------------------------------------------------------------------
  // Sort: pending items first by priority, then completed items
  // -------------------------------------------------------------------------
  items.sort((a, b) => {
    if (a.status === "pending" && b.status === "completed") return -1;
    if (a.status === "completed" && b.status === "pending") return 1;
    return a.priority - b.priority;
  });

  return success(items);
});
