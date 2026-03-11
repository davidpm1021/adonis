export const dynamic = 'force-dynamic';

import { db } from "@/db";
import * as schema from "@/db/schema";
import { desc, gte, lte, and, eq, sql } from "drizzle-orm";
import { success, error, withErrorHandling, nowISO, todayET } from "@/lib/api";
import { getAnthropicClient, getModel, logAIUsage } from "@/lib/ai";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get Monday of the current week (ISO week: Mon-Sun) in ET */
function getCurrentWeekStart(): string {
  const today = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
  );
  const day = today.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? 6 : day - 1; // days since Monday
  const monday = new Date(today);
  monday.setDate(monday.getDate() - diff);
  return monday.toLocaleDateString("en-CA");
}

/** Get Sunday of the current week */
function getCurrentWeekEnd(): string {
  const start = getCurrentWeekStart();
  const [y, m, d] = start.split("-").map(Number);
  const sunday = new Date(y, m - 1, d + 6);
  return sunday.toLocaleDateString("en-CA");
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
// POST /api/reports/weekly/generate
// ---------------------------------------------------------------------------
export const POST = withErrorHandling(async () => {
  const weekStart = getCurrentWeekStart();
  const weekEnd = getCurrentWeekEnd();

  // ------------------------------------------------------------------
  // 1. Check if a report for this week already exists
  // ------------------------------------------------------------------
  const existing = db
    .select()
    .from(schema.weeklyReports)
    .where(eq(schema.weeklyReports.weekStart, weekStart))
    .get();

  if (existing) {
    return success({
      report: existing,
      cached: true,
      message: "Report for this week already exists.",
    });
  }

  // ------------------------------------------------------------------
  // 2. Verify API key is configured
  // ------------------------------------------------------------------
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your-api-key-here") {
    return error(
      "Weekly report generation requires an ANTHROPIC_API_KEY. Set it in .env.local to enable this feature.",
      503,
    );
  }

  // ------------------------------------------------------------------
  // 3. Gather data from the past 7 days
  // ------------------------------------------------------------------
  const sevenDaysAgoStr = daysAgo(7);
  const todayStr = todayET();

  // Fetch all data sources in parallel
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
    activeGoals,
    activePhase,
  ] = await Promise.all([
    // Daily logs
    db
      .select()
      .from(schema.dailyLog)
      .where(and(gte(schema.dailyLog.date, sevenDaysAgoStr), lte(schema.dailyLog.date, todayStr)))
      .orderBy(schema.dailyLog.date),

    // Body metrics
    db
      .select()
      .from(schema.bodyMetrics)
      .where(and(gte(schema.bodyMetrics.date, sevenDaysAgoStr), lte(schema.bodyMetrics.date, todayStr)))
      .orderBy(schema.bodyMetrics.date),

    // Nutrition logs
    db
      .select()
      .from(schema.nutritionLog)
      .where(and(gte(schema.nutritionLog.date, sevenDaysAgoStr), lte(schema.nutritionLog.date, todayStr)))
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
      .where(and(gte(schema.workouts.date, sevenDaysAgoStr), lte(schema.workouts.date, todayStr)))
      .orderBy(schema.workouts.date),

    // Exercises (all, we'll filter by workout IDs)
    db.select().from(schema.exercises),

    // Sleep logs
    db
      .select()
      .from(schema.sleepLog)
      .where(and(gte(schema.sleepLog.date, sevenDaysAgoStr), lte(schema.sleepLog.date, todayStr)))
      .orderBy(schema.sleepLog.date),

    // Supplement logs
    db
      .select()
      .from(schema.supplementLog)
      .where(and(gte(schema.supplementLog.date, sevenDaysAgoStr), lte(schema.supplementLog.date, todayStr)))
      .orderBy(schema.supplementLog.date),

    // Vitals
    db
      .select()
      .from(schema.vitalsLog)
      .where(and(gte(schema.vitalsLog.date, sevenDaysAgoStr), lte(schema.vitalsLog.date, todayStr)))
      .orderBy(desc(schema.vitalsLog.date)),

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
  const notes = dailyLogs.filter((l) => l.notes).map((l) => `${l.date}: ${l.notes}`);

  // --- Body Metrics ---
  const weights = bodyMetricsRows.filter((m) => m.weight != null).map((m) => m.weight!);
  const startWeight = weights.length > 0 ? weights[0] : null;
  const endWeight = weights.length > 0 ? weights[weights.length - 1] : null;
  const avgWeight = weights.length > 0 ? r1(weights.reduce((s, w) => s + w, 0) / weights.length) : null;
  const weightChange = startWeight != null && endWeight != null ? r1(endWeight - startWeight) : null;

  // --- Nutrition ---
  // Group by date for daily totals
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

  // Get exercises for these workouts
  const workoutIds = new Set(workoutRows.map((w) => w.id));
  const weekExercises = exerciseRows.filter((e) => workoutIds.has(e.workoutId));

  const workoutSummaries = workoutRows.map((w) => {
    const exs = weekExercises.filter((e) => e.workoutId === w.id);
    return {
      date: w.date,
      type: w.workoutType,
      duration: w.durationMinutes,
      rpe: w.rpe,
      completed: w.completed === 1,
      exercises: exs.map((e) => ({
        name: e.exerciseName,
        sets: e.sets,
        reps: e.reps,
        weight: e.weightLbs,
      })),
    };
  });

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

  // --- Training Phase ---
  const phase = activePhase.length > 0 ? activePhase[0] : null;

  // ------------------------------------------------------------------
  // 5. Build the structured prompt
  // ------------------------------------------------------------------
  const dataSection = `
## Data Summary for ${weekStart} to ${weekEnd}

### Daily Logs (${daysLogged} days logged)
- Average Energy: ${avgEnergy ?? "N/A"}/10
- Average Mood: ${avgMood ?? "N/A"}/10
- Average Stress: ${avgStress ?? "N/A"}/10
- Alcohol-Free Days: ${alcoholFreeDays}/${daysLogged}${allAlcoholFree ? " (100% sober)" : ""}
${nonNegotiableCompletion ? `
- Non-Negotiable Completion:
  - Morning Walk: ${nonNegotiableCompletion.morningWalk}%
  - Strength Training: ${nonNegotiableCompletion.strengthTraining}%
  - Lunch with Protein: ${nonNegotiableCompletion.lunchWithProtein}%
  - Mobility Work: ${nonNegotiableCompletion.mobilityWork}%
  - Supplements: ${nonNegotiableCompletion.supplements}%` : ""}
${wins.length > 0 ? `\n- Wins:\n${wins.map((w) => `  - ${w}`).join("\n")}` : ""}
${struggles.length > 0 ? `\n- Struggles:\n${struggles.map((s) => `  - ${s}`).join("\n")}` : ""}
${notes.length > 0 ? `\n- Notes:\n${notes.map((n) => `  - ${n}`).join("\n")}` : ""}

### Body Metrics
- Weight entries this week: ${weights.length}
${startWeight != null ? `- Start of week weight: ${startWeight} lbs` : ""}
${endWeight != null ? `- End of week weight: ${endWeight} lbs` : ""}
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
${workoutSummaries.length > 0
    ? workoutSummaries
        .map(
          (w) =>
            `- ${w.date}: ${w.type} (${w.duration ?? "?"}min, RPE ${w.rpe ?? "?"})${w.completed ? "" : " [SKIPPED]"}
${w.exercises.length > 0 ? w.exercises.map((e) => `    - ${e.name}: ${e.sets ?? "?"}x${e.reps ?? "?"} @ ${e.weight ?? "BW"} lbs`).join("\n") : "    - No exercises logged"}`,
        )
        .join("\n")
    : "- No workouts logged this week"}

### Sleep (${sleepRows.length} nights logged)
- Average Duration: ${avgSleepHours ?? "N/A"} hrs
- Average Quality: ${avgSleepQuality ?? "N/A"}/10
- BiPAP Compliance: ${bipapCompliance ?? "N/A"}%

### Supplements
- Compliance: ${supplementCompliance ?? "N/A"}% (${takenCount}/${totalSupplementEntries} entries taken)

### Vitals
${latestVitals
    ? `- Latest BP: ${latestVitals.systolic ?? "?"}/${latestVitals.diastolic ?? "?"} mmHg (${latestVitals.date})
- Resting HR: ${latestVitals.restingHeartRate ?? "N/A"} bpm
- SpO2: ${latestVitals.spo2 ?? "N/A"}%`
    : "- No vitals logged this week"}

### Active Goals
${activeGoals.length > 0
    ? activeGoals.map((g) => `- ${g.category}: ${g.description}${g.targetValue != null ? ` (target: ${g.targetValue} ${g.targetUnit ?? ""})` : ""} — current: ${g.currentValue ?? "not tracked"}`).join("\n")
    : "- No active goals"}

### Training Phase
${phase ? `- Phase ${phase.phaseNumber}: ${phase.phaseName} (${phase.startDate ?? "?"} to ${phase.endDate ?? "?"})` : "- No active training phase"}
`.trim();

  const systemPrompt = `You are the ADONIS intelligence engine generating a weekly health report for David Martin.

You have access to the following week's health data. Analyze it comprehensively and generate a structured weekly report.

Be direct, data-driven, and actionable. Reference specific numbers. Celebrate genuine wins, flag concerning patterns, and provide clear next-week priorities.

IMPORTANT FORMATTING RULES:
- Use the exact section headers provided in the template
- Keep the summary concise (2-3 sentences)
- Wins should be the top 3 most impactful accomplishments
- Flags should highlight actionable concerns
- Next Week Focus should be the 3 most impactful priorities
- If data is missing for a section, acknowledge it and recommend tracking

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
  "workouts_planned": number,
  "avg_energy": number|null,
  "avg_mood": number|null,
  "supplement_compliance_pct": number|null,
  "alcohol_free_days": number,
  "days_logged": number
}`;

  const userPrompt = `${dataSection}

---

Generate the weekly report using this exact template structure:

# Weekly Report: ${weekStart} to ${weekEnd}

## Summary
[Brief overall assessment - 2-3 sentences]

## Body Metrics
[Weight change, measurements, trends]

## Training
[Workouts completed vs planned, key exercises, volume changes]

## Nutrition
[Average macros, compliance with targets, patterns]

## Sleep
[Average duration/quality, BiPAP compliance]

## Wins
[Top 3 accomplishments this week]

## Flags
[Areas needing attention]

## Next Week Focus
[Top 3 priorities for next week]

## Phase Status
[Current training phase progress]

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
      max_tokens: 4096,
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
    logAIUsage({
      feature: "weekly_report",
      model,
      inputTokens,
      outputTokens,
    });
  } catch (err) {
    console.error("AI report generation failed:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return error(`Failed to generate weekly report: ${message}`, 500);
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
      workouts_planned: totalWorkouts,
      avg_energy: avgEnergy,
      avg_mood: avgMood,
      supplement_compliance_pct: supplementCompliance,
      alcohol_free_days: alcoholFreeDays,
      days_logged: daysLogged,
    };
  }

  const inserted = db
    .insert(schema.weeklyReports)
    .values({
      weekStart,
      weekEnd,
      reportContent,
      keyMetrics: JSON.stringify(keyMetrics),
      aiRecommendations: JSON.stringify(aiRecommendations),
      createdAt: now,
    })
    .returning()
    .get();

  return success({
    report: inserted,
    cached: false,
    tokens: { input: inputTokens, output: outputTokens },
  });
});
