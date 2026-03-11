import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { sql } from "drizzle-orm";
import * as schema from "./schema";
import { ensureTables } from "./tables";
import path from "path";

const DB_PATH = path.resolve(process.env.DATABASE_URL || "./adonis.db");

console.log(`Seeding database at: ${DB_PATH}`);

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

const db = drizzle(sqlite, { schema });

const now = new Date().toISOString();

// ---------------------------------------------------------------------------
// Helper: clear all tables
// ---------------------------------------------------------------------------
function clearAll() {
  const tables = [
    "streak_milestones", "streak_freezes",
    "ai_usage_log", "food_parse_cache", "environment_checklist", "vitals_log",
    "preventive_care", "calculated_markers", "nutrition_insights", "favorite_meals",
    "weekly_reports", "goal_history", "nutrition_targets", "training_phases",
    "goals", "ai_conversations", "sleep_log", "supplement_log", "nutrition_log",
    "exercises", "workouts", "lab_results", "body_metrics", "daily_log", "user_profile",
  ];
  for (const t of tables) {
    db.run(sql.raw(`DELETE FROM ${t}`));
  }
  console.log("  Cleared all tables.");
}

// ---------------------------------------------------------------------------
// 1. User Profile
// ---------------------------------------------------------------------------
function seedUserProfile() {
  db.insert(schema.userProfile).values({
    id: 1,
    name: "David Martin",
    dob: "1981-10-21",
    sex: "male",
    heightInches: 66,
    startingWeight: 225,
    goalWeightLow: 185,
    goalWeightHigh: 195,
    medicalConditions: JSON.stringify([
      "Severe obstructive sleep apnea (BiPAP nightly)",
      "Pre-diabetes / insulin resistance",
      "Fatty liver (suspected NAFLD)",
      "Low testosterone",
      "Dyslipidemia",
      "Left Achilles issue (monitor)",
    ]),
    medications: JSON.stringify([
      { name: "Mounjaro", dose: "10mg", frequency: "weekly" },
      { name: "Lipitor", dose: "20mg", frequency: "daily" },
      { name: "Adderall", dose: "20mg", frequency: "daily" },
      { name: "Vitamin D", dose: "5000 IU", frequency: "daily" },
    ]),
    allergies: JSON.stringify([]),
    sobrietyStartDate: "2025-02-23",
    weeklyAlcoholSpend: 75,
    weeklyAlcoholCalories: 2500,
    setupComplete: 1,
    createdAt: now,
    updatedAt: now,
  }).run();
  console.log("  Seeded user_profile.");
}

