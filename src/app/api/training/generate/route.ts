export const dynamic = 'force-dynamic';

import { db } from "@/db";
import * as schema from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { success, error, withErrorHandling, nowISO } from "@/lib/api";
import { getAnthropicClient, getModel, logAIUsage } from "@/lib/ai";
import type Anthropic from "@anthropic-ai/sdk";

// POST /api/training/generate — AI-generated progressive workout based on recent history
export const POST = withErrorHandling(async () => {
  // Fetch current phase
  const phases = await db
    .select()
    .from(schema.trainingPhases)
    .where(eq(schema.trainingPhases.status, "active"))
    .limit(1);

  const phase = phases[0] ?? null;

  // Fetch last 5 workouts with exercises
  const recentWorkouts = await db
    .select()
    .from(schema.workouts)
    .orderBy(desc(schema.workouts.date))
    .limit(5);

  const workoutsWithExercises = await Promise.all(
    recentWorkouts.map(async (w) => {
      const exs = await db
        .select()
        .from(schema.exercises)
        .where(eq(schema.exercises.workoutId, w.id));
      return { ...w, exercises: exs };
    })
  );

  // Fetch profile for context
  const profileRows = await db
    .select()
    .from(schema.userProfile)
    .where(eq(schema.userProfile.id, 1))
    .limit(1);
  const profile = profileRows[0] ?? null;

  // Build the prompt
  let phaseContext = "No active training phase.";
  if (phase) {
    phaseContext = `CURRENT PHASE: Phase ${phase.phaseNumber} — ${phase.phaseName}
Start: ${phase.startDate}, End: ${phase.endDate}
Notes: ${phase.notes || "None"}

PRESCRIBED WORKOUTS:
${phase.prescribedWorkouts || "None"}

PROGRESSION RULES:
${phase.progressionRules || "None"}`;
  }

  let historyContext = "No previous workouts logged.";
  if (workoutsWithExercises.length > 0) {
    historyContext = workoutsWithExercises
      .map((w) => {
        const exList = w.exercises
          .map(
            (e) =>
              `    ${e.exerciseName}: ${e.sets ?? "?"}x${e.reps ?? "?"} @ ${e.weightLbs ?? "BW"} lbs${e.notes ? ` (${e.notes})` : ""}`
          )
          .join("\n");
        return `  ${w.date} — ${w.workoutType} | ${w.durationMinutes ?? "?"}min | RPE ${w.rpe ?? "?"}/10 | ${w.completed ? "Completed" : "Incomplete"}${w.notes ? ` | Notes: ${w.notes}` : ""}
${exList || "    (no exercises logged)"}${w.coachFeedback ? `\n    ATHLETE FEEDBACK: ${w.coachFeedback}` : ""}`;
      })
      .join("\n\n");
  }

  let profileContext = "";
  if (profile) {
    const conditions = profile.medicalConditions
      ? (() => { try { return JSON.parse(profile.medicalConditions); } catch { return []; } })()
      : [];
    profileContext = `ATHLETE: ${profile.name || "User"}, ${profile.sex || "unknown"}, ${profile.heightInches ? `${Math.floor(profile.heightInches / 12)}'${profile.heightInches % 12}"` : "height unknown"}
Medical considerations: ${conditions.length > 0 ? conditions.join(", ") : "None noted"}`;
  }

  const systemPrompt = `You are an expert strength & conditioning coach generating the next workout for a client.

${profileContext}

${phaseContext}

LAST ${workoutsWithExercises.length} WORKOUTS (most recent first):
${historyContext}

INSTRUCTIONS:
- Generate the next logical workout applying the progression rules from the current phase.
- Look at the last 5 workouts to determine appropriate weight/rep/set progressions.
- If the athlete completed all prescribed sets and reps at the same weight for 2+ sessions, progress the weight by 5 lbs.
- If RPE was consistently high (>8), reduce load slightly.
- If RPE was consistently low (<5), increase volume or weight.
- Respect any medical considerations (especially Achilles issues).
- Keep the workout within the prescribed phase structure.
- If no previous workouts exist, generate the first workout from the prescribed plan with conservative starting weights.
- PAY CLOSE ATTENTION to "ATHLETE FEEDBACK" entries — these are direct check-ins from the athlete about how exercises felt, what they struggled with, form issues, energy levels, and pain. Use this feedback to adjust exercise selection, weight, volume, and provide relevant coaching cues. For example, if the athlete reported struggling with push-ups, consider reducing reps/sets or offering a regression. If they said an exercise felt easy, progress it.

Return ONLY valid JSON with this exact structure:
{
  "workoutType": "Strength",
  "durationMinutes": number,
  "rpeTarget": number,
  "notes": "brief coaching note about today's focus",
  "exercises": [
    {
      "exerciseName": "string",
      "sets": number,
      "reps": number,
      "weightLbs": number or null,
      "notes": "progression reasoning"
    }
  ]
}`;

  let client;
  try {
    client = getAnthropicClient();
  } catch {
    return error("AI not configured — set ANTHROPIC_API_KEY in .env.local", 503);
  }

  const model = getModel("COACHING");

  const response = await client.messages.create({
    model,
    max_tokens: 1500,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: "Generate my next workout with appropriate progressions.",
      },
    ],
  });

  logAIUsage({
    feature: "workout_generate",
    model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  });

  const rawText = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  let workout;
  try {
    const jsonStr = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    workout = JSON.parse(jsonStr);
  } catch {
    return error("Failed to parse AI workout response", 502);
  }

  if (!workout.exercises || !Array.isArray(workout.exercises)) {
    return error("AI response missing exercises array", 502);
  }

  return success({
    generated: true,
    workout,
    basedOn: workoutsWithExercises.length,
    phase: phase
      ? { name: phase.phaseName, number: phase.phaseNumber }
      : null,
  });
});
