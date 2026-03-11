import { z } from "zod";

// ---------------------------------------------------------------------------
// Common validators
// ---------------------------------------------------------------------------
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format");
const score1to10 = z.number().int().min(1).max(10);
const score0to10 = z.number().int().min(0).max(10);
const boolInt = z.number().int().min(0).max(1);

// ---------------------------------------------------------------------------
// Daily Log
// ---------------------------------------------------------------------------
export const dailyLogSchema = z.object({
  date: dateString,
  morningWalk: boolInt.optional().default(0),
  walkDurationMinutes: z.number().int().min(0).max(180).optional().nullable(),
  strengthTraining: boolInt.optional().default(0),
  ateLunchWithProtein: boolInt.optional().default(0),
  mobilityWork: boolInt.optional().default(0),
  supplementsTaken: boolInt.optional().default(0),
  alcoholFree: boolInt.optional().default(1),
  energy: score1to10.optional().nullable(),
  mood: score1to10.optional().nullable(),
  stress: score1to10.optional().nullable(),
  soreness: score1to10.optional().nullable(),
  anxietyLevel: score1to10.optional().nullable(),
  alcoholCraving: score0to10.optional().default(0),
  alcoholTrigger: z.string().optional().nullable(),
  foamRolling: boolInt.optional().default(0),
  coldExposure: boolInt.optional().default(0),
  heatExposure: boolInt.optional().default(0),
  notes: z.string().optional().nullable(),
  wins: z.string().optional().nullable(),
  struggles: z.string().optional().nullable(),
});

export type DailyLogInput = z.infer<typeof dailyLogSchema>;

