export const dynamic = 'force-dynamic';

import {
  success,
  error,
  withErrorHandling,
} from "@/lib/api";
import {
  getAnthropicClient,
  getModel,
  logAIUsage,
} from "@/lib/ai";
import type Anthropic from "@anthropic-ai/sdk";

// POST /api/nutrition/grocery-list — Generate consolidated grocery list from meal plan
export const POST = withErrorHandling(async (req) => {
  let body;
  try {
    body = await req.json();
  } catch {
    return error("Invalid JSON body", 400);
  }

  const { mealPlan } = body;

  if (!mealPlan || !mealPlan.days || !Array.isArray(mealPlan.days)) {
    return error("Request body must include a valid mealPlan with a 'days' array", 400);
  }

  // Call Claude Sonnet to consolidate ingredients
  let client;
  try {
    client = getAnthropicClient();
  } catch {
    return error(
      "AI grocery list not configured — set ANTHROPIC_API_KEY in .env.local",
      503
    );
  }

  const model = getModel("MEAL_SUGGEST");

  const systemPrompt = `Given this meal plan, generate a consolidated grocery list. Combine duplicate ingredients and sum quantities where possible. Organize by grocery store section. Return ONLY valid JSON: { "sections": [{ "name": "Produce"|"Protein"|"Dairy"|"Pantry"|"Frozen"|"Other", "items": [{ "name": "string", "quantity": "string" }] }] }`;

  const response = await client.messages.create({
    model,
    max_tokens: 2048,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Here is the 7-day meal plan:\n\n${JSON.stringify(mealPlan, null, 2)}`,
      },
    ],
  });

  // Log AI usage
  await logAIUsage({
    feature: "grocery_list",
    model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  });

  // Parse JSON response
  const rawText = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  let groceryList;
  try {
    const jsonStr = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    groceryList = JSON.parse(jsonStr);
  } catch {
    return error("Failed to parse AI grocery list response", 502);
  }

  if (!groceryList.sections || !Array.isArray(groceryList.sections)) {
    return error("AI response missing required 'sections' array", 502);
  }

  return success({ groceryList });
});
