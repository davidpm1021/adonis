import { db } from "@/db";
import * as schema from "@/db/schema";
import { desc, gte } from "drizzle-orm";
import { success, serverError, withErrorHandling, dateRangeParams, nowISO, todayET } from "@/lib/api";
import { getAnthropicClient, getModel, logAIUsage } from "@/lib/ai";
import { subDays, format } from "date-fns";

// GET /api/insights/nutrition — List nutrition insights ordered by created_at desc
export const GET = withErrorHandling(async (req) => {
  const url = new URL(req.url);
  const { limit, offset } = dateRangeParams(url);

  const rows = await db
    .select()
    .from(schema.nutritionInsights)
    .orderBy(desc(schema.nutritionInsights.createdAt))
    .limit(limit)
    .offset(offset);

  return success(rows);
});

// POST /api/insights/nutrition — Generate fresh nutrition insights from last 30 days
export async function POST() {
  try {
    const today = todayET();
    const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyy-MM-dd");
    const now = nowISO();

    // Get last 30 days of nutrition data
    const nutritionLogs = db
      .select()
      .from(schema.nutritionLog)
      .where(gte(schema.nutritionLog.date, thirtyDaysAgo))
      .all();

    if (nutritionLogs.length === 0) {
      return success({
        insights: [],
        stats: null,
        message: "No nutrition data in the last 30 days to analyze.",
      });
    }

    // Aggregate data by day
    const dailyData: Record<
      string,
      {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        fiber: number;
        meals: { type: string; description: string | null; calories: number }[];
      }
    > = {};

    for (const log of nutritionLogs) {
      if (!dailyData[log.date]) {
        dailyData[log.date] = {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          fiber: 0,
          meals: [],
        };
      }
      dailyData[log.date].calories += log.calories || 0;
      dailyData[log.date].protein += log.proteinG || 0;
      dailyData[log.date].carbs += log.carbsG || 0;
      dailyData[log.date].fat += log.fatG || 0;
      dailyData[log.date].fiber += log.fiberG || 0;
      dailyData[log.date].meals.push({
        type: log.mealType,
        description: log.description,
        calories: log.calories || 0,
      });
    }

    // Compute stats
    const days = Object.entries(dailyData);
    const totalDays = days.length;

    // Weekend vs weekday
    const weekdayDays = days.filter(([date]) => {
      const d = new Date(date + "T12:00:00");
      const dow = d.getDay();
      return dow >= 1 && dow <= 5;
    });
    const weekendDays = days.filter(([date]) => {
      const d = new Date(date + "T12:00:00");
      const dow = d.getDay();
      return dow === 0 || dow === 6;
    });

    const avgWeekdayCals =
      weekdayDays.length > 0
        ? Math.round(
            weekdayDays.reduce((s, [, d]) => s + d.calories, 0) /
              weekdayDays.length
          )
        : 0;
    const avgWeekendCals =
      weekendDays.length > 0
        ? Math.round(
            weekendDays.reduce((s, [, d]) => s + d.calories, 0) /
              weekendDays.length
          )
        : 0;

    // Protein by meal type
    const proteinByMeal: Record<string, { total: number; count: number }> = {};
    for (const log of nutritionLogs) {
      if (!proteinByMeal[log.mealType]) {
        proteinByMeal[log.mealType] = { total: 0, count: 0 };
      }
      proteinByMeal[log.mealType].total += log.proteinG || 0;
      proteinByMeal[log.mealType].count += 1;
    }

    // Fiber compliance
    const currentTargets = db
      .select()
      .from(schema.nutritionTargets)
      .orderBy(desc(schema.nutritionTargets.effectiveDate))
      .limit(1)
      .get();

    const fiberTarget = currentTargets?.fiberMin || 25;
    const daysHittingFiber = days.filter(
      ([, d]) => d.fiber >= fiberTarget
    ).length;
    const fiberComplianceRate =
      totalDays > 0 ? Math.round((daysHittingFiber / totalDays) * 100) : 0;

    // Most common meals
    const mealCounts: Record<string, number> = {};
    for (const log of nutritionLogs) {
      const desc = log.description?.toLowerCase().trim();
      if (desc && desc.length > 2) {
        mealCounts[desc] = (mealCounts[desc] || 0) + 1;
      }
    }
    const topMeals = Object.entries(mealCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([meal, count]) => ({ meal, count }));

    // Restaurant/takeout detection
    const takeoutKeywords = [
      "restaurant",
      "takeout",
      "delivery",
      "uber eats",
      "doordash",
      "grubhub",
      "chipotle",
      "mcdonald",
      "chick-fil-a",
      "subway",
      "pizza",
      "burger king",
      "wendy",
      "taco bell",
      "panda express",
      "dining out",
      "ate out",
      "ordered",
    ];
    let takeoutMeals = 0;
    for (const log of nutritionLogs) {
      const desc = (log.description || "").toLowerCase();
      if (takeoutKeywords.some((kw) => desc.includes(kw))) {
        takeoutMeals++;
      }
    }

    const computedStats = {
      total_days_tracked: totalDays,
      total_entries: nutritionLogs.length,
      avg_weekday_calories: avgWeekdayCals,
      avg_weekend_calories: avgWeekendCals,
      weekend_vs_weekday_diff: avgWeekendCals - avgWeekdayCals,
      protein_by_meal: Object.fromEntries(
        Object.entries(proteinByMeal).map(([type, data]) => [
          type,
          {
            avg_per_meal: Math.round(data.total / data.count),
            total_entries: data.count,
          },
        ])
      ),
      fiber_compliance_rate: fiberComplianceRate,
      fiber_days_hit: daysHittingFiber,
      fiber_target: fiberTarget,
      top_meals: topMeals,
      takeout_meals: takeoutMeals,
      takeout_percentage:
        nutritionLogs.length > 0
          ? Math.round((takeoutMeals / nutritionLogs.length) * 100)
          : 0,
    };

    // Call Claude for pattern analysis
    const model = getModel("FOOD_PARSE"); // Sonnet for cost efficiency
    const client = getAnthropicClient();

    const prompt = `You are a nutrition analyst. Analyze these 30-day nutrition patterns and generate concise insights.

COMPUTED STATS:
${JSON.stringify(computedStats, null, 2)}

Generate 3-5 specific, actionable insights. Focus on:
1. Weekend vs weekday eating patterns
2. Protein distribution across meals
3. Fiber compliance trends
4. Meal variety and frequency
5. Restaurant/takeout frequency if notable

Return ONLY a valid JSON array (no additional text):
[
  {
    "type": "pattern" | "achievement" | "concern" | "suggestion",
    "title": "Short title",
    "content": "Concise insight with specific data points"
  }
]`;

    const response = await client.messages.create({
      model,
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    });

    logAIUsage({
      feature: "nutrition_insights",
      model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    });

    const responseText =
      response.content[0].type === "text" ? response.content[0].text : "";

    let aiInsights: { type: string; title: string; content: string }[] = [];
    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      aiInsights = jsonMatch
        ? JSON.parse(jsonMatch[0])
        : JSON.parse(responseText);
    } catch {
      aiInsights = [];
    }

    // Store insights in the database
    for (const insight of aiInsights) {
      db.insert(schema.nutritionInsights)
        .values({
          insightType: insight.type,
          content: `**${insight.title}**: ${insight.content}`,
          dataRangeStart: thirtyDaysAgo,
          dataRangeEnd: today,
          createdAt: now,
        })
        .run();
    }

    // Get stored insights (including the ones we just created)
    const storedInsights = db
      .select()
      .from(schema.nutritionInsights)
      .orderBy(desc(schema.nutritionInsights.createdAt))
      .limit(20)
      .all();

    return success({
      insights: storedInsights,
      stats: computedStats,
      ai_insights: aiInsights,
      generated_at: now,
    });
  } catch (err) {
    return serverError(err);
  }
}
