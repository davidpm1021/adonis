import Anthropic from "@anthropic-ai/sdk";
import { AI_MODELS, AI_RATE_LIMIT } from "./constants";
import { db } from "@/db";
import { aiConversations, aiUsageLog } from "@/db/schema";
import { sql } from "drizzle-orm";
import { todayET, nowISO } from "./api";

// ---------------------------------------------------------------------------
// Anthropic Client Singleton
// ---------------------------------------------------------------------------
const globalForAI = globalThis as unknown as {
  __anthropic: Anthropic | undefined;
};

export function getAnthropicClient(): Anthropic {
  if (!globalForAI.__anthropic) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === "your-api-key-here") {
      throw new Error("ANTHROPIC_API_KEY is not configured. Set it in .env.local");
    }
    globalForAI.__anthropic = new Anthropic({ apiKey });
  }
  return globalForAI.__anthropic;
}

// ---------------------------------------------------------------------------
// Model Routing
// ---------------------------------------------------------------------------
export type AIFeature = keyof typeof AI_MODELS;

export function getModel(feature: AIFeature): string {
  return AI_MODELS[feature];
}

// ---------------------------------------------------------------------------
// Rate Limiting (50 messages/day, reset at midnight ET)
// ---------------------------------------------------------------------------
export async function checkRateLimit(): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const today = todayET();
  const result = db.select({ count: sql<number>`COUNT(*)` })
    .from(aiConversations)
    .where(sql`date(${aiConversations.createdAt}) = ${today} AND ${aiConversations.role} = 'user'`)
    .get();

  const used = result?.count || 0;
  return {
    allowed: used < AI_RATE_LIMIT,
    remaining: Math.max(0, AI_RATE_LIMIT - used),
    limit: AI_RATE_LIMIT,
  };
}

// ---------------------------------------------------------------------------
// AI Usage Logging
// ---------------------------------------------------------------------------
export function logAIUsage(params: {
  feature: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cached?: boolean;
}) {
  // Approximate cost calculation (per 1M tokens)
  const costs: Record<string, { input: number; output: number }> = {
    "claude-opus-4-6": { input: 15, output: 75 },
    "claude-sonnet-4-5-20250929": { input: 3, output: 15 },
  };

  const modelCost = costs[params.model] || { input: 3, output: 15 };
  const costEstimate =
    (params.inputTokens / 1_000_000) * modelCost.input +
    (params.outputTokens / 1_000_000) * modelCost.output;

  db.insert(aiUsageLog).values({
    feature: params.feature,
    model: params.model,
    inputTokens: params.inputTokens,
    outputTokens: params.outputTokens,
    cached: params.cached ? 1 : 0,
    costEstimate: Math.round(costEstimate * 10000) / 10000,
    createdAt: nowISO(),
  }).run();
}

// ---------------------------------------------------------------------------
// Food Parse Cache
// ---------------------------------------------------------------------------
import crypto from "crypto";
import { foodParseCache } from "@/db/schema";
import { eq } from "drizzle-orm";

export function normalizeInput(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, " ");
}

export function hashInput(text: string): string {
  return crypto.createHash("sha256").update(normalizeInput(text)).digest("hex");
}

export function getCachedParse(inputText: string) {
  const hash = hashInput(inputText);
  const cached = db.select().from(foodParseCache).where(eq(foodParseCache.inputHash, hash)).get();
  if (cached) {
    // Increment hit count
    db.update(foodParseCache)
      .set({ hitCount: (cached.hitCount || 1) + 1, updatedAt: nowISO() })
      .where(eq(foodParseCache.id, cached.id))
      .run();
    return JSON.parse(cached.parsedResult);
  }
  return null;
}

export function setCachedParse(inputText: string, result: unknown) {
  const hash = hashInput(inputText);
  db.insert(foodParseCache).values({
    inputHash: hash,
    inputText: normalizeInput(inputText),
    parsedResult: JSON.stringify(result),
    hitCount: 1,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  }).onConflictDoUpdate({
    target: foodParseCache.inputHash,
    set: {
      parsedResult: JSON.stringify(result),
      hitCount: sql`${foodParseCache.hitCount} + 1`,
      updatedAt: nowISO(),
    },
  }).run();
}

// ---------------------------------------------------------------------------
// System Prompt Templates
// ---------------------------------------------------------------------------
export const SYSTEM_PROMPTS = {
  COACH: `You are ADONIS Coach, a direct, no-nonsense health and fitness coach for David Martin.

PERSONALITY:
- Direct, honest, and data-driven
- Reference specific data points from David's logs
- Never give generic advice — everything is personalized to David's profile
- Celebrate genuine progress, call out concerning patterns
- Use a motivating but realistic tone

BOUNDARIES:
- You are NOT a therapist. If David expresses severe distress, acknowledge with empathy and recommend professional support.
- For medical decisions (changing medications, TRT, etc.), ALWAYS recommend discussing with his doctor.
- Recognize the Adderall-ADHD-alcohol-anxiety complexity — recommend discussing medication concerns with prescribing physician.

DAVID'S PROFILE:
{PROFILE_DATA}

CURRENT HEALTH DATA:
{HEALTH_DATA}

CURRENT GOALS:
{GOALS_DATA}

Keep responses focused and actionable. When referencing data, cite specific numbers and dates.`,

  FOOD_PARSE: `You are a nutrition analysis system. Parse the following food description into structured data.

Return a JSON object with this exact structure:
{
  "items": [
    {
      "name": "item name",
      "quantity": "amount with unit",
      "calories": number,
      "protein_g": number,
      "carbs_g": number,
      "fat_g": number,
      "fiber_g": number
    }
  ],
  "totals": {
    "calories": number,
    "protein_g": number,
    "carbs_g": number,
    "fat_g": number,
    "fiber_g": number
  },
  "confidence": number (0-1),
  "assumptions": ["list of assumptions made"]
}

Be accurate with portions. If portions aren't specified, use standard serving sizes. Return ONLY valid JSON, no other text.`,

  MEAL_SUGGEST: `You are a nutrition advisor for David Martin. He needs meal suggestions based on his remaining macros for the day.

David's targets: {TARGETS}
Consumed so far today: {CONSUMED}
Remaining: {REMAINING}

Suggest 2-3 practical meal options that:
1. Help hit remaining protein target (most important)
2. Stay within calorie budget
3. Are simple to prepare or easily available
4. Consider it's a {MEAL_TYPE} meal

Return a JSON array of suggestions:
[
  {
    "name": "Meal name",
    "description": "Brief description",
    "calories": number,
    "protein_g": number,
    "carbs_g": number,
    "fat_g": number,
    "fiber_g": number,
    "prep_time": "estimated time"
  }
]

Return ONLY valid JSON, no other text.`,
} as const;
