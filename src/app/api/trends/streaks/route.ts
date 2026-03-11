export const dynamic = 'force-dynamic';

import { db } from "@/db";
import * as schema from "@/db/schema";
import { asc, eq, sql, desc } from "drizzle-orm";
import { success, withErrorHandling, todayET, nowISO } from "@/lib/api";
import {
  calculateStreak,
  calculateDailyLogStreak,
  calculateProteinStreak,
  calculateSleepLoggedStreak,
  calculateOverallStreak,
  applyStreakFreezes,
} from "@/lib/calculations";
import { STREAK_MILESTONES } from "@/lib/constants";

// GET /api/trends/streaks — Calculate current and best streaks for all behaviors
export const GET = withErrorHandling(async () => {
  const today = todayET();
  const now = nowISO();

  const [logs, sleepLogs, nutritionByDate, targets, freezes] =
    await Promise.all([
      // Daily logs for behavior streaks
      db
        .select()
        .from(schema.dailyLog)
        .orderBy(asc(schema.dailyLog.date)),

      // Sleep logs for sleep streak
      db
        .select({ date: schema.sleepLog.date })
        .from(schema.sleepLog)
        .orderBy(asc(schema.sleepLog.date)),

      // Nutrition aggregated by date for protein streak
      db
        .select({
          date: schema.nutritionLog.date,
          totalProtein: sql<number>`sum(${schema.nutritionLog.proteinG})`,
        })
        .from(schema.nutritionLog)
        .groupBy(schema.nutritionLog.date)
        .orderBy(asc(schema.nutritionLog.date)),

      // Current nutrition targets (for protein goal)
      db
        .select()
        .from(schema.nutritionTargets)
        .where(sql`${schema.nutritionTargets.effectiveDate} <= ${today}`)
        .orderBy(desc(schema.nutritionTargets.effectiveDate))
        .limit(1),

      // Streak freezes
      db.select().from(schema.streakFreezes),
    ]);

  const proteinMin = targets[0]?.proteinMin ?? 160;

  // Original behavior streaks from daily_log fields
  const behaviorFields = [
    "morningWalk",
    "strengthTraining",
    "supplementsTaken",
    "alcoholFree",
  ] as const;

  type FieldKey = (typeof behaviorFields)[number];

  const streaks: Record<
    string,
    { current: number; best: number; todayComplete: boolean }
  > = {};

  for (const field of behaviorFields) {
    let dates = logs.map((log) => ({
      date: log.date,
      value: (log[field as FieldKey] as number) === 1,
    }));

    // Apply freezes
    dates = applyStreakFreezes(dates, freezes, field);

    const result = calculateStreak(dates);
    const todayLog = logs.find((l) => l.date === today);
    const todayComplete = todayLog
      ? (todayLog[field as FieldKey] as number) === 1
      : false;

    streaks[field] = { ...result, todayComplete };
  }

  // Daily log streak
  const logDates = logs.map((l) => l.date);
  const dailyLogResult = calculateDailyLogStreak(logDates);
  const dailyLogTodayComplete = logs.some((l) => l.date === today);
  streaks.dailyLog = { ...dailyLogResult, todayComplete: dailyLogTodayComplete };

  // Protein target streak
  const proteinResult = calculateProteinStreak(
    nutritionByDate.map((r) => ({
      date: r.date,
      totalProtein: r.totalProtein ?? 0,
    })),
    proteinMin
  );
  const todayProtein = nutritionByDate.find((r) => r.date === today);
  const proteinTodayComplete =
    (todayProtein?.totalProtein ?? 0) >= proteinMin;
  streaks.proteinTarget = {
    ...proteinResult,
    todayComplete: proteinTodayComplete,
  };

  // Sleep logged streak
  const sleepDates = sleepLogs.map((l) => l.date);
  const sleepResult = calculateSleepLoggedStreak(sleepDates);
  const sleepTodayComplete = sleepDates.includes(today);
  streaks.sleepLogged = { ...sleepResult, todayComplete: sleepTodayComplete };

  // Overall consistency streak (80%+ of 7 behaviors per day)
  const dailyScores = logs.map((log) => {
    const todayLog = log;
    let completed = 0;
    let total = 7;

    if ((todayLog.morningWalk ?? 0) === 1) completed++;
    if ((todayLog.strengthTraining ?? 0) === 1) completed++;
    if ((todayLog.supplementsTaken ?? 0) === 1) completed++;
    if ((todayLog.alcoholFree ?? 0) === 1) completed++;

    // Check protein for this date
    const proteinEntry = nutritionByDate.find(
      (n) => n.date === todayLog.date
    );
    if ((proteinEntry?.totalProtein ?? 0) >= proteinMin) completed++;

    // Check sleep for this date
    if (sleepDates.includes(todayLog.date)) completed++;

    // Daily log itself counts (it exists)
    completed++;

    return {
      date: todayLog.date,
      completedCount: completed,
      totalCount: total,
    };
  });

  const overallResult = calculateOverallStreak(dailyScores);
  const todayScore = dailyScores.find((s) => s.date === today);
  const overallTodayComplete = todayScore
    ? todayScore.completedCount / todayScore.totalCount >= 0.8
    : false;
  streaks.overall = { ...overallResult, todayComplete: overallTodayComplete };

  // Freeze info
  const monthStart = today.slice(0, 7) + "-01";
  const monthEnd = today.slice(0, 7) + "-31";
  const monthFreezes = freezes.filter(
    (f) => f.date >= monthStart && f.date <= monthEnd
  );

  // Check for new milestones and record them
  const existingMilestones = await db
    .select()
    .from(schema.streakMilestones);

  const existingSet = new Set(
    existingMilestones.map((m) => `${m.streakType}:${m.milestone}`)
  );

  for (const [streakType, streakData] of Object.entries(streaks)) {
    for (const milestone of STREAK_MILESTONES) {
      if (
        streakData.current >= milestone &&
        !existingSet.has(`${streakType}:${milestone}`)
      ) {
        await db
          .insert(schema.streakMilestones)
          .values({
            streakType,
            milestone,
            achievedDate: today,
            celebrated: 0,
            createdAt: now,
          })
          .run();
      }
    }
  }

  // Get uncelebrated milestones
  const uncelebrated = await db
    .select()
    .from(schema.streakMilestones)
    .where(eq(schema.streakMilestones.celebrated, 0));

  return success({
    streaks,
    freezesUsedThisMonth: monthFreezes.length,
    freezesAvailable: Math.max(0, 2 - monthFreezes.length),
    uncelebratedMilestones: uncelebrated,
  });
});
