import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// ---------------------------------------------------------------------------
// 1. User Profile (single-user: David)
// ---------------------------------------------------------------------------
export const userProfile = sqliteTable("user_profile", {
  id: integer("id").primaryKey().$defaultFn(() => 1),
  name: text("name"),
  dob: text("dob"),
  sex: text("sex"),
  heightInches: integer("height_inches"),
  startingWeight: real("starting_weight"),
  goalWeightLow: real("goal_weight_low"),
  goalWeightHigh: real("goal_weight_high"),
  medicalConditions: text("medical_conditions"), // JSON
  medications: text("medications"), // JSON
  allergies: text("allergies"), // JSON
  sobrietyStartDate: text("sobriety_start_date"),
  weeklyAlcoholSpend: real("weekly_alcohol_spend").default(0),
  weeklyAlcoholCalories: integer("weekly_alcohol_calories").default(0),
  setupComplete: integer("setup_complete").default(0),
  createdAt: text("created_at"),
  updatedAt: text("updated_at"),
});

// ---------------------------------------------------------------------------
// Streak Freezes (Duolingo-style "miss 1 day without breaking streak")
// ---------------------------------------------------------------------------
export const streakFreezes = sqliteTable("streak_freezes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  streakType: text("streak_type").notNull(),
  reason: text("reason"),
  createdAt: text("created_at"),
});

// ---------------------------------------------------------------------------
// Streak Milestones (tracks when milestones are hit for celebrations)
// ---------------------------------------------------------------------------
export const streakMilestones = sqliteTable("streak_milestones", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  streakType: text("streak_type").notNull(),
  milestone: integer("milestone").notNull(),
  achievedDate: text("achieved_date").notNull(),
  celebrated: integer("celebrated").default(0),
  createdAt: text("created_at"),
});

// ---------------------------------------------------------------------------
// 2. Daily Log
// ---------------------------------------------------------------------------
export const dailyLog = sqliteTable("daily_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").unique().notNull(),
  morningWalk: integer("morning_walk").default(0),
  walkDurationMinutes: integer("walk_duration_minutes"),
  strengthTraining: integer("strength_training").default(0),
  ateLunchWithProtein: integer("ate_lunch_with_protein").default(0),
  mobilityWork: integer("mobility_work").default(0),
  supplementsTaken: integer("supplements_taken").default(0),
  alcoholFree: integer("alcohol_free").default(1),
  energy: integer("energy"),
  mood: integer("mood"),
  stress: integer("stress"),
  soreness: integer("soreness"),
  anxietyLevel: integer("anxiety_level"),
  alcoholCraving: integer("alcohol_craving").default(0),
  alcoholTrigger: text("alcohol_trigger"),
  foamRolling: integer("foam_rolling").default(0),
  coldExposure: integer("cold_exposure").default(0),
  heatExposure: integer("heat_exposure").default(0),
  notes: text("notes"),
  wins: text("wins"),
  struggles: text("struggles"),
  createdAt: text("created_at"),
  updatedAt: text("updated_at"),
});

// ---------------------------------------------------------------------------
// 3. Body Metrics
// ---------------------------------------------------------------------------
export const bodyMetrics = sqliteTable("body_metrics", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  weight: real("weight"),
  bodyFatPercentage: real("body_fat_percentage"),
  waistInches: real("waist_inches"),
  chestInches: real("chest_inches"),
  armInches: real("arm_inches"),
  thighInches: real("thigh_inches"),
  neckInches: real("neck_inches"),
  dexaTotalFatPct: real("dexa_total_fat_pct"),
  dexaLeanMassLbs: real("dexa_lean_mass_lbs"),
  dexaFatMassLbs: real("dexa_fat_mass_lbs"),
  dexaVisceralFatArea: real("dexa_visceral_fat_area"),
  dexaBoneDensity: real("dexa_bone_density"),
  navyBfEstimate: real("navy_bf_estimate"),
  notes: text("notes"),
  createdAt: text("created_at"),
});

// ---------------------------------------------------------------------------
// 4. Lab Results
// ---------------------------------------------------------------------------
export const labResults = sqliteTable("lab_results", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  testName: text("test_name").notNull(),
  value: real("value").notNull(),
  unit: text("unit").notNull(),
  referenceLow: real("reference_low"),
  referenceHigh: real("reference_high"),
  flag: text("flag"),
  notes: text("notes"),
  createdAt: text("created_at"),
});

