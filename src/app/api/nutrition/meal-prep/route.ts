export const dynamic = 'force-dynamic';

import { db } from "@/db";
import * as schema from "@/db/schema";
import { desc, sql } from "drizzle-orm";
import {
  success,
  error,
  withErrorHandling,
  todayET,
} from "@/lib/api";
import {
  getAnthropicClient,
  getModel,
  logAIUsage,
} from "@/lib/ai";
import type Anthropic from "@anthropic-ai/sdk";

// POST /api/nutrition/meal-prep — AI-generated weekly meal prep plan
export const POST = withErrorHandling(async () => {
  // 1. Gather current nutrition targets
  const today = todayET();
  const targets = await db
    .select()
    .from(schema.nutritionTargets)
    .where(sql`${schema.nutritionTargets.effectiveDate} <= ${today}`)
    .orderBy(desc(schema.nutritionTargets.effectiveDate))
    .limit(1);

  if (targets.length === 0) {
    return error("Set nutrition targets first before generating a meal plan.", 400);
  }

  const t = targets[0];
  const targetStr = `${t.caloriesMin}-${t.caloriesMax} calories, ${t.proteinMin}-${t.proteinMax}g protein, ${t.carbsMin}-${t.carbsMax}g carbs, ${t.fatMin}-${t.fatMax}g fat, ${t.fiberMin}-${t.fiberMax}g fiber`;

  // 2. Gather favorite meals
  const favorites = await db
    .select()
    .from(schema.favoriteMeals)
    .orderBy(desc(schema.favoriteMeals.useCount))
    .limit(20);

  const favoriteNames = favorites.map((f) => f.name).join(", ") || "none saved yet";

  // 3. Gather user profile for allergies
  const profiles = await db
    .select()
    .from(schema.userProfile)
    .limit(1);

  let allergies = "none";
  if (profiles.length > 0 && profiles[0].allergies) {
    try {
      const parsed = JSON.parse(profiles[0].allergies);
      if (Array.isArray(parsed) && parsed.length > 0) {
        allergies = parsed.join(", ");
      }
    } catch {
      allergies = profiles[0].allergies;
    }
  }

  // 4. Call Claude Sonnet for meal prep plan
  let client;
  try {
    client = getAnthropicClient();
  } catch {
    return error(
      "AI meal prep not configured — set ANTHROPIC_API_KEY in .env.local",
      503
    );
  }

  const model = getModel("MEAL_SUGGEST");

  const systemPrompt = `Generate a 7-day meal prep plan for David. His nutrition targets are ${targetStr}. His favorite meals include ${favoriteNames}. Allergies: ${allergies}. Return ONLY valid JSON: { "days": [{ "day": "Monday", "meals": [{ "mealType": "breakfast"|"lunch"|"dinner"|"snack", "name": "string", "description": "string", "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number, "fiber_g": number, "ingredients": ["string"] }] }] }`;

  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content:
          "Generate a practical, varied 7-day meal prep plan that hits my daily targets. Prioritize protein and simplicity.",
      },
    ],
  });

  // 5. Log AI usage
  await logAIUsage({
    feature: "meal_prep",
    model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  });

  // 6. Parse JSON response
  const rawText = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  let mealPlan;
  try {
    const jsonStr = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    mealPlan = JSON.parse(jsonStr);
  } catch {
    return error("Failed to parse AI meal plan response", 502);
  }

  if (!mealPlan.days || !Array.isArray(mealPlan.days)) {
    return error("AI response missing required 'days' array", 502);
  }

  return success({
    mealPlan,
    targets: {
      calories: `${t.caloriesMin}-${t.caloriesMax}`,
      protein: `${t.proteinMin}-${t.proteinMax}g`,
      carbs: `${t.carbsMin}-${t.carbsMax}g`,
      fat: `${t.fatMin}-${t.fatMax}g`,
      fiber: `${t.fiberMin}-${t.fiberMax}g`,
    },
  });
});
