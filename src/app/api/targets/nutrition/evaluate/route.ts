export const dynamic = 'force-dynamic';

import { db } from "@/db";
import * as schema from "@/db/schema";
import { desc, gte } from "drizzle-orm";
import { success, error, serverError, nowISO, todayET } from "@/lib/api";
import { getAnthropicClient, getModel, logAIUsage } from "@/lib/ai";
import { subDays, format } from "date-fns";

// POST /api/targets/nutrition/evaluate — Evaluate if nutrition targets should be adjusted
export async function POST() {
  try {
    // 1. Get current nutrition targets
    const currentTargets = db
      .select()
      .from(schema.nutritionTargets)
      .orderBy(desc(schema.nutritionTargets.effectiveDate))
      .limit(1)
      .get();

    if (!currentTargets) {
      return error("No nutrition targets configured.", 404);
    }

    // 2. Get last 14 days of nutrition data
    const today = todayET();
    const twoWeeksAgo = format(subDays(new Date(), 14), "yyyy-MM-dd");

    const nutritionLogs = db
      .select()
      .from(schema.nutritionLog)
      .where(gte(schema.nutritionLog.date, twoWeeksAgo))
      .all();

    // 3. Get weight trend (last 14 days)
    const weightData = db
      .select()
      .from(schema.bodyMetrics)
      .where(gte(schema.bodyMetrics.date, twoWeeksAgo))
      .all();

    // 4. Get daily logs for activity level
    const dailyLogs = db
      .select()
      .from(schema.dailyLog)
      .where(gte(schema.dailyLog.date, twoWeeksAgo))
      .all();

    // 5. Aggregate nutrition data by day
    const dailyNutrition: Record<
      string,
      {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        fiber: number;
        meals: number;
      }
    > = {};

    for (const log of nutritionLogs) {
      if (!dailyNutrition[log.date]) {
        dailyNutrition[log.date] = {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          fiber: 0,
          meals: 0,
        };
      }
      dailyNutrition[log.date].calories += log.calories || 0;
      dailyNutrition[log.date].protein += log.proteinG || 0;
      dailyNutrition[log.date].carbs += log.carbsG || 0;
      dailyNutrition[log.date].fat += log.fatG || 0;
      dailyNutrition[log.date].fiber += log.fiberG || 0;
      dailyNutrition[log.date].meals += 1;
    }

    const daysWithData = Object.keys(dailyNutrition).length;
    const avgCalories =
      daysWithData > 0
        ? Math.round(
            Object.values(dailyNutrition).reduce(
              (s, d) => s + d.calories,
              0
            ) / daysWithData
          )
        : 0;
    const avgProtein =
      daysWithData > 0
        ? Math.round(
            Object.values(dailyNutrition).reduce(
              (s, d) => s + d.protein,
              0
            ) / daysWithData
          )
        : 0;
    const avgCarbs =
      daysWithData > 0
        ? Math.round(
            Object.values(dailyNutrition).reduce(
              (s, d) => s + d.carbs,
              0
            ) / daysWithData
          )
        : 0;
    const avgFat =
      daysWithData > 0
        ? Math.round(
            Object.values(dailyNutrition).reduce((s, d) => s + d.fat, 0) /
              daysWithData
          )
        : 0;
    const avgFiber =
      daysWithData > 0
        ? Math.round(
            Object.values(dailyNutrition).reduce(
              (s, d) => s + d.fiber,
              0
            ) / daysWithData
          )
        : 0;

    // Weight trend
    const weights = weightData
      .filter((w) => w.weight != null)
      .sort((a, b) => a.date.localeCompare(b.date));

    const weightTrend =
      weights.length >= 2
        ? {
            start: weights[0].weight,
            end: weights[weights.length - 1].weight,
            change:
              Math.round(
                ((weights[weights.length - 1].weight || 0) -
                  (weights[0].weight || 0)) *
                  10
              ) / 10,
          }
        : null;

    // Activity level
    const activeDays = dailyLogs.filter(
      (d) => d.strengthTraining === 1
    ).length;
    const walkDays = dailyLogs.filter((d) => d.morningWalk === 1).length;

    // 6. Call Claude Sonnet for cost-efficient analysis
    const model = getModel("FOOD_PARSE"); // Sonnet for cost efficiency
    const client = getAnthropicClient();

    const prompt = `You are a sports nutritionist evaluating whether a client's nutrition targets need adjustment.

CURRENT TARGETS:
- Calories: ${currentTargets.caloriesMin}-${currentTargets.caloriesMax} kcal
- Protein: ${currentTargets.proteinMin}-${currentTargets.proteinMax}g
- Carbs: ${currentTargets.carbsMin}-${currentTargets.carbsMax}g
- Fat: ${currentTargets.fatMin}-${currentTargets.fatMax}g
- Fiber: ${currentTargets.fiberMin}-${currentTargets.fiberMax}g
- Current rationale: ${currentTargets.rationale || "None set"}

ACTUAL INTAKE (14-day averages, ${daysWithData} days with data):
- Avg calories: ${avgCalories} kcal
- Avg protein: ${avgProtein}g
- Avg carbs: ${avgCarbs}g
- Avg fat: ${avgFat}g
- Avg fiber: ${avgFiber}g

DAILY BREAKDOWN:
${JSON.stringify(dailyNutrition, null, 2)}

WEIGHT TREND:
${
  weightTrend
    ? `Start: ${weightTrend.start} lbs -> End: ${weightTrend.end} lbs (Change: ${weightTrend.change > 0 ? "+" : ""}${weightTrend.change} lbs)`
    : "Insufficient weight data"
}

ACTIVITY LEVEL (last 14 days):
- Strength training days: ${activeDays}
- Morning walk days: ${walkDays}

Analyze whether the current nutrition targets should be adjusted. Consider:
1. Is the user consistently hitting or missing targets?
2. Is the weight trending as expected for the current calorie target?
3. Is protein sufficient for muscle preservation/growth?
4. Are there macro imbalances that should be corrected?

Return ONLY a valid JSON object (no additional text):
{
  "recommendation": "adjust" | "maintain",
  "analysis": "Detailed analysis of current nutrition patterns vs targets",
  "proposed_targets": {
    "calories_min": number,
    "calories_max": number,
    "protein_min": number,
    "protein_max": number,
    "carbs_min": number,
    "carbs_max": number,
    "fat_min": number,
    "fat_max": number,
    "fiber_min": number,
    "fiber_max": number,
    "rationale": "Why these specific adjustments"
  },
  "key_findings": ["finding 1", "finding 2", ...]
}

If maintaining, proposed_targets should match current targets with an updated rationale explaining why no change is needed.`;

    const response = await client.messages.create({
      model,
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    });

    logAIUsage({
      feature: "nutrition_evaluate",
      model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    });

    const responseText =
      response.content[0].type === "text" ? response.content[0].text : "";

    let evaluation: {
      recommendation: string;
      analysis: string;
      proposed_targets: {
        calories_min: number;
        calories_max: number;
        protein_min: number;
        protein_max: number;
        carbs_min: number;
        carbs_max: number;
        fat_min: number;
        fat_max: number;
        fiber_min: number;
        fiber_max: number;
        rationale: string;
      };
      key_findings: string[];
    };

    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      evaluation = jsonMatch
        ? JSON.parse(jsonMatch[0])
        : JSON.parse(responseText);
    } catch {
      return error("Failed to parse AI evaluation response.", 500);
    }

    return success({
      recommendation: evaluation.recommendation,
      current_targets: {
        calories_min: currentTargets.caloriesMin,
        calories_max: currentTargets.caloriesMax,
        protein_min: currentTargets.proteinMin,
        protein_max: currentTargets.proteinMax,
        carbs_min: currentTargets.carbsMin,
        carbs_max: currentTargets.carbsMax,
        fat_min: currentTargets.fatMin,
        fat_max: currentTargets.fatMax,
        fiber_min: currentTargets.fiberMin,
        fiber_max: currentTargets.fiberMax,
      },
      proposed_targets: evaluation.proposed_targets,
      actual_averages: {
        calories: avgCalories,
        protein: avgProtein,
        carbs: avgCarbs,
        fat: avgFat,
        fiber: avgFiber,
        days_with_data: daysWithData,
      },
      weight_trend: weightTrend,
      analysis: evaluation.analysis,
      key_findings: evaluation.key_findings,
      evaluated_at: nowISO(),
    });
  } catch (err) {
    return serverError(err);
  }
}