// ---------------------------------------------------------------------------
// 5. Workouts
// ---------------------------------------------------------------------------
export const workouts = sqliteTable("workouts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  workoutType: text("workout_type").notNull(),
  durationMinutes: integer("duration_minutes"),
  rpe: integer("rpe"),
  completed: integer("completed").default(1),
  notes: text("notes"),
  coachFeedback: text("coach_feedback"),
  createdAt: text("created_at"),
});

// ---------------------------------------------------------------------------
// 6. Exercises
// ---------------------------------------------------------------------------
export const exercises = sqliteTable("exercises", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workoutId: integer("workout_id")
    .notNull()
    .references(() => workouts.id),
  exerciseName: text("exercise_name").notNull(),
  sets: integer("sets"),
  reps: integer("reps"),
  weightLbs: real("weight_lbs"),
  durationSeconds: integer("duration_seconds"),
  distanceSteps: integer("distance_steps"),
  notes: text("notes"),
});

// ---------------------------------------------------------------------------
// 7. Nutrition Log
// ---------------------------------------------------------------------------
export const nutritionLog = sqliteTable("nutrition_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  mealType: text("meal_type").notNull(), // breakfast | lunch | snack | dinner
  description: text("description"),
  calories: real("calories"),
  proteinG: real("protein_g"),
  carbsG: real("carbs_g"),
  fatG: real("fat_g"),
  fiberG: real("fiber_g"),
  source: text("source").default("manual"), // manual | ai_parsed | photo | favorite
  aiConfidence: real("ai_confidence"),
  notes: text("notes"),
  createdAt: text("created_at"),
});

// ---------------------------------------------------------------------------
// 8. Supplement Log
// ---------------------------------------------------------------------------
export const supplementLog = sqliteTable("supplement_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  supplementName: text("supplement_name").notNull(),
  dose: text("dose"),
  taken: integer("taken").default(0),
  timeOfDay: text("time_of_day"),
  createdAt: text("created_at"),
});

// ---------------------------------------------------------------------------
// 9. Sleep Log
// ---------------------------------------------------------------------------
export const sleepLog = sqliteTable("sleep_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").unique().notNull(),
  bedtime: text("bedtime"),
  wakeTime: text("wake_time"),
  totalHours: real("total_hours"),
  sleepQuality: integer("sleep_quality"),
  timeToFallAsleepMinutes: integer("time_to_fall_asleep_minutes"),
  wakeUps: integer("wake_ups"),
  bipapUsed: integer("bipap_used").default(1),
  notes: text("notes"),
  createdAt: text("created_at"),
});

// ---------------------------------------------------------------------------
// 10. AI Conversations
// ---------------------------------------------------------------------------
export const aiConversations = sqliteTable("ai_conversations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: text("session_id").notNull(),
  role: text("role").notNull(), // user | assistant | system
  content: text("content").notNull(),
  createdAt: text("created_at"),
});

// ---------------------------------------------------------------------------
// 11. Goals
// ---------------------------------------------------------------------------
export const goals = sqliteTable("goals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  category: text("category").notNull(),
  description: text("description").notNull(),
  targetValue: real("target_value"),
  targetUnit: text("target_unit"),
  targetDate: text("target_date"),
  currentValue: real("current_value"),
  status: text("status").default("active"), // active | achieved | archived
  createdAt: text("created_at"),
  updatedAt: text("updated_at"),
});

// ---------------------------------------------------------------------------
// 12. Training Phases
// ---------------------------------------------------------------------------
export const trainingPhases = sqliteTable("training_phases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  phaseNumber: integer("phase_number").notNull(),
  phaseName: text("phase_name").notNull(),
  startDate: text("start_date"),
  endDate: text("end_date"),
  status: text("status").default("active"),
  prescribedWorkouts: text("prescribed_workouts"), // JSON
  progressionRules: text("progression_rules"), // JSON
  notes: text("notes"),
  createdAt: text("created_at"),
});

// ---------------------------------------------------------------------------
// 13. Nutrition Targets
// ---------------------------------------------------------------------------
export const nutritionTargets = sqliteTable("nutrition_targets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  effectiveDate: text("effective_date").notNull(),
  caloriesMin: integer("calories_min"),
  caloriesMax: integer("calories_max"),
  proteinMin: integer("protein_min"),
  proteinMax: integer("protein_max"),
  carbsMin: integer("carbs_min"),
  carbsMax: integer("carbs_max"),
  fatMin: integer("fat_min"),
  fatMax: integer("fat_max"),
  fiberMin: integer("fiber_min"),
  fiberMax: integer("fiber_max"),
  rationale: text("rationale"),
  createdAt: text("created_at"),
});