// ---------------------------------------------------------------------------
// 2. Lab Results — October 21, 2025 panel + January 24, 2025 panel
// ---------------------------------------------------------------------------
function seedLabResults() {
  const oct2025Labs = [
    { testName: "Fasting Glucose", value: 113, unit: "mg/dL", referenceLow: 65, referenceHigh: 100, flag: "high" },
    { testName: "HbA1c", value: 5.4, unit: "%", referenceLow: 4.0, referenceHigh: 5.7, flag: "normal" },
    { testName: "Total Testosterone", value: 232, unit: "ng/dL", referenceLow: 264, referenceHigh: 916, flag: "low" },
    { testName: "Free Testosterone", value: 17.7, unit: "pg/mL", referenceLow: 6.8, referenceHigh: 21.5, flag: "normal" },
    { testName: "ALT", value: 57, unit: "U/L", referenceLow: 0, referenceHigh: 44, flag: "high" },
    { testName: "AST", value: 30, unit: "U/L", referenceLow: 0, referenceHigh: 40, flag: "normal" },
    { testName: "Triglycerides", value: 182, unit: "mg/dL", referenceLow: 0, referenceHigh: 150, flag: "high" },
    { testName: "HDL", value: 39, unit: "mg/dL", referenceLow: 40, referenceHigh: 999, flag: "borderline" },
    { testName: "LDL", value: 86, unit: "mg/dL", referenceLow: 0, referenceHigh: 100, flag: "normal" },
    { testName: "Total Cholesterol", value: 156, unit: "mg/dL", referenceLow: 100, referenceHigh: 200, flag: "normal" },
    { testName: "Vitamin D", value: 37.9, unit: "ng/mL", referenceLow: 30, referenceHigh: 100, flag: "normal" },
    { testName: "eGFR", value: 103, unit: "mL/min/1.73m2", referenceLow: 60, referenceHigh: 999, flag: "normal" },
    { testName: "Hemoglobin", value: 16.1, unit: "g/dL", referenceLow: 13.0, referenceHigh: 17.7, flag: "normal" },
    { testName: "Platelets", value: 167, unit: "K/uL", referenceLow: 150, referenceHigh: 450, flag: "normal" },
  ];

  // January 24, 2025 panel (prior baseline — estimated values based on trajectory)
  const jan2025Labs = [
    { testName: "Fasting Glucose", value: 118, unit: "mg/dL", referenceLow: 65, referenceHigh: 100, flag: "high" },
    { testName: "HbA1c", value: 5.6, unit: "%", referenceLow: 4.0, referenceHigh: 5.7, flag: "normal" },
    { testName: "Total Testosterone", value: 218, unit: "ng/dL", referenceLow: 264, referenceHigh: 916, flag: "low" },
    { testName: "Free Testosterone", value: 15.2, unit: "pg/mL", referenceLow: 6.8, referenceHigh: 21.5, flag: "normal" },
    { testName: "ALT", value: 62, unit: "U/L", referenceLow: 0, referenceHigh: 44, flag: "high" },
    { testName: "AST", value: 35, unit: "U/L", referenceLow: 0, referenceHigh: 40, flag: "normal" },
    { testName: "Triglycerides", value: 198, unit: "mg/dL", referenceLow: 0, referenceHigh: 150, flag: "high" },
    { testName: "HDL", value: 36, unit: "mg/dL", referenceLow: 40, referenceHigh: 999, flag: "low" },
    { testName: "LDL", value: 92, unit: "mg/dL", referenceLow: 0, referenceHigh: 100, flag: "normal" },
    { testName: "Total Cholesterol", value: 168, unit: "mg/dL", referenceLow: 100, referenceHigh: 200, flag: "normal" },
    { testName: "Vitamin D", value: 28.5, unit: "ng/mL", referenceLow: 30, referenceHigh: 100, flag: "low" },
  ];

  for (const lab of jan2025Labs) {
    db.insert(schema.labResults).values({
      date: "2025-01-24",
      ...lab,
      createdAt: now,
    }).run();
  }

  for (const lab of oct2025Labs) {
    db.insert(schema.labResults).values({
      date: "2025-10-21",
      ...lab,
      createdAt: now,
    }).run();
  }

  console.log("  Seeded lab_results (25 records across 2 panels).");
}

// ---------------------------------------------------------------------------
// 3. Goals
// ---------------------------------------------------------------------------
function seedGoals() {
  const goalsData = [
    { category: "weight", description: "Reach target weight 185-195 lbs", targetValue: 190, targetUnit: "lbs", currentValue: 225 },
    { category: "labs", description: "Fasting glucose < 100 mg/dL", targetValue: 100, targetUnit: "mg/dL", currentValue: 113 },
    { category: "labs", description: "ALT < 44 U/L (normalize liver enzymes)", targetValue: 44, targetUnit: "U/L", currentValue: 57 },
    { category: "labs", description: "Total testosterone > 400 ng/dL", targetValue: 400, targetUnit: "ng/dL", currentValue: 232 },
    { category: "labs", description: "Triglycerides < 150 mg/dL", targetValue: 150, targetUnit: "mg/dL", currentValue: 182 },
    { category: "labs", description: "HDL cholesterol > 50 mg/dL", targetValue: 50, targetUnit: "mg/dL", currentValue: 39 },
    { category: "nutrition", description: "Daily protein intake 160-180g", targetValue: 170, targetUnit: "g", currentValue: 0 },
    { category: "nutrition", description: "Daily fiber intake 35-40g", targetValue: 37, targetUnit: "g", currentValue: 0 },
    { category: "sobriety", description: "Maintain complete sobriety", targetValue: 365, targetUnit: "days", currentValue: 0 },
    { category: "fitness", description: "Complete 3 strength sessions per week", targetValue: 3, targetUnit: "sessions/week", currentValue: 0 },
    { category: "fitness", description: "Daily morning walk 25-30 minutes", targetValue: 30, targetUnit: "minutes", currentValue: 0 },
  ];

  for (const goal of goalsData) {
    db.insert(schema.goals).values({
      ...goal,
      targetDate: "2026-08-23",
      status: "active",
      createdAt: now,
      updatedAt: now,
    }).run();
  }

  console.log(`  Seeded goals (${goalsData.length} records).`);
}