// ---------------------------------------------------------------------------
// Body Metrics
// ---------------------------------------------------------------------------
export const bodyMetricsSchema = z.object({
  date: dateString,
  weight: z.number().positive().optional().nullable(),
  bodyFatPercentage: z.number().min(1).max(60).optional().nullable(),
  waistInches: z.number().positive().optional().nullable(),
  chestInches: z.number().positive().optional().nullable(),
  armInches: z.number().positive().optional().nullable(),
  thighInches: z.number().positive().optional().nullable(),
  neckInches: z.number().positive().optional().nullable(),
  dexaTotalFatPct: z.number().optional().nullable(),
  dexaLeanMassLbs: z.number().optional().nullable(),
  dexaFatMassLbs: z.number().optional().nullable(),
  dexaVisceralFatArea: z.number().optional().nullable(),
  dexaBoneDensity: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type BodyMetricsInput = z.infer<typeof bodyMetricsSchema>;

// ---------------------------------------------------------------------------
// Lab Results
// ---------------------------------------------------------------------------
export const labResultSchema = z.object({
  date: dateString,
  testName: z.string().min(1),
  value: z.number(),
  unit: z.string().min(1),
  referenceLow: z.number().optional().nullable(),
  referenceHigh: z.number().optional().nullable(),
  flag: z.enum(["normal", "low", "high", "borderline"]).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type LabResultInput = z.infer<typeof labResultSchema>;

// ---------------------------------------------------------------------------
// Workouts
// ---------------------------------------------------------------------------
export const workoutSchema = z.object({
  date: dateString,
  workoutType: z.string().min(1),
  durationMinutes: z.number().int().positive().optional().nullable(),
  rpe: z.number().int().min(1).max(10).optional().nullable(),
  completed: boolInt.optional().default(1),
  notes: z.string().optional().nullable(),
  coachFeedback: z.string().optional().nullable(),
  exercises: z.array(z.object({
    exerciseName: z.string().min(1),
    sets: z.number().int().positive().optional().nullable(),
    reps: z.number().int().positive().optional().nullable(),
    weightLbs: z.number().positive().optional().nullable(),
    durationSeconds: z.number().int().positive().optional().nullable(),
    distanceSteps: z.number().int().positive().optional().nullable(),
    notes: z.string().optional().nullable(),
  })).optional().default([]),
});

export type WorkoutInput = z.infer<typeof workoutSchema>;

// ---------------------------------------------------------------------------
// Nutrition Log
// ---------------------------------------------------------------------------
export const nutritionLogSchema = z.object({
  date: dateString,
  mealType: z.enum(["breakfast", "lunch", "snack", "dinner"]),
  description: z.string().optional().nullable(),
  calories: z.number().min(0).optional().nullable(),
  proteinG: z.number().min(0).optional().nullable(),
  carbsG: z.number().min(0).optional().nullable(),
  fatG: z.number().min(0).optional().nullable(),
  fiberG: z.number().min(0).optional().nullable(),
  source: z.enum(["manual", "ai_parsed", "photo", "favorite"]).optional().default("manual"),
  aiConfidence: z.number().min(0).max(1).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type NutritionLogInput = z.infer<typeof nutritionLogSchema>;

// ---------------------------------------------------------------------------
// Supplement Log
// ---------------------------------------------------------------------------
export const supplementLogSchema = z.object({
  date: dateString,
  supplementName: z.string().min(1),
  dose: z.string().optional().nullable(),
  taken: boolInt.optional().default(0),
  timeOfDay: z.string().optional().nullable(),
});

export type SupplementLogInput = z.infer<typeof supplementLogSchema>;

// ---------------------------------------------------------------------------
// Sleep Log
// ---------------------------------------------------------------------------
export const sleepLogSchema = z.object({
  date: dateString,
  bedtime: z.string().optional().nullable(),
  wakeTime: z.string().optional().nullable(),
  totalHours: z.number().min(0).max(24).optional().nullable(),
  sleepQuality: score1to10.optional().nullable(),
  timeToFallAsleepMinutes: z.number().int().min(0).optional().nullable(),
  wakeUps: z.number().int().min(0).optional().nullable(),
  bipapUsed: boolInt.optional().default(1),
  notes: z.string().optional().nullable(),
});

export type SleepLogInput = z.infer<typeof sleepLogSchema>;

// ---------------------------------------------------------------------------
// Vitals Log
// ---------------------------------------------------------------------------
export const vitalsLogSchema = z.object({
  date: dateString,
  timeOfDay: z.string().optional().nullable(),
  systolic: z.number().int().min(60).max(250).optional().nullable(),
  diastolic: z.number().int().min(30).max(150).optional().nullable(),
  restingHeartRate: z.number().int().min(30).max(200).optional().nullable(),
  spo2: z.number().min(70).max(100).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type VitalsLogInput = z.infer<typeof vitalsLogSchema>;

// ---------------------------------------------------------------------------
// AI Coach
// ---------------------------------------------------------------------------
export const aiChatSchema = z.object({
  message: z.string().min(1).max(5000),
  sessionId: z.string().optional(),
});

export type AIChatInput = z.infer<typeof aiChatSchema>;

// ---------------------------------------------------------------------------
// Food Parse
// ---------------------------------------------------------------------------
export const foodParseSchema = z.object({
  text: z.string().min(1).max(2000),
});

export type FoodParseInput = z.infer<typeof foodParseSchema>;

// ---------------------------------------------------------------------------
// Favorite Meals
// ---------------------------------------------------------------------------
export const favoriteMealSchema = z.object({
  name: z.string().min(1),
  mealType: z.enum(["breakfast", "lunch", "snack", "dinner"]).optional().nullable(),
  items: z.string().optional().nullable(), // JSON string
  totalCalories: z.number().min(0).optional().nullable(),
  totalProteinG: z.number().min(0).optional().nullable(),
  totalCarbsG: z.number().min(0).optional().nullable(),
  totalFatG: z.number().min(0).optional().nullable(),
  totalFiberG: z.number().min(0).optional().nullable(),
});

export type FavoriteMealInput = z.infer<typeof favoriteMealSchema>;

// ---------------------------------------------------------------------------
// User Profile
// ---------------------------------------------------------------------------
export const userProfileSchema = z.object({
  name: z.string().optional(),
  dob: z.string().optional(),
  sex: z.enum(["male", "female"]).optional(),
  heightInches: z.number().int().min(36).max(96).optional(),
  startingWeight: z.number().positive().optional(),
  goalWeightLow: z.number().optional(),
  goalWeightHigh: z.number().optional(),
  medicalConditions: z.string().optional(), // JSON
  medications: z.string().optional(), // JSON
  allergies: z.string().optional(), // JSON
  sobrietyStartDate: z.string().optional(),
  weeklyAlcoholSpend: z.number().optional(),
  weeklyAlcoholCalories: z.number().int().optional(),
  setupComplete: z.number().int().min(0).max(1).optional(),
});

export type UserProfileInput = z.infer<typeof userProfileSchema>;

// ---------------------------------------------------------------------------
// Setup Wizard
// ---------------------------------------------------------------------------
export const setupWizardSchema = z.object({
  // Step 2: Personal
  name: z.string().min(1).optional(),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  sex: z.enum(["male", "female"]).optional(),
  heightInches: z.number().int().min(36).max(96).optional(),
  // Step 3: Goals
  startingWeight: z.number().positive().optional(),
  goalWeightLow: z.number().positive().optional(),
  goalWeightHigh: z.number().positive().optional(),
  // Step 4: Medical
  medicalConditions: z.string().optional(),
  medications: z.string().optional(),
  allergies: z.string().optional(),
  // Step 5: Habits
  trackedBehaviors: z.string().optional(), // JSON array of behavior keys
  sobrietyStartDate: z.string().optional(),
  weeklyAlcoholSpend: z.number().optional(),
  weeklyAlcoholCalories: z.number().int().optional(),
  // Control
  currentStep: z.number().int().min(1).max(6).optional(),
  setupComplete: z.number().int().min(0).max(1).optional(),
});

export type SetupWizardInput = z.infer<typeof setupWizardSchema>;

// ---------------------------------------------------------------------------
// Streak Freeze
// ---------------------------------------------------------------------------
export const streakFreezeSchema = z.object({
  date: dateString,
  streakType: z.string().min(1),
  reason: z.string().optional(),
});

export type StreakFreezeInput = z.infer<typeof streakFreezeSchema>;

// ---------------------------------------------------------------------------
// Nutrition Targets
// ---------------------------------------------------------------------------
export const nutritionTargetsSchema = z.object({
  effectiveDate: dateString,
  caloriesMin: z.number().int().min(0).optional(),
  caloriesMax: z.number().int().min(0).optional(),
  proteinMin: z.number().int().min(0).optional(),
  proteinMax: z.number().int().min(0).optional(),
  carbsMin: z.number().int().min(0).optional(),
  carbsMax: z.number().int().min(0).optional(),
  fatMin: z.number().int().min(0).optional(),
  fatMax: z.number().int().min(0).optional(),
  fiberMin: z.number().int().min(0).optional(),
  fiberMax: z.number().int().min(0).optional(),
  rationale: z.string().optional(),
});

export type NutritionTargetsInput = z.infer<typeof nutritionTargetsSchema>;

// ---------------------------------------------------------------------------
// Preventive Care
// ---------------------------------------------------------------------------
export const preventiveCareUpdateSchema = z.object({
  status: z.enum(["not_scheduled", "scheduled", "completed", "overdue", "active"]).optional(),
  dueDate: z.string().optional().nullable(),
  completedDate: z.string().optional().nullable(),
  result: z.string().optional().nullable(),
  resultValue: z.string().optional().nullable(),
  provider: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  nextDue: z.string().optional().nullable(),
});

export type PreventiveCareUpdateInput = z.infer<typeof preventiveCareUpdateSchema>;

// ---------------------------------------------------------------------------
// Environment Checklist
// ---------------------------------------------------------------------------
export const environmentUpdateSchema = z.object({
  completed: boolInt,
  completedDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type EnvironmentUpdateInput = z.infer<typeof environmentUpdateSchema>;
