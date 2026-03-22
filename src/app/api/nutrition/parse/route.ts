export const dynamic = 'force-dynamic';

import {
  success,
  error,
  withErrorHandling,
  parseBody,
} from "@/lib/api";
import { foodParseSchema } from "@/lib/validations";
import {
  getCachedParse,
  setCachedParse,
  getAnthropicClient,
  getModel,
  logAIUsage,
  SYSTEM_PROMPTS,
} from "@/lib/ai";

// POST /api/nutrition/parse — Natural language food parsing via Claude
export const POST = withErrorHandling(async (req) => {
  const { text } = await parseBody(req, foodParseSchema);

  // Check cache first
  const cached = await getCachedParse(text);
  if (cached) {
    return success({ ...cached, cached: true });
  }

  // Check if API key is configured
  let client;
  try {
    client = getAnthropicClient();
  } catch {
    return error(
      "AI parsing not configured — set ANTHROPIC_API_KEY in .env.local",
      503
    );
  }

  const model = getModel("FOOD_PARSE");

  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    system: SYSTEM_PROMPTS.FOOD_PARSE,
    messages: [{ role: "user", content: text }],
  });

  // Log usage
  await logAIUsage({
    feature: "food_parse",
    model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  });

  // Extract text content from response
  const rawText = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  // Parse JSON from response — handle markdown code fences
  let parsed;
  try {
    const jsonStr = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    parsed = JSON.parse(jsonStr);
  } catch {
    return error("Failed to parse AI response as JSON", 502);
  }

  // Validate expected shape
  if (!parsed.items || !parsed.totals) {
    return error("AI response missing required fields (items, totals)", 502);
  }

  // Cache the result
  await setCachedParse(text, parsed);

  return success({
    ...parsed,
    cached: false,
  });
});

// Need the type for the filter
import type Anthropic from "@anthropic-ai/sdk";