// ---------------------------------------------------------------------------
// 4. Training Phase 1
// ---------------------------------------------------------------------------
function seedTrainingPhases() {
  db.insert(schema.trainingPhases).values({
    phaseNumber: 1,
    phaseName: "Foundation — Build the Base",
    startDate: "2026-02-23",
    endDate: "2026-04-05",
    status: "active",
    prescribedWorkouts: JSON.stringify({
      schedule: ["Tuesday", "Thursday", "Saturday"],
      exercises: [
        { name: "Goblet Squat", sets: 3, reps: 10, weight: "25-35 lbs DB", notes: "Focus on depth, knees tracking over toes" },
        { name: "Push-ups", sets: 3, reps: "8-12", weight: "bodyweight", notes: "Modify on knees if needed, full range of motion" },
        { name: "Dumbbell Row", sets: 3, reps: 10, weight: "25-30 lbs", notes: "Each arm, squeeze at top" },
        { name: "Kettlebell Deadlift", sets: 3, reps: 12, weight: "35-45 lbs KB", notes: "Hinge pattern, flat back" },
        { name: "Dead Bug", sets: 3, reps: "8 each side", weight: "bodyweight", notes: "Slow and controlled, low back pressed into floor" },
        { name: "Plank", sets: 3, reps: "20-30 seconds", weight: "bodyweight", notes: "Build to 45 seconds" },
        { name: "Farmer Carry", sets: 2, reps: "40 yards", weight: "30-40 lbs each", notes: "Tall posture, tight core" },
      ],
      warmup: "5 minutes light walking or dynamic stretching",
      cooldown: "5 minutes stretching, foam rolling problem areas",
      duration: "45-55 minutes",
      rpe_target: "6-7 out of 10",
    }),
    progressionRules: JSON.stringify({
      frequency: "weekly",
      criteria: [
        "If all sets completed at target reps for 2 consecutive sessions, increase weight by 5 lbs",
        "If RPE consistently < 5, increase volume (1 additional set) or weight",
        "If RPE consistently > 8, reduce weight by 10% and rebuild",
        "Achilles check: any pain in left Achilles → substitute lunges with step-ups, avoid heavy farmer carries",
      ],
      phase_advancement: "After 6 weeks (April 5, 2026), evaluate for Phase 2 progression",
    }),
    notes: "Foundation phase. Focus on movement quality over weight. David is returning to training after extended break.",
    createdAt: now,
  }).run();

  console.log("  Seeded training_phases (Phase 1).");
}

// ---------------------------------------------------------------------------
// 5. Nutrition Targets
// ---------------------------------------------------------------------------
function seedNutritionTargets() {
  db.insert(schema.nutritionTargets).values({
    effectiveDate: "2026-02-23",
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
    rationale: "Caloric deficit for weight loss while preserving muscle mass. High protein critical for satiety, muscle preservation, and testosterone support. Moderate carbs timed around training. Adequate fat for hormone production. High fiber for metabolic health, gut health, and NAFLD management.",
    createdAt: now,
  }).run();

  console.log("  Seeded nutrition_targets.");
}

