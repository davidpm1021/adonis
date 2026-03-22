// ADONIS Color Palette
export const COLORS = {
  bg: {
    primary: "#0a0a0f",
    card: "#12121a",
    cardHover: "#1a1a2e",
  },
  accent: {
    teal: "#00e5c7",
    amber: "#f59e0b",
    red: "#ef4444",
    green: "#22c55e",
  },
  text: {
    primary: "#f5f5f5",
    secondary: "#8b8b9e",
  },
} as const;

// AI Model Routing
export const AI_MODELS = {
  COACHING: "claude-opus-4-6" as const,
  FOOD_PARSE: "claude-sonnet-4-5-20250929" as const,
  PHOTO_PARSE: "claude-opus-4-6" as const,
  MEAL_SUGGEST: "claude-sonnet-4-5-20250929" as const,
};

// Rate Limits
export const AI_RATE_LIMIT = 50; // messages per day
export const SYSTEM_PROMPT_TOKEN_BUDGET = 8000;

// Sobriety
export const SOBRIETY_START_DATE = "2025-02-23"; // Phase 1 start
export const SOBRIETY_MILESTONES = [1, 3, 7, 14, 30, 60, 90, 180, 365, 500, 730, 1000];

// Dashboard phases based on days of data
export const DASHBOARD_PHASES = {
  EARLY: { min: 1, max: 28, label: "Early" },
  ESTABLISHED: { min: 29, max: 84, label: "Established" },
  DATA_RICH: { min: 85, max: Infinity, label: "Data-Rich" },
} as const;

// Blood pressure reference ranges
export const BP_RANGES = {
  OPTIMAL: { systolic: [0, 120], diastolic: [0, 80], label: "Optimal", color: "#22c55e" },
  ELEVATED: { systolic: [120, 130], diastolic: [80, 80], label: "Elevated", color: "#f59e0b" },
  STAGE_1: { systolic: [130, 140], diastolic: [80, 90], label: "Stage 1 HTN", color: "#ef4444" },
  STAGE_2: { systolic: [140, 999], diastolic: [90, 999], label: "Stage 2 HTN", color: "#dc2626" },
} as const;

// Resting heart rate ranges (male, age 40-45)
export const HR_RANGES = {
  EXCELLENT: { min: 0, max: 58, label: "Excellent", color: "#22c55e" },
  GOOD: { min: 58, max: 64, label: "Good", color: "#00e5c7" },
  AVERAGE: { min: 64, max: 70, label: "Average", color: "#f5f5f5" },
  BELOW_AVG: { min: 70, max: 78, label: "Below Average", color: "#f59e0b" },
  POOR: { min: 78, max: 999, label: "Poor", color: "#ef4444" },
} as const;

// SpO2 threshold
export const SPO2_ALERT_THRESHOLD = 95;

// HOMA-IR interpretation
export const HOMA_IR_RANGES = {
  NORMAL: { min: 0, max: 1.0, label: "Normal", color: "#22c55e" },
  EARLY_IR: { min: 1.0, max: 1.9, label: "Early IR", color: "#f59e0b" },
  SIGNIFICANT_IR: { min: 1.9, max: 2.9, label: "Significant IR", color: "#ef4444" },
  SEVERE_IR: { min: 2.9, max: 999, label: "Severe IR", color: "#dc2626" },
} as const;

