export const dynamic = "force-dynamic";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc, gte, sql } from "drizzle-orm";
import { success, error, withErrorHandling, todayET, nowISO } from "@/lib/api";
import { getAnthropicClient, getModel, logAIUsage } from "@/lib/ai";
import { SUPPLEMENT_PURPOSES } from "@/lib/constants";
import { calculateSobriety } from "@/lib/calculations";
import type Anthropic from "@anthropic-ai/sdk";

// POST /api/briefing/generate — Generate the AI daily briefing
export const POST = withErrorHandling(async () => {
  const today = todayET();
  const now = nowISO();

  // Check for existing non-stale briefing today
  const existing = (
    await db
      .select()
      .from(schema.dailyBriefings)
      .where(eq(schema.dailyBriefings.date, today))
      .orderBy(desc(schema.dailyBriefings.generatedAt))
      .limit(1)
  )[0];

  if (existing && existing.stale === 0) {
    return success({ briefing: JSON.parse(existing.briefingJson), cached: true });
  }

  // -------------------------------------------------------------------------
  // Gather ALL context data in parallel
  // -------------------------------------------------------------------------
  const daysAgo = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  };

  const yesterday = daysAgo(1);
  const sevenDaysAgo = daysAgo(7);
  const fourteenDaysAgo = daysAgo(14);

  const [
    profileRows,
    weightRows,
    yesterdayMeals,
    todayMeals,
    nutritionTargetRows,
    last7Logs,
    last7Sleep,
    last7Supps,
    last7Workouts,
    activePhaseRows,
    goalRows,
    labRows,
    latestReportRows,
    todayVitals,
    todayWeight,
  ] = await Promise.all([
    db.select().from(schema.userProfile).where(eq(schema.userProfile.id, 1)).limit(1),
    db.select().from(schema.bodyMetrics).orderBy(desc(schema.bodyMetrics.date)).limit(14),
    db.select().from(schema.nutritionLog).where(eq(schema.nutritionLog.date, yesterday)),
    db.select().from(schema.nutritionLog).where(eq(schema.nutritionLog.date, today)),
    db.select().from(schema.nutritionTargets)
      .where(sql`${schema.nutritionTargets.effectiveDate} <= ${today}`)
      .orderBy(desc(schema.nutritionTargets.effectiveDate)).limit(1),
    db.select().from(schema.dailyLog)
      .where(gte(schema.dailyLog.date, sevenDaysAgo))
      .orderBy(desc(schema.dailyLog.date)),
    db.select().from(schema.sleepLog)
      .where(gte(schema.sleepLog.date, sevenDaysAgo))
      .orderBy(desc(schema.sleepLog.date)),
    db.select().from(schema.supplementLog)
      .where(gte(schema.supplementLog.date, sevenDaysAgo)),
    db.select().from(schema.workouts)
      .where(gte(schema.workouts.date, sevenDaysAgo))
      .orderBy(desc(schema.workouts.date)),
    db.select().from(schema.trainingPhases)
      .where(eq(schema.trainingPhases.status, "active")).limit(1),
    db.select().from(schema.goals)
      .where(eq(schema.goals.status, "active")),
    db.select().from(schema.labResults).orderBy(desc(schema.labResults.date)).limit(20),
    db.select().from(schema.weeklyReports)
      .orderBy(desc(schema.weeklyReports.weekStart)).limit(1),
    db.select().from(schema.vitalsLog).where(eq(schema.vitalsLog.date, today)),
    db.select().from(schema.bodyMetrics).where(eq(schema.bodyMetrics.date, today)).limit(1),
  ]);

  const profile = profileRows[0];
  const targets = nutritionTargetRows[0];
  const phase = activePhaseRows[0];

  // -------------------------------------------------------------------------
  // Build compact context string (target: < 4000 tokens)
  // -------------------------------------------------------------------------

  // Profile
  const age = profile?.dob
    ? Math.floor((Date.now() - new Date(profile.dob).getTime()) / (365.25 * 86400000))
    : null;
  const conditions = profile?.medicalConditions
    ? (() => { try { return JSON.parse(profile.medicalConditions); } catch { return []; } })()
    : [];
  const medications = profile?.medications
    ? (() => { try { return JSON.parse(profile.medications); } catch { return []; } })()
    : [];

  const sobriety = calculateSobriety(profile?.sobrietyStartDate ?? "2025-02-23");

  // Time of day
  const etHour = parseInt(
    new Date().toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", hour12: false }),
    10
  );
  const dayName = new Date().toLocaleDateString("en-US", { timeZone: "America/New_York", weekday: "long" });
  const trainingDays = ["Tuesday", "Thursday", "Saturday"];
  const isTrainingDay = trainingDays.includes(dayName);

  // Weight trend
  const currentWeight = weightRows[0]?.weight ?? null;
  const goalLow = profile?.goalWeightLow ?? 185;
  const goalHigh = profile?.goalWeightHigh ?? 195;
  const weightTrend = weightRows.slice(0, 7).map((w) => `${w.date}: ${w.weight} lbs`).join(", ");

  // Yesterday's nutrition
  const yNut = yesterdayMeals.reduce(
    (acc, m) => ({
      cal: acc.cal + (m.calories ?? 0),
      pro: acc.pro + (m.proteinG ?? 0),
      carb: acc.carb + (m.carbsG ?? 0),
      fat: acc.fat + (m.fatG ?? 0),
      fiber: acc.fiber + (m.fiberG ?? 0),
    }),
    { cal: 0, pro: 0, carb: 0, fat: 0, fiber: 0 }
  );
  const yMealList = yesterdayMeals.map((m) => `${m.mealType}: ${m.description || "no description"} (${m.calories}cal, ${m.proteinG}g pro)`).join("; ");

  // Today's nutrition so far
  const tNut = todayMeals.reduce(
    (acc, m) => ({
      cal: acc.cal + (m.calories ?? 0),
      pro: acc.pro + (m.proteinG ?? 0),
    }),
    { cal: 0, pro: 0 }
  );

  // Sleep summary
  const sleepSummary = last7Sleep.map((s) => `${s.date}: ${s.totalHours ?? "?"}h quality:${s.sleepQuality ?? "?"}/10`).join("; ");

  // Supplement compliance
  const suppByDate: Record<string, { taken: number; total: number }> = {};
  for (const s of last7Supps) {
    if (!suppByDate[s.date]) suppByDate[s.date] = { taken: 0, total: 0 };
    suppByDate[s.date].total++;
    if (s.taken === 1) suppByDate[s.date].taken++;
  }
  const suppCompliance = Object.entries(suppByDate)
    .map(([d, v]) => `${d}: ${v.taken}/${v.total}`)
    .join(", ");

  // Daily log scores
  const logScores = last7Logs.map((l) => {
    const parts = [];
    if (l.energy) parts.push(`energy:${l.energy}`);
    if (l.mood) parts.push(`mood:${l.mood}`);
    if (l.stress) parts.push(`stress:${l.stress}`);
    if (l.soreness) parts.push(`sore:${l.soreness}`);
    if (l.wins) parts.push(`wins:"${l.wins}"`);
    if (l.struggles) parts.push(`struggles:"${l.struggles}"`);
    return `${l.date}: ${parts.join(", ") || "no scores"}`;
  }).join("; ");

  // Workouts
  const workoutSummary = last7Workouts.map((w) =>
    `${w.date}: ${w.workoutType} ${w.durationMinutes ?? "?"}min RPE:${w.rpe ?? "?"}${w.coachFeedback ? ` feedback:"${w.coachFeedback}"` : ""}`
  ).join("; ");

  // Goals
  const goalsSummary = goalRows.map((g) =>
    `${g.category}: ${g.description} (current:${g.currentValue ?? "?"} target:${g.targetValue ?? "?"}${g.targetUnit ?? ""})`
  ).join("; ");

  // Labs
  const labSummary = labRows.slice(0, 12).map((l) =>
    `${l.testName}: ${l.value}${l.unit} [${l.flag}]`
  ).join("; ");

  // Today status
  const todayLog = last7Logs.find((l) => l.date === today);
  const todayStatus = [];
  if (todayWeight[0]) todayStatus.push("weight logged");
  if (todayVitals.length > 0) todayStatus.push("vitals logged");
  if (todayMeals.length > 0) todayStatus.push(`${todayMeals.length} meals logged`);
  if (todayLog?.morningWalk === 1) todayStatus.push("walked");
  if (todayLog?.supplementsTaken === 1) todayStatus.push("supplements done");

  const contextBlock = `PROFILE: ${profile?.name ?? "David"}, age ${age ?? "44"}, ${profile?.sex ?? "male"}, ${profile?.heightInches ? `${Math.floor(profile.heightInches / 12)}'${profile.heightInches % 12}"` : "5'6\""}