// ---------------------------------------------------------------------------
// 6. Favorite Meals
// ---------------------------------------------------------------------------
function seedFavoriteMeals() {
  const meals = [
    {
      name: "Eggs + Greek Yogurt Breakfast",
      mealType: "breakfast",
      items: JSON.stringify([
        { name: "Scrambled eggs (3 large)", calories: 210, protein: 18, carbs: 1, fat: 15, fiber: 0 },
        { name: "Greek yogurt, plain (1 cup)", calories: 130, protein: 22, carbs: 8, fat: 0, fiber: 0 },
        { name: "Berries (1/2 cup)", calories: 40, protein: 0.5, carbs: 10, fat: 0, fiber: 2 },
      ]),
      totalCalories: 380,
      totalProteinG: 40.5,
      totalCarbsG: 19,
      totalFatG: 15,
      totalFiberG: 2,
    },
    {
      name: "Protein Shake",
      mealType: "snack",
      items: JSON.stringify([
        { name: "Whey protein (2 scoops)", calories: 240, protein: 48, carbs: 6, fat: 4, fiber: 0 },
        { name: "Banana (1 medium)", calories: 105, protein: 1, carbs: 27, fat: 0.5, fiber: 3 },
        { name: "Peanut butter (1 tbsp)", calories: 95, protein: 4, carbs: 3, fat: 8, fiber: 1 },
        { name: "Almond milk (1 cup)", calories: 30, protein: 1, carbs: 1, fat: 2.5, fiber: 0 },
      ]),
      totalCalories: 470,
      totalProteinG: 54,
      totalCarbsG: 37,
      totalFatG: 15,
      totalFiberG: 4,
    },
    {
      name: "Chicken Salad Lunch",
      mealType: "lunch",
      items: JSON.stringify([
        { name: "Grilled chicken breast (6 oz)", calories: 280, protein: 52, carbs: 0, fat: 6, fiber: 0 },
        { name: "Mixed greens (2 cups)", calories: 15, protein: 1, carbs: 2, fat: 0, fiber: 2 },
        { name: "Cherry tomatoes (1/2 cup)", calories: 15, protein: 0.5, carbs: 3, fat: 0, fiber: 1 },
        { name: "Olive oil dressing (1 tbsp)", calories: 120, protein: 0, carbs: 0, fat: 14, fiber: 0 },
        { name: "Avocado (1/4)", calories: 60, protein: 1, carbs: 3, fat: 5, fiber: 2.5 },
      ]),
      totalCalories: 490,
      totalProteinG: 54.5,
      totalCarbsG: 8,
      totalFatG: 25,
      totalFiberG: 5.5,
    },
    {
      name: "Sushi (Salmon Rolls)",
      mealType: "dinner",
      items: JSON.stringify([
        { name: "Salmon sashimi (6 pieces)", calories: 210, protein: 30, carbs: 0, fat: 9, fiber: 0 },
        { name: "California roll (6 pieces)", calories: 255, protein: 9, carbs: 38, fat: 7, fiber: 2 },
        { name: "Edamame (1/2 cup)", calories: 95, protein: 9, carbs: 7, fat: 4, fiber: 4 },
        { name: "Miso soup", calories: 40, protein: 3, carbs: 5, fat: 1, fiber: 0.5 },
      ]),
      totalCalories: 600,
      totalProteinG: 51,
      totalCarbsG: 50,
      totalFatG: 21,
      totalFiberG: 6.5,
    },
  ];

  for (const meal of meals) {
    db.insert(schema.favoriteMeals).values({
      ...meal,
      useCount: 0,
      createdAt: now,
    }).run();
  }

  console.log(`  Seeded favorite_meals (${meals.length} records).`);
}