// Lab biomarker registry
export const LAB_BIOMARKERS: Record<string, {
  unit: string;
  low: number;
  high: number;
  interpretation: string;
  priority: 1 | 2;
}> = {
  "Fasting Glucose": { unit: "mg/dL", low: 65, high: 100, interpretation: "Blood sugar control", priority: 1 },
  "HbA1c": { unit: "%", low: 4.0, high: 5.7, interpretation: "3-month blood sugar average", priority: 1 },
  "Fasting Insulin": { unit: "uIU/mL", low: 2.6, high: 11.1, interpretation: "Insulin resistance marker", priority: 1 },
  "Total Testosterone": { unit: "ng/dL", low: 300, high: 1000, interpretation: "Primary androgen", priority: 1 },
  "Free Testosterone": { unit: "pg/mL", low: 8.7, high: 25.1, interpretation: "Bioactive testosterone", priority: 1 },
  "SHBG": { unit: "nmol/L", low: 16.5, high: 55.9, interpretation: "Sex hormone binding globulin", priority: 1 },
  "Estradiol": { unit: "pg/mL", low: 8, high: 35, interpretation: "Primary estrogen", priority: 1 },
  "Total Cholesterol": { unit: "mg/dL", low: 0, high: 200, interpretation: "Total cholesterol", priority: 1 },
  "LDL": { unit: "mg/dL", low: 0, high: 100, interpretation: "Bad cholesterol", priority: 1 },
  "HDL": { unit: "mg/dL", low: 40, high: 999, interpretation: "Good cholesterol", priority: 1 },
  "Triglycerides": { unit: "mg/dL", low: 0, high: 150, interpretation: "Blood fats", priority: 1 },
  "ALT": { unit: "U/L", low: 7, high: 44, interpretation: "Liver enzyme", priority: 1 },
  "AST": { unit: "U/L", low: 8, high: 33, interpretation: "Liver enzyme", priority: 1 },
  "GGT": { unit: "U/L", low: 8, high: 61, interpretation: "Liver enzyme (alcohol-sensitive)", priority: 1 },
  "hs-CRP": { unit: "mg/L", low: 0, high: 1.0, interpretation: "Systemic inflammation", priority: 1 },
  "TSH": { unit: "mIU/L", low: 0.5, high: 5.0, interpretation: "Thyroid function", priority: 1 },
  "Free T4": { unit: "ng/dL", low: 0.7, high: 1.9, interpretation: "Active thyroid hormone", priority: 1 },
  "Free T3": { unit: "pg/mL", low: 2.0, high: 4.4, interpretation: "Most active thyroid hormone", priority: 1 },
  "Vitamin D": { unit: "ng/mL", low: 40, high: 80, interpretation: "Vitamin D status", priority: 1 },
  "Homocysteine": { unit: "umol/L", low: 0, high: 10, interpretation: "Cardiovascular risk marker", priority: 2 },
  "Uric Acid": { unit: "mg/dL", low: 3.5, high: 7.2, interpretation: "Gout/metabolic risk", priority: 2 },
  "Ferritin": { unit: "ng/mL", low: 30, high: 300, interpretation: "Iron stores", priority: 2 },
  "ApoB": { unit: "mg/dL", low: 0, high: 90, interpretation: "Atherogenic particle count", priority: 2 },
  "Lp(a)": { unit: "nmol/L", low: 0, high: 75, interpretation: "Genetic cardiovascular risk", priority: 2 },
};

// Supplement stack
export const DEFAULT_SUPPLEMENTS = [
  { name: "Fish Oil (EPA/DHA)", dose: "2g", time_of_day: "morning" },
  { name: "Vitamin D3", dose: "5000 IU", time_of_day: "morning" },
  { name: "Vitamin K2 (MK-7)", dose: "100mcg", time_of_day: "morning" },
  { name: "B-Complex", dose: "1 capsule", time_of_day: "morning" },
  { name: "Creatine Monohydrate", dose: "5g", time_of_day: "morning" },
  { name: "Zinc", dose: "30mg", time_of_day: "dinner" },
  { name: "Magnesium Glycinate", dose: "400mg", time_of_day: "before_bed" },
  { name: "Collagen Peptides", dose: "10g", time_of_day: "morning" },
  { name: "Psyllium Husk", dose: "5g", time_of_day: "dinner" },
] as const;

// ---------------------------------------------------------------------------
// Streak System (Duolingo-style)
// ---------------------------------------------------------------------------
export const STREAK_MILESTONES = [3, 7, 14, 21, 30, 50, 60, 90, 100, 150, 180, 200, 250, 300, 365, 500, 730, 1000];