// ---------------------------------------------------------------------------
// 14. Goal History
// ---------------------------------------------------------------------------
export const goalHistory = sqliteTable("goal_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  goalId: integer("goal_id")
    .notNull()
    .references(() => goals.id),
  eventType: text("event_type").notNull(), // created | updated | achieved | archived
  oldValue: text("old_value"),
  newValue: text("new_value"),
  reason: text("reason"),
  eventDate: text("event_date").notNull(),
  createdAt: text("created_at"),
});

// ---------------------------------------------------------------------------
// 15. Weekly Reports
// ---------------------------------------------------------------------------
export const weeklyReports = sqliteTable("weekly_reports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  weekStart: text("week_start").notNull(),
  weekEnd: text("week_end").notNull(),
  reportContent: text("report_content"), // markdown
  keyMetrics: text("key_metrics"), // JSON
  aiRecommendations: text("ai_recommendations"), // JSON
  createdAt: text("created_at"),
});

// ---------------------------------------------------------------------------
// 16. Favorite Meals
// ---------------------------------------------------------------------------
export const favoriteMeals = sqliteTable("favorite_meals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  mealType: text("meal_type"),
  items: text("items"), // JSON
  totalCalories: real("total_calories"),
  totalProteinG: real("total_protein_g"),
  totalCarbsG: real("total_carbs_g"),
  totalFatG: real("total_fat_g"),
  totalFiberG: real("total_fiber_g"),
  useCount: integer("use_count").default(0),
  lastUsed: text("last_used"),
  createdAt: text("created_at"),
});

// ---------------------------------------------------------------------------
// 17. Nutrition Insights
// ---------------------------------------------------------------------------
export const nutritionInsights = sqliteTable("nutrition_insights", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  insightType: text("insight_type").notNull(),
  content: text("content").notNull(),
  dataRangeStart: text("data_range_start"),
  dataRangeEnd: text("data_range_end"),
  createdAt: text("created_at"),
});

// ---------------------------------------------------------------------------
// 18. Calculated Markers
// ---------------------------------------------------------------------------
export const calculatedMarkers = sqliteTable("calculated_markers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  markerName: text("marker_name").notNull(),
  value: real("value").notNull(),
  formula: text("formula"),
  inputValues: text("input_values"), // JSON
  interpretation: text("interpretation"),
  createdAt: text("created_at"),
});

// ---------------------------------------------------------------------------
// 19. Preventive Care
// ---------------------------------------------------------------------------
export const preventiveCare = sqliteTable("preventive_care", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  itemName: text("item_name").notNull(),
  category: text("category").notNull(),
  status: text("status").default("not_scheduled"),
  dueDate: text("due_date"),
  completedDate: text("completed_date"),
  result: text("result"),
  resultValue: text("result_value"),
  provider: text("provider"),
  notes: text("notes"),
  nextDue: text("next_due"),
  createdAt: text("created_at"),
  updatedAt: text("updated_at"),
});

// ---------------------------------------------------------------------------
// 20. Vitals Log
// ---------------------------------------------------------------------------
export const vitalsLog = sqliteTable("vitals_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  timeOfDay: text("time_of_day"),
  systolic: integer("systolic"),
  diastolic: integer("diastolic"),
  restingHeartRate: integer("resting_heart_rate"),
  spo2: real("spo2"),
  notes: text("notes"),
  createdAt: text("created_at"),
});

// ---------------------------------------------------------------------------
// 21. Environment Checklist
// ---------------------------------------------------------------------------
export const environmentChecklist = sqliteTable("environment_checklist", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  item: text("item").notNull(),
  category: text("category").notNull(),
  completed: integer("completed").default(0),
  completedDate: text("completed_date"),
  notes: text("notes"),
  createdAt: text("created_at"),
});

// ---------------------------------------------------------------------------
// 22. Food Parse Cache
// ---------------------------------------------------------------------------
export const foodParseCache = sqliteTable("food_parse_cache", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  inputHash: text("input_hash").unique().notNull(),
  inputText: text("input_text").notNull(),
  parsedResult: text("parsed_result").notNull(), // JSON
  hitCount: integer("hit_count").default(1),
  createdAt: text("created_at"),
  updatedAt: text("updated_at"),
});

// ---------------------------------------------------------------------------
// 23. AI Usage Log
// ---------------------------------------------------------------------------
export const aiUsageLog = sqliteTable("ai_usage_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  feature: text("feature").notNull(),
  model: text("model").notNull(),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  cached: integer("cached").default(0),
  costEstimate: real("cost_estimate"),
  createdAt: text("created_at"),
});
