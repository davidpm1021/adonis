export const dynamic = "force-dynamic";

import { db } from "@/db";
import { eq, desc, gte, sql } from "drizzle-orm";
import * as schema from "@/db/schema";
import { PageHeader } from "@/components/layout/page-header";
import { MetricsSnapshot } from "@/components/dashboard/metrics-snapshot";
import { StreakCalendar } from "@/components/dashboard/streak-calendar";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { PhaseStatus } from "@/components/dashboard/phase-status";
import { WeeklyReportWidget } from "@/components/dashboard/weekly-report-widget";
import { DashboardStreakHub } from "@/components/dashboard/streaks/dashboard-streak-hub";
import { ActionQueue } from "@/components/dashboard/action-queue";
import { NudgeCards } from "@/components/dashboard/nudge-cards";
import {
  calculateSobriety,
  calculateMoneySaved,
  calculateCaloriesAvoided,
  getSobrietyHealthBenefit,
  calculateNutritionTotals,
  calculateConsistency,
} from "@/lib/calculations";

export default async function DashboardPage() {
  // Today in Eastern Time
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });

  // 30 days ago for streak/consistency queries
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toLocaleDateString("en-CA", { timeZone: "America/New_York" });

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toLocaleDateString("en-CA", { timeZone: "America/New_York" });

  // ---------------------------------------------------------------------------
  // Fetch all data in parallel
  // ---------------------------------------------------------------------------
  const [
    profileRows,
    todayLogRows,
    latestWeightRows,
    previousWeightRows,
    todayMeals,
    nutritionTargetRows,
    activePhaseRows,
    last30Logs,
    last7Logs,
    latestReportRows,
  ] = await Promise.all([
    // 1. User profile
    db.select().from(schema.userProfile).where(eq(schema.userProfile.id, 1)).limit(1),

    // 2. Today's daily log
    db.select().from(schema.dailyLog).where(eq(schema.dailyLog.date, today)).limit(1),

    // 3. Latest body metrics (for current weight)
    db.select().from(schema.bodyMetrics).orderBy(desc(schema.bodyMetrics.date)).limit(1),

    // 4. Previous body metrics (for trend delta)
    db.select().from(schema.bodyMetrics).orderBy(desc(schema.bodyMetrics.date)).limit(2),

    // 5. Today's nutrition entries
    db.select().from(schema.nutritionLog).where(eq(schema.nutritionLog.date, today)),

    // 6. Current nutrition targets (latest effective)
    db
      .select()
      .from(schema.nutritionTargets)
      .where(sql`${schema.nutritionTargets.effectiveDate} <= ${today}`)
      .orderBy(desc(schema.nutritionTargets.effectiveDate))
      .limit(1),

    // 7. Active training phase
    db
      .select()
      .from(schema.trainingPhases)
      .where(eq(schema.trainingPhases.status, "active"))
      .limit(1),

    // 8. Last 30 days of daily logs (for streak calendar + consistency)
    db
      .select()
      .from(schema.dailyLog)
      .where(gte(schema.dailyLog.date, thirtyDaysAgoStr))
      .orderBy(schema.dailyLog.date),

    // 9. Last 7 days of daily logs (for 7-day consistency)
    db
      .select()
      .from(schema.dailyLog)
      .where(gte(schema.dailyLog.date, sevenDaysAgoStr))
      .orderBy(schema.dailyLog.date),

    // 10. Latest weekly report
    db
      .select()
      .from(schema.weeklyReports)
      .orderBy(desc(schema.weeklyReports.weekStart))
      .limit(1),
  ]);

  // ---------------------------------------------------------------------------
  // Process data
  // ---------------------------------------------------------------------------
  const profile = profileRows[0] ?? null;
  const todayLog = todayLogRows[0] ?? null;
  const latestWeight = latestWeightRows[0]?.weight ?? null;
  const previousWeight =
    previousWeightRows.length >= 2 ? previousWeightRows[1].weight : null;
  const startingWeight = profile?.startingWeight ?? 225;

  // Sobriety
  const sobrietyStartDate = profile?.sobrietyStartDate ?? "2025-02-23";
  const sobriety = calculateSobriety(sobrietyStartDate);
  const moneySaved = calculateMoneySaved(
    sobriety.days,
    profile?.weeklyAlcoholSpend ?? 75
  );
  const caloriesAvoided = calculateCaloriesAvoided(
    sobriety.days,
    profile?.weeklyAlcoholCalories ?? 2500
  );
  const healthBenefit = getSobrietyHealthBenefit(sobriety.days);

  // Rest day logic
  const todayDate = new Date(today + "T12:00:00");
  const dayOfWeek = todayDate.getDay();
  const trainingDays = [2, 4, 6]; // Tue, Thu, Sat
  const isRestDay = !trainingDays.includes(dayOfWeek);

  // Nutrition totals for today
  const todayNutrition = calculateNutritionTotals(todayMeals);
  const nutritionTargets = nutritionTargetRows[0] ?? null;
  const proteinMin = nutritionTargets?.proteinMin ?? 160;

  // Today's behavior completion status for TodaysProgress
  const todayBehaviors = [
    {
      key: "dailyLog",
      label: "Daily Log",
      done: todayLog !== null,
      href: "/daily-log",
    },
    {
      key: "morningWalk",
      label: "Morning Walk",
      done: (todayLog?.morningWalk ?? 0) === 1,
      href: "/daily-log",
    },
    {
      key: "strengthTraining",
      label: "Training",
      done: isRestDay ? true : (todayLog?.strengthTraining ?? 0) === 1,
      href: "/training",
      restDay: isRestDay,
    },
    {
      key: "proteinTarget",
      label: "Protein Goal",
      done: todayNutrition.protein >= proteinMin,
      href: "/nutrition",
    },
    {
      key: "supplementsTaken",
      label: "Supplements",
      done: (todayLog?.supplementsTaken ?? 0) === 1,
      href: "/supplements",
    },
    {
      key: "alcoholFree",
      label: "Alcohol-Free",
      done: (todayLog?.alcoholFree ?? 1) === 1,
      href: "/daily-log",
    },
    {
      key: "sleepLogged",
      label: "Sleep Logged",
      done: false, // Will be checked client-side via streaks API
      href: "/sleep",
    },
  ];

  // Consistency
  const consistency30d = calculateConsistency(
    last30Logs.map((l) => ({
      date: l.date,
      morningWalk: l.morningWalk ?? 0,
      strengthTraining: l.strengthTraining ?? 0,
      ateLunchWithProtein: l.ateLunchWithProtein ?? 0,
      mobilityWork: l.mobilityWork ?? 0,
      supplementsTaken: l.supplementsTaken ?? 0,
    })),
    30
  );
  const consistency7d = calculateConsistency(
    last7Logs.map((l) => ({
      date: l.date,
      morningWalk: l.morningWalk ?? 0,
      strengthTraining: l.strengthTraining ?? 0,
      ateLunchWithProtein: l.ateLunchWithProtein ?? 0,
      mobilityWork: l.mobilityWork ?? 0,
      supplementsTaken: l.supplementsTaken ?? 0,
    })),
    7
  );

  // Streak calendar data
  const streakDays = last30Logs.map((log) => {
    const completed =
      (log.morningWalk ?? 0) +
      (log.strengthTraining ?? 0) +
      (log.ateLunchWithProtein ?? 0) +
      (log.mobilityWork ?? 0) +
      (log.supplementsTaken ?? 0);
    return {
      date: log.date,
      completedCount: completed,
      total: 5,
    };
  });

  // Training phase
  const activePhase = activePhaseRows[0] ?? null;

  // Latest weekly report
  const latestReport = latestReportRows[0] ?? null;

  // Greeting based on time of day
  const etHour = parseInt(
    new Date().toLocaleTimeString("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      hour12: false,
    }),
    10
  );
  const greeting =
    etHour < 12 ? "Good morning" : etHour < 17 ? "Good afternoon" : "Good evening";
  const userName = profile?.name ? `, ${profile.name.split(" ")[0]}` : "";
  const dayFormatted = new Date(today + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div>
      <PageHeader
        title={`${greeting}${userName}.`}
        subtitle={dayFormatted}
      />

      {/* AI Nudges — contextual daily insights */}
      <NudgeCards />

      {/* Action Queue — contextual "what to do next" */}
      <div className="mb-4">
        <ActionQueue />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Streak Hub — client component that fetches streaks and renders
            StreakHero + TodaysProgress + StreakCardsGrid + CelebrationModal */}
        <DashboardStreakHub
          initialBehaviors={todayBehaviors}
          sobrietyDays={sobriety.days}
          moneySaved={moneySaved}
          caloriesAvoided={caloriesAvoided}
          healthBenefit={healthBenefit}
        />

        {/* Row 3: 2-3 column grid */}
        <MetricsSnapshot
          currentWeight={latestWeight}
          startingWeight={startingWeight}
          previousWeight={previousWeight}
          todayNutrition={todayNutrition}
          nutritionTargets={
            nutritionTargets
              ? {
                  caloriesMin: nutritionTargets.caloriesMin,
                  caloriesMax: nutritionTargets.caloriesMax,
                  proteinMin: nutritionTargets.proteinMin,
                  proteinMax: nutritionTargets.proteinMax,
                  carbsMin: nutritionTargets.carbsMin,
                  carbsMax: nutritionTargets.carbsMax,
                  fatMin: nutritionTargets.fatMin,
                  fatMax: nutritionTargets.fatMax,
                  fiberMin: nutritionTargets.fiberMin,
                  fiberMax: nutritionTargets.fiberMax,
                }
              : null
          }
          consistency7d={consistency7d}
          consistency30d={consistency30d}
        />

        <StreakCalendar days={streakDays} />

        <QuickActions />

        <PhaseStatus
          phase={
            activePhase
              ? {
                  phaseName: activePhase.phaseName,
                  phaseNumber: activePhase.phaseNumber,
                  startDate: activePhase.startDate,
                  endDate: activePhase.endDate,
                }
              : null
          }
          today={today}
        />

        <WeeklyReportWidget
          report={
            latestReport
              ? {
                  weekStart: latestReport.weekStart,
                  weekEnd: latestReport.weekEnd,
                  reportContent: latestReport.reportContent,
                  createdAt: latestReport.createdAt,
                }
              : null
          }
        />
      </div>
    </div>
  );
}