export const STREAK_BEHAVIORS = [
  { key: "dailyLog", label: "Daily Log", icon: "ClipboardCheck", description: "Log your day" },
  { key: "morningWalk", label: "Morning Walk", icon: "Footprints", description: "Get your walk in" },
  { key: "strengthTraining", label: "Training", icon: "Dumbbell", description: "Complete workout", respectsRestDays: true },
  { key: "proteinTarget", label: "Protein Goal", icon: "Beef", description: "Hit protein target" },
  { key: "supplementsTaken", label: "Supplements", icon: "Pill", description: "Take all supplements" },
  { key: "alcoholFree", label: "Alcohol-Free", icon: "ShieldCheck", description: "Stay sober" },
  { key: "sleepLogged", label: "Sleep Logged", icon: "Moon", description: "Log your sleep" },
] as const;

export type StreakBehaviorKey = (typeof STREAK_BEHAVIORS)[number]["key"];

export const STREAK_FLAME_TIERS = [
  { min: 0, max: 2, color: "#4a4a5e", label: "Building", glowIntensity: 0 },
  { min: 3, max: 6, color: "#d4d4d8", label: "Warming Up", glowIntensity: 0.2 },
  { min: 7, max: 29, color: "#f59e0b", label: "On Fire", glowIntensity: 0.4 },
  { min: 30, max: 99, color: "#f59e0b", label: "Blazing", glowIntensity: 0.6 },
  { min: 100, max: 364, color: "#00e5c7", label: "Legendary", glowIntensity: 0.8 },
  { min: 365, max: Infinity, color: "#00e5c7", label: "Immortal", glowIntensity: 1.0 },
] as const;

export const MAX_STREAK_FREEZES_PER_MONTH = 2;

// Phase 1 training start
export const PHASE_1_START_DATE = "2026-02-23";

// Navigation items
export const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  { label: "Daily Log", href: "/daily-log", icon: "ClipboardCheck" },
  { label: "Nutrition", href: "/nutrition", icon: "Utensils" },
  { label: "Body Metrics", href: "/body-metrics", icon: "Activity" },
  { label: "Labs", href: "/labs", icon: "TestTubes" },
  { label: "Training", href: "/training", icon: "Dumbbell" },
  { label: "Supplements", href: "/supplements", icon: "Pill" },
  { label: "Sleep", href: "/sleep", icon: "Moon" },
  { label: "Vitals", href: "/vitals", icon: "HeartPulse" },
  { label: "Preventive Care", href: "/preventive-care", icon: "ShieldCheck" },
  { label: "Trends", href: "/trends", icon: "TrendingUp" },
  { label: "Reports", href: "/reports", icon: "FileText" },
  { label: "AI Coach", href: "/ai-coach", icon: "Bot" },
  { label: "Environment", href: "/environment", icon: "Leaf" },
  { label: "Settings", href: "/settings", icon: "Settings" },
] as const;

// Supplement purposes — why each supplement is taken
export const SUPPLEMENT_PURPOSES: Record<string, string> = {
  "Fish Oil (EPA/DHA)": "Reduces inflammation, supports cardiovascular and brain health, improves triglycerides",
  "Vitamin D3": "Immune function, bone density, mood regulation — critical with low baseline levels",
  "Vitamin K2 (MK-7)": "Directs calcium to bones (not arteries), works synergistically with D3",
  "B-Complex": "Energy metabolism, nervous system support, methylation — important with ADHD medication",
  "Creatine Monohydrate": "Muscle recovery, strength gains, cognitive function, well-researched and safe",
  "Zinc": "Testosterone support, immune function, wound healing — take with food to avoid nausea",
  "Zinc Picolinate": "Testosterone support, immune function, wound healing — take with food to avoid nausea",
  "Magnesium Glycinate": "Sleep quality, muscle relaxation, stress reduction — glycinate form is best absorbed at night",
  "Collagen Peptides": "Joint health, skin elasticity, Achilles tendon support — take on empty stomach",
  "Psyllium Husk": "Fiber supplementation for gut health, blood sugar regulation, and NAFLD management",
};

// Lab retest schedule
export const LAB_RETEST_SCHEDULE = [
  { label: "Baseline", date: "2025-10-21", status: "completed" as const },
  { label: "3-Month", date: "2026-05-23", status: "upcoming" as const },
  { label: "6-Month", date: "2026-08-23", status: "upcoming" as const },
  { label: "12-Month", date: "2027-02-23", status: "upcoming" as const },
] as const;