// ---------------------------------------------------------------------------
// 7. Preventive Care
// ---------------------------------------------------------------------------
function seedPreventiveCare() {
  const items = [
    // Immediate / Near-Term
    { itemName: "Coronary Artery Calcium (CAC) Score", category: "cardiac", status: "not_scheduled", dueDate: "2026-04-23", notes: "Within 1-2 months of program start. Baseline cardiovascular risk assessment." },
    { itemName: "DEXA Scan (Body Composition)", category: "metabolic", status: "not_scheduled", dueDate: "2026-03-09", notes: "Within 2 weeks. Baseline body composition for tracking." },
    { itemName: "Comprehensive Blood Work (Expanded)", category: "labs", status: "not_scheduled", dueDate: "2026-05-23", notes: "3-month mark. Include fasting insulin, SHBG, estradiol, hs-CRP, thyroid panel, homocysteine, uric acid, ferritin, ApoB, Lp(a)." },
    { itemName: "Dental Cleaning + Evaluation", category: "dental", status: "not_scheduled", dueDate: "2026-03-23", notes: "ASAP if > 12 months since last visit. Inflammation link to cardiovascular health." },

    // Age-Appropriate Screenings
    { itemName: "Colonoscopy", category: "cancer_screening", status: "not_scheduled", dueDate: "2026-10-21", notes: "Age 45 (Oct 2026). Every 10 years if normal. Critical screening." },
    { itemName: "Dermatology Skin Check", category: "cancer_screening", status: "not_scheduled", dueDate: "2026-08-23", notes: "Annual full-body skin exam." },
    { itemName: "Eye Exam (Dilated)", category: "vision", status: "not_scheduled", dueDate: "2026-08-23", notes: "Annual dilated exam. Important with pre-diabetes." },
    { itemName: "Blood Pressure Monitoring", category: "cardiac", status: "active", notes: "Ongoing home monitoring. 3-4x/week minimum." },
    { itemName: "Dental Cleaning (6-month)", category: "dental", status: "not_scheduled", dueDate: "2026-09-23", notes: "Every 6 months." },
    { itemName: "Flu Vaccine", category: "vaccination", status: "not_scheduled", dueDate: "2026-10-01", notes: "Annual, fall." },
    { itemName: "Tdap Booster", category: "vaccination", status: "not_scheduled", dueDate: "2026-12-31", notes: "Every 10 years. Check when last received." },
    { itemName: "Shingrix Vaccine", category: "vaccination", status: "not_scheduled", dueDate: "2031-10-21", notes: "Age 50. 2-dose series." },
  ];

  for (const item of items) {
    db.insert(schema.preventiveCare).values({
      ...item,
      createdAt: now,
      updatedAt: now,
    }).run();
  }

  console.log(`  Seeded preventive_care (${items.length} records).`);
}

// ---------------------------------------------------------------------------
// 8. Environment Checklist
// ---------------------------------------------------------------------------
function seedEnvironmentChecklist() {
  const items = [
    // High Priority
    { item: "Replace plastic food storage containers with glass or stainless steel (Pyrex, Glasslock)", category: "kitchen" },
    { item: "Stop microwaving food in plastic — use glass or ceramic only", category: "kitchen" },
    { item: "Replace plastic water bottles with stainless steel or glass", category: "kitchen" },
    { item: "Replace non-stick cookware (Teflon) with cast iron, stainless steel, or ceramic", category: "kitchen" },
    { item: "Switch to aluminum-free, paraben-free deodorant/antiperspirant", category: "personal_care" },
    { item: "Switch to paraben-free, phthalate-free shampoo and body wash", category: "personal_care" },

    // Medium Priority
    { item: "Install water filter for drinking water (even on municipal supply)", category: "water" },
    { item: "Avoid handling thermal receipts (or wash hands immediately after)", category: "home" },
    { item: "Choose organic for the 'Dirty Dozen' produce list", category: "kitchen" },
    { item: "Get HEPA air purifier for home office", category: "home" },
    { item: "Switch to natural cleaning products (avoid harsh chemicals)", category: "home" },
    { item: "Replace plastic cutting boards with wood or bamboo", category: "kitchen" },
    { item: "Use glass containers for meal prep and leftovers", category: "kitchen" },
    { item: "Check personal care products on EWG's Skin Deep database", category: "personal_care" },
  ];

  for (const item of items) {
    db.insert(schema.environmentChecklist).values({
      ...item,
      completed: 0,
      createdAt: now,
    }).run();
  }

  console.log(`  Seeded environment_checklist (${items.length} records).`);
}

// ---------------------------------------------------------------------------
// 9. Body Metrics (starting weight)
// ---------------------------------------------------------------------------
function seedBodyMetrics() {
  db.insert(schema.bodyMetrics).values({
    date: "2026-02-23",
    weight: 225,
    notes: "Starting weight — Phase 1 Day 1",
    createdAt: now,
  }).run();

  console.log("  Seeded body_metrics (starting weight).");
}

