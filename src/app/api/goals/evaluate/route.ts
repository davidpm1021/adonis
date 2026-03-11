export const dynamic = 'force-dynamic';

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc, gte } from "drizzle-orm";
import { success, error, serverError, nowISO, todayET } from "@/lib/api";
import { getAnthropicClient, getModel, logAIUsage } from "@/lib/ai";
import { subDays, format, differenceInDays, parseISO } from "date-fns";

// POST /api/goals/evaluate — Scan active goals for achievements or staleness
export async function POST() {
  try {
    // 1. Get all active goals
    const activeGoals = db
      .select()
      .from(schema.goals)
      .where(eq(schema.goals.status, "active"))
      .all();

    if (activeGoals.length === 0) {
      return success({
        achieved: [],
        stalled: [],
        proposed_new_goals: [],
        message: "No active goals to evaluate.",
      });
    }

    // 2. Get recent data for comparison
    const today = todayET();
    const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyy-MM-dd");

    // Get latest body metrics for weight/body comp goals
    const latestMetrics = db
      .select()
      .from(schema.bodyMetrics)
      .orderBy(desc(schema.bodyMetrics.date))
      .limit(1)
      .get();

    // Get recent weight trend
    const recentWeights = db
      .select()
      .from(schema.bodyMetrics)
      .where(gte(schema.bodyMetrics.date, thirtyDaysAgo))
      .all();

    // Get goal history for staleness detection
    const goalHistoryRows = db
      .select()
      .from(schema.goalHistory)
      .orderBy(desc(schema.goalHistory.eventDate))
      .all();

    // Get recent workout data
    const recentWorkouts = db
      .select()
      .from(schema.workouts)
      .where(gte(schema.workouts.date, thirtyDaysAgo))
      .all();

    // Get recent nutrition data
    const recentNutrition = db
      .select()
      .from(schema.nutritionLog)
      .where(gte(schema.nutritionLog.date, thirtyDaysAgo))
      .all();

    // Get recent sleep data
    const recentSleep = db
      .select()
      .from(schema.sleepLog)
      .where(gte(schema.sleepLog.date, thirtyDaysAgo))
      .all();

    // 3. Evaluate each goal
    const achieved: {
      goal_id: number;
      description: string;
      category: string;
      achievement_details: string;
    }[] = [];

    const stalled: {
      goal_id: number;
      description: string;
      category: string;
      days_since_progress: number;
      suggestion: string;
    }[] = [];

    for (const goal of activeGoals) {
      // Check achievement: if target_value and current_value exist and target is met
      if (
        goal.targetValue != null &&
        goal.currentValue != null &&
        goal.currentValue >= goal.targetValue
      ) {
        achieved.push({
          goal_id: goal.id,
          description: goal.description,
          category: goal.category,
          achievement_details: `Target ${goal.targetValue}${goal.targetUnit ? " " + goal.targetUnit : ""} reached with current value ${goal.currentValue}${goal.targetUnit ? " " + goal.targetUnit : ""}`,
        });
        continue;
      }

      // Check for auto-detectable achievements based on category
      if (goal.category === "weight" && latestMetrics?.weight != null && goal.targetValue != null) {
        // For weight loss goals, current might be less than target
        if (goal.description.toLowerCase().includes("lose") || goal.description.toLowerCase().includes("under")) {
          if (latestMetrics.weight <= goal.targetValue) {
            achieved.push({
              goal_id: goal.id,
              description: goal.description,
              category: goal.category,
              achievement_details: `Current weight ${latestMetrics.weight} lbs has reached target of ${goal.targetValue} lbs`,
            });
            continue;
          }
        }
      }

      // Check for staleness: no goal history updates in 30+ days
      const goalUpdates = goalHistoryRows.filter(
        (h) => h.goalId === goal.id
      );
      const lastUpdate = goalUpdates[0]; // already sorted desc
      const daysSinceProgress = lastUpdate
        ? differenceInDays(new Date(), parseISO(lastUpdate.eventDate))
        : goal.updatedAt
        ? differenceInDays(new Date(), parseISO(goal.updatedAt))
        : goal.createdAt
        ? differenceInDays(new Date(), parseISO(goal.createdAt))
        : 999;

      if (daysSinceProgress >= 30) {
        stalled.push({
          goal_id: goal.id,
          description: goal.description,
          category: goal.category,
          days_since_progress: daysSinceProgress,
          suggestion: `This goal has had no progress updates in ${daysSinceProgress} days. Consider updating the target, adjusting the approach, or archiving if no longer relevant.`,
        });
      }
    }

    // 4. Call Claude for new goal suggestions based on current data
    const model = getModel("FOOD_PARSE"); // Sonnet for cost efficiency
    const client = getAnthropicClient();

    const currentGoalsSummary = activeGoals
      .map(
        (g) =>
          `- [${g.category}] ${g.description} (target: ${g.targetValue ?? "N/A"} ${g.targetUnit ?? ""}, current: ${g.currentValue ?? "N/A"})`
      )
      .join("\n");

    const prompt = `You are a health coach analyzing a client's data to suggest new goals.

CURRENT ACTIVE GOALS:
${currentGoalsSummary || "None"}

RECENT DATA SUMMARY (last 30 days):
- Weight data points: ${recentWeights.length}${latestMetrics?.weight ? `, latest weight: ${latestMetrics.weight} lbs` : ""}
- Workouts completed: ${recentWorkouts.filter((w) => w.completed === 1).length}
- Nutrition entries: ${recentNutrition.length}
- Sleep entries: ${recentSleep.length}${recentSleep.length > 0 ? `, avg sleep quality: ${Math.round(recentSleep.reduce((s, l) => s + (l.sleepQuality || 0), 0) / recentSleep.length)}/10` : ""}

ACHIEVED GOALS:
${achieved.map((a) => `- ${a.description}: ${a.achievement_details}`).join("\n") || "None"}

STALLED GOALS:
${stalled.map((s) => `- ${s.description}: ${s.days_since_progress} days without progress`).join("\n") || "None"}

Based on the current goals and data, suggest 1-3 new goals that would be meaningful. Only suggest goals that are:
1. Not duplicates of existing active goals
2. Specific and measurable
3. Achievable within 1-6 months
4. Relevant to the user's health journey

Return ONLY a valid JSON array (no additional text):
[
  {
    "category": "weight" | "training" | "nutrition" | "sleep" | "health" | "body_composition",
    "description": "Specific goal description",
    "target_value": number or null,
    "target_unit": "unit string" or null,
    "rationale": "Why this goal matters now"
  }
]

If no new goals are needed, return an empty array: []`;

    const response = await client.messages.create({
      model,
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    });

    logAIUsage({
      feature: "goals_evaluate",
      model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    });

    const responseText =
      response.content[0].type === "text" ? response.content[0].text : "";

    let proposedGoals: {
      category: string;
      description: string;
      target_value: number | null;
      target_unit: string | null;
      rationale: string;
    }[] = [];

    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      proposedGoals = jsonMatch
        ? JSON.parse(jsonMatch[0])
        : JSON.parse(responseText);
    } catch {
      // If parsing fails, just return empty proposed goals
      proposedGoals = [];
    }

    return success({
      achieved,
      stalled,
      proposed_new_goals: proposedGoals,
      total_active_goals: activeGoals.length,
      evaluated_at: nowISO(),
    });
  } catch (err) {
    return serverError(err);
  }
}
