import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { success, error, withErrorHandling, nowISO } from "@/lib/api";
import { setupWizardSchema } from "@/lib/validations";
import { DEFAULT_SUPPLEMENTS } from "@/lib/constants";

// GET /api/setup — Check if setup is complete
export const GET = withErrorHandling(async () => {
  const rows = await db
    .select()
    .from(schema.userProfile)
    .where(eq(schema.userProfile.id, 1))
    .limit(1);

  const profile = rows[0] ?? null;

  return success({
    setupComplete: profile?.setupComplete === 1,
    profile: profile
      ? {
          name: profile.name,
          dob: profile.dob,
          sex: profile.sex,
          heightInches: profile.heightInches,
          startingWeight: profile.startingWeight,
          goalWeightLow: profile.goalWeightLow,
          goalWeightHigh: profile.goalWeightHigh,
          medicalConditions: profile.medicalConditions,
          medications: profile.medications,
          allergies: profile.allergies,
          sobrietyStartDate: profile.sobrietyStartDate,
          weeklyAlcoholSpend: profile.weeklyAlcoholSpend,
          weeklyAlcoholCalories: profile.weeklyAlcoholCalories,
        }
      : null,
  });
});

// POST /api/setup — Create or update profile from wizard
export const POST = withErrorHandling(async (req) => {
  const body = await req.json();
  const data = setupWizardSchema.parse(body);
  const now = nowISO();

  // Check if profile exists
  const existing = await db
    .select()
    .from(schema.userProfile)
    .where(eq(schema.userProfile.id, 1))
    .limit(1);

  const profileData = {
    name: data.name,
    dob: data.dob,
    sex: data.sex,
    heightInches: data.heightInches,
    startingWeight: data.startingWeight,
    goalWeightLow: data.goalWeightLow,
    goalWeightHigh: data.goalWeightHigh,
    medicalConditions: data.medicalConditions,
    medications: data.medications,
    allergies: data.allergies,
    sobrietyStartDate: data.sobrietyStartDate,
    weeklyAlcoholSpend: data.weeklyAlcoholSpend,
    weeklyAlcoholCalories: data.weeklyAlcoholCalories,
    setupComplete: data.setupComplete,
    updatedAt: now,
  };

  // Remove undefined keys so we don't overwrite with null on partial saves
  const cleanData = Object.fromEntries(
    Object.entries(profileData).filter(([, v]) => v !== undefined)
  );

  if (existing.length > 0) {
    await db
      .update(schema.userProfile)
      .set(cleanData)
      .where(eq(schema.userProfile.id, 1))
      .run();
  } else {
    await db
      .insert(schema.userProfile)
      .values({
        id: 1,
        ...cleanData,
        createdAt: now,
      })
      .run();
  }

  // On final step (setupComplete = 1), seed defaults if needed
  if (data.setupComplete === 1) {
    // Seed default nutrition targets if none exist
    const targets = await db
      .select()
      .from(schema.nutritionTargets)
      .limit(1);

    if (targets.length === 0) {
      const today = new Date().toISOString().split("T")[0];
      await db
        .insert(schema.nutritionTargets)
        .values({
          effectiveDate: today,
          caloriesMin: 1800,
          caloriesMax: 2200,
          proteinMin: 160,
          proteinMax: 180,
          carbsMin: 120,
          carbsMax: 180,
          fatMin: 50,
          fatMax: 75,
          fiberMin: 35,
          fiberMax: 40,
          rationale:
            "Default targets. Adjust based on your goals and activity level.",
          createdAt: now,
        })
        .run();
    }

    // Seed default supplement stack for today if none exist
    const today = new Date().toISOString().split("T")[0];
    const existingSupps = await db
      .select()
      .from(schema.supplementLog)
      .where(eq(schema.supplementLog.date, today))
      .limit(1);

    if (existingSupps.length === 0) {
      for (const supp of DEFAULT_SUPPLEMENTS) {
        await db
          .insert(schema.supplementLog)
          .values({
            date: today,
            supplementName: supp.name,
            dose: supp.dose,
            taken: 0,
            timeOfDay: supp.time_of_day,
            createdAt: now,
          })
          .run();
      }
    }

    // Seed starting body metric if weight provided
    if (data.startingWeight) {
      const today = new Date().toISOString().split("T")[0];
      const existingMetrics = await db
        .select()
        .from(schema.bodyMetrics)
        .limit(1);

      if (existingMetrics.length === 0) {
        await db
          .insert(schema.bodyMetrics)
          .values({
            date: today,
            weight: data.startingWeight,
            notes: "Starting weight from setup wizard",
            createdAt: now,
          })
          .run();
      }
    }

    // Seed Phase 1 training phase if none exist
    const existingPhases = await db
      .select()
      .from(schema.trainingPhases)
      .limit(1);

    if (existingPhases.length === 0) {
      const phaseStart = new Date().toISOString().split("T")[0];
      const phaseEnd = (() => {
        const d = new Date();
        d.setDate(d.getDate() + 42);
        return d.toISOString().split("T")[0];
      })();

      await db
        .insert(schema.trainingPhases)
        .values({
          phaseNumber: 1,
          phaseName: "Foundation — Build the Base",
          startDate: phaseStart,
          endDate: phaseEnd,
          status: "active",
          prescribedWorkouts: JSON.stringify([
            {
              day: "Day A — Full Body",
              exercises: [
                { name: "Goblet Squat", sets: 3, reps: "10", notes: "Focus on depth, knees tracking over toes" },
                { name: "Push-ups", sets: 3, reps: "8-12", notes: "Modify on knees if needed" },
                { name: "Dumbbell Row", sets: 3, reps: "10 each", notes: "Squeeze at top" },
                { name: "Kettlebell Deadlift", sets: 3, reps: "12", notes: "Hinge pattern, flat back" },
                { name: "Dead Bug", sets: 3, reps: "8 each side", notes: "Slow and controlled" },
                { name: "Plank", sets: 3, reps: "20-30 seconds", notes: "Build to 45 seconds" },
                { name: "Farmer Carry", sets: 2, reps: "40 yards", notes: "Tall posture, tight core" },
              ],
            },
          ]),
          progressionRules: JSON.stringify([
            { rule: "If all sets completed at target reps for 2 consecutive sessions, increase weight by 5 lbs" },
            { rule: "If RPE consistently < 5, increase volume (1 additional set) or weight" },
            { rule: "If RPE consistently > 8, reduce weight by 10% and rebuild" },
            { rule: "Achilles check: any pain in left Achilles → substitute lunges with step-ups" },
          ]),
          notes: "Foundation phase. Focus on movement quality over weight.",
          createdAt: now,
        })
        .run();
    }
  }

  return success({ saved: true });
});
