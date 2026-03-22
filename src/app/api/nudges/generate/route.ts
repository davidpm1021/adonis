export const dynamic = 'force-dynamic';

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { success, error, withErrorHandling, todayET, nowISO } from "@/lib/api";
import { getAnthropicClient, getModel, logAIUsage } from "@/lib/ai";
import type Anthropic from "@anthropic-ai/sdk";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysAgo(n: number): string {
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
  );
  now.setDate(now.getDate() - n);
  return now.toLocaleDateString("en-CA");
}

// ---------------------------------------------------------------------------
// POST /api/nudges/generate — Generate 2-3 contextual daily nudges via AI
// ---------------------------------------------------------------------------
export const POST = withErrorHandling(async () => {
  const today = todayET();

  // ------------------------------------------------------------------
  // 1. Return cached nudges if they already exist for today
  // ------------------------------------------------------------------
  const existing = await db
    .select()
    .from(schema.dailyNudges)
    .where(eq(schema.dailyNudges.date, today));

  if (existing.length > 0) {
    return success({ nudges: existing, cached: true });
  }

  // ------------------------------------------------------------------
  // 2. Verify API key
  // ------------------------------------------------------------------
  let client: Anthropic;
  try {
    client = getAnthropicClient();
  } catch {
    return error(
      "AI nudges require ANTHROPIC_API_KEY. Set it in .env.local",
      503
    );
  }

  // ------------------------------------------------------------------
  // 3. Gather today's context
  // ------------------------------------------------------------------
  const sevenDaysAgo = daysAgo(7);

  const [
    dailyLogRows,
    nutritionRows,
    weightRows,
    sleepRows,
    workoutRows,
    supplementRows,
    recentDailyLogs,
    weightTrend,
  ] = await Promise.all([
    // Today's daily log
    db
      .select()
      .from(schema.dailyLog)
      .where(eq(schema.dailyLog.date, today))
      .limit(1),

    // Today's nutrition totals
    db
      .select({
        totalCalories: sql<number>`COALESCE(SUM(${schema.nutritionLog.calories}), 0)`,
        totalProtein: sql<number>`COALESCE(SUM(${schema.nutritionLog.proteinG}), 0)`,
        totalCarbs: sql<number>`COALESCE(SUM(${schema.nutritionLog.carbsG}), 0)`,
        totalFat: sql<number>`COALESCE(SUM(${schema.nutritionLog.fatG}), 0)`,
        mealCount: sql<number>`COUNT(*)`,
      })
      .from(schema.nutritionLog)
      .where(eq(schema.nutritionLog.date, today)),

    // Today's weight
    db
      .select()
      .from(schema.bodyMetrics)
      .where(eq(schema.bodyMetrics.date, today))
      .limit(1),

    // Today's sleep
    db
      .select()
      .from(schema.sleepLog)
      .where(eq(schema.sleepLog.date, today))
      .limit(1),

    // Today's workouts
    db
      .select()
      .from(schema.workouts)
      .where(eq(schema.workouts.date, today)),

    // Today's supplement compliance
    db
      .select()
      .from(schema.supplementLog)
      .where(eq(schema.supplementLog.date, today)),

    // Last 7 daily logs (for streaks)
    db
      .select()
      .from(schema.dailyLog)
      .where(
        and(
          gte(schema.dailyLog.date, sevenDaysAgo),
          lte(schema.dailyLog.date, today)
        )
      )
      .orderBy(desc(schema.dailyLog.date)),

    // Last 5 body metrics (for weight trend)
    db
      .select()
      .from(schema.bodyMetrics)
      .where(lte(schema.bodyMetrics.date, today))
      .orderBy(desc(schema.bodyMetrics.date))
      .limit(5),
  ]);

  // --- Build context summary ---
  const dailyLog = dailyLogRows[0] ?? null;
  const nutrition = nutritionRows[0] ?? null;
  const weight = weightRows[0] ?? null;
  const sleep = sleepRows[0] ?? null;
  const workoutCount = workoutRows.length;
  const suppsTaken = supplementRows.filter((s) => s.taken === 1).length;
  const suppsTotal = supplementRows.length;

  // Streaks from last 7 days
  const daysLogged = recentDailyLogs.length;
  const walkStreak = recentDailyLogs.filter((l) => l.morningWalk === 1).length;
  const soberStreak = recentDailyLogs.filter((l) => l.alcoholFree === 1).length;
  const trainingDays = recentDailyLogs.filter((l) => l.strengthTraining === 1).length;

  // Weight trend
  const weights = weightTrend
    .filter((m) => m.weight != null)
    .map((m) => ({ date: m.date, weight: m.weight! }));
  const weightTrendStr =
    weights.length >= 2
      ? `Last ${weights.length} weigh-ins: ${weights
          .reverse()
          .map((w) => `${w.date}: ${w.weight}lbs`)
          .join(", ")}`
      : "Insufficient weight data for trend.";

  const contextSummary = `
Today: ${today}

Daily Status:
- Daily log: ${dailyLog ? "logged" : "not logged"}
- Nutrition: ${Number(nutrition?.mealCount ?? 0)} meals, ${Number(nutrition?.totalCalories ?? 0)} cal, ${Number(nutrition?.totalProtein ?? 0)}g protein
- Weight: ${weight ? `${weight.weight} lbs` : "not logged today"}
- Sleep: ${sleep ? `${sleep.totalHours ?? "?"}hrs, quality ${sleep.sleepQuality ?? "?"}` : "not logged"}
- Workouts today: ${workoutCount}
- Supplements: ${suppsTotal > 0 ? `${suppsTaken}/${suppsTotal} taken` : "none tracked today"}

Streaks (last 7 days, ${daysLogged} days logged):
- Morning walks: ${walkStreak}/${daysLogged} days
- Alcohol-free: ${soberStreak}/${daysLogged} days
- Training: ${trainingDays}/${daysLogged} days

Weight Trend:
${weightTrendStr}
`.trim();

  // ------------------------------------------------------------------
  // 4. Call Claude Sonnet for nudge generation
  // ------------------------------------------------------------------
  const model = getModel("FOOD_PARSE"); // Sonnet for cost efficiency

  const systemPrompt = `Generate 2-3 short daily nudges for David, a health-focused individual tracking sobriety, nutrition, training, and sleep. Each nudge is 1-2 sentences. Be specific, reference data. Types: motivation (celebrating wins), insight (data pattern), warning (concerning trend), suggestion (specific action). Return JSON: [{"text": "...", "type": "motivation|insight|warning|suggestion", "priority": 1-3}]`;

  const response = await client.messages.create({
    model,
    max_tokens: 512,
    system: systemPrompt,
    messages: [{ role: "user", content: contextSummary }],
  });

  // Log AI usage
  await logAIUsage({
    feature: "daily_nudges",
    model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  });

  // ------------------------------------------------------------------
  // 5. Parse response
  // ------------------------------------------------------------------
  const rawText = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  let nudges: Array<{ text: string; type: string; priority: number }>;
  try {
    const jsonStr = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    nudges = JSON.parse(jsonStr);
  } catch {
    return error("Failed to parse AI nudge response as JSON", 502);
  }

  if (!Array.isArray(nudges) || nudges.length === 0) {
    return error("AI returned no nudges", 502);
  }

  // ------------------------------------------------------------------
  // 6. Insert nudges into database
  // ------------------------------------------------------------------
  const now = nowISO();
  const validTypes = ["motivation", "insight", "warning", "suggestion"];

  const inserted = [];
  for (const nudge of nudges) {
    const type = validTypes.includes(nudge.type) ? nudge.type : "suggestion";
    const priority = Math.max(1, Math.min(3, Math.round(nudge.priority ?? 1)));

    const row = (
      await db
        .insert(schema.dailyNudges)
        .values({
          date: today,
          nudgeText: nudge.text,
          nudgeType: type,
          priority,
          dismissed: 0,
          createdAt: now,
        })
        .returning()
    )[0];

    inserted.push(row);
  }

  return success({ nudges: inserted, cached: false });
});
