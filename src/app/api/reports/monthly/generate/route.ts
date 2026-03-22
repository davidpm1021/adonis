export const dynamic = 'force-dynamic';

import { db } from "@/db";
import * as schema from "@/db/schema";
import { desc, gte, lte, and, eq, sql } from "drizzle-orm";
import { success, error, withErrorHandling, nowISO, todayET } from "@/lib/api";
import { getAnthropicClient, getModel, logAIUsage } from "@/lib/ai";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get the first day of the current month in ET */
function getCurrentMonthStart(): string {
  const today = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
  );
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
}

/** Get the last day of the current month in ET */
function getCurrentMonthEnd(): string {
  const today = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
  );
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return lastDay.toLocaleDateString("en-CA");
}

/** Get a date N days ago in ET as YYYY-MM-DD */
function daysAgo(n: number): string {
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
  );
  now.setDate(now.getDate() - n);
  return now.toLocaleDateString("en-CA");
}

/** Safe JSON parse helper */
function safeJsonParse<T>(val: string | null | undefined, fallback: T): T {
  if (!val) return fallback;
  try {
    return JSON.parse(val) as T;
  } catch {
    return fallback;
  }
}

/** Round to 1 decimal */
function r1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ---------------------------------------------------------------------------
// POST /api/reports/monthly/generate
// ---------------------------------------------------------------------------
export const POST = withErrorHandling(async () => {
  const monthStart = getCurrentMonthStart();
  const monthEnd = getCurrentMonthEnd();

  // ------------------------------------------------------------------
  // 1. Check if a report for this month already exists
  // ------------------------------------------------------------------
  const existing = (await db
    .select()
    .from(schema.monthlyReports)
    .where(eq(schema.monthlyReports.monthStart, monthStart)))[0];

  if (existing) {
    return success({
      report: existing,
      cached: true,
      message: "Report for this month already exists.",
    });
  }

  // ------------------------------------------------------------------
  // 2. Verify API key is configured
  // ------------------------------------------------------------------
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your-api-key-here") {
    return error(
      "Monthly report generation requires an ANTHROPIC_API_KEY. Set it in .env.local to enable this feature.",
      503,
    );
  }

  // ------------------------------------------------------------------
  // 3. Gather data from the past 30 days
  // ------------------------------------------------------------------
  const thirtyDaysAgoStr = daysAgo(30);
  const todayStr = todayET();

  const [
    dailyLogs,
    bodyMetricsRows,
    nutritionRows,
    nutritionTargetRows,
    workoutRows,
    exerciseRows,
    sleepRows,
    supplementRows,
    vitalsRows,
    labRows,
    activeGoals,
    activePhase,
  ] = await Promise.all([
    // Daily logs
    db
      .select()
      .from(schema.dailyLog)
      .where(and(gte(schema.dailyLog.date, thirtyDaysAgoStr), lte(schema.dailyLog.date, todayStr)))
      .orderBy(schema.dailyLog.date),

    // Body metrics
    db
      .select()
      .from(schema.bodyMetrics)
      .where(and(gte(schema.bodyMetrics.date, thirtyDaysAgoStr), lte(schema.bodyMetrics.date, todayStr)))
      .orderBy(schema.bodyMetrics.date),

    // Nutrition logs
    db
      .select()
      .from(schema.nutritionLog)
      .where(and(gte(schema.nutritionLog.date, thirtyDaysAgoStr), lte(schema.nutritionLog.date, todayStr)))
      .orderBy(schema.nutritionLog.date),

    // Nutrition targets (latest effective)
    db
      .select()
      .from(schema.nutritionTargets)
      .where(sql`${schema.nutritionTargets.effectiveDate} <= ${todayStr}`)
      .orderBy(desc(schema.nutritionTargets.effectiveDate))
      .limit(1),

    // Workouts
    db
      .select()
      .from(schema.workouts)
      .where(and(gte(schema.workouts.date, thirtyDaysAgoStr), lte(schema.workouts.date, todayStr)))
      .orderBy(schema.workouts.date),

    // Exercises (all, we'll filter by workout IDs)
    db.select().from(schema.exercises),

    // Sleep logs
    db
      .select()
      .from(schema.sleepLog)
      .where(and(gte(schema.sleepLog.date, thirtyDaysAgoStr), lte(schema.sleepLog.date, todayStr)))
      .orderBy(schema.sleepLog.date),

    // Supplement logs
    db
      .select()
      .from(schema.supplementLog)
      .where(and(gte(schema.supplementLog.date, thirtyDaysAgoStr), lte(schema.supplementLog.date, todayStr)))
      .orderBy(schema.supplementLog.date),

    // Vitals
    db
      .select()
      .from(schema.vitalsLog)
      .where(and(gte(schema.vitalsLog.date, thirtyDaysAgoStr), lte(schema.vitalsLog.date, todayStr)))
      .orderBy(desc(schema.vitalsLog.date)),

    // Lab results (within the month)
    db
      .select()
      .from(schema.labResults)
      .where(and(gte(schema.labResults.date, thirtyDaysAgoStr), lte(schema.labResults.date, todayStr)))
      .orderBy(schema.labResults.date),

    // Active goals
    db
      .select()
      .from(schema.goals)
      .where(eq(schema.goals.status, "active")),

    // Active training phase
    db
      .select()
      .from(schema.trainingPhases)
      .where(eq(schema.trainingPhases.status, "active"))
      .limit(1),
  ]);

  // ------------------------------------------------------------------
  // 4. Process and summarize data for the prompt
  // ------------------------------------------------------------------

  // --- Daily Logs Summary ---
  const daysLogged = dailyLogs.length;
  const avgEnergy =
    dailyLogs.filter((l) => l.energy != null).length > 0
      ? r1(
          dailyLogs.filter((l) => l.energy != null).reduce((s, l) => s + (l.energy ?? 0), 0) /
            dailyLogs.filter((l) => l.energy != null).length,
        )
      : null;
  const avgMood =
    dailyLogs.filter((l) => l.mood != null).length > 0
      ? r1(
          dailyLogs.filter((l) => l.mood != null).reduce((s, l) => s + (l.mood ?? 0), 0) /
            dailyLogs.filter((l) => l.mood != null).length,
        )
      : null;
  const avgStress =
    dailyLogs.filter((l) => l.stress != null).length > 0
      ? r1(
          dailyLogs.filter((l) => l.stress != null).reduce((s, l) => s + (l.stress ?? 0), 0) /
            dailyLogs.filter((l) => l.stress != null).length,
        )
      : null;

  const nonNegotiableCompletion = daysLogged > 0
    ? {
        morningWalk: r1((dailyLogs.filter((l) => l.morningWalk === 1).length / daysLogged) * 100),
        strengthTraining: r1((dailyLogs.filter((l) => l.strengthTraining === 1).length / daysLogged) * 100),
        lunchWithProtein: r1((dailyLogs.filter((l) => l.ateLunchWithProtein === 1).length / daysLogged) * 100),
        mobilityWork: r1((dailyLogs.filter((l) => l.mobilityWork === 1).length / daysLogged) * 100),
        supplements: r1((dailyLogs.filter((l) => l.supplementsTaken === 1).length / daysLogged) * 100),
      }
    : null;

  const alcoholFreeDays = dailyLogs.filter((l) => l.alcoholFree === 1).length;
  const allAlcoholFree = alcoholFreeDays === daysLogged;

  // Collect wins, struggles, notes
  const wins = dailyLogs.filter((l) => l.wins).map((l) => `${l.date}: ${l.wins}`);
  const struggles = dailyLogs.filter((l) => l.struggles).map((l) => `${l.date}: ${l.struggles}`);

  // --- Body Metrics ---
  const weights = bodyMetricsRows.filter((m) => m.weight != null).map((m) => m.weight!);
  const startWeight = weights.length > 0 ? weights[0] : null;
  const endWeight = weights.length > 0 ? weights[weights.length - 1] : null;
  const avgWeight = weights.length > 0 ? r1(weights.reduce((s, w) => s + w, 0) / weights.length) : null;
  const weightChange = startWeight != null && endWeight != null ? r1(endWeight - startWeight) : null;

  // --- Nutrition ---
  const nutritionByDate: Record<string, { calories: number; protein: number; carbs: number; fat: number; fiber: number }> = {};
  for (const entry of nutritionRows) {
    if (!nutritionByDate[entry.date]) {
      nutritionByDate[entry.date] = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
    }
    nutritionByDate[entry.date].calories += entry.calories ?? 0;
    nutritionByDate[entry.date].protein += entry.proteinG ?? 0;
    nutritionByDate[entry.date].carbs += entry.carbsG ?? 0;
    nutritionByDate[entry.date].fat += entry.fatG ?? 0;
    nutritionByDate[entry.date].fiber += entry.fiberG ?? 0;
  }

  const nutritionDays = Object.values(nutritionByDate);
  const avgCalories = nutritionDays.length > 0 ? Math.round(nutritionDays.reduce((s, d) => s + d.calories, 0) / nutritionDays.length) : null;
  const avgProtein = nutritionDays.length > 0 ? Math.round(nutritionDays.reduce((s, d) => s + d.protein, 0) / nutritionDays.length) : null;
  const avgCarbs = nutritionDays.length > 0 ? Math.round(nutritionDays.reduce((s, d) => s + d.carbs, 0) / nutritionDays.length) : null;
  const avgFat = nutritionDays.length > 0 ? Math.round(nutritionDays.reduce((s, d) => s + d.fat, 0) / nutritionDays.length) : null;
  const avgFiber = nutritionDays.length > 0 ? Math.round(nutritionDays.reduce((s, d) => s + d.fiber, 0) / nutritionDays.length) : null;

  const nutritionTarget = nutritionTargetRows[0] ?? null;

  // --- Workouts ---
  const workoutsCompleted = workoutRows.filter((w) => w.completed === 1).length;
  const totalWorkouts = workoutRows.length;

  const workoutIds = new Set(workoutRows.map((w) => w.id));
  const monthExercises = exerciseRows.filter((e) => workoutIds.has(e.workoutId));

  const workoutSummaries = workoutRows.map((w) => {
    const exs = monthExercises.filter((e) => e.workoutId === w.id);
    return {
      date: w.date,
      type: w.workoutType,
      duration: w.durationMinutes,
      rpe: w.rpe,
      completed: w.completed === 1,
      exerciseCount: exs.length,
    };
  });

  // Workout frequency by type
  const workoutTypes: Record<string, number> = {};
  for (const w of workoutRows) {
    workoutTypes[w.workoutType] = (workoutTypes[w.workoutType] ?? 0) + 1;
  }

  // --- Sleep ---
  const sleepHours = sleepRows.filter((s) => s.totalHours != null).map((s) => s.totalHours!);
  const avgSleepHours = sleepHours.length > 0 ? r1(sleepHours.reduce((s, h) => s + h, 0) / sleepHours.length) : null;
  const sleepQualities = sleepRows.filter((s) => s.sleepQuality != null).map((s) => s.sleepQuality!);
  const avgSleepQuality = sleepQualities.length > 0 ? r1(sleepQualities.reduce((s, q) => s + q, 0) / sleepQualities.length) : null;
  const bipapDays = sleepRows.filter((s) => s.bipapUsed === 1).length;
  const bipapCompliance = sleepRows.length > 0 ? r1((bipapDays / sleepRows.length) * 100) : null;

  // --- Supplements ---
  const totalSupplementEntries = supplementRows.length;
  const takenCount = supplementRows.filter((s) => s.taken === 1).length;
  const supplementCompliance = totalSupplementEntries > 0 ? r1((takenCount / totalSupplementEntries) * 100) : null;

  // --- Vitals ---
  const latestVitals = vitalsRows.length > 0 ? vitalsRows[0] : null;
  const avgSystolic = vitalsRows.filter((v) => v.systolic != null).length > 0
    ? Math.round(vitalsRows.filter((v) => v.systolic != null).reduce((s, v) => s + (v.systolic ?? 0), 0) / vitalsRows.filter((v) => v.systolic != null).length)
    : null;
  const avgDiastolic = vitalsRows.filter((v) => v.diastolic != null).length > 0
    ? Math.round(vitalsRows.filter((v) => v.diastolic != null).reduce((s, v) => s + (v.diastolic ?? 0), 0) / vitalsRows.filter((v) => v.diastolic != null).length)
    : null;

  // --- Labs ---
  const labSummary = labRows.map((l) => `${l.testName}: ${l.value} ${l.unit} (${l.date})${l.flag ? ` [${l.flag}]` : ""}`);

  // --- Training Phase ---
  const phase = activePhase.length > 0 ? activePhase[0] : null;

  // ------------------------------------------------------------------
  // 5. Build the structured prompt
  // ------------------------------------------------------------------
  const dataSection = `
## Data Summary for ${monthStart} to ${monthEnd} (30-day period)

### Daily Logs (${daysLogged} days logged out of 30)
- Average Energy: ${avgEnergy ?? "N/A"}/10
- Average Mood: ${avgMood ?? "N/A"}/10
- Average Stress: ${avgStress ?? "N/A"}/10
- Alcohol-Free Days: ${alcoholFreeDays}/${daysLogged}${allAlcoholFree ? " (100% sober)" : ""}
${nonNegotiableCompletion ? `
- Non-Negotiable Completion Rates:
  - Morning Walk: ${nonNegotiableCompletion.morningWalk}%
  - Strength Training: ${nonNegotiableCompletion.strengthTraining}%
  - Lunch with Protein: ${nonNegotiableCompletion.lunchWithProtein}%
  - Mobility Work: ${nonNegotiableCompletion.mobilityWork}%
  - Supplements: ${nonNegotiableCompletion.supplements}%` : ""}
${wins.length > 0 ? `\n- Notable Wins:\n${wins.slice(0, 10).map((w) => `  - ${w}`).join("\n")}` : ""}
${struggles.length > 0 ? `\n- Notable Struggles:\n${struggles.slice(0, 10).map((s) => `  - ${s}`).join("\n")}` : ""}

### Body Metrics
- Weight entries: ${weights.length}
${startWeight != null ? `- Start of period weight: ${startWeight} lbs` : ""}
${endWeight != null ? `- End of period weight: ${endWeight} lbs` : ""}
${weightChange != null ? `- Weight change: ${weightChange > 0 ? "+" : ""}${weightChange} lbs` : ""}
${avgWeight != null ? `- Average weight: ${avgWeight} lbs` : ""}

### Nutrition (${nutritionDays.length} days tracked)
- Average Daily Calories: ${avgCalories ?? "N/A"} kcal
- Average Daily Protein: ${avgProtein ?? "N/A"}g
- Average Daily Carbs: ${avgCarbs ?? "N/A"}g
- Average Daily Fat: ${avgFat ?? "N/A"}g
- Average Daily Fiber: ${avgFiber ?? "N/A"}g
${nutritionTarget ? `
- Targets: ${nutritionTarget.caloriesMin}-${nutritionTarget.caloriesMax} kcal, ${nutritionTarget.proteinMin}-${nutritionTarget.proteinMax}g protein, ${nutritionTarget.carbsMin}-${nutritionTarget.carbsMax}g carbs, ${nutritionTarget.fatMin}-${nutritionTarget.fatMax}g fat` : ""}

### Training (${workoutsCompleted}/${totalWorkouts} workouts completed)
- Workout frequency by type: ${Object.entries(workoutTypes).map(([type, count]) => `${type}: ${count}`).join(", ") || "N/A"}
- Workout summaries: ${workoutSummaries.length > 0 ? workoutSummaries.map((w) => `${w.date}: ${w.type} (${w.duration ?? "?"}min, RPE ${w.rpe ?? "?"}, ${w.exerciseCount} exercises)${w.completed ? "" : " [SKIPPED]"}`).join("; ") : "No workouts logged"}

### Sleep (${sleepRows.length} nights logged)
- Average Duration: ${avgSleepHours ?? "N/A"} hrs
- Average Quality: ${avgSleepQuality ?? "N/A"}/10
- BiPAP Compliance: ${bipapCompliance ?? "N/A"}%

### Supplements
- Compliance: ${supplementCompliance ?? "N/A"}% (${takenCount}/${totalSupplementEntries} entries taken)

### Vitals
${latestVitals
    ? `- Latest BP: ${latestVitals.systolic ?? "?"}/${latestVitals.diastolic ?? "?"} mmHg (${latestVitals.date})
- Average BP: ${avgSystolic ?? "?"}/${avgDiastolic ?? "?"} mmHg
- Resting HR: ${latestVitals.restingHeartRate ?? "N/A"} bpm`
    : "- No vitals logged this month"}

### Lab Results
${labSummary.length > 0 ? labSummary.map((l) => `- ${l}`).join("\n") : "- No lab results this month"}

### Active Goals
${activeGoals.length > 0
    ? activeGoals.map((g) => `- ${g.category}: ${g.description}${g.targetValue != null ? ` (target: ${g.targetValue} ${g.targetUnit ?? ""})` : ""} — current: ${g.currentValue ?? "not tracked"}`).join("\n")
    : "- No active goals"}

### Training Phase
${phase ? `- Phase ${phase.phaseNumber}: ${phase.phaseName} (${phase.startDate ?? "?"} to ${phase.endDate ?? "?"})` : "- No active training phase"}
`.trim();

  const systemPrompt = `You are the ADONIS intelligence engine generating a comprehensive monthly health report for David Martin.

You have access to the past 30 days of health data. Analyze it comprehensively and generate a structured monthly report.

Be direct, data-driven, and actionable. Reference specific numbers and trends. Celebrate genuine progress, flag concerning patterns, and provide clear recommendations for the next month.

IMPORTANT FORMATTING RULES:
- Use the exact section headers provided in the template
- Focus on TRENDS and PATTERNS over the month, not just averages
- Compare to targets where available
- Provide specific, actionable recommendations

Also generate:
1. A JSON object of key metrics (wrap in <key_metrics>...</key_metrics> tags)
2. A JSON array of recommendation strings (wrap in <recommendations>...</recommendations> tags)

The key_metrics JSON should include these fields (use null if no data):
{
  "avg_weight": number|null,
  "weight_change": number|null,
  "avg_calories": number|null,
  "avg_protein_g": number|null,
  "avg_carbs_g": number|null,
  "avg_fat_g": number|null,
  "avg_sleep_hrs": number|null,
  "avg_sleep_quality": number|null,
  "bipap_compliance_pct": number|null,
  "workouts_completed": number,
  "workouts_total": number,
  "avg_energy": number|null,
  "avg_mood": number|null,
  "avg_stress": number|null,
  "supplement_compliance_pct": number|null,
  "alcohol_free_days": number,
  "days_logged": number,
  "avg_systolic": number|null,
  "avg_diastolic": number|null
}`;

  const userPrompt = `${dataSection}

---

Generate the monthly report using this exact template structure:

# Monthly Report: ${monthStart} to ${monthEnd}

## Executive Summary
[High-level assessment of the month — 3-4 sentences covering the most important trends and outcomes]

## Nutrition Analysis
[Macro compliance, calorie trends, protein hitting targets, patterns by day of week if visible]

## Training Progress
[Workouts completed, volume trends, exercise progression, consistency]

## Sleep Analysis
[Sleep duration/quality trends, BiPAP compliance, patterns]

## Weight & Body Composition
[Weight trajectory, rate of change, body fat trends if available]

## Lab Changes
[Any new lab results, comparison to previous, flags]

## Goal Progress
[Status of active goals, trajectory toward targets]

## Recommendations for Next Month
[Top 5 specific, actionable recommendations for the coming month]

Remember to also include <key_metrics>JSON</key_metrics> and <recommendations>JSON array</recommendations> after the report.`;

  // ------------------------------------------------------------------
  // 6. Call the Anthropic API
  // ------------------------------------------------------------------
  let reportContent: string;
  let keyMetrics: Record<string, unknown> = {};
  let aiRecommendations: string[] = [];
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    const client = getAnthropicClient();
    const model = getModel("COACHING");

    const response = await client.messages.create({
      model,
      max_tokens: 6144,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    // Extract text from response
    const fullText = response.content
      .filter((block) => block.type === "text")
      .map((block) => {
        if (block.type === "text") return block.text;
        return "";
      })
      .join("\n");

    inputTokens = response.usage?.input_tokens ?? 0;
    outputTokens = response.usage?.output_tokens ?? 0;

    // Extract key_metrics JSON
    const metricsMatch = fullText.match(/<key_metrics>([\s\S]*?)<\/key_metrics>/);
    if (metricsMatch) {
      keyMetrics = safeJsonParse(metricsMatch[1].trim(), {});
    }

    // Extract recommendations JSON
    const recsMatch = fullText.match(/<recommendations>([\s\S]*?)<\/recommendations>/);
    if (recsMatch) {
      aiRecommendations = safeJsonParse(recsMatch[1].trim(), []);
    }

    // Remove the tags from the report content
    reportContent = fullText
      .replace(/<key_metrics>[\s\S]*?<\/key_metrics>/, "")
      .replace(/<recommendations>[\s\S]*?<\/recommendations>/, "")
      .trim();

    // Log AI usage
    await logAIUsage({
      feature: "monthly_report",
      model,
      inputTokens,
      outputTokens,
    });
  } catch (err) {
    console.error("AI monthly report generation failed:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return error(`Failed to generate monthly report: ${message}`, 500);
  }

  // ------------------------------------------------------------------
  // 7. Store the report
  // ------------------------------------------------------------------
  const now = nowISO();

  // If key_metrics is empty, build a fallback from data we already have
  if (Object.keys(keyMetrics).length === 0) {
    keyMetrics = {
      avg_weight: avgWeight,
      weight_change: weightChange,
      avg_calories: avgCalories,
      avg_protein_g: avgProtein,
      avg_carbs_g: avgCarbs,
      avg_fat_g: avgFat,
      avg_sleep_hrs: avgSleepHours,
      avg_sleep_quality: avgSleepQuality,
      bipap_compliance_pct: bipapCompliance,
      workouts_completed: workoutsCompleted,
      workouts_total: totalWorkouts,
      avg_energy: avgEnergy,
      avg_mood: avgMood,
      avg_stress: avgStress,
      supplement_compliance_pct: supplementCompliance,
      alcohol_free_days: alcoholFreeDays,
      days_logged: daysLogged,
      avg_systolic: avgSystolic,
      avg_diastolic: avgDiastolic,
    };
  }

  const inserted = (await db
    .insert(schema.monthlyReports)
    .values({
      monthStart,
      monthEnd,
      reportContent,
      keyMetrics: JSON.stringify(keyMetrics),
      aiRecommendations: JSON.stringify(aiRecommendations),
      createdAt: now,
    })
    .returning())[0];

  return success({
    report: inserted,
    cached: false,
    tokens: { input: inputTokens, output: outputTokens },
  });
});