CONDITIONS: ${conditions.join(", ") || "none"}
MEDICATIONS: ${medications.map((m: { name: string; dose: string; frequency: string }) => `${m.name} ${m.dose} ${m.frequency}`).join(", ") || "none"}
SOBRIETY: Day ${sobriety.days} (since ${profile?.sobrietyStartDate ?? "2025-02-23"})

TODAY: ${dayName} ${today}, ${etHour < 12 ? "morning" : etHour < 17 ? "afternoon" : etHour < 22 ? "evening" : "night"} (${etHour}:00 ET)
TRAINING DAY: ${isTrainingDay ? "YES" : "No — rest day"}
ALREADY DONE TODAY: ${todayStatus.join(", ") || "nothing yet"}

WEIGHT: Current ${currentWeight ?? "unknown"} lbs, goal ${goalLow}-${goalHigh} lbs, starting ${profile?.startingWeight ?? 225} lbs
WEIGHT TREND (14d): ${weightTrend || "no entries"}

NUTRITION TARGETS: ${targets ? `${targets.caloriesMin}-${targets.caloriesMax} cal, ${targets.proteinMin}-${targets.proteinMax}g protein, ${targets.carbsMin}-${targets.carbsMax}g carbs, ${targets.fatMin}-${targets.fatMax}g fat, ${targets.fiberMin}-${targets.fiberMax}g fiber` : "not set"}
YESTERDAY NUTRITION: ${yNut.cal > 0 ? `${Math.round(yNut.cal)} cal, ${Math.round(yNut.pro)}g protein, ${Math.round(yNut.carb)}g carbs, ${Math.round(yNut.fat)}g fat, ${Math.round(yNut.fiber)}g fiber` : "not logged"}
YESTERDAY MEALS: ${yMealList || "none logged"}
TODAY SO FAR: ${tNut.cal > 0 ? `${Math.round(tNut.cal)} cal, ${Math.round(tNut.pro)}g protein (${todayMeals.length} meals)` : "nothing logged yet"}

