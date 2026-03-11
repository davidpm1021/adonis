export const dynamic = 'force-dynamic';

import { db } from "@/db";
import * as schema from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import {
  success,
  error,
  withErrorHandling,
  todayET,
  nowISO,
} from "@/lib/api";
import {
  getAnthropicClient,
  getModel,
  logAIUsage,
  SYSTEM_PROMPTS,
} from "@/lib/ai";
import { calculateNutritionTotals } from "@/lib/calculations";
import type Anthropic from "@anthropic-ai/sdk";

// GET /api/nutrition/suggestions — Macro-aware meal suggestions via Claude
export const GET = withErrorHandling(async (req) => {
  const today = todayET();
  const url = new URL(req.url);
  const mealType = url.searchParams.get("mealType") || "any";

  // Get current nutrition targets
  const targets = await db
    .select()
    .from(schema.nutritionTargets)
    .where(sql`${schema.nutritionTargets.effectiveDate} <= ${today}`)
    .orderBy(desc(schema.nutritionTargets.effectiveDate))
    .limit(1);

  if (targets.length === 0) {
    return success({
      date: today,
      suggestions: [],
      message: "Set nutrition targets first to get meal suggestions.",
    });
  }

  const t = targets[0];

  // Get today's meals so far
  const todayMeals = await db
    .select()
    .from(schema.nutritionLog)
    .where(eq(schema.nutritionLog.date, today));

  const consumed = calculateNutritionTotals(todayMeals);

  const remaining = {
    calories: Math.max(0, (t.caloriesMax ?? 2200) - consumed.calories),
    protein_g: Math.max(0, (t.proteinMin ?? 160) - consumed.protein),
    carbs_g: Math.max(0, (t.carbsMax ?? 180) - consumed.carbs),
    fat_g: Math.max(0, (t.fatMax ?? 75) - consumed.fat),
    fiber_g: Math.max(0, (t.fiberMin ?? 35) - consumed.fiber),
  };

  // If targets are already met, say so
  if (remaining.calories <= 0 && remaining.protein_g <= 0) {
    return success({
      date: today,
      suggestions: [],
      consumed,
      remaining,
      message: "You've hit your calorie and protein targets for today!",
    });
  }

  // Call Claude for suggestions
  let client;
  try {
    client = getAnthropicClient();
  } catch {
    return error(
      "AI suggestions not configured — set ANTHROPIC_API_KEY in .env.local",
      503
    );
  }

  const model = getModel("MEAL_SUGGEST");

  const targetsStr = `Calories: ${t.caloriesMin}-${t.caloriesMax}, Protein: ${t.proteinMin}-${t.proteinMax}g, Carbs: ${t.carbsMin}-${t.carbsMax}g, Fat: ${t.fatMin}-${t.fatMax}g, Fiber: ${t.fiberMin}-${t.fiberMax}g`;
  const consumedStr = `Calories: ${Math.round(consumed.calories)}, Protein: ${Math.round(consumed.protein)}g, Carbs: ${Math.round(consumed.carbs)}g, Fat: ${Math.round(consumed.fat)}g, Fiber: ${Math.round(consumed.fiber)}g`;
  const remainingStr = `Calories: ${Math.round(remaining.calories)}, Protein: ${Math.round(remaining.protein_g)}g, Carbs: ${Math.round(remaining.carbs_g)}g, Fat: ${Math.round(remaining.fat_g)}g, Fiber: ${Math.round(remaining.fiber_g)}g`;

  const prompt = SYSTEM_PROMPTS.MEAL_SUGGEST
    .replace("{TARGETS}", targetsStr)
    .replace("{CONSUMED}", consumedStr)
    .replace("{REMAINING}", remainingStr)
    .replace("{MEAL_TYPE}", mealType);

  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  logAIUsage({
    feature: "meal_suggest",
    model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  });

  const rawText = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  let suggestions;
  try {
    const jsonStr = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    suggestions = JSON.parse(jsonStr);
  } catch {
    return error("Failed to parse AI suggestions", 502);
  }

  return success({
    date: today,
    suggestions,
    consumed,
    remaining,
  });
});
