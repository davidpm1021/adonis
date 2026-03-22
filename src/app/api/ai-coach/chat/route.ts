export const dynamic = 'force-dynamic';

import { db } from "@/db";
import * as schema from "@/db/schema";
import { success, error, withErrorHandling, parseBody, nowISO, todayET } from "@/lib/api";
import { checkRateLimit, getAnthropicClient, getModel, logAIUsage, SYSTEM_PROMPTS } from "@/lib/ai";
import { aiChatSchema } from "@/lib/validations";
import { desc, eq } from "drizzle-orm";
import crypto from "crypto";

// POST /api/ai-coach/chat — Send a message to the AI Coach
export const POST = withErrorHandling(async (req) => {
  const data = await parseBody(req, aiChatSchema);

  // Check rate limit
  const rateLimit = await checkRateLimit();
  if (!rateLimit.allowed) {
    return error(
      `Daily message limit reached (${rateLimit.limit}/day). Resets at midnight ET.`,
      429,
    );
  }

  // Generate session ID if not provided
  const sessionId = data.sessionId || crypto.randomUUID();
  const now = nowISO();

  // Save user message
  await db.insert(schema.aiConversations).values({
    sessionId,
    role: "user",
    content: data.message,
    createdAt: now,
  });

  // Try to call the Anthropic API; fall back to placeholder if not configured
  let assistantMessage: string;
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    const client = getAnthropicClient();
    const model = getModel("COACHING");

    // Build context data for the system prompt
    const [profileData, healthData, goalsData, conversationHistory] = await Promise.all([
      buildProfileContext(),
      buildHealthContext(),
      buildGoalsContext(),
      buildConversationHistory(sessionId),
    ]);

    const systemPrompt = SYSTEM_PROMPTS.COACH
      .replace("{PROFILE_DATA}", profileData)
      .replace("{HEALTH_DATA}", healthData)
      .replace("{GOALS_DATA}", goalsData);

    // Build messages array with conversation history
    const messages: { role: "user" | "assistant"; content: string }[] = [
      ...conversationHistory,
      { role: "user" as const, content: data.message },
    ];

    const response = await client.messages.create({
      model,
      max_tokens: 1500,
      system: systemPrompt,
      messages,
    });

    // Extract text from response
    assistantMessage = response.content
      .filter((block) => block.type === "text")
      .map((block) => {
        if (block.type === "text") return block.text;
        return "";
      })
      .join("\n");

    inputTokens = response.usage.input_tokens;
    outputTokens = response.usage.output_tokens;

    // Log AI usage
    await logAIUsage({
      feature: "ai_coach",
      model,
      inputTokens,
      outputTokens,
    });
  } catch (err) {
    // If API key is not configured or API call fails, return a helpful fallback
    const errMsg = err instanceof Error ? err.message : "Unknown error";

    if (errMsg.includes("ANTHROPIC_API_KEY")) {
      assistantMessage =
        "AI Coach is not yet configured. Please set your ANTHROPIC_API_KEY in .env.local to enable coaching.";
    } else {
      console.error("AI Coach error:", errMsg);
      assistantMessage =
        "Coach is temporarily unavailable. Please try again in a moment. If this persists, check your API key configuration in Settings.";
    }
  }

  // Save assistant message
  await db.insert(schema.aiConversations).values({
    sessionId,
    role: "assistant",
    content: assistantMessage,
    createdAt: nowISO(),
  });

  // Re-check rate limit to get updated remaining count
  const updatedRateLimit = await checkRateLimit();

  return success({
    sessionId,
    message: assistantMessage,
    rateLimit: {
      remaining: updatedRateLimit.remaining,
      limit: updatedRateLimit.limit,
    },
    usage: inputTokens > 0 ? { inputTokens, outputTokens } : undefined,
  });
});

// ---------------------------------------------------------------------------
// Context builders
// ---------------------------------------------------------------------------

async function buildProfileContext(): Promise<string> {
  try {
    const profile = (await db.select().from(schema.userProfile))[0];
    if (!profile) return "No profile data available.";

    const parts: string[] = [];
    if (profile.name) parts.push(`Name: ${profile.name}`);
    if (profile.dob) parts.push(`DOB: ${profile.dob}`);
    if (profile.sex) parts.push(`Sex: ${profile.sex}`);
    if (profile.heightInches) {
      const ft = Math.floor(profile.heightInches / 12);
      const inches = profile.heightInches % 12;
      parts.push(`Height: ${ft}'${inches}"`);
    }
    if (profile.startingWeight) parts.push(`Starting Weight: ${profile.startingWeight} lbs`);
    if (profile.goalWeightLow && profile.goalWeightHigh) {
      parts.push(`Goal Weight: ${profile.goalWeightLow}-${profile.goalWeightHigh} lbs`);
    }
    if (profile.sobrietyStartDate) parts.push(`Sobriety Start: ${profile.sobrietyStartDate}`);
    if (profile.medicalConditions) {
      try {
        const conds = JSON.parse(profile.medicalConditions);
        if (Array.isArray(conds) && conds.length > 0) parts.push(`Medical: ${conds.join(", ")}`);
      } catch { /* ignore */ }
    }
    if (profile.medications) {
      try {
        const meds = JSON.parse(profile.medications);
        if (Array.isArray(meds) && meds.length > 0) parts.push(`Medications: ${meds.join(", ")}`);
      } catch { /* ignore */ }
    }

    return parts.join("\n") || "No profile data available.";
  } catch {
    return "No profile data available.";
  }
}