SLEEP (7d): ${sleepSummary || "no data"}
SUPPLEMENTS (7d): ${suppCompliance || "no data"}
DAILY SCORES (7d): ${logScores || "no data"}
WORKOUTS (7d): ${workoutSummary || "none"}

TRAINING PHASE: ${phase ? `Phase ${phase.phaseNumber} — ${phase.phaseName} (${phase.startDate} to ${phase.endDate})` : "none"}
GOALS: ${goalsSummary || "none set"}
LATEST LABS: ${labSummary || "none"}
LATEST WEEKLY REPORT: ${latestReportRows[0]?.reportContent?.slice(0, 300) ?? "none"}`;

  // -------------------------------------------------------------------------
  // Call Claude Sonnet
  // -------------------------------------------------------------------------
  let client;
  try {
    client = getAnthropicClient();
  } catch {
    return error("AI not configured — set ANTHROPIC_API_KEY", 503);
  }

  const model = getModel("FOOD_PARSE"); // Sonnet for cost efficiency

  const systemPrompt = `You are David's personal AI coach, trainer, and dietician. You know everything about his health data, goals, and history. Generate a daily briefing — a personalized coaching message for RIGHT NOW.

RULES:
- Write in second person, direct coaching voice. You're his trusted coach, not a chatbot.
- Reference SPECIFIC numbers, dates, and patterns. Never be vague or generic.
- Be honest about poor performance — don't sugarcoat. But be encouraging about genuine progress.
- Keep total under 500 words — dense and actionable.
- Use markdown formatting: **bold** for emphasis, bullet lists where helpful.
- For supplement lists, include dose and brief purpose in parentheses.

Return ONLY valid JSON with this exact structure:
{
  "greeting": "One line. Time-of-day greeting with sobriety day count and a specific motivational anchor.",
  "body_status": "2-3 sentences about current weight, trend, comparison to goal. Reference specifics.",
  "right_now": "What to do RIGHT NOW based on time of day. Be specific — list supplements with doses, or meals with protein targets.",
  "right_now_actions": ["weight", "supplements_morning", "vitals"],
  "training": "Training day status. If training day, what's prescribed. If rest day, say so. Reference recent workout history.",
  "training_actions": [],
  "nutrition": "Yesterday's nutrition analysis OR today so far. Protein vs target. Specific meal suggestions if falling short.",
  "nutrition_actions": ["meal"],
  "patterns": "1-2 data patterns you notice. Sleep trends, mood correlations, supplement compliance, anything actionable. Skip if nothing notable.",
  "week_ahead": "1-2 sentences: training days remaining, upcoming events, lab dates.",
  "generated_at": "${now}"
}

The "right_now_actions" array contains action IDs for inline forms: "weight", "supplements_morning", "supplements_dinner", "supplements_before_bed", "vitals", "meal", "checkin", "sleep", "walk"
Only include actions that are relevant to the current time AND not yet completed today.`;

  const response = await client.messages.create({
    model,
    max_tokens: 1200,
    system: systemPrompt,
    messages: [
      { role: "user", content: contextBlock },
    ],
  });

  await logAIUsage({
    feature: "daily_briefing",
    model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  });

  const rawText = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  let briefing;
  try {
    const jsonStr = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    briefing = JSON.parse(jsonStr);
  } catch {
    return error("Failed to parse AI briefing response", 502);
  }

  // Ensure generated_at is set
  briefing.generated_at = now;

  // Store in DB (mark old ones as stale)
  if (existing) {
    await db.update(schema.dailyBriefings)
      .set({ stale: 1 })
      .where(eq(schema.dailyBriefings.id, existing.id));
  }

  await db.insert(schema.dailyBriefings).values({
    date: today,
    briefingJson: JSON.stringify(briefing),
    model,
    generatedAt: now,
    stale: 0,
    createdAt: now,
  });

  return success({ briefing, cached: false });
});