// ---------------------------------------------------------------------------
// 10. Supplement Stack seed (template for daily log generation)
// ---------------------------------------------------------------------------
function seedSupplementLog() {
  const supplements = [
    { supplementName: "Fish Oil (EPA/DHA)", dose: "2-3g", timeOfDay: "morning" },
    { supplementName: "Vitamin D3", dose: "5000 IU", timeOfDay: "morning" },
    { supplementName: "Vitamin K2 (MK-7)", dose: "200mcg", timeOfDay: "morning" },
    { supplementName: "B-Complex", dose: "1 capsule", timeOfDay: "morning" },
    { supplementName: "Creatine Monohydrate", dose: "5g", timeOfDay: "morning" },
    { supplementName: "Zinc Picolinate", dose: "30mg", timeOfDay: "dinner" },
    { supplementName: "Magnesium Glycinate", dose: "400mg", timeOfDay: "before_bed" },
    { supplementName: "Collagen Peptides", dose: "10g", timeOfDay: "morning" },
    { supplementName: "Psyllium Husk", dose: "5g", timeOfDay: "dinner" },
  ];

  // Seed today's supplement checklist
  const today = new Date().toISOString().split("T")[0];
  for (const supp of supplements) {
    db.insert(schema.supplementLog).values({
      date: today,
      ...supp,
      taken: 0,
      createdAt: now,
    }).run();
  }

  console.log(`  Seeded supplement_log (${supplements.length} supplements for today).`);
}

// ---------------------------------------------------------------------------
// Run all seeds
// ---------------------------------------------------------------------------
function main() {
  console.log("\nADONIS Database Seed\n" + "=".repeat(40));

  // Migrate existing databases safely
  console.log("\nRunning migrations...");
  migrateExisting();

  // Create tables using raw SQL (Drizzle push)
  console.log("\nCreating tables...");
  createTables();

  console.log("\nClearing existing data...");
  clearAll();

  console.log("\nSeeding data...");
  seedUserProfile();
  seedLabResults();
  seedGoals();
  seedTrainingPhases();
  seedNutritionTargets();
  seedFavoriteMeals();
  seedPreventiveCare();
  seedEnvironmentChecklist();
  seedBodyMetrics();
  seedSupplementLog();

  console.log("\n" + "=".repeat(40));
  console.log("Seed complete! All tables populated.");
  console.log(`Database: ${DB_PATH}`);

  sqlite.close();
}

// ---------------------------------------------------------------------------
// Create tables using shared definition (avoids duplication)
// ---------------------------------------------------------------------------
function createTables() {
  ensureTables(sqlite);
  console.log("  All 25 tables created.");
}

// ---------------------------------------------------------------------------
// Migration helper: safely ALTERs existing databases
// ---------------------------------------------------------------------------
function migrateExisting() {
  // Add setup_complete to user_profile if missing
  try {
    sqlite.exec(`ALTER TABLE user_profile ADD COLUMN setup_complete INTEGER DEFAULT 0`);
    console.log("  Migration: added setup_complete to user_profile.");
  } catch {
    // Column already exists — safe to ignore
  }

  // Add coach_feedback to workouts if missing
  try {
    sqlite.exec(`ALTER TABLE workouts ADD COLUMN coach_feedback TEXT`);
    console.log("  Migration: added coach_feedback to workouts.");
  } catch {
    // Column already exists — safe to ignore
  }

  // Create new tables (IF NOT EXISTS handles idempotency)
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS streak_freezes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      streak_type TEXT NOT NULL,
      reason TEXT,
      created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS streak_milestones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      streak_type TEXT NOT NULL,
      milestone INTEGER NOT NULL,
      achieved_date TEXT NOT NULL,
      celebrated INTEGER DEFAULT 0,
      created_at TEXT
    );
  `);
  console.log("  Migration: ensured streak_freezes + streak_milestones exist.");
}

main();