async function buildHealthContext(): Promise<string> {
  const today = todayET();
  const parts: string[] = [];

  try {
    // Latest 7 daily logs
    const logs = await db
      .select()
      .from(schema.dailyLog)
      .orderBy(desc(schema.dailyLog.date))
      .limit(7);

    if (logs.length > 0) {
      parts.push("RECENT DAILY LOGS (last 7):");
      for (const log of logs) {
        const items: string[] = [`  ${log.date}:`];
        if (log.energy != null) items.push(`Energy=${log.energy}/10`);
        if (log.mood != null) items.push(`Mood=${log.mood}/10`);
        if (log.stress != null) items.push(`Stress=${log.stress}/10`);
        if (log.morningWalk) items.push("Walk=Yes");
        if (log.strengthTraining) items.push("Trained=Yes");
        if (log.alcoholFree === 0) items.push("ALCOHOL=Yes");
        parts.push(items.join(" "));
      }
    }

    // Latest body metrics
    const metrics = await db
      .select()
      .from(schema.bodyMetrics)
      .orderBy(desc(schema.bodyMetrics.date))
      .limit(3);

    if (metrics.length > 0) {
      parts.push("\nRECENT BODY METRICS:");
      for (const m of metrics) {
        const items: string[] = [`  ${m.date}:`];
        if (m.weight != null) items.push(`Weight=${m.weight}lbs`);
        if (m.bodyFatPercentage != null) items.push(`BF=${m.bodyFatPercentage}%`);
        if (m.waistInches != null) items.push(`Waist=${m.waistInches}in`);
        parts.push(items.join(" "));
      }
    }

    // Latest sleep logs
    const sleepLogs = await db
      .select()
      .from(schema.sleepLog)
      .orderBy(desc(schema.sleepLog.date))
      .limit(7);

    if (sleepLogs.length > 0) {
      parts.push("\nRECENT SLEEP (last 7):");
      for (const s of sleepLogs) {
        const items: string[] = [`  ${s.date}:`];
        if (s.totalHours != null) items.push(`${s.totalHours.toFixed(1)}hrs`);
        if (s.sleepQuality != null) items.push(`Quality=${s.sleepQuality}/10`);
        if (s.bipapUsed != null) items.push(`BiPAP=${s.bipapUsed ? "Yes" : "No"}`);
        parts.push(items.join(" "));
      }
    }

    // Latest labs (priority 1 only, last draw)
    const labs = await db
      .select()
      .from(schema.labResults)
      .orderBy(desc(schema.labResults.date))
      .limit(20);

    if (labs.length > 0) {
      parts.push("\nRECENT LAB RESULTS:");
      for (const lab of labs.slice(0, 10)) {
        parts.push(`  ${lab.date}: ${lab.testName} = ${lab.value} ${lab.unit}${lab.flag ? ` (${lab.flag})` : ""}`);
      }
    }

    // Current training phase
    const phase = (await db
      .select()
      .from(schema.trainingPhases)
      .where(eq(schema.trainingPhases.status, "active"))
      .limit(1))[0];

    if (phase) {
      parts.push(`\nCURRENT TRAINING PHASE: Phase ${phase.phaseNumber} - ${phase.phaseName} (${phase.startDate} to ${phase.endDate || "ongoing"})`);
    }
  } catch {
    parts.push("Error loading health data.");
  }

  return parts.join("\n") || "No health data available yet.";
}

async function buildGoalsContext(): Promise<string> {
  try {
    const goals = await db
      .select()
      .from(schema.goals)
      .where(eq(schema.goals.status, "active"));

    if (goals.length === 0) return "No active goals set.";

    const lines = goals.map((g) => {
      let line = `- [${g.category}] ${g.description}`;
      if (g.targetValue != null && g.targetUnit) {
        line += ` (Target: ${g.targetValue} ${g.targetUnit})`;
      }
      if (g.targetDate) line += ` by ${g.targetDate}`;
      if (g.currentValue != null) line += ` | Current: ${g.currentValue}`;
      return line;
    });

    return lines.join("\n");
  } catch {
    return "No goals data available.";
  }
}

async function buildConversationHistory(
  sessionId: string,
): Promise<{ role: "user" | "assistant"; content: string }[]> {
  try {
    const messages = await db
      .select()
      .from(schema.aiConversations)
      .where(eq(schema.aiConversations.sessionId, sessionId))
      .orderBy(schema.aiConversations.id);

    // Return last 20 messages to keep context window reasonable
    return messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-20)
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));
  } catch {
    return [];
  }
}
