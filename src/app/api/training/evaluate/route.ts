export const dynamic = 'force-dynamic';

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc, gte, sql } from "drizzle-orm";
import { success, error, serverError, nowISO, todayET } from "@/lib/api";
import { getAnthropicClient, getModel, logAIUsage } from "@/lib/ai";
import { subDays, format } from "date-fns";

// POST /api/training/evaluate — Evaluate whether the current training phase should advance
export async function POST() {
  try {
    // 1. Get current active phase
    const activePhase = db
      .select()
      .from(schema.trainingPhases)
      .where(eq(schema.trainingPhases.status, "active"))
      .orderBy(desc(schema.trainingPhases.phaseNumber))
      .limit(1)
      .get();

    if (!activePhase) {
      return error("No active training phase found.", 404);
    }

    // 2. Get last 14 days of workout data
    const today = todayET();
    const twoWeeksAgo = format(subDays(new Date(), 14), "yyyy-MM-dd");

    const recentWorkouts = db
      .select()
      .from(schema.workouts)
      .where(gte(schema.workouts.date, twoWeeksAgo))
      .all();

    // 3. Get exercises for those workouts
    const workoutIds = recentWorkouts.map((w) => w.id);
    const recentExercises =
      workoutIds.length > 0
        ? db
            .select()
            .from(schema.exercises)
            .where(
              sql`${schema.exercises.workoutId} IN (${sql.join(
                workoutIds.map((id) => sql`${id}`),
                sql`, `
              )})`
            )
            .all()
        : [];

    // 4. Get phase-duration workout stats for consistency
    const phaseStartDate = activePhase.startDate || twoWeeksAgo;
    const phaseWorkouts = db
      .select()
      .from(schema.workouts)
      .where(gte(schema.workouts.date, phaseStartDate))
      .all();

    const completedCount = phaseWorkouts.filter(
      (w) => w.completed === 1
    ).length;

    // Parse progression rules
    let progressionRules: unknown = null;
    if (activePhase.progressionRules) {
      try {
        progressionRules = JSON.parse(activePhase.progressionRules);
      } catch {
        // ignore parse errors
      }
    }

    let prescribedWorkouts: unknown = null;
    if (activePhase.prescribedWorkouts) {
      try {
        prescribedWorkouts = JSON.parse(activePhase.prescribedWorkouts);
      } catch {
        // ignore parse errors
      }
    }

    // 5. Calculate stats
    const totalWorkouts = phaseWorkouts.length;
    const avgRpe =
      phaseWorkouts.length > 0
        ? phaseWorkouts.reduce((sum, w) => sum + (w.rpe || 0), 0) /
          phaseWorkouts.filter((w) => w.rpe != null).length || 0
        : 0;

    // Calculate weeks in phase
    const phaseStart = new Date(phaseStartDate);
    const now = new Date();
    const weeksInPhase = Math.max(
      1,
      Math.ceil(
        (now.getTime() - phaseStart.getTime()) / (1000 * 60 * 60 * 24 * 7)
      )
    );
    const plannedPerWeek = 3; // default assumption
    const plannedTotal = weeksInPhase * plannedPerWeek;
    const adherenceRate =
      plannedTotal > 0 ? completedCount / plannedTotal : 0;

    // Group exercises by name for progression tracking
    const exerciseProgress: Record<
      string,
      { dates: string[]; weights: number[]; volumes: number[] }
    > = {};
    for (const workout of recentWorkouts) {
      const exs = recentExercises.filter(
        (e) => e.workoutId === workout.id
      );
      for (const ex of exs) {
        if (!exerciseProgress[ex.exerciseName]) {
          exerciseProgress[ex.exerciseName] = {
            dates: [],
            weights: [],
            volumes: [],
          };
        }
        exerciseProgress[ex.exerciseName].dates.push(workout.date);
        exerciseProgress[ex.exerciseName].weights.push(ex.weightLbs || 0);
        exerciseProgress[ex.exerciseName].volumes.push(
          (ex.sets || 0) * (ex.reps || 0) * (ex.weightLbs || 0)
        );
      }
    }

    // 6. Call Claude Opus for evaluation
    const model = getModel("COACHING");
    const client = getAnthropicClient();

    const prompt = `You are an expert strength coach evaluating a training phase for progression decisions.

CURRENT PHASE:
- Phase ${activePhase.phaseNumber}: ${activePhase.phaseName}
- Start date: ${activePhase.startDate || "unknown"}
- End date: ${activePhase.endDate || "ongoing"}
- Weeks in phase: ${weeksInPhase}

PRESCRIBED WORKOUTS:
${JSON.stringify(prescribedWorkouts, null, 2) || "No prescribed workouts set"}

PROGRESSION RULES:
${JSON.stringify(progressionRules, null, 2) || "No progression rules set"}

WORKOUT STATS (this phase):
- Total workouts: ${totalWorkouts}
- Completed: ${completedCount}
- Planned (estimated): ${plannedTotal}
- Adherence rate: ${Math.round(adherenceRate * 100)}%
- Average RPE: ${avgRpe > 0 ? avgRpe.toFixed(1) : "Not tracked"}

LAST 2 WEEKS - EXERCISE PROGRESSION:
${JSON.stringify(exerciseProgress, null, 2)}

RECENT WORKOUTS (last 14 days):
${JSON.stringify(
  recentWorkouts.map((w) => ({
    date: w.date,
    type: w.workoutType,
    duration: w.durationMinutes,
    rpe: w.rpe,
    completed: w.completed,
  })),
  null,
  2
)}

Evaluate this training phase and provide a recommendation. Consider:
1. Workout adherence (is the user completing 90%+ of planned workouts?)
2. Exercise progression (are weights/volumes increasing over the 2-week window?)
3. RPE trends (is training becoming too easy or too hard?)
4. Time in phase (has enough time passed for adaptation, typically 4-8 weeks?)
5. Whether a deload week might be needed

Return ONLY a valid JSON object with this structure (no additional text):
{
  "recommendation": "advance" | "extend" | "deload" | "maintain",
  "rationale": "Detailed explanation of the recommendation",
  "key_observations": ["observation 1", "observation 2", ...],
  "proposed_phase": {
    "phase_name": "Name of next phase if advancing",
    "focus": "Primary focus of the next phase",
    "duration_weeks": 4-8,
    "notes": "Brief description"
  },
  "confidence": "high" | "medium" | "low"
}

If the recommendation is "maintain", "extend", or "deload", the proposed_phase can describe modifications rather than a new phase.`;

    const response = await client.messages.create({
      model,
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    // Log AI usage
    logAIUsage({
      feature: "training_evaluate",
      model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    });

    // Parse the response
    const responseText =
      response.content[0].type === "text" ? response.content[0].text : "";

    let evaluation: {
      recommendation: string;
      rationale: string;
      key_observations: string[];
      proposed_phase: {
        phase_name: string;
        focus: string;
        duration_weeks: number;
        notes: string;
      } | null;
      confidence: string;
    };

    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      evaluation = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(responseText);
    } catch {
      return error("Failed to parse AI evaluation response.", 500);
    }

    return success({
      current_phase: {
        id: activePhase.id,
        phaseNumber: activePhase.phaseNumber,
        phaseName: activePhase.phaseName,
        startDate: activePhase.startDate,
        endDate: activePhase.endDate,
        weeksInPhase,
      },
      stats: {
        totalWorkouts,
        completedCount,
        plannedTotal,
        adherenceRate: Math.round(adherenceRate * 100),
        avgRpe: avgRpe > 0 ? Math.round(avgRpe * 10) / 10 : null,
      },
      recommendation: evaluation.recommendation,
      rationale: evaluation.rationale,
      key_observations: evaluation.key_observations,
      proposed_phase: evaluation.proposed_phase,
      confidence: evaluation.confidence,
      evaluated_at: nowISO(),
    });
  } catch (err) {
    return serverError(err);
  }
}
