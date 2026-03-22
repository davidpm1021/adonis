import { pgTable, text, integer, real, serial } from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// 1. User Profile (single-user: David)
// ---------------------------------------------------------------------------
export const userProfile = pgTable("user_profile", {
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
export const streakFreezes = pgTable("streak_freezes", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  streakType: text("streak_type").notNull(),
  reason: text("reason"),
  createdAt: text("created_at"),
});

// ---------------------------------------------------------------------------
// Streak Milestones (tracks when milestones are hit for celebrations)
// ---------------------------------------------------------------------------
export const streakMilestones = pgTable("streak_milestones", {
  id: serial("id").primaryKey(),
  streakType: text("streak_type").notNull(),
  milestone: integer("milestone").notNull(),
  achievedDate: text("achieved_date").notNull(),
  celebrated: integer("celebrated").default(0),
  createdAt: text("created_at"),
});

// ---------------------------------------------------------------------------
// 2. Daily Log
// ---------------------------------------------------------------------------
export const dailyLog = pgTable("daily_log", {
  id: serial("id").primaryKey(),
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
export const bodyMetrics = pgTable("body_metrics", {
  id: serial("id").primaryKey(),
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
export const labResults = pgTable("lab_results", {
  id: serial("id").primaryKey(),
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
export const workouts = pgTable("workouts", {
  id: serial("id").primaryKey(),
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
export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
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
export const nutritionLog = pgTable("nutrition_log", {
  id: serial("id").primaryKey(),
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
export const supplementLog = pgTable("supplement_log", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  supplementName: text("supplement_name").notNull(),
  dose: text("dose"),
  taken: integer("taken").default(0),
  timeOfDay: text("time_of_day"),
  purpose: text("purpose"),
  createdAt: text("created_at"),
});

// ---------------------------------------------------------------------------
// 9. Sleep Log
// ---------------------------------------------------------------------------
export const sleepLog = pgTable("sleep_log", {
  id: serial("id").primaryKey(),
  date: text("date").unique().notNull(),
  bedtime: text("bedtime"),
  wakeTime: text("wake_time"),
  totalHours: real("total_hours"),
  sleepQuality: integer("sleep_quality"),
  timeToFallAsleepMinutes: integer("time_to_fall_asleep_minutes"),
  wakeUps: integer("wake_ups"),
  bipapUsed: integer("bipap_used").default(1),
  notes: text("notes"),
  source: text("source").default("manual"),
  createdAt: text("created_at"),
});

// ---------------------------------------------------------------------------
// 10. AI Conversations
// ---------------------------------------------------------------------------
export const aiConversations = pgTable("ai_conversations", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  role: text("role").notNull(), // user | assistant | system
  content: text("content").notNull(),
  createdAt: text("created_at"),
});

// ---------------------------------------------------------------------------
// 11. Goals
// ---------------------------------------------------------------------------
export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
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
export const trainingPhases = pgTable("training_phases", {
  id: serial("id").primaryKey(),
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
export const nutritionTargets = pgTable("nutrition_targets", {
  id: serial("id").primaryKey(),
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
export const goalHistory = pgTable("goal_history", {
  id: serial("id").primaryKey(),
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
export const weeklyReports = pgTable("weekly_reports", {
  id: serial("id").primaryKey(),
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
export const favoriteMeals = pgTable("favorite_meals", {
  id: serial("id").primaryKey(),
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
export const nutritionInsights = pgTable("nutrition_insights", {
  id: serial("id").primaryKey(),
  insightType: text("insight_type").notNull(),
  content: text("content").notNull(),
  dataRangeStart: text("data_range_start"),
  dataRangeEnd: text("data_range_end"),
  createdAt: text("created_at"),
});

// ---------------------------------------------------------------------------
// 18. Calculated Markers
// ---------------------------------------------------------------------------
export const calculatedMarkers = pgTable("calculated_markers", {
  id: serial("id").primaryKey(),
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
export const preventiveCare = pgTable("preventive_care", {
  id: serial("id").primaryKey(),
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
export const vitalsLog = pgTable("vitals_log", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  timeOfDay: text("time_of_day"),
  systolic: integer("systolic"),
  diastolic: integer("diastolic"),
  restingHeartRate: integer("resting_heart_rate"),
  spo2: real("spo2"),
  notes: text("notes"),
  source: text("source").default("manual"),
  createdAt: text("created_at"),
});

// ---------------------------------------------------------------------------
// 21. Environment Checklist
// ---------------------------------------------------------------------------
export const environmentChecklist = pgTable("environment_checklist", {
  id: serial("id").primaryKey(),
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
export const foodParseCache = pgTable("food_parse_cache", {
  id: serial("id").primaryKey(),
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
export const aiUsageLog = pgTable("ai_usage_log", {
  id: serial("id").primaryKey(),
  feature: text("feature").notNull(),
  model: text("model").notNull(),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  cached: integer("cached").default(0),
  costEstimate: real("cost_estimate"),
  createdAt: text("created_at"),
});

// ---------------------------------------------------------------------------
// 24. Garmin Daily Summary (Sprint 3)
// ---------------------------------------------------------------------------
export const garminDailySummary = pgTable("garmin_daily_summary", {
  id: serial("id").primaryKey(),
  date: text("date").unique().notNull(),
  totalSteps: integer("total_steps"),
  stepGoal: integer("step_goal"),
  floorsClimbed: integer("floors_climbed"),
  activeMinutes: integer("active_minutes"),
  caloriesTotal: integer("calories_total"),
  caloriesActive: integer("calories_active"),
  distanceMeters: real("distance_meters"),
  averageStress: integer("average_stress"),
  maxStress: integer("max_stress"),
  bodyBatteryHigh: integer("body_battery_high"),
  bodyBatteryLow: integer("body_battery_low"),
  averageHr: integer("average_hr"),
  maxHr: integer("max_hr"),
  minHr: integer("min_hr"),
  restingHr: integer("resting_hr"),
  spo2Average: real("spo2_average"),
  rawJson: text("raw_json"),
  syncedAt: text("synced_at"),
  createdAt: text("created_at"),
});

// ---------------------------------------------------------------------------
// 25. Garmin Sync Config (Sprint 3)
// ---------------------------------------------------------------------------
export const garminSyncConfig = pgTable("garmin_sync_config", {
  id: integer("id").primaryKey().$defaultFn(() => 1),
  enabled: integer("enabled").default(0),
  garminEmail: text("garmin_email"),
  garminPasswordEncrypted: text("garmin_password_encrypted"),
  lastSyncAt: text("last_sync_at"),
  syncIntervalMinutes: integer("sync_interval_minutes").default(15),
  createdAt: text("created_at"),
  updatedAt: text("updated_at"),
});

// ---------------------------------------------------------------------------
// 26. Daily Nudges (Sprint 4)
// ---------------------------------------------------------------------------
export const dailyNudges = pgTable("daily_nudges", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  nudgeText: text("nudge_text").notNull(),
  nudgeType: text("nudge_type").notNull(),
  priority: integer("priority").default(1),
  dismissed: integer("dismissed").default(0),
  createdAt: text("created_at"),
});

// ---------------------------------------------------------------------------
// 27. Daily Briefings (AI Coach Briefing)
// ---------------------------------------------------------------------------
export const dailyBriefings = pgTable("daily_briefings", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  briefingJson: text("briefing_json").notNull(),
  model: text("model").notNull(),
  generatedAt: text("generated_at").notNull(),
  stale: integer("stale").default(0),
  createdAt: text("created_at"),
});

// ---------------------------------------------------------------------------
// 28. Monthly Reports (Sprint 5)
// ---------------------------------------------------------------------------
export const monthlyReports = pgTable("monthly_reports", {
  id: serial("id").primaryKey(),
  monthStart: text("month_start").notNull(),
  monthEnd: text("month_end").notNull(),
  reportContent: text("report_content"),
  keyMetrics: text("key_metrics"),
  aiRecommendations: text("ai_recommendations"),
  createdAt: text("created_at"),
});
