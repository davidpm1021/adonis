# Project Spec: ADONIS — Personal Health Operating System

**Built for David Martin | Self-Hosted | AI-Powered**
**"Rebuild the machine."**

---

## Overview

ADONIS is a self-hosted, full-stack health dashboard and AI coaching platform designed for one user: David, a 44-year-old male rebuilding his health from the ground up. It runs on a local media server, accessed via localhost, and integrates the Claude API (Opus 4.6) as an always-available health coach with full context of David's medical history, lab work, training plan, and daily progress data.

This is not a generic fitness app. It is a comprehensive biological monitoring system that tracks everything from daily habits and body metrics to lab values, supplement compliance, sleep quality, and long-term health trends — with an adaptive AI layer that learns from David's data patterns, adjusts recommendations over time, flags concerns, and provides accountability. The system gets smarter the more it's used.

**See also: ADONIS Addendum v1.1** for the full Adaptive Intelligence System and Smart Food Logging specifications.

---

## Tech Stack (Recommended)

**Frontend:** React 18+ with TypeScript, Tailwind CSS, Recharts or Chart.js for data visualization, Framer Motion for animations
**Backend:** Node.js with Express (or Next.js full-stack)
**Database:** SQLite (simple, file-based, perfect for single-user self-hosted) via Prisma or Drizzle ORM
**AI Integration:** Anthropic Claude API (claude-opus-4-6) via @anthropic-ai/sdk
**Hosting:** Localhost on media server, accessed via bookmarked URL (e.g., http://localhost:3000)

---

## Design Direction

**Aesthetic:** Dark, minimal, utilitarian — like a mission control dashboard for the human body. Think Bloomberg Terminal meets medical monitoring meets brutalist design. Not a bubbly fitness app. This is serious infrastructure for a serious project.

**Color Palette:**

- Background: Near-black (#0a0a0f) with subtle dark card surfaces (#12121a, #1a1a2e)
- Primary accent: Electric teal/cyan (#00e5c7) — used sparingly for active states, progress indicators, key metrics
- Secondary accent: Warm amber (#f59e0b) — warnings, attention items
- Danger: Muted red (#ef4444) — missed targets, out-of-range labs
- Success: Clean green (#22c55e) — completed habits, in-range values
- Text: White (#f5f5f5) primary, gray (#8b8b9e) secondary

**Typography:**

- Display/headers: JetBrains Mono or IBM Plex Mono (monospace, technical feel)
- Body: IBM Plex Sans or DM Sans
- Data/metrics: Tabular numerals, JetBrains Mono

**Interactions:**

- Smooth transitions between views (200–300ms)
- Subtle glow effects on active metrics
- Progress rings and animated counters for daily stats
- Minimal motion — purposeful, not decorative

---

## Core Architecture

```
┌──────────────────────────────────────────┐
│                FRONTEND                   │
│  React SPA with routing                  │
│  ├── Dashboard (daily overview)          │
│  ├── Log Entry (daily check-in form)     │
│  ├── Body Metrics (weight, measurements) │
│  ├── Lab Tracker (blood work over time)  │
│  ├── Training Log (workouts)             │
│  ├── Nutrition Log (meals, macros)       │
│  ├── Supplement Tracker                  │
│  ├── Sleep Log                           │
│  ├── Trends & Analytics                  │
│  ├── AI Coach (chat interface)           │
│  └── Settings & Profile                  │
├──────────────────────────────────────────┤
│                BACKEND API                │
│  Express/Next.js API routes              │
│  ├── /api/daily-log                      │
│  ├── /api/metrics                        │
│  ├── /api/labs                           │
│  ├── /api/workouts                       │
│  ├── /api/nutrition                      │
│  ├── /api/supplements                    │
│  ├── /api/sleep                          │
│  ├── /api/trends                         │
│  ├── /api/ai-coach                       │
│  └── /api/settings                       │
├──────────────────────────────────────────┤
│              DATABASE (SQLite)            │
│  Single file, backed up daily            │
│  All tables defined below                │
├──────────────────────────────────────────┤
│           CLAUDE API INTEGRATION          │
│  System prompt with full health context   │
│  Conversation history per session         │
│  Access to all DB data for analysis       │
└──────────────────────────────────────────┘
```

---

## Database Schema

### user_profile

```sql
CREATE TABLE user_profile (
  id INTEGER PRIMARY KEY DEFAULT 1,
  name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  sex TEXT NOT NULL,
  height_inches REAL NOT NULL,
  starting_weight REAL NOT NULL,
  goal_weight REAL,
  medical_conditions TEXT, -- JSON array
  medications TEXT, -- JSON array
  allergies TEXT, -- JSON array
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### daily_log

The core table — one row per day, capturing the non-negotiables and daily snapshot.

```sql
CREATE TABLE daily_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date DATE NOT NULL UNIQUE,

  -- Non-negotiable habits (boolean tracking)
  morning_walk BOOLEAN DEFAULT FALSE,
  walk_duration_minutes INTEGER,
  strength_training BOOLEAN DEFAULT FALSE,
  ate_lunch_with_protein BOOLEAN DEFAULT FALSE,
  mobility_work BOOLEAN DEFAULT FALSE,
  supplements_taken BOOLEAN DEFAULT FALSE,

  -- Alcohol (tracking sobriety streak)
  alcohol_free BOOLEAN DEFAULT TRUE,

  -- Subjective scores (1-10)
  energy_level INTEGER CHECK(energy_level BETWEEN 1 AND 10),
  mood_score INTEGER CHECK(mood_score BETWEEN 1 AND 10),
  stress_level INTEGER CHECK(stress_level BETWEEN 1 AND 10),
  soreness_level INTEGER CHECK(soreness_level BETWEEN 1 AND 10),

  -- Notes
  notes TEXT,
  wins TEXT, -- what went well
  struggles TEXT, -- what was hard

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### body_metrics

```sql
CREATE TABLE body_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date DATE NOT NULL,
  weight REAL, -- lbs
  body_fat_percentage REAL, -- if measured
  waist_inches REAL,
  chest_inches REAL,
  arm_inches REAL,
  thigh_inches REAL,
  neck_inches REAL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### lab_results

```sql
CREATE TABLE lab_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date DATE NOT NULL,
  test_name TEXT NOT NULL,
  value REAL NOT NULL,
  unit TEXT NOT NULL,
  reference_low REAL,
  reference_high REAL,
  flag TEXT, -- 'normal', 'high', 'low', 'critical'
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Pre-populated with David's existing labs (10/21/2025 and 01/24/2025 results).

### workouts

```sql
CREATE TABLE workouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date DATE NOT NULL,
  workout_type TEXT NOT NULL, -- 'strength', 'walk', 'cardio', 'mobility', 'other'
  duration_minutes INTEGER,
  notes TEXT,
  rpe INTEGER CHECK(rpe BETWEEN 1 AND 10), -- rate of perceived exertion
  completed BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### exercises

```sql
CREATE TABLE exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_id INTEGER NOT NULL REFERENCES workouts(id),
  exercise_name TEXT NOT NULL,
  sets INTEGER,
  reps INTEGER,
  weight_lbs REAL,
  duration_seconds INTEGER, -- for holds/carries
  distance_steps INTEGER, -- for carries
  notes TEXT
);
```

### nutrition_log

```sql
CREATE TABLE nutrition_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date DATE NOT NULL,
  meal_type TEXT NOT NULL, -- 'breakfast', 'lunch', 'snack', 'dinner'
  description TEXT NOT NULL,
  calories INTEGER,
  protein_g REAL,
  carbs_g REAL,
  fat_g REAL,
  fiber_g REAL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### supplement_log

```sql
CREATE TABLE supplement_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date DATE NOT NULL,
  supplement_name TEXT NOT NULL,
  dose TEXT NOT NULL,
  taken BOOLEAN DEFAULT TRUE,
  time_of_day TEXT, -- 'morning', 'evening', 'with_meal'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### sleep_log

```sql
CREATE TABLE sleep_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date DATE NOT NULL, -- the date of the morning you woke up
  bedtime TIME,
  wake_time TIME,
  total_hours REAL,
  sleep_quality INTEGER CHECK(sleep_quality BETWEEN 1 AND 10),
  time_to_fall_asleep_minutes INTEGER,
  wake_ups INTEGER, -- number of times woke during night
  bipap_used BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### ai_conversations

```sql
CREATE TABLE ai_conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL, -- 'user', 'assistant', 'system'
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### goals

```sql
CREATE TABLE goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL, -- 'weight', 'fitness', 'lab', 'habit', 'custom'
  description TEXT NOT NULL,
  target_value REAL,
  target_unit TEXT,
  target_date DATE,
  current_value REAL,
  status TEXT DEFAULT 'active', -- 'active', 'achieved', 'paused'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## Page-by-Page Feature Spec

### 1. Dashboard (Home — `/`)

The daily command center. Shows today's status at a glance.

**Top Section: Today's Scorecard**

- Date and day of the week, prominently displayed
- Sobriety day counter (large, prominent — this is the streak that matters most)
- Phase indicator (e.g., "Phase 1 — Week 3 of 6")
- Days since starting (e.g., "Day 19")

**Non-Negotiable Grid (4 cards):**
Each card is a large toggle/status indicator:

1. Morning Walk — ✓/✗ with duration if logged
2. Strength Training — ✓/✗ (only shown on Tue/Thu/Sat, grayed out on rest days)
3. Lunch with Protein — ✓/✗
4. Mobility Work — ✓/✗
5. Supplements — ✓/✗

Tapping a card either toggles it (quick log) or opens a detail entry.

**Streak Counter:**
Horizontal streak visualization showing the last 30 days. Each day is a small square:

- Green = all non-negotiables hit
- Yellow = most hit (75%+)
- Red = missed majority
- Gray = future days

**Metrics Snapshot:**

- Current weight (with trend arrow and delta from starting)
- Last night's sleep (hours + quality score)
- Today's macros so far (if logged)
- Overall consistency % (last 7 days, last 30 days)

**Quick Actions:**

- "Log Today" button → opens the daily check-in form
- "Talk to Coach" button → opens AI chat
- "Log Weight" → quick weight entry
- "Log Workout" → workout entry

**Motivation/Context:**

- A small card showing the next lab retest date and days until
- Current phase goals summary

---

### 2. Daily Check-In (`/log` or `/log/:date`)

The primary data entry form. Should be fast to complete — under 2 minutes for a standard day.

**Structure:**

- Date selector (defaults to today)
- Non-negotiable toggles (walk, strength, lunch, mobility, supplements, alcohol-free)
- Walk duration slider or number input (if walk = yes)
- Subjective scores: Energy, Mood, Stress, Soreness (each 1–10 slider or button row)
- Wins field (text — "what went well today")
- Struggles field (text — "what was hard today")
- Free-form notes

**Smart defaults:**

- Alcohol-free defaults to YES
- BiPAP defaults to YES
- On non-training days, strength training is pre-marked as "rest day"

**After saving:** Show a confirmation with a summary and optionally ask if the user wants to log nutrition or a workout in detail.

---

### 3. Body Metrics (`/metrics`)

**Weight Tracking:**

- Line chart showing weight over time with trend line
- Starting weight marker (225 lbs)
- Goal weight marker (if set)
- Weight entry: simple input with date

**Body Measurements:**

- Waist, chest, arm, thigh, neck circumference
- Chart showing each measurement over time
- Recommendation to measure weekly on the same day (Saturday morning, before eating)

**BMI / Body Composition:**

- Calculated BMI display (note: BMI is a crude tool, displayed for reference only)
- Body fat % if measured (optional)

---

### 4. Lab Tracker (`/labs`)

**Lab Dashboard:**

- Cards for each tracked biomarker, showing current value, reference range, and status (in-range, high, low)
- Trend sparkline showing history (if multiple results exist)
- Color-coded: green (in range), amber (borderline), red (out of range)

**Key Biomarkers to Track:**
| Biomarker | Current | Reference | Status | Priority |
|---|---|---|---|---|
| Fasting Glucose | 113 | 70–99 | HIGH | Critical |
| HbA1c | 5.4 | 4.8–5.6 | Normal | Monitor |
| Testosterone (Total) | 232 | 264–916 | LOW | Critical |
| Free Testosterone | 17.7 | 6.8–21.5 | Normal | Monitor |
| ALT (SGPT) | 57 | 0–44 | HIGH | Critical |
| AST (SGOT) | 30 | 0–40 | Normal | Monitor |
| Triglycerides | 182 | 0–149 | HIGH | Critical |
| HDL Cholesterol | 39 | >39 | BORDERLINE | High |
| LDL Cholesterol | 86 | 0–99 | Normal | Monitor |
| Total Cholesterol | 156 | 100–199 | Normal | Monitor |
| Vitamin D | 37.9 | 30–100 | Normal (Low Optimal) | Monitor |
| eGFR | 103 | >59 | Normal | Monitor |
| Hemoglobin | 16.1 | 13.0–17.7 | Normal | Low |
| Platelets | 167 | 150–450 | Normal | Low |

**Lab Entry:**

- Form to enter new lab results with date, test name, value, units, reference range
- Bulk import option (enter a full panel at once)
- Compare current vs. previous with delta and direction arrows

**Timeline View:**

- Expandable chart for each biomarker showing all historical values
- Reference range shaded as a band on the chart
- Annotations for major lifestyle changes (e.g., "Started exercise", "Quit alcohol", "Started Mounjaro")

---

### 5. Training Log (`/training`)

**Calendar View:**

- Monthly calendar with workout days highlighted
- Strength days (Tue/Thu/Sat) marked differently from walk-only days
- Click any day to view or log workout

**Workout Entry:**

- Select workout type (Strength, Walk, Cardio, Other)
- Duration
- RPE (1–10)
- For strength: add exercises with sets × reps × weight
- Pre-loaded exercise library based on Phase 1 plan:
  - Goblet Squat
  - Push-ups
  - Dumbbell Row
  - Kettlebell Deadlift / Kettlebell Swing
  - Dead Bug / Plank
  - Farmer's Carry
- Notes field

**Progress Tracking:**

- For each exercise: chart showing volume over time (sets × reps × weight)
- Total weekly training volume
- Training consistency (sessions completed vs. planned)

**Phase Plan Reference:**

- Display current phase's prescribed workout (from Phase 1 plan)
- Show which week you're in and what the targets are
- Easy comparison: prescribed vs. actual

---

### 6. Nutrition Log (`/nutrition`)

**Daily View:**

- Meal cards: Breakfast, Lunch, Snack, Dinner
- Each meal shows description + macros if entered
- Daily totals bar: Protein | Carbs | Fat | Fiber | Calories
- Target bars showing progress toward daily goals:
  - Protein: 160–180g (primary target, most visually prominent)
  - Fiber: 35–40g
  - Calories: ~1,800–2,200 (flexible, not rigid)

**Meal Entry:**

- Meal type selector
- Description (free text)
- Macro inputs (protein, carbs, fat, fiber, calories — all optional but encouraged)
- Quick-add buttons for common meals (can be customized):
  - "Eggs + Greek Yogurt breakfast" → pre-filled macros
  - "Chicken + salad lunch" → pre-filled macros
  - "Protein shake" → pre-filled macros

**Weekly Summary:**

- Average daily protein, fiber, calories
- Compliance with targets
- Trend charts

---

### 7. Supplement Tracker (`/supplements`)

**Daily Checklist View:**
Pre-configured supplement stack with checkboxes:

**Morning (with breakfast):**

- [ ] Fish Oil (2–3g EPA/DHA)
- [ ] Vitamin D3 (5,000 IU)
- [ ] Vitamin K2 (MK-7, 200mcg)
- [ ] B-Complex
- [ ] Creatine (5g)

**With Dinner:**

- [ ] Zinc Picolinate (30mg)

**Before Bed:**

- [ ] Magnesium Glycinate (400mg)
- [ ] Collagen Peptides (optional)
- [ ] Psyllium Husk (optional)

**Compliance Tracking:**

- Weekly compliance % per supplement
- Calendar heatmap showing supplement consistency
- Ability to add/remove supplements from the stack

---

### 8. Sleep Log (`/sleep`)

**Daily Entry:**

- Bedtime and wake time (time pickers)
- Total hours (auto-calculated)
- Sleep quality (1–10 slider)
- Estimated time to fall asleep (minutes)
- Number of wake-ups
- BiPAP used (yes/no toggle, defaults to yes)
- Notes (e.g., "woke up at 3am, took 20min to fall back asleep")

**Trend Charts:**

- Sleep duration over time
- Sleep quality over time
- Time to fall asleep over time
- Correlation view: sleep quality vs. alcohol (once streak is long enough, this becomes a powerful motivator — "your average sleep quality without alcohol is X vs. Y before")

---

### 9. Trends & Analytics (`/trends`)

The big picture view. This is where the data tells a story.

**Key Dashboards:**

**Consistency Score:**

- Overall habit compliance over 7 / 30 / 90 day windows
- Breakdown by habit (walk %, strength %, nutrition %, supplements %)
- Streak tracker: current and longest streaks for each habit

**Body Composition Trend:**

- Weight chart with trendline and projected trajectory
- If measurements are tracked: waist trend (the most health-relevant measurement)

**Lab Trajectory:**

- Multi-line chart showing all critical biomarkers normalized to their reference ranges
- Clear visual of what's improving and what needs attention
- Projected next lab date with targets

**Correlations (AI-powered insights):**

- Sleep quality vs. energy level
- Training consistency vs. mood
- Weight trend vs. nutrition compliance
- Sobriety days vs. sleep quality

**Monthly Report:**

- Auto-generated summary of the month: key stats, achievements, areas for improvement
- Can be generated by AI Coach on demand

---

### 10. AI Coach (`/coach`)

**This is the killer feature.**

A full chat interface powered by Claude Opus 4.6, with a system prompt that includes:

1. David's complete health profile (from user_profile table)
2. The Complete Human Operating Manual (full text embedded in system prompt)
3. The Phase 1 Plan (full text embedded)
4. Recent daily logs (last 7–14 days of data, pulled from DB and formatted)
5. Latest body metrics
6. Latest lab results
7. Current goals and progress

**System Prompt Structure:**

```
You are David's personal health coach. You have complete knowledge of his
medical history, current medications, lab work, training plan, and daily
progress data.

[Full health manual inserted here]
[Full Phase 1 plan inserted here]

CURRENT DATA:
[User profile]
[Last 14 days of daily logs]
[Latest body metrics]
[Latest lab results]
[Current goals]
[Current supplement stack and compliance]

Your role:
- Provide specific, actionable advice based on David's actual data
- Flag concerning trends (e.g., declining sleep quality, missed training sessions)
- Celebrate wins and streaks
- Adjust recommendations based on progress
- Answer health and nutrition questions in the context of David's specific situation
- Be direct, no-nonsense, and honest
- Reference specific data points when giving feedback
- Never provide generic advice — everything should be personalized to David's profile

Important notes:
- David is on Mounjaro 10mg, Lipitor, Adderall, and Vitamin D
- David has severe obstructive sleep apnea and uses a BiPAP nightly
- David quit alcohol on [DATE]. Track and reinforce this.
- David has a left Achilles issue — monitor for pain reports
- David's testosterone is low (232) — lifestyle intervention first, reassess at 6 months
- When David asks about medical decisions (changing meds, TRT, etc.),
  always recommend discussing with his doctor
```

**Chat Features:**

- Persistent conversation history (stored in ai_conversations table)
- "New session" button to start fresh
- Context window shows the data summary being sent to Claude
- Quick prompts:
  - "How am I doing this week?"
  - "Analyze my sleep trends"
  - "What should I focus on today?"
  - "Am I on track for my goals?"
  - "Review my nutrition this week"
  - "Generate my monthly report"

**Weekly Check-In (Prompted):**
The system should prompt David once per week (e.g., Sunday evening) to have a structured check-in with the AI coach. The AI reviews the week's data and provides a summary, flags, and adjustments.

---

### 11. Settings & Profile (`/settings`)

- Edit profile info (weight goal, medications, conditions)
- Manage supplement stack (add/remove supplements)
- Set daily targets (protein, fiber, calories, steps)
- Configure notification preferences
- Export data (CSV/JSON)
- Database backup
- API key management (Claude API key stored securely — environment variable, not in DB)
- Phase management (current phase, start date, week number)

---

## API Routes

### Daily Log

```
GET    /api/daily-log              → List logs (with date range filter)
GET    /api/daily-log/:date        → Get specific day
POST   /api/daily-log              → Create/update day's log
DELETE /api/daily-log/:date        → Delete a day's log
```

### Body Metrics

```
GET    /api/metrics                → List all metrics (with date range)
GET    /api/metrics/latest         → Get most recent entry
POST   /api/metrics                → Add new measurement
DELETE /api/metrics/:id            → Delete entry
```

### Lab Results

```
GET    /api/labs                   → List all results (filterable by test name, date range)
GET    /api/labs/summary           → Latest value for each biomarker
POST   /api/labs                   → Add lab result(s) — supports bulk insert
DELETE /api/labs/:id               → Delete result
```

### Workouts

```
GET    /api/workouts               → List workouts (with date range)
GET    /api/workouts/:id           → Get workout with exercises
POST   /api/workouts               → Create workout with exercises
PUT    /api/workouts/:id           → Update workout
DELETE /api/workouts/:id           → Delete workout
```

### Nutrition

```
GET    /api/nutrition              → List entries (with date range, meal type filter)
GET    /api/nutrition/daily/:date  → Get all meals for a day with totals
POST   /api/nutrition              → Add meal entry
DELETE /api/nutrition/:id          → Delete entry
```

### Supplements

```
GET    /api/supplements/stack      → Get current supplement stack config
GET    /api/supplements/log/:date  → Get supplement compliance for a date
POST   /api/supplements/log        → Log supplement compliance
PUT    /api/supplements/stack      → Update supplement stack
```

### Sleep

```
GET    /api/sleep                  → List sleep logs (with date range)
GET    /api/sleep/:date            → Get specific night
POST   /api/sleep                  → Add sleep log
DELETE /api/sleep/:id              → Delete entry
```

### Trends

```
GET    /api/trends/consistency     → Habit consistency stats
GET    /api/trends/weight          → Weight trend data
GET    /api/trends/labs            → Lab trend data for all biomarkers
GET    /api/trends/correlations    → Computed correlations between metrics
GET    /api/trends/streaks         → Current and best streaks
```

### AI Coach

```
POST   /api/ai-coach/chat         → Send message, get AI response
GET    /api/ai-coach/sessions      → List conversation sessions
GET    /api/ai-coach/sessions/:id  → Get conversation history
POST   /api/ai-coach/weekly-review → Trigger weekly review generation
DELETE /api/ai-coach/sessions/:id  → Delete session
```

### Settings

```
GET    /api/settings/profile       → Get user profile
PUT    /api/settings/profile       → Update user profile
GET    /api/settings/targets       → Get daily targets
PUT    /api/settings/targets       → Update daily targets
POST   /api/settings/export        → Export all data as JSON
POST   /api/settings/backup        → Create database backup
```

---

## AI Integration Details

### Claude API Call Structure

```typescript
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function chatWithCoach(
  userMessage: string,
  conversationHistory: Message[],
) {
  // Pull recent data from database
  const recentLogs = await getRecentDailyLogs(14);
  const latestMetrics = await getLatestBodyMetrics();
  const latestLabs = await getLatestLabSummary();
  const currentGoals = await getActiveGoals();
  const sleepData = await getRecentSleepLogs(7);
  const nutritionSummary = await getWeeklyNutritionSummary();
  const streaks = await getCurrentStreaks();
  const profile = await getUserProfile();

  const systemPrompt = buildSystemPrompt({
    profile,
    recentLogs,
    latestMetrics,
    latestLabs,
    currentGoals,
    sleepData,
    nutritionSummary,
    streaks,
    healthManual: HEALTH_MANUAL_TEXT,
    phasePlan: PHASE_1_PLAN_TEXT,
  });

  const response = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [...conversationHistory, { role: "user", content: userMessage }],
  });

  // Store conversation in DB
  await saveMessage(sessionId, "user", userMessage);
  await saveMessage(sessionId, "assistant", response.content[0].text);

  return response.content[0].text;
}
```

### Data Formatting for AI Context

The system prompt should format data cleanly so Claude can reason about it:

```
=== RECENT DAILY LOGS (Last 7 Days) ===
2/22: Walk ✓ (25min) | Strength ✗ (rest day) | Lunch ✓ | Mobility ✓ | Supplements ✓ | Alcohol-free ✓ | Energy: 6 | Mood: 7 | Sleep: 6.5hrs quality 5/10
2/21: Walk ✓ (20min) | Strength ✓ | Lunch ✓ | Mobility ✓ | Supplements ✓ | Alcohol-free ✓ | Energy: 5 | Mood: 6 | Sleep: 7hrs quality 6/10
...

=== BODY METRICS ===
Current weight: 221.4 lbs (started 225, down 3.6 lbs)
Trend: -0.8 lbs/week average

=== STREAKS ===
Sobriety: 14 days (current) / 14 days (best)
Morning walk: 12 days (current) / 12 days (best)
All non-negotiables: 9 days (current) / 9 days (best)

=== CRITICAL LAB VALUES (Last tested 10/21/2025) ===
Next lab retest target: ~1/21/2026 (3-month mark)
Glucose: 113 (HIGH — target: <100)
ALT: 57 (HIGH — target: <44)
Testosterone: 232 (LOW — target: improvement toward 400+)
Triglycerides: 182 (HIGH — target: <150)
HDL: 39 (BORDERLINE — target: >40, ideally >50)

=== NUTRITION (7-day averages) ===
Avg protein: 142g/day (target: 160-180g)
Avg fiber: 28g/day (target: 35-40g)
Avg calories: 1,950/day
```

---

## Seed Data

Pre-populate the database with:

1. **User Profile:** David Martin, DOB 10/21/1981, Male, 66 inches, 225 lbs starting weight
2. **Lab Results:** Both the 10/21/2025 panel AND the 01/24/2025 previous results (all biomarkers from both dates)
3. **Medications:** Mounjaro 10mg, Lipitor (dose TBD), Adderall (dose TBD), Vitamin D
4. **Medical Conditions:** Severe obstructive sleep apnea, pre-diabetes / insulin resistance, fatty liver (suspected NAFLD), low testosterone, dyslipidemia
5. **Supplement Stack:** Full stack from the health manual
6. **Goals:**
   - Weight: Target ~185–195 lbs
   - Fasting Glucose: Target <100
   - ALT: Target <44
   - Testosterone: Target >400
   - Triglycerides: Target <150
   - HDL: Target >50
   - Daily protein: 160–180g
   - Daily fiber: 35–40g
7. **Phase 1 Start Date:** 2/23/2026

---

## Stretch Features (Post-MVP)

- **Photo log:** Upload progress photos stored locally, displayed in timeline
- **PDF lab import:** Parse Labcorp PDF format automatically to populate lab results
- **Wearable integration:** Pull data from Apple Health / Google Fit / Garmin via export files
- **Weekly PDF report:** Auto-generate a formatted health report
- **Meal photo + AI macro estimation:** Take a photo of a meal, send to Claude Vision for estimated macros
- **Exercise form videos:** Embedded reference videos for each exercise in the training plan
- **Medication reminders:** Time-based notifications (if running as PWA)
- **Blood pressure tracking:** Separate log for BP readings if David starts monitoring
- **Mobile-responsive PWA:** Install as app on phone for quick logging on the go

---

## File Structure (Suggested)

```
foundation/
├── package.json
├── .env                          # ANTHROPIC_API_KEY, PORT, DB_PATH
├── prisma/
│   ├── schema.prisma             # Database schema
│   └── seed.ts                   # Seed data (David's profile, labs, etc.)
├── src/
│   ├── server/
│   │   ├── index.ts              # Express server entry
│   │   ├── db.ts                 # Database connection
│   │   ├── routes/
│   │   │   ├── dailyLog.ts
│   │   │   ├── metrics.ts
│   │   │   ├── labs.ts
│   │   │   ├── workouts.ts
│   │   │   ├── nutrition.ts
│   │   │   ├── supplements.ts
│   │   │   ├── sleep.ts
│   │   │   ├── trends.ts
│   │   │   ├── aiCoach.ts
│   │   │   └── settings.ts
│   │   ├── services/
│   │   │   ├── aiCoach.ts        # Claude API integration
│   │   │   ├── analytics.ts     # Trend calculations
│   │   │   └── streaks.ts       # Streak computations
│   │   └── data/
│   │       ├── healthManual.ts   # Full health manual text
│   │       └── phasePlan.ts      # Phase 1 plan text
│   └── client/
│       ├── index.html
│       ├── App.tsx
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Sidebar.tsx
│       │   │   ├── Header.tsx
│       │   │   └── Layout.tsx
│       │   ├── dashboard/
│       │   │   ├── Scorecard.tsx
│       │   │   ├── StreakGrid.tsx
│       │   │   ├── MetricsSnapshot.tsx
│       │   │   └── QuickActions.tsx
│       │   ├── charts/
│       │   │   ├── WeightChart.tsx
│       │   │   ├── LabChart.tsx
│       │   │   ├── SleepChart.tsx
│       │   │   └── ConsistencyChart.tsx
│       │   ├── forms/
│       │   │   ├── DailyLogForm.tsx
│       │   │   ├── WorkoutForm.tsx
│       │   │   ├── MealForm.tsx
│       │   │   ├── SleepForm.tsx
│       │   │   └── LabEntryForm.tsx
│       │   ├── coach/
│       │   │   ├── ChatInterface.tsx
│       │   │   ├── MessageBubble.tsx
│       │   │   └── QuickPrompts.tsx
│       │   └── common/
│       │       ├── ScoreSlider.tsx
│       │       ├── ToggleCard.tsx
│       │       ├── TrendSparkline.tsx
│       │       └── StatusBadge.tsx
│       ├── pages/
│       │   ├── Dashboard.tsx
│       │   ├── DailyLog.tsx
│       │   ├── BodyMetrics.tsx
│       │   ├── LabTracker.tsx
│       │   ├── Training.tsx
│       │   ├── Nutrition.tsx
│       │   ├── Supplements.tsx
│       │   ├── Sleep.tsx
│       │   ├── Trends.tsx
│       │   ├── Coach.tsx
│       │   └── Settings.tsx
│       ├── hooks/
│       │   ├── useApi.ts
│       │   ├── useDailyLog.ts
│       │   └── useStreaks.ts
│       ├── styles/
│       │   └── globals.css
│       └── utils/
│           ├── formatters.ts
│           └── calculations.ts
└── README.md
```

---

## Build Priorities (MVP First)

### MVP (Build First)

1. Database schema + seed data
2. Dashboard with daily scorecard and streaks
3. Daily log form (non-negotiable tracking)
4. Body metrics (weight tracking with chart)
5. AI Coach chat interface with full context
6. Lab tracker (display existing labs + add new)

### Phase 2

7. Workout logging with exercise detail
8. Nutrition logging with macro tracking
9. Supplement checklist
10. Sleep log

### Phase 3

11. Trends & analytics page
12. Correlation analysis
13. Monthly report generation
14. Settings and data export
15. Stretch features

---

## Notes for Claude Code

- This is a single-user application. No auth needed. No multi-tenancy.
- SQLite is ideal — single file, zero configuration, easy backups.
- Keep the AI coach system prompt under 8,000 tokens of dynamic data. The health manual and phase plan should be summarized/condensed for the system prompt, not inserted verbatim in full (or use a tiered approach where the full docs are available but recent data is always included).
- The sobriety counter is a first-class citizen. It should be one of the most prominent elements on the dashboard. This is David's keystone habit.
- Error handling on the Claude API: implement retry with exponential backoff, and show a graceful "Coach is unavailable" message if the API is down.
- All dates should be in US Eastern time (David is in New Jersey).
- The app should feel fast. Use optimistic updates on the frontend for toggles and form submissions.

# ADONIS — Addendum v1.1

**Rebrand + Adaptive Intelligence + Smart Food Logging**

This addendum modifies and extends the original project spec. All references to "FOUNDATION" are replaced with "ADONIS." The two major additions below should be integrated into the build.

---

## Rebrand: ADONIS

**Name:** ADONIS
**Tagline:** "Rebuild the machine."

The name ADONIS references the Greek ideal of male physical perfection — not as vanity, but as aspiration. The system should reflect this in subtle branding throughout: the logo, the loading screen, the tone of the AI coach.

**Logo concept:** The word ADONIS in the monospace display font (JetBrains Mono), all caps, with the "O" replaced by or containing a minimal geometric icon — a hexagon, a pulse line, or a simple anatomical heart outline. Clean, technical, not decorative.

**Loading/splash screen:** Dark background, logo fades in with a subtle pulse animation, then transitions to dashboard. Fast — under 1.5 seconds.

Update all references in the codebase, UI, page titles, and system prompts from FOUNDATION to ADONIS.

---

## Addition 1: Adaptive Intelligence System

ADONIS should not be a static tracker. It should learn from David's data patterns and actively adapt recommendations, targets, and the training plan as he progresses. The system gets smarter the more data it has.

### 1.1 Adaptive Training Plan

The Phase 1 plan is the starting point, but ADONIS should evolve the program based on actual performance data.

**How it works:**

The system stores the current training phase as structured data:

```sql
CREATE TABLE training_phases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phase_number INTEGER NOT NULL,
  phase_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'extended'
  prescribed_workouts TEXT NOT NULL, -- JSON: full workout prescription
  progression_rules TEXT NOT NULL, -- JSON: rules for when to advance
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Progression logic (evaluated weekly by the AI coach):**

The AI Coach receives a weekly data digest and evaluates whether David is ready to progress, using rules like:

- **Volume progression:** If David completes all prescribed sets/reps for an exercise for 2 consecutive sessions, the AI suggests increasing weight, reps, or adding a set.
- **Phase advancement:** If David hits the Phase 1 graduation criteria (30-min daily walks, 15+ of 18 strength sessions, Achilles stable), the AI generates a Phase 2 plan tailored to his actual performance, not a generic template.
- **Deload detection:** If RPE scores trend above 8 for 3+ consecutive sessions, or if soreness scores are consistently 7+, the AI suggests a deload week.
- **Plateau detection:** If weight loss stalls for 2+ weeks despite compliance, the AI analyzes nutrition logs and suggests adjustments (e.g., slight caloric adjustment, carb cycling, increased NEAT).
- **Achilles monitoring:** If David logs pain in the Achilles (via notes or a dedicated pain flag), the AI adjusts the plan — removing impact exercises, increasing mobility work, and suggesting he see a provider if it persists.

**Training plan generation:**

When it's time to advance phases, the AI Coach generates the next phase's plan based on:

- What exercises David performed best at (highest volume progression)
- What exercises he struggled with or skipped
- His current equipment (and whether he's acquired new equipment)
- His cardiovascular fitness improvement (walk duration/intensity trends)
- Any reported pain or limitations

The AI writes the new phase plan in the same structured format and stores it in the training_phases table. David reviews and approves before it goes live.

### 1.2 Adaptive Nutrition Targets

Static macro targets don't account for the reality that needs change as the body changes.

**Auto-adjusting calorie and macro targets:**

```sql
CREATE TABLE nutrition_targets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  effective_date DATE NOT NULL,
  calories_min INTEGER,
  calories_max INTEGER,
  protein_g_min REAL,
  protein_g_max REAL,
  carbs_g_min REAL,
  carbs_g_max REAL,
  fat_g_min REAL,
  fat_g_max REAL,
  fiber_g_min REAL,
  fiber_g_max REAL,
  rationale TEXT, -- AI-generated explanation of why targets changed
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Adjustment triggers (evaluated bi-weekly):**

- **Weight loss pace:** If losing faster than 2 lbs/week consistently, the AI may suggest slightly increasing calories to preserve lean mass (especially important on Mounjaro). If losing slower than 0.5 lbs/week despite compliance, suggest a modest deficit increase or activity increase.
- **Protein per bodyweight:** As David loses weight, the absolute protein target adjusts. At 210 lbs, the target might shift from 160–180g to 150–170g. The AI recalculates and updates.
- **Training day vs. rest day:** The system can suggest differentiated targets — slightly higher carbs on strength training days for performance, slightly lower on sedentary rest days.
- **Post-lab adjustments:** When new lab results come in, if triglycerides are still elevated, the AI might recommend further reducing refined carbs or increasing omega-3 intake. If glucose improves, it might relax carb restrictions slightly.

### 1.3 Adaptive Sleep Recommendations

The sleep log data feeds back into personalized recommendations:

- If time-to-fall-asleep averages >30 minutes over a week, suggest earlier magnesium dosing, extended exhale breathing, or a caffeine curfew adjustment.
- If wake-ups increase, flag possible causes (late eating, screen time, stress scores trending up).
- Track sleep quality improvement over the sobriety timeline and surface this correlation explicitly ("Your average sleep quality has improved from 4.2 to 6.8 since quitting alcohol").

### 1.4 Adaptive Goal System

Goals shouldn't be static. When David hits a goal, ADONIS should acknowledge it, archive it, and propose the next target.

```sql
CREATE TABLE goal_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  goal_id INTEGER NOT NULL REFERENCES goals(id),
  event_type TEXT NOT NULL, -- 'created', 'updated', 'achieved', 'adjusted', 'paused'
  old_value TEXT,
  new_value TEXT,
  reason TEXT, -- AI-generated rationale
  event_date DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Example flow:**

1. Goal: "Reduce fasting glucose to <100 mg/dL"
2. Lab retest at 3 months shows glucose at 102 — improved but not at target
3. AI acknowledges progress (113 → 102), adjusts timeline, suggests continued focus
4. Lab retest at 6 months shows glucose at 94 — goal achieved
5. AI celebrates, archives goal, proposes new goal: "Maintain fasting glucose <100 for 6 months"

### 1.5 Weekly Intelligence Report

Every Sunday at a configured time, ADONIS auto-generates a structured weekly report using the AI Coach. This is stored and viewable in the Trends section.

```sql
CREATE TABLE weekly_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  report_content TEXT NOT NULL, -- Markdown-formatted AI report
  key_metrics TEXT NOT NULL, -- JSON summary of the week's numbers
  ai_recommendations TEXT, -- JSON array of specific recommendations
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Report structure:**

1. **Week Summary:** Overall consistency score, days completed, streaks
2. **Body:** Weight change this week, trend over last 4 weeks
3. **Training:** Sessions completed, volume changes, RPE trends
4. **Nutrition:** Average macros vs. targets, notable gaps
5. **Sleep:** Average quality, duration trends, notable patterns
6. **Wins:** What went well (pulled from daily log "wins" fields + data patterns)
7. **Flags:** Concerns or areas needing attention
8. **Next Week Focus:** 1–3 specific, actionable priorities for the coming week
9. **Phase Status:** Current phase progress, estimated time to next phase

---

## Addition 2: Smart Food Logging

Food logging is where most health apps lose people. It's tedious, inaccurate, and feels like homework. ADONIS should make it as fast and frictionless as possible while still capturing useful data.

### 2.1 Multi-Modal Food Input

ADONIS supports multiple ways to log food, from fastest/least accurate to slowest/most accurate:

**Method 1: Natural Language (AI-Parsed)**

David types a plain English description of what he ate, and Claude parses it into structured nutrition data.

```
Input: "3 eggs scrambled with cheese, greek yogurt with chia seeds, coffee with half and half"

AI returns:
{
  "meal_type": "breakfast",
  "items": [
    { "name": "Scrambled eggs with cheese", "calories": 340, "protein": 24, "carbs": 2, "fat": 26, "fiber": 0 },
    { "name": "Greek yogurt with chia seeds", "calories": 180, "protein": 18, "carbs": 12, "fat": 6, "fiber": 5 },
    { "name": "Coffee with half and half", "calories": 40, "protein": 1, "carbs": 1, "fat": 3, "fiber": 0 }
  ],
  "totals": { "calories": 560, "protein": 43, "carbs": 15, "fat": 35, "fiber": 5 }
}
```

**Implementation:**

```typescript
// API route: POST /api/nutrition/parse
async function parseNaturalLanguageFood(description: string) {
  const response = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1024,
    system: `You are a nutrition parser. Given a natural language description of a meal, 
return ONLY a JSON object with the following structure. Estimate macros based on standard 
portions unless specific quantities are mentioned. Be accurate — use USDA database 
knowledge. Round to nearest whole number for calories, one decimal for macros.

{
  "meal_type": "breakfast|lunch|snack|dinner",
  "items": [
    { "name": "string", "calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number }
  ],
  "totals": { "calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number },
  "confidence": "high|medium|low",
  "notes": "any assumptions made about portions or preparation"
}`,
    messages: [{ role: "user", content: description }],
  });

  return JSON.parse(response.content[0].text);
}
```

David can review and adjust the parsed values before saving. The AI should note its confidence level and any assumptions it made ("Assumed 1 cup Greek yogurt, 2% fat. Assumed 1 tbsp chia seeds.").

**Method 2: Photo-Based Logging (Stretch Feature — Claude Vision)**

David takes a photo of his meal. The image is sent to Claude's vision capability for identification and macro estimation.

```typescript
// API route: POST /api/nutrition/photo
async function parseFoodPhoto(base64Image: string, mealDescription?: string) {
  const response = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1024,
    system: `You are a nutrition analyst. Given a photo of a meal, identify the foods present, 
estimate portion sizes, and calculate approximate macronutrients. Return JSON in the same 
format as the text parser. Be conservative with estimates and note your confidence level.
If a text description is also provided, use it to improve accuracy.`,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/jpeg",
              data: base64Image,
            },
          },
          {
            type: "text",
            text:
              mealDescription ||
              "Please identify and estimate the nutrition for this meal.",
          },
        ],
      },
    ],
  });

  return JSON.parse(response.content[0].text);
}
```

**Method 3: Quick-Add Favorites**

The most common meals David eats can be saved as favorites for one-tap logging.

```sql
CREATE TABLE favorite_meals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, -- "Standard breakfast", "Chicken salad lunch", "Protein shake"
  meal_type TEXT NOT NULL,
  items TEXT NOT NULL, -- JSON array of food items with macros
  total_calories INTEGER,
  total_protein REAL,
  total_carbs REAL,
  total_fat REAL,
  total_fiber REAL,
  use_count INTEGER DEFAULT 0, -- tracks how often this is used
  last_used DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Auto-suggested favorites:** After David logs the same meal description 3+ times, ADONIS suggests saving it as a favorite. The system learns his patterns.

**Pre-seeded favorites based on David's reported diet:**

- "Eggs + Greek yogurt breakfast" (3 eggs, 1 cup Greek yogurt, chia seeds, coffee w/ half-and-half)
- "Protein shake" (whey protein, water or milk)
- "Chicken + salad lunch" (6oz chicken breast, mixed greens, olive oil dressing)
- "Sushi + Chinese takeout dinner" (estimated typical order)

**Method 4: Manual Entry**

Traditional form: food name, calories, protein, carbs, fat, fiber. Always available as fallback.

### 2.2 Smart Meal Suggestions

Based on David's logged data, ADONIS can suggest meals to hit his remaining daily targets.

**"What should I eat?" feature:**

At any point during the day, David can ask ADONIS (via the AI Coach or a dedicated button) what to eat for his next meal. The system calculates:

- What macros he's already consumed today
- What's remaining to hit targets (especially protein and fiber)
- The time of day (suggesting appropriate meal types)
- His favorite meals and past logged meals
- What he's eaten recently (to avoid suggesting the same thing 5 days in a row)

**Example:**

```
David has logged:
  Breakfast: 43g protein, 5g fiber, 560 cal
  Snack: 15g protein, 4g fiber, 200 cal

Remaining targets:
  Protein: 102–122g still needed
  Fiber: 26–31g still needed
  Calories: ~1,000–1,400 remaining

AI suggestion for dinner:
"You need about 100g protein and 27g fiber to close out the day. Here are
three options:

1. Salmon (6oz) + roasted broccoli + black beans over rice
   → ~52g protein, 14g fiber, 680 cal

2. Chicken thighs (8oz) + large salad with chickpeas and avocado
   → ~58g protein, 16g fiber, 720 cal

3. Beef stir-fry with mixed vegetables over rice + side of lentil soup
   → ~55g protein, 12g fiber, 750 cal

Any of these plus a bedtime psyllium husk (5g fiber) would get you close
to all targets."
```

### 2.3 Running Daily Nutrition Dashboard

The nutrition view should show a **live running total** throughout the day that updates as meals are logged:

```
┌─────────────────────────────────────────────┐
│  TODAY'S NUTRITION                           │
│                                              │
│  Protein   ████████████░░░░░░░  142/170g     │
│  Fiber     ██████████░░░░░░░░░  28/38g       │
│  Calories  █████████████░░░░░░  1,580/2,100  │
│  Fat       ██████████████░░░░░  68/85g       │
│  Carbs     ████████████░░░░░░░  125/150g     │
│                                              │
│  Logged: Breakfast ✓  Lunch ✓  Snack ✗       │
│  Remaining: ~520 cal | 28g protein | 10g fib │
│                                              │
│  [+ Log Meal]  [What Should I Eat?]          │
└─────────────────────────────────────────────┘
```

**Color coding:**

- Green: On track (within 80–100% of target)
- Amber: Below pace (under 60% at the current time of day)
- Red: Significantly under (risk of missing target) or over target
- Teal glow: Target hit for the day

**Protein priority:** Protein bar should be the most visually prominent. This is the #1 nutrition priority — especially on Mounjaro to prevent lean mass loss.

### 2.4 Food Intelligence Over Time

As data accumulates, ADONIS builds a picture of David's actual eating patterns:

**Pattern detection:**

- Average protein intake by day of week (does he consistently undereat protein on weekends?)
- Fiber intake trends (is it improving week over week?)
- Meal timing patterns (is he still skipping lunch some days?)
- Takeout frequency tracking
- Correlation between nutrition compliance and energy/mood scores

**Stored as:**

```sql
CREATE TABLE nutrition_insights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  insight_type TEXT NOT NULL, -- 'pattern', 'alert', 'suggestion', 'milestone'
  content TEXT NOT NULL,
  data_range_start DATE,
  data_range_end DATE,
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Example insights surfaced on the dashboard or in weekly reports:**

- "You've averaged 38g of fiber over the last 7 days — up from 22g when you started. Your gut microbiome thanks you."
- "Your protein intake drops to 128g average on weekends vs. 162g on weekdays. Consider prepping protein-forward weekend lunches."
- "You've logged lunch 6 out of 7 days this week — a big improvement from Week 1 when you skipped it 4 times."
- "On days where you hit 160g+ protein, your average energy score is 7.1 vs. 5.4 on days below 130g."

### 2.5 Grocery/Meal Prep Suggestions

A weekly feature (triggered manually or auto-generated Sunday) where the AI Coach suggests a rough grocery list and meal prep plan for the week based on:

- David's favorite meals and logged patterns
- Macro targets
- What's worked well (meals that correlated with high compliance)
- Variety (not the same meals every day)
- Simplicity (David works from home, cooking should be fast)

This doesn't need to be a full meal planning system — just a practical "here's what to buy and roughly what to cook this week" output from the AI Coach, formatted as a printable/copyable list.

---

## Addition 3: Adaptive Dashboard Widgets

The dashboard should adapt what it shows based on what's most relevant right now:

**Early days (Weeks 1–4):**

- Sobriety counter (huge, prominent)
- Streak tracker for non-negotiables
- Simple consistency score
- Encouragement-focused messaging

**Established phase (Weeks 5–12):**

- Sobriety counter (still prominent but can be smaller)
- Weight trend chart added
- Training volume progression
- Nutrition compliance %
- Next lab retest countdown

**Data-rich phase (Month 3+):**

- Multi-metric dashboard
- Lab trajectory charts
- Correlation insights
- Phase progression and next goals
- Monthly comparison views

The system determines what to show based on how many days of data exist and what phase David is in. The AI Coach helps curate what's most relevant.

---

## Updated Database Tables (Add to Original Schema)

Add the following tables to the original spec:

1. `training_phases` — Adaptive training plan storage
2. `nutrition_targets` — Time-varying macro targets
3. `goal_history` — Goal lifecycle tracking
4. `weekly_reports` — AI-generated weekly intelligence reports
5. `favorite_meals` — Quick-add meal favorites
6. `nutrition_insights` — AI-generated nutrition pattern analysis

---

## Updated API Routes (Add to Original Spec)

```
POST   /api/nutrition/parse        → Natural language food parsing (Claude API)
POST   /api/nutrition/photo        → Photo-based food logging (Claude Vision)
GET    /api/nutrition/suggestions   → "What should I eat?" based on remaining targets
GET    /api/nutrition/favorites     → List saved favorite meals
POST   /api/nutrition/favorites     → Save a new favorite meal
DELETE /api/nutrition/favorites/:id → Remove a favorite

GET    /api/training/phases         → List all training phases
GET    /api/training/phases/current → Get active phase with prescribed workouts
POST   /api/training/phases         → Create new phase (AI-generated)
PUT    /api/training/phases/:id     → Update phase (approve, extend, complete)

GET    /api/reports/weekly          → List weekly reports
GET    /api/reports/weekly/latest   → Get most recent report
POST   /api/reports/weekly/generate → Trigger weekly report generation

GET    /api/insights/nutrition      → Get nutrition insights
GET    /api/insights/all            → Get all recent insights across categories

GET    /api/targets/nutrition       → Get current nutrition targets
GET    /api/targets/nutrition/history → Get history of target changes
```

---

## Updated Build Priorities

### MVP (Build First)

1. Database schema + all tables + seed data
2. Dashboard with sobriety counter, streaks, adaptive widgets
3. Daily log form
4. **Natural language food logging with Claude parsing**
5. Running daily nutrition dashboard with live macro totals
6. Body metrics / weight tracking
7. AI Coach chat with full context
8. Lab tracker with seed data

### Phase 2

9. Favorite meals system with auto-suggestions
10. Workout logging with exercise detail
11. "What should I eat?" meal suggestion feature
12. Supplement checklist
13. Sleep log
14. Weekly intelligence report auto-generation

### Phase 3

15. Photo-based food logging (Claude Vision)
16. Adaptive training plan progression
17. Adaptive nutrition targets
18. Trends & analytics with correlations
19. Nutrition pattern insights
20. Grocery/meal prep weekly suggestions
21. Settings, data export, and backup

---

## Key Implementation Note: AI Cost Management

With Claude Opus 4.6 powering multiple features (food parsing, coaching, weekly reports, meal suggestions, training plan generation), API costs can add up. Implement these controls:

1. **Cache natural language food parses.** If David types "3 eggs scrambled" and it's been parsed before, return the cached result instead of calling the API.
2. **Use Sonnet for food parsing.** The natural language food parser doesn't need Opus-level intelligence. Route food parsing calls to `claude-sonnet-4-5-20250929` and reserve Opus for the coaching conversations and complex analysis.
3. **Batch weekly report data.** Pull all data once, format it, and make a single API call for the weekly report rather than multiple calls.
4. **Rate limit coaching.** Implement a reasonable rate limit on the AI Coach (e.g., 50 messages per day) to prevent accidental cost spikes.
5. **Display token usage.** Show a small indicator in settings of approximate monthly API cost so David can monitor spend.

```typescript
// Model routing
const MODELS = {
  COACHING: "claude-opus-4-6", // Complex analysis, coaching, reports
  FOOD_PARSE: "claude-sonnet-4-5-20250929", // Food parsing, simple structured output
  PHOTO_PARSE: "claude-opus-4-6", // Vision tasks need Opus
  MEAL_SUGGEST: "claude-sonnet-4-5-20250929", // Meal suggestions
};
```

# ADONIS — Addendum v1.1

**Rebrand + Adaptive Intelligence + Smart Food Logging**

This addendum modifies and extends the original project spec. All references to "FOUNDATION" are replaced with "ADONIS." The two major additions below should be integrated into the build.

---

## Rebrand: ADONIS

**Name:** ADONIS
**Tagline:** "Rebuild the machine."

The name ADONIS references the Greek ideal of male physical perfection — not as vanity, but as aspiration. The system should reflect this in subtle branding throughout: the logo, the loading screen, the tone of the AI coach.

**Logo concept:** The word ADONIS in the monospace display font (JetBrains Mono), all caps, with the "O" replaced by or containing a minimal geometric icon — a hexagon, a pulse line, or a simple anatomical heart outline. Clean, technical, not decorative.

**Loading/splash screen:** Dark background, logo fades in with a subtle pulse animation, then transitions to dashboard. Fast — under 1.5 seconds.

Update all references in the codebase, UI, page titles, and system prompts from FOUNDATION to ADONIS.

---

## Addition 1: Adaptive Intelligence System

ADONIS should not be a static tracker. It should learn from David's data patterns and actively adapt recommendations, targets, and the training plan as he progresses. The system gets smarter the more data it has.

### 1.1 Adaptive Training Plan

The Phase 1 plan is the starting point, but ADONIS should evolve the program based on actual performance data.

**How it works:**

The system stores the current training phase as structured data:

```sql
CREATE TABLE training_phases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phase_number INTEGER NOT NULL,
  phase_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'extended'
  prescribed_workouts TEXT NOT NULL, -- JSON: full workout prescription
  progression_rules TEXT NOT NULL, -- JSON: rules for when to advance
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Progression logic (evaluated weekly by the AI coach):**

The AI Coach receives a weekly data digest and evaluates whether David is ready to progress, using rules like:

- **Volume progression:** If David completes all prescribed sets/reps for an exercise for 2 consecutive sessions, the AI suggests increasing weight, reps, or adding a set.
- **Phase advancement:** If David hits the Phase 1 graduation criteria (30-min daily walks, 15+ of 18 strength sessions, Achilles stable), the AI generates a Phase 2 plan tailored to his actual performance, not a generic template.
- **Deload detection:** If RPE scores trend above 8 for 3+ consecutive sessions, or if soreness scores are consistently 7+, the AI suggests a deload week.
- **Plateau detection:** If weight loss stalls for 2+ weeks despite compliance, the AI analyzes nutrition logs and suggests adjustments (e.g., slight caloric adjustment, carb cycling, increased NEAT).
- **Achilles monitoring:** If David logs pain in the Achilles (via notes or a dedicated pain flag), the AI adjusts the plan — removing impact exercises, increasing mobility work, and suggesting he see a provider if it persists.

**Training plan generation:**

When it's time to advance phases, the AI Coach generates the next phase's plan based on:

- What exercises David performed best at (highest volume progression)
- What exercises he struggled with or skipped
- His current equipment (and whether he's acquired new equipment)
- His cardiovascular fitness improvement (walk duration/intensity trends)
- Any reported pain or limitations

The AI writes the new phase plan in the same structured format and stores it in the training_phases table. David reviews and approves before it goes live.

### 1.2 Adaptive Nutrition Targets

Static macro targets don't account for the reality that needs change as the body changes.

**Auto-adjusting calorie and macro targets:**

```sql
CREATE TABLE nutrition_targets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  effective_date DATE NOT NULL,
  calories_min INTEGER,
  calories_max INTEGER,
  protein_g_min REAL,
  protein_g_max REAL,
  carbs_g_min REAL,
  carbs_g_max REAL,
  fat_g_min REAL,
  fat_g_max REAL,
  fiber_g_min REAL,
  fiber_g_max REAL,
  rationale TEXT, -- AI-generated explanation of why targets changed
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Adjustment triggers (evaluated bi-weekly):**

- **Weight loss pace:** If losing faster than 2 lbs/week consistently, the AI may suggest slightly increasing calories to preserve lean mass (especially important on Mounjaro). If losing slower than 0.5 lbs/week despite compliance, suggest a modest deficit increase or activity increase.
- **Protein per bodyweight:** As David loses weight, the absolute protein target adjusts. At 210 lbs, the target might shift from 160–180g to 150–170g. The AI recalculates and updates.
- **Training day vs. rest day:** The system can suggest differentiated targets — slightly higher carbs on strength training days for performance, slightly lower on sedentary rest days.
- **Post-lab adjustments:** When new lab results come in, if triglycerides are still elevated, the AI might recommend further reducing refined carbs or increasing omega-3 intake. If glucose improves, it might relax carb restrictions slightly.

### 1.3 Adaptive Sleep Recommendations

The sleep log data feeds back into personalized recommendations:

- If time-to-fall-asleep averages >30 minutes over a week, suggest earlier magnesium dosing, extended exhale breathing, or a caffeine curfew adjustment.
- If wake-ups increase, flag possible causes (late eating, screen time, stress scores trending up).
- Track sleep quality improvement over the sobriety timeline and surface this correlation explicitly ("Your average sleep quality has improved from 4.2 to 6.8 since quitting alcohol").

### 1.4 Adaptive Goal System

Goals shouldn't be static. When David hits a goal, ADONIS should acknowledge it, archive it, and propose the next target.

```sql
CREATE TABLE goal_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  goal_id INTEGER NOT NULL REFERENCES goals(id),
  event_type TEXT NOT NULL, -- 'created', 'updated', 'achieved', 'adjusted', 'paused'
  old_value TEXT,
  new_value TEXT,
  reason TEXT, -- AI-generated rationale
  event_date DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Example flow:**

1. Goal: "Reduce fasting glucose to <100 mg/dL"
2. Lab retest at 3 months shows glucose at 102 — improved but not at target
3. AI acknowledges progress (113 → 102), adjusts timeline, suggests continued focus
4. Lab retest at 6 months shows glucose at 94 — goal achieved
5. AI celebrates, archives goal, proposes new goal: "Maintain fasting glucose <100 for 6 months"

### 1.5 Weekly Intelligence Report

Every Sunday at a configured time, ADONIS auto-generates a structured weekly report using the AI Coach. This is stored and viewable in the Trends section.

```sql
CREATE TABLE weekly_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  report_content TEXT NOT NULL, -- Markdown-formatted AI report
  key_metrics TEXT NOT NULL, -- JSON summary of the week's numbers
  ai_recommendations TEXT, -- JSON array of specific recommendations
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Report structure:**

1. **Week Summary:** Overall consistency score, days completed, streaks
2. **Body:** Weight change this week, trend over last 4 weeks
3. **Training:** Sessions completed, volume changes, RPE trends
4. **Nutrition:** Average macros vs. targets, notable gaps
5. **Sleep:** Average quality, duration trends, notable patterns
6. **Wins:** What went well (pulled from daily log "wins" fields + data patterns)
7. **Flags:** Concerns or areas needing attention
8. **Next Week Focus:** 1–3 specific, actionable priorities for the coming week
9. **Phase Status:** Current phase progress, estimated time to next phase

---

## Addition 2: Smart Food Logging

Food logging is where most health apps lose people. It's tedious, inaccurate, and feels like homework. ADONIS should make it as fast and frictionless as possible while still capturing useful data.

### 2.1 Multi-Modal Food Input

ADONIS supports multiple ways to log food, from fastest/least accurate to slowest/most accurate:

**Method 1: Natural Language (AI-Parsed)**

David types a plain English description of what he ate, and Claude parses it into structured nutrition data.

```
Input: "3 eggs scrambled with cheese, greek yogurt with chia seeds, coffee with half and half"

AI returns:
{
  "meal_type": "breakfast",
  "items": [
    { "name": "Scrambled eggs with cheese", "calories": 340, "protein": 24, "carbs": 2, "fat": 26, "fiber": 0 },
    { "name": "Greek yogurt with chia seeds", "calories": 180, "protein": 18, "carbs": 12, "fat": 6, "fiber": 5 },
    { "name": "Coffee with half and half", "calories": 40, "protein": 1, "carbs": 1, "fat": 3, "fiber": 0 }
  ],
  "totals": { "calories": 560, "protein": 43, "carbs": 15, "fat": 35, "fiber": 5 }
}
```

**Implementation:**

```typescript
// API route: POST /api/nutrition/parse
async function parseNaturalLanguageFood(description: string) {
  const response = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1024,
    system: `You are a nutrition parser. Given a natural language description of a meal, 
return ONLY a JSON object with the following structure. Estimate macros based on standard 
portions unless specific quantities are mentioned. Be accurate — use USDA database 
knowledge. Round to nearest whole number for calories, one decimal for macros.

{
  "meal_type": "breakfast|lunch|snack|dinner",
  "items": [
    { "name": "string", "calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number }
  ],
  "totals": { "calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number },
  "confidence": "high|medium|low",
  "notes": "any assumptions made about portions or preparation"
}`,
    messages: [{ role: "user", content: description }],
  });

  return JSON.parse(response.content[0].text);
}
```

David can review and adjust the parsed values before saving. The AI should note its confidence level and any assumptions it made ("Assumed 1 cup Greek yogurt, 2% fat. Assumed 1 tbsp chia seeds.").

**Method 2: Photo-Based Logging (Stretch Feature — Claude Vision)**

David takes a photo of his meal. The image is sent to Claude's vision capability for identification and macro estimation.

```typescript
// API route: POST /api/nutrition/photo
async function parseFoodPhoto(base64Image: string, mealDescription?: string) {
  const response = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1024,
    system: `You are a nutrition analyst. Given a photo of a meal, identify the foods present, 
estimate portion sizes, and calculate approximate macronutrients. Return JSON in the same 
format as the text parser. Be conservative with estimates and note your confidence level.
If a text description is also provided, use it to improve accuracy.`,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/jpeg",
              data: base64Image,
            },
          },
          {
            type: "text",
            text:
              mealDescription ||
              "Please identify and estimate the nutrition for this meal.",
          },
        ],
      },
    ],
  });

  return JSON.parse(response.content[0].text);
}
```

**Method 3: Quick-Add Favorites**

The most common meals David eats can be saved as favorites for one-tap logging.

```sql
CREATE TABLE favorite_meals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, -- "Standard breakfast", "Chicken salad lunch", "Protein shake"
  meal_type TEXT NOT NULL,
  items TEXT NOT NULL, -- JSON array of food items with macros
  total_calories INTEGER,
  total_protein REAL,
  total_carbs REAL,
  total_fat REAL,
  total_fiber REAL,
  use_count INTEGER DEFAULT 0, -- tracks how often this is used
  last_used DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Auto-suggested favorites:** After David logs the same meal description 3+ times, ADONIS suggests saving it as a favorite. The system learns his patterns.

**Pre-seeded favorites based on David's reported diet:**

- "Eggs + Greek yogurt breakfast" (3 eggs, 1 cup Greek yogurt, chia seeds, coffee w/ half-and-half)
- "Protein shake" (whey protein, water or milk)
- "Chicken + salad lunch" (6oz chicken breast, mixed greens, olive oil dressing)
- "Sushi + Chinese takeout dinner" (estimated typical order)

**Method 4: Manual Entry**

Traditional form: food name, calories, protein, carbs, fat, fiber. Always available as fallback.

### 2.2 Smart Meal Suggestions

Based on David's logged data, ADONIS can suggest meals to hit his remaining daily targets.

**"What should I eat?" feature:**

At any point during the day, David can ask ADONIS (via the AI Coach or a dedicated button) what to eat for his next meal. The system calculates:

- What macros he's already consumed today
- What's remaining to hit targets (especially protein and fiber)
- The time of day (suggesting appropriate meal types)
- His favorite meals and past logged meals
- What he's eaten recently (to avoid suggesting the same thing 5 days in a row)

**Example:**

```
David has logged:
  Breakfast: 43g protein, 5g fiber, 560 cal
  Snack: 15g protein, 4g fiber, 200 cal

Remaining targets:
  Protein: 102–122g still needed
  Fiber: 26–31g still needed
  Calories: ~1,000–1,400 remaining

AI suggestion for dinner:
"You need about 100g protein and 27g fiber to close out the day. Here are
three options:

1. Salmon (6oz) + roasted broccoli + black beans over rice
   → ~52g protein, 14g fiber, 680 cal

2. Chicken thighs (8oz) + large salad with chickpeas and avocado
   → ~58g protein, 16g fiber, 720 cal

3. Beef stir-fry with mixed vegetables over rice + side of lentil soup
   → ~55g protein, 12g fiber, 750 cal

Any of these plus a bedtime psyllium husk (5g fiber) would get you close
to all targets."
```

### 2.3 Running Daily Nutrition Dashboard

The nutrition view should show a **live running total** throughout the day that updates as meals are logged:

```
┌─────────────────────────────────────────────┐
│  TODAY'S NUTRITION                           │
│                                              │
│  Protein   ████████████░░░░░░░  142/170g     │
│  Fiber     ██████████░░░░░░░░░  28/38g       │
│  Calories  █████████████░░░░░░  1,580/2,100  │
│  Fat       ██████████████░░░░░  68/85g       │
│  Carbs     ████████████░░░░░░░  125/150g     │
│                                              │
│  Logged: Breakfast ✓  Lunch ✓  Snack ✗       │
│  Remaining: ~520 cal | 28g protein | 10g fib │
│                                              │
│  [+ Log Meal]  [What Should I Eat?]          │
└─────────────────────────────────────────────┘
```

**Color coding:**

- Green: On track (within 80–100% of target)
- Amber: Below pace (under 60% at the current time of day)
- Red: Significantly under (risk of missing target) or over target
- Teal glow: Target hit for the day

**Protein priority:** Protein bar should be the most visually prominent. This is the #1 nutrition priority — especially on Mounjaro to prevent lean mass loss.

### 2.4 Food Intelligence Over Time

As data accumulates, ADONIS builds a picture of David's actual eating patterns:

**Pattern detection:**

- Average protein intake by day of week (does he consistently undereat protein on weekends?)
- Fiber intake trends (is it improving week over week?)
- Meal timing patterns (is he still skipping lunch some days?)
- Takeout frequency tracking
- Correlation between nutrition compliance and energy/mood scores

**Stored as:**

```sql
CREATE TABLE nutrition_insights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  insight_type TEXT NOT NULL, -- 'pattern', 'alert', 'suggestion', 'milestone'
  content TEXT NOT NULL,
  data_range_start DATE,
  data_range_end DATE,
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Example insights surfaced on the dashboard or in weekly reports:**

- "You've averaged 38g of fiber over the last 7 days — up from 22g when you started. Your gut microbiome thanks you."
- "Your protein intake drops to 128g average on weekends vs. 162g on weekdays. Consider prepping protein-forward weekend lunches."
- "You've logged lunch 6 out of 7 days this week — a big improvement from Week 1 when you skipped it 4 times."
- "On days where you hit 160g+ protein, your average energy score is 7.1 vs. 5.4 on days below 130g."

### 2.5 Grocery/Meal Prep Suggestions

A weekly feature (triggered manually or auto-generated Sunday) where the AI Coach suggests a rough grocery list and meal prep plan for the week based on:

- David's favorite meals and logged patterns
- Macro targets
- What's worked well (meals that correlated with high compliance)
- Variety (not the same meals every day)
- Simplicity (David works from home, cooking should be fast)

This doesn't need to be a full meal planning system — just a practical "here's what to buy and roughly what to cook this week" output from the AI Coach, formatted as a printable/copyable list.

---

## Addition 3: Adaptive Dashboard Widgets

The dashboard should adapt what it shows based on what's most relevant right now:

**Early days (Weeks 1–4):**

- Sobriety counter (huge, prominent)
- Streak tracker for non-negotiables
- Simple consistency score
- Encouragement-focused messaging

**Established phase (Weeks 5–12):**

- Sobriety counter (still prominent but can be smaller)
- Weight trend chart added
- Training volume progression
- Nutrition compliance %
- Next lab retest countdown

**Data-rich phase (Month 3+):**

- Multi-metric dashboard
- Lab trajectory charts
- Correlation insights
- Phase progression and next goals
- Monthly comparison views

The system determines what to show based on how many days of data exist and what phase David is in. The AI Coach helps curate what's most relevant.

---

## Updated Database Tables (Add to Original Schema)

Add the following tables to the original spec:

1. `training_phases` — Adaptive training plan storage
2. `nutrition_targets` — Time-varying macro targets
3. `goal_history` — Goal lifecycle tracking
4. `weekly_reports` — AI-generated weekly intelligence reports
5. `favorite_meals` — Quick-add meal favorites
6. `nutrition_insights` — AI-generated nutrition pattern analysis

---

## Updated API Routes (Add to Original Spec)

```
POST   /api/nutrition/parse        → Natural language food parsing (Claude API)
POST   /api/nutrition/photo        → Photo-based food logging (Claude Vision)
GET    /api/nutrition/suggestions   → "What should I eat?" based on remaining targets
GET    /api/nutrition/favorites     → List saved favorite meals
POST   /api/nutrition/favorites     → Save a new favorite meal
DELETE /api/nutrition/favorites/:id → Remove a favorite

GET    /api/training/phases         → List all training phases
GET    /api/training/phases/current → Get active phase with prescribed workouts
POST   /api/training/phases         → Create new phase (AI-generated)
PUT    /api/training/phases/:id     → Update phase (approve, extend, complete)

GET    /api/reports/weekly          → List weekly reports
GET    /api/reports/weekly/latest   → Get most recent report
POST   /api/reports/weekly/generate → Trigger weekly report generation

GET    /api/insights/nutrition      → Get nutrition insights
GET    /api/insights/all            → Get all recent insights across categories

GET    /api/targets/nutrition       → Get current nutrition targets
GET    /api/targets/nutrition/history → Get history of target changes
```

---

## Updated Build Priorities

### MVP (Build First)

1. Database schema + all tables + seed data
2. Dashboard with sobriety counter, streaks, adaptive widgets
3. Daily log form
4. **Natural language food logging with Claude parsing**
5. Running daily nutrition dashboard with live macro totals
6. Body metrics / weight tracking
7. AI Coach chat with full context
8. Lab tracker with seed data

### Phase 2

9. Favorite meals system with auto-suggestions
10. Workout logging with exercise detail
11. "What should I eat?" meal suggestion feature
12. Supplement checklist
13. Sleep log
14. Weekly intelligence report auto-generation

### Phase 3

15. Photo-based food logging (Claude Vision)
16. Adaptive training plan progression
17. Adaptive nutrition targets
18. Trends & analytics with correlations
19. Nutrition pattern insights
20. Grocery/meal prep weekly suggestions
21. Settings, data export, and backup

---

## Key Implementation Note: AI Cost Management

With Claude Opus 4.6 powering multiple features (food parsing, coaching, weekly reports, meal suggestions, training plan generation), API costs can add up. Implement these controls:

1. **Cache natural language food parses.** If David types "3 eggs scrambled" and it's been parsed before, return the cached result instead of calling the API.
2. **Use Sonnet for food parsing.** The natural language food parser doesn't need Opus-level intelligence. Route food parsing calls to `claude-sonnet-4-5-20250929` and reserve Opus for the coaching conversations and complex analysis.
3. **Batch weekly report data.** Pull all data once, format it, and make a single API call for the weekly report rather than multiple calls.
4. **Rate limit coaching.** Implement a reasonable rate limit on the AI Coach (e.g., 50 messages per day) to prevent accidental cost spikes.
5. **Display token usage.** Show a small indicator in settings of approximate monthly API cost so David can monitor spend.

```typescript
// Model routing
const MODELS = {
  COACHING: "claude-opus-4-6", // Complex analysis, coaching, reports
  FOOD_PARSE: "claude-sonnet-4-5-20250929", // Food parsing, simple structured output
  PHOTO_PARSE: "claude-opus-4-6", // Vision tasks need Opus
  MEAL_SUGGEST: "claude-sonnet-4-5-20250929", // Meal suggestions
};
```

# ADONIS — Addendum v1.2

**Gaps, Missing Systems, and Expanded Health Protocol**

This addendum documents everything identified as missing from the original spec, the health manual, and the Phase 1 plan. It covers additional medical testing, new tracking systems for ADONIS, psychological and environmental health considerations, and preventive care scheduling.

---

## Section 1: Missing Lab Work

David's Labcorp panel is solid for a standard primary care workup, but it's missing several biomarkers that are directly relevant to his metabolic, hormonal, and cardiovascular picture. These should be requested at the next blood draw (target: 3-month mark, ~late May 2026).

### Priority 1 — Request Immediately (Next Draw)

**Fasting Insulin**

- Why: Fasting glucose alone is an incomplete picture of insulin resistance. Glucose at 113 tells you the river is flooding — fasting insulin tells you how hard the dam is working to hold it back. A glucose of 113 with an insulin of 8 is a very different situation than a glucose of 113 with an insulin of 25.
- Combined with fasting glucose, this allows calculation of HOMA-IR (Homeostatic Model Assessment of Insulin Resistance): `(Fasting Insulin × Fasting Glucose) / 405`
  - HOMA-IR < 1.0: Optimal insulin sensitivity
  - HOMA-IR 1.0–1.9: Early insulin resistance
  - HOMA-IR 2.0–2.9: Significant insulin resistance
  - HOMA-IR ≥ 3.0: Severe insulin resistance
- This is the single most important missing lab value. It directly informs how aggressive the carbohydrate and exercise interventions need to be.
- ADONIS should calculate and display HOMA-IR automatically when both values are present.

**Estradiol (E2) — Sensitive Assay**

- Why: At David's body fat level, aromatase enzyme in adipose tissue is almost certainly converting testosterone to estrogen. Total testosterone is 232 (low), but we don't know how much of the problem is underproduction vs. excessive conversion.
- If estradiol is elevated (>30–40 pg/mL), this confirms aromatase-driven conversion and means that weight loss alone could significantly improve testosterone by reducing the conversion pathway.
- Must request the "sensitive" or "LC/MS" estradiol assay, not the standard immunoassay (which is designed for female ranges and is unreliable in men).

**SHBG (Sex Hormone Binding Globulin)**

- Why: SHBG binds testosterone and makes it unavailable to tissues. High SHBG means more of David's already-low testosterone is bound and inactive. Low SHBG (common with insulin resistance and obesity) means more is free but may also indicate metabolic dysfunction.
- Combined with total T and albumin, this allows accurate calculation of free and bioavailable testosterone — more reliable than the direct free T assay David had.
- ADONIS should calculate free T and bioavailable T from these values.

**hs-CRP (High-Sensitivity C-Reactive Protein)**

- Why: The single best blood marker for systemic inflammation. Given David's weight, sedentary history, alcohol use, elevated triglycerides, and suspected fatty liver, this is very likely elevated.
- Cardiovascular risk interpretation:
  - < 1.0 mg/L: Low risk
  - 1.0–3.0 mg/L: Moderate risk
  - \> 3.0 mg/L: High risk
- This also serves as a powerful progress marker — it should drop significantly with weight loss, exercise, alcohol cessation, and omega-3 supplementation.

**Thyroid Panel (TSH, Free T3, Free T4)**

- Why: Thyroid dysfunction is the great mimicker. Hypothyroidism causes fatigue, weight gain, difficulty losing weight, poor sleep, brain fog, depression, constipation, cold intolerance, and elevated cholesterol — overlapping with nearly every symptom David reports.
- Subclinical hypothyroidism (TSH 4.5–10 with normal T3/T4) is common and frequently missed. Even "high-normal" TSH can impair metabolism.
- This is cheap, easy, and should have been on the original panel. Request it.

### Priority 2 — Request at Next Draw

**Homocysteine**

- Why: Elevated homocysteine is an independent cardiovascular risk factor and indicates impaired methylation — a biochemical process critical for DNA repair, neurotransmitter synthesis, and detoxification.
- Alcohol depletes B vitamins which are required for homocysteine metabolism. David's levels may be elevated from years of alcohol use.
- B-complex supplementation (already in the plan) addresses this, but a baseline measurement is important.
- Optimal: < 10 µmol/L. Concerning: > 12 µmol/L. High risk: > 15 µmol/L.

**Uric Acid**

- Why: Elevated uric acid is a hallmark of metabolic syndrome, associated with gout risk, and an independent predictor of cardiovascular disease and kidney disease. It's also a marker of fructose metabolism — the liver converts fructose to uric acid.
- David's metabolic profile (insulin resistance, elevated triglycerides, overweight, alcohol history) makes elevated uric acid likely.
- Reference range: 3.5–7.2 mg/dL. Optimal: < 6.0 mg/dL.

**Ferritin + Iron Panel (Serum Iron, TIBC, Transferrin Saturation)**

- Why: Ferritin is simultaneously an iron storage marker and an acute-phase inflammatory marker. Low ferritin causes fatigue independent of anemia (David's hemoglobin and CBC are normal, but iron stores could still be suboptimal). High ferritin can indicate inflammation or iron overload (hemochromatosis — surprisingly common in men of European descent).
- Also relevant: excess iron is stored in the liver and can worsen fatty liver disease.
- Optimal ferritin: 50–150 ng/mL for men. Below 50 warrants iron supplementation discussion. Above 300 warrants further investigation.

**Apolipoprotein B (ApoB)**

- Why: ApoB is increasingly recognized as a superior marker of cardiovascular risk compared to LDL cholesterol. Each atherogenic lipoprotein particle (LDL, VLDL, IDL, Lp(a)) carries exactly one ApoB molecule, so ApoB gives you a direct count of the particles that actually cause atherosclerosis.
- David's LDL is 86 (looks fine), but LDL particle count could be much higher — especially with elevated triglycerides and insulin resistance, which shift the profile toward small, dense LDL particles that are more atherogenic.
- Optimal ApoB: < 80 mg/dL. Concerning: > 100 mg/dL.

**Lipoprotein(a) [Lp(a)]**

- Why: Lp(a) is a genetically determined, independent cardiovascular risk factor. It doesn't change with lifestyle or most medications (except PCSK9 inhibitors). You only need to test it once in your life — it either is or isn't a problem.
- If elevated (> 50 nmol/L or > 30 mg/dL), it changes how aggressively David and his doctor should manage other risk factors.
- This is a one-time test. Get the baseline.

### ADONIS Integration for Labs

Add the following to the lab tracker:

```sql
-- Add to lab_results or create a new calculated_markers table
CREATE TABLE calculated_markers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date DATE NOT NULL,
  marker_name TEXT NOT NULL, -- 'HOMA-IR', 'Free T (calculated)', 'Bioavailable T', 'ApoB/LDL ratio'
  value REAL NOT NULL,
  formula TEXT NOT NULL, -- the calculation used
  input_values TEXT NOT NULL, -- JSON of source lab values used
  interpretation TEXT, -- AI-generated interpretation
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

The system should:

- Auto-calculate HOMA-IR when both fasting insulin and fasting glucose are present
- Auto-calculate free and bioavailable testosterone when total T, SHBG, and albumin are present
- Flag when labs are due based on the planned retest schedule
- Store reference ranges for all new biomarkers
- Include all new markers in the AI Coach's context for analysis

**Suggested lab retest schedule:**
| Timepoint | Tests |
|---|---|
| Baseline (10/21/2025) | Done — current panel |
| 3 months (~5/23/2026) | Full panel + all Priority 1 & 2 additions |
| 6 months (~8/23/2026) | Full panel + testosterone + estradiol + SHBG + fasting insulin |
| 12 months (~2/23/2027) | Comprehensive annual panel |

---

## Section 2: Cardiovascular Screening

David's snow shoveling scare, combined with his risk profile (44M, sedentary, overweight, elevated triglycerides, low HDL, insulin resistance, alcohol history, family history unknown), warrants proactive cardiovascular screening beyond standard blood work.

### Coronary Artery Calcium (CAC) Score

**What it is:** A non-contrast, low-radiation CT scan of the heart that directly measures calcium deposits in the coronary arteries. Takes 5 minutes. No IV, no dye, no fasting.

**Why it matters:** The CAC score is the single best predictor of 10-year cardiovascular event risk, superior to any blood test or risk calculator. It tells you what's actually happening in your arteries right now.

**Scoring:**

- 0: No detectable plaque. Extremely low risk. Reassuring but not a free pass — repeat in 5 years.
- 1–100: Mild plaque. Moderate risk. Aggressive prevention indicated (David's current statin use is appropriate).
- 101–300: Moderate plaque. High risk. Intensified medical management.
- 300+: Severe plaque. Very high risk. Cardiology referral.

**Cost:** $75–200, often not covered by insurance. Worth paying out of pocket. Available at most imaging centers without a referral, though a doctor's order is sometimes required.

**Recommendation:** David should get a CAC scan in the next 1–2 months. The result directly informs how aggressive his prevention strategy needs to be and provides a powerful motivational data point.

### Resting EKG

**What it is:** A 12-lead electrocardiogram. Takes 2 minutes in the doctor's office.

**Why:** Establishes a cardiac baseline. Detects rhythm abnormalities, conduction issues, or signs of prior cardiac damage. Should already exist in David's medical record — if not, request one.

### Exercise Stress Test

**What it is:** EKG monitoring while walking/jogging on a treadmill at increasing intensity.

**Why:** Given that basic exertion (shoveling snow) caused near-syncope and chest symptoms, David's doctor may want to rule out exercise-induced ischemia before he ramps up training intensity.

**Recommendation:** Discuss with Dr. Scheuerma. If the doctor is comfortable with David starting at the very low intensity prescribed in Phase 1 (walking), the stress test may not be immediately necessary. But before Phase 2 introduces higher-intensity cardiovascular training, this should be on the table.

### ADONIS Integration for Cardiovascular Screening

Add a preventive care tracker:

```sql
CREATE TABLE preventive_care (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_name TEXT NOT NULL, -- 'CAC Score', 'Colonoscopy', 'DEXA Scan', 'Dental Cleaning', etc.
  category TEXT NOT NULL, -- 'cardiovascular', 'cancer_screening', 'imaging', 'dental', 'vision', 'general'
  status TEXT DEFAULT 'pending', -- 'pending', 'scheduled', 'completed', 'overdue'
  due_date DATE,
  completed_date DATE,
  result TEXT, -- free text or structured result
  result_value REAL, -- numeric result if applicable (e.g., CAC score)
  provider TEXT,
  notes TEXT,
  next_due DATE, -- when to repeat
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## Section 3: Blood Pressure and Resting Heart Rate Tracking

These are two of the cheapest, most powerful health metrics available and we're not currently tracking either.

### Blood Pressure

**Equipment:** Omron home blood pressure monitor — $30–40 on Amazon. Upper arm cuff, not wrist.

**Protocol:**

- Measure first thing in the morning, before coffee, after sitting quietly for 2 minutes
- Take 2 readings 1 minute apart, log the average
- Measure 3–4 times per week minimum (daily is better)

**Reference ranges:**

- Optimal: < 120/80
- Elevated: 120–129 / < 80
- Stage 1 Hypertension: 130–139 / 80–89
- Stage 2 Hypertension: ≥ 140 / ≥ 90

**Why it matters for David:** His metabolic profile puts him at elevated risk. Blood pressure is also one of the most responsive metrics to his interventions — weight loss, alcohol cessation, exercise, increased potassium, and reduced stress all lower blood pressure, often dramatically. Tracking it creates a powerful positive feedback loop.

### Resting Heart Rate

**Equipment:** Pulse oximeter — $15–20 on Amazon. Also gives SpO2 (blood oxygen saturation), which is directly relevant with sleep apnea.

**Protocol:**

- Measure first thing in the morning, before getting out of bed
- Lying still, relaxed, for at least 1 minute
- Log both resting HR and SpO2

**Reference ranges (resting HR):**

- Poor: > 80 bpm
- Below average: 72–80 bpm
- Average: 60–72 bpm
- Good: 55–60 bpm
- Excellent: < 55 bpm
- (These improve dramatically with cardiovascular training)

**SpO2 reference:**

- Normal: 95–100%
- Concerning: < 95% (relevant with sleep apnea — if consistently low in the morning, discuss BiPAP settings with sleep specialist)

### ADONIS Integration

```sql
CREATE TABLE vitals_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date DATE NOT NULL,
  time_of_day TEXT, -- 'morning', 'evening', 'post_workout'

  -- Blood Pressure
  systolic INTEGER,
  diastolic INTEGER,

  -- Heart Rate
  resting_heart_rate INTEGER,

  -- Oxygen
  spo2 REAL, -- blood oxygen saturation %

  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Dashboard additions:**

- Blood pressure trend chart (systolic and diastolic as dual lines, with reference bands)
- Resting heart rate trend chart (one of the most motivating visualizations as fitness improves)
- SpO2 tracking with alerts if consistently below 95%
- Morning vitals should be part of the daily log flow — a quick "morning vitals" section at the top of the daily check-in form: weight, BP, resting HR, SpO2 (all optional but encouraged)

**AI Coach context:** Include last 7 days of vitals averages in the system prompt. The coach should flag upward BP trends, celebrate HR improvements, and correlate vitals changes with training and weight loss.

**API routes:**

```
GET    /api/vitals               → List vitals entries (with date range filter)
GET    /api/vitals/latest        → Most recent entry
GET    /api/vitals/averages      → 7-day, 30-day, 90-day averages
POST   /api/vitals               → Log vitals
DELETE /api/vitals/:id           → Delete entry
```

---

## Section 4: Body Composition Baseline

### DEXA Scan

**What it is:** Dual-energy X-ray absorptiometry. The gold standard for measuring body composition — gives precise measurements of fat mass, lean mass, bone density, and their distribution across your body.

**Why it matters:**

- Establishes a true baseline. Scale weight is 225, but we don't know the breakdown. Knowing that David is, say, 35% body fat (78 lbs of fat, 147 lbs of lean mass) creates specific targets.
- Mounjaro causes weight loss that can include significant lean mass loss (up to 30–40% of total weight lost can be lean tissue without resistance training). Tracking lean mass over time confirms that the strength training is doing its job.
- Bone density baseline. Important at 44, and relevant given Vitamin D history.
- Regional fat distribution. Visceral fat (around organs) is far more dangerous than subcutaneous fat. DEXA quantifies this.

**Protocol:**

- Get a baseline scan now (or within the first 2 weeks)
- Repeat at 6 months
- Same facility, same time of day, same hydration status for consistency

**Cost:** $40–100 at most imaging centers. Some offer packages for repeat scans.

**Alternative:** If DEXA isn't accessible, a simple body fat estimation via Navy method (neck and waist circumference) can be calculated in ADONIS as an approximation:

```
Body Fat % (men) = 86.010 × log10(waist - neck) - 70.041 × log10(height) + 36.76
```

ADONIS should auto-calculate this from body measurements when entered and display it alongside DEXA results if available.

### ADONIS Integration

Add to `body_metrics` table:

```sql
ALTER TABLE body_metrics ADD COLUMN dexa_total_fat_pct REAL;
ALTER TABLE body_metrics ADD COLUMN dexa_lean_mass_lbs REAL;
ALTER TABLE body_metrics ADD COLUMN dexa_fat_mass_lbs REAL;
ALTER TABLE body_metrics ADD COLUMN dexa_visceral_fat_area REAL; -- cm²
ALTER TABLE body_metrics ADD COLUMN dexa_bone_density REAL; -- g/cm² T-score
ALTER TABLE body_metrics ADD COLUMN navy_bf_estimate REAL; -- auto-calculated
```

---

## Section 5: Psychological and Mental Health Support

### Alcohol Cessation — The Psychological Dimension

Quitting alcohol when it's been a problem is not simply a behavioral change — it's a neurological, psychological, and social upheaval. The plan currently treats alcohol cessation as a line item ("alcohol-free: yes/no"). It needs more depth.

**What David may experience in the first 30–90 days:**

- **Weeks 1–2:** Possible withdrawal symptoms depending on prior consumption level (anxiety, irritability, insomnia, sweating, tremors in severe cases). If David was a heavy daily drinker, he should discuss tapering or medically supervised withdrawal with his doctor. Abrupt cessation from heavy alcohol use can be medically dangerous.
- **Weeks 2–4:** Mood instability. Alcohol suppresses both anxiety and emotional processing. Removing it can temporarily amplify both. This is the highest-risk period for relapse.
- **Weeks 4–8:** Emotional rebalancing. Sleep improves. Energy begins to stabilize. The "pink cloud" effect may occur — a period of euphoria that eventually levels off.
- **Months 2–6:** New normal establishment. Social situations become the primary challenge. Identity shifts from "person who quit drinking" to "person who doesn't drink."

**Support structures to consider:**

- **Therapist or counselor** — ideally one experienced with alcohol cessation and men's health. Particularly valuable for processing the anxiety, identity shifts, and life reassessment that come with getting sober.
- **SMART Recovery** — evidence-based, secular self-help program. Focuses on self-empowerment and cognitive-behavioral techniques. Free online meetings available.
- **Sober communities** — r/stopdrinking, Huberman Lab sobriety community, local sober meetups. Connection with people who understand the journey.
- **Accountability partner** — a friend or family member who knows what David is doing and can check in.

**What the AI Coach should NOT do:** The AI Coach should not serve as a therapist or crisis counselor. It should acknowledge the difficulty of sobriety, celebrate milestones, notice when David's mood/stress scores suggest he might be struggling, and consistently recommend professional support when appropriate.

### ADONIS Integration for Mental Health

Add to the daily log form:

```sql
ALTER TABLE daily_log ADD COLUMN anxiety_level INTEGER CHECK(anxiety_level BETWEEN 1 AND 10);
ALTER TABLE daily_log ADD COLUMN alcohol_craving INTEGER CHECK(alcohol_craving BETWEEN 0 AND 10); -- 0 = none
ALTER TABLE daily_log ADD COLUMN alcohol_trigger TEXT; -- optional: what triggered the craving if applicable
```

**Sobriety tracker enhancements:**

- Milestone celebrations at key thresholds: 1 week, 2 weeks, 30 days, 60 days, 90 days, 6 months, 1 year
- Money saved calculator (estimate based on average prior weekly spend on alcohol — David can configure this)
- Calories avoided calculator (alcohol is ~7 cal/gram plus mixers)
- Health benefit timeline: "At 30 days, your liver enzymes are likely normalizing. At 90 days, your sleep architecture has significantly restructured."
- Craving log with pattern detection (time of day, triggers, correlation with stress scores)

### Broader Mental Health Tracking

The daily log already captures mood and stress scores (1–10). Adding anxiety level creates a more complete picture. The AI Coach should:

- Track mood/stress/anxiety trends over time
- Correlate mental health scores with sleep, exercise, nutrition, and sobriety timeline
- Flag sustained low mood (average < 4 for 7+ days) or high anxiety (average > 7 for 7+ days) and suggest professional support
- Never attempt to diagnose depression, anxiety disorders, or other conditions
- Recognize that the Adderall-ADHD-alcohol-anxiety axis is complex and encourage David to discuss any changes with his prescribing physician

### ADONIS Dashboard Addition

A small "mental health pulse" widget on the dashboard showing 7-day rolling averages for mood, stress, and anxiety as simple trend sparklines. Subtle, not prominent — this is contextual awareness, not a spotlight.

---

## Section 6: Environmental Health

### Endocrine Disruptors

Chemicals that interfere with hormonal signaling are ubiquitous in modern environments. For a man with low testosterone and metabolic syndrome, reducing exposure is a low-effort, high-impact intervention.

**High-priority swaps (do first):**

| Current                               | Replace With                                | Why                                                                                    |
| ------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------- |
| Plastic food storage containers       | Glass or stainless steel (Pyrex, Glasslock) | BPA and phthalates leach from plastic, especially when heated. These are estrogenic.   |
| Microwaving food in plastic           | Microwave in glass or ceramic only          | Heat dramatically increases leaching.                                                  |
| Plastic water bottles                 | Stainless steel or glass bottle             | Chronic low-level exposure adds up.                                                    |
| Non-stick cookware (Teflon)           | Cast iron, stainless steel, or ceramic      | PFAS ("forever chemicals") are endocrine disruptors. Cast iron also adds dietary iron. |
| Conventional deodorant/antiperspirant | Aluminum-free, paraben-free alternatives    | Parabens are estrogenic. Aluminum's safety is debated.                                 |
| Conventional shampoo/body wash        | Paraben-free, phthalate-free products       | Read ingredients. Avoid anything listing "fragrance" (often contains phthalates).      |

**Medium-priority (phase in over time):**

| Action                                                | Why                                                                                                                                                                                                |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Filter drinking water (even if on municipal supply)   | Removes chlorine, heavy metals, pharmaceutical residues, microplastics. A basic carbon filter (Brita) helps. An under-sink reverse osmosis system is ideal.                                        |
| Avoid thermal receipts (or wash hands after handling) | Thermal paper is coated in BPA/BPS. Absorbed through skin.                                                                                                                                         |
| Choose organic for the "Dirty Dozen" produce          | Pesticide residues act as endocrine disruptors. Prioritize organic for: strawberries, spinach, kale, peaches, pears, nectarines, apples, grapes, bell peppers, cherries, blueberries, green beans. |
| Air quality in home office                            | Consider a HEPA air purifier for the room where you spend 8+ hours/day. Indoor air can be 2–5x more polluted than outdoor air.                                                                     |

**Not included in ADONIS tracking** — these are behavioral/environmental changes, not daily metrics. But the AI Coach should be aware of them and can mention them in coaching conversations when relevant (e.g., "Have you made the switch to glass food containers yet?").

### ADONIS Integration

Add an environmental health checklist to the Settings/Profile page — a one-time assessment:

```sql
CREATE TABLE environment_checklist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item TEXT NOT NULL,
  category TEXT NOT NULL, -- 'kitchen', 'personal_care', 'water', 'home'
  completed BOOLEAN DEFAULT FALSE,
  completed_date DATE,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Seed with all the swaps listed above. David can check them off as he makes changes. The AI Coach can reference completion status and gently remind about remaining items.

---

## Section 7: Posture and Workstation Ergonomics

### The Problem

8+ hours/day of seated desk work produces predictable postural dysfunction:

- Forward head posture (for every inch the head moves forward, it adds ~10 lbs of effective load on the cervical spine)
- Rounded shoulders (tight pecs, weak mid/lower traps)
- Thoracic kyphosis (excessive upper back rounding)
- Anterior pelvic tilt (tight hip flexors, weak glutes and abs)
- Tight hip flexors (already addressed in mobility work)
- Gluteal amnesia (glutes "forget" how to fire properly — sounds absurd, is very real)

This directly impacts training (poor squat and deadlift mechanics, increased injury risk), breathing (compressed diaphragm), energy levels (poor posture reduces lung capacity by up to 30%), and appearance.

### Workstation Audit

David should evaluate and optimize his home office setup:

- **Monitor:** Top of screen at eye level. If using a laptop, get an external monitor or laptop stand + external keyboard.
- **Chair:** Feet flat on floor. Thighs parallel to ground. Lumbar support present. If his chair doesn't provide this, a lumbar support cushion ($20–30) is a cheap fix.
- **Keyboard and mouse:** At elbow height. Shoulders relaxed, not shrugged.
- **Standing desk:** A sit-stand desk converter ($150–300) or a full standing desk allows alternating positions throughout the day. Even standing for 15–20 minutes per hour makes a meaningful difference.

### Posture-Corrective Additions to Mobility Work

Add these to the daily mobility routine (Phase 1 already includes hip flexor stretches and thoracic rotation):

- **Chin tucks:** 10 reps, 3 times per day (can be done at desk). Pulls the head back over the spine and strengthens deep neck flexors.
- **Wall angels:** 2 sets of 10 reps. Stand with back against wall, arms in "goal post" position, slide arms up and down while maintaining contact with wall. Corrects rounded shoulders and thoracic kyphosis.
- **Band pull-aparts:** If David acquires a resistance band ($5–10), 2 sets of 15 reps daily. Directly counteracts forward shoulder posture.
- **Glute bridges:** 2 sets of 12 reps. Reactivates glutes that sitting has deactivated. Can be incorporated into warm-up or mobility work.

---

## Section 8: Nasal Breathing

### Why It Matters

The human body was designed to breathe through the nose. Nasal breathing:

- Produces nitric oxide in the nasal passages, which dilates blood vessels, lowers blood pressure, improves oxygen delivery, and has antimicrobial properties
- Filters, warms, and humidifies air before it reaches the lungs
- Activates the diaphragm and promotes parasympathetic nervous system activation
- Improves CO2 tolerance (which paradoxically improves oxygen delivery to tissues via the Bohr effect)
- Reduces sleep apnea severity by maintaining airway tone

Mouth breathing does none of this and is associated with worsened sleep apnea, dental problems, chronic inflammation of the airways, and increased stress response.

### Protocol

**During the day:**

- Consciously practice nasal breathing during all low-intensity activity (walking, working, resting)
- If you catch yourself mouth breathing, close your mouth. Simple.
- During exercise: nasal breathing serves as an intensity governor. If you can't breathe through your nose during the Phase 1 walks, you're going too fast. This is actually a useful tool for keeping intensity in the right zone.

**During sleep:**

- The BiPAP complicates mouth taping (a common nasal breathing intervention). Do NOT mouth tape without discussing with the sleep specialist.
- If David's BiPAP mask is full-face (covers mouth and nose), nasal breathing during sleep is less of a concern — the positive pressure maintains airway patency regardless.
- If using a nasal-only mask, mouth leak is a common issue. A chin strap or mouth tape (with medical clearance) can help.

### ADONIS Integration

No dedicated tracking needed for nasal breathing — it's a behavioral practice. But the AI Coach should be aware of it and can incorporate it into coaching ("How is the nasal breathing going during your walks? Can you maintain it for the full 25 minutes?").

---

## Section 9: Preventive Care Schedule

At 44, David is entering the age where preventive screening becomes critical. Several screenings are due or approaching.

### Immediate / Near-Term

| Screening                           | When                                 | Notes                                                                                        |
| ----------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------- |
| Coronary Artery Calcium (CAC) Score | Within next 1–2 months               | See Section 2. Proactive, not standard of care, but strongly recommended given risk profile. |
| DEXA Scan (body composition)        | Within next 2 weeks                  | Baseline body composition. See Section 4.                                                    |
| Comprehensive blood work (expanded) | ~May 2026 (3-month mark)             | All additional biomarkers from Section 1.                                                    |
| Dental cleaning + evaluation        | ASAP if > 12 months since last visit | Oral health impacts cardiovascular and metabolic health.                                     |

### Age-Appropriate Screenings

| Screening                   | When Due          | Frequency                | Notes                                                                                                                        |
| --------------------------- | ----------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Colonoscopy                 | Age 45 (Oct 2026) | Every 10 years if normal | Colorectal cancer screening. Schedule now to happen on time. Family history of colon cancer may move this earlier.           |
| Dermatology skin check      | Annually          | Annual                   | Full body skin exam for melanoma and other skin cancers. Especially important with any history of sun exposure or burns.     |
| Eye exam (dilated)          | Annually          | Annual                   | Baseline retinal exam. Elevated glucose increases diabetic retinopathy risk. Also checks for glaucoma, macular degeneration. |
| Blood pressure monitoring   | Ongoing (home)    | 3–4x/week minimum        | See Section 3.                                                                                                               |
| Dental cleaning             | Every 6 months    | Biannual                 | Standard of care.                                                                                                            |
| Flu vaccine                 | Annually (fall)   | Annual                   | Standard recommendation.                                                                                                     |
| Tdap booster                | Every 10 years    | Check when last received |                                                                                                                              |
| Shingles vaccine (Shingrix) | Age 50            | 2-dose series            | Not due yet, but worth noting.                                                                                               |

### ADONIS Integration

The `preventive_care` table (defined in Section 2) handles all of this. Seed it with every item above. The dashboard should show a "Preventive Care" widget or section that:

- Shows upcoming/overdue screenings with dates
- Turns amber 30 days before a screening is due
- Turns red when overdue
- Allows David to mark as scheduled or completed with results
- The AI Coach references this in periodic reviews: "Your colonoscopy is due in October — have you scheduled it?"

---

## Section 10: Recovery Modalities

As David ramps up training volume and intensity, recovery becomes a limiting factor. The plan currently addresses sleep and nutrition for recovery but doesn't cover soft tissue work.

### Foam Rolling / Self-Myofascial Release (SMR)

**Equipment:** High-density foam roller ($15–25). Optionally, a lacrosse ball ($5) for targeted work.

**Protocol (post-workout or evening, 5–10 minutes):**

- Calves (both sides, extra attention on left for Achilles support): 30–60 seconds each
- IT band (outer thigh): 30–60 seconds each side
- Quads: 30–60 seconds each
- Thoracic spine: 30–60 seconds (roller perpendicular to spine, roll upper/mid back)
- Glutes: 30 seconds each (sit on roller or use lacrosse ball)
- Lats: 30 seconds each side

**Why:** Reduces muscle adhesions, improves blood flow, accelerates recovery between sessions, and reduces injury risk. Particularly important for the calves/Achilles complex.

### Massage

**If budget allows:** Monthly sports or deep tissue massage. A professional can identify and address tissue restrictions that self-rolling misses. Especially valuable for the Achilles/calf complex.

**Budget-friendly alternative:** Percussion massage gun ($50–80 for a decent one). Effective for larger muscle groups. Don't use directly on the Achilles tendon — use on the calf muscle belly instead.

### Epsom Salt Baths

**Protocol:** 2 cups of Epsom salt (magnesium sulfate) in a hot bath, 15–20 minutes, 2–3 times per week.

**Benefits:** Transdermal magnesium absorption (supplemental to oral magnesium), muscle relaxation, parasympathetic activation, improved sleep when done before bed. Combines heat exposure benefits (see health manual, Part 8) with magnesium delivery.

### ADONIS Integration

Recovery doesn't need its own tracking page, but a few additions:

- Add a `foam_rolling` boolean to `daily_log`
- Add foam rolling to the non-negotiable tracking once David is past Phase 1 (it's not a Phase 1 priority — keep the initial habit stack small)
- The AI Coach should start recommending recovery modalities once training volume increases in Phase 2

```sql
ALTER TABLE daily_log ADD COLUMN foam_rolling BOOLEAN DEFAULT FALSE;
ALTER TABLE daily_log ADD COLUMN cold_exposure BOOLEAN DEFAULT FALSE;
ALTER TABLE daily_log ADD COLUMN heat_exposure BOOLEAN DEFAULT FALSE;
```

---

## Section 11: Equipment Recommendations

A consolidated list of equipment David should acquire, in priority order:

### Immediate (Week 1)

| Item                                   | Approx. Cost | Purpose                            |
| -------------------------------------- | ------------ | ---------------------------------- |
| Omron upper arm blood pressure monitor | $35          | Blood pressure tracking            |
| Pulse oximeter                         | $15          | Resting HR and SpO2 tracking       |
| Magnesium glycinate supplement         | $15          | Sleep, recovery, glucose           |
| Fish oil (high EPA/DHA)                | $25          | Triglycerides, inflammation, brain |
| Zinc picolinate                        | $10          | Testosterone support               |
| Vitamin K2 (MK-7)                      | $12          | Vitamin D partner, arterial health |
| Creatine monohydrate                   | $15          | Strength, brain, body composition  |
| B-complex                              | $12          | Methylation, post-alcohol recovery |

### Soon (Weeks 2–4)

| Item                                | Approx. Cost | Purpose                                         |
| ----------------------------------- | ------------ | ----------------------------------------------- |
| High-density foam roller            | $20          | Recovery, soft tissue work                      |
| Resistance band (light/medium)      | $8           | Band pull-aparts, warm-up, posture work         |
| Glass food storage containers (set) | $30          | Replace plastic — endocrine disruptor reduction |
| Collagen peptides                   | $20          | Gut lining, Achilles/joint support              |
| Psyllium husk                       | $10          | Fiber supplementation                           |

### When Ready (Month 1–3)

| Item                                    | Approx. Cost | Purpose                               |
| --------------------------------------- | ------------ | ------------------------------------- |
| Standing desk converter                 | $150–300     | Posture, NEAT, workstation ergonomics |
| DEXA scan                               | $50–100      | Body composition baseline             |
| CAC score scan                          | $75–150      | Cardiovascular risk assessment        |
| Lacrosse ball                           | $5           | Targeted myofascial release           |
| Percussion massage gun (optional)       | $60–80       | Recovery tool                         |
| HEPA air purifier for office (optional) | $80–150      | Indoor air quality                    |

---

## Section 12: Updated Daily Log Form

With all additions, the daily check-in form should be structured as follows. Fields marked (optional) can be collapsed/hidden by default to keep the form fast on most days.

**Morning Vitals (quick capture):**

- Weight (optional — recommend 3–4x/week, not daily)
- Blood pressure: systolic / diastolic
- Resting heart rate
- SpO2 (optional)

**Non-Negotiables:**

- Morning walk: Yes/No + duration
- Strength training: Yes/No/Rest Day
- Lunch with protein: Yes/No
- Mobility work: Yes/No
- Supplements taken: Yes/No
- Alcohol-free: Yes/No
- Foam rolling: Yes/No (added after Phase 1)
- Cold exposure: Yes/No (optional)

**Subjective Scores (1–10 sliders):**

- Energy level
- Mood
- Stress level
- Anxiety level
- Soreness level
- Alcohol craving (0–10, where 0 = none)

**Qualitative:**

- Wins (text)
- Struggles (text)
- Notes (text)
- Alcohol trigger (text, shown only if craving > 0)

**Design note:** This form must still be completable in under 2 minutes for a standard day. Use smart defaults, toggle switches, and collapsible sections. The morning vitals section should be at the top but collapsible. The subjective scores should use a horizontal button row (1–10) rather than a slider for speed.

---

## Summary of All New Database Tables and Modifications

### New Tables

1. `calculated_markers` — Auto-computed values (HOMA-IR, calculated free T, etc.)
2. `preventive_care` — Screening schedule and results
3. `vitals_log` — Blood pressure, resting HR, SpO2
4. `environment_checklist` — Endocrine disruptor reduction tracking

### Modified Tables

5. `daily_log` — Add columns: `anxiety_level`, `alcohol_craving`, `alcohol_trigger`, `foam_rolling`, `cold_exposure`, `heat_exposure`
6. `body_metrics` — Add columns: `dexa_total_fat_pct`, `dexa_lean_mass_lbs`, `dexa_fat_mass_lbs`, `dexa_visceral_fat_area`, `dexa_bone_density`, `navy_bf_estimate`

### New API Routes

```
GET/POST/DELETE  /api/vitals           → Blood pressure, HR, SpO2 logging
GET              /api/vitals/averages  → Rolling averages
GET/PUT          /api/preventive-care  → Screening schedule management
GET              /api/calculated-markers → HOMA-IR, calculated free T, etc.
GET/PUT          /api/environment      → Environmental health checklist
```

---

## What This Addendum Does NOT Cover (Future Considerations)

Items identified but deferred for later phases:

- **Genetic testing** (e.g., 23andMe health reports, Promethease analysis for pharmacogenomics — may reveal methylation SNPs like MTHFR that affect supplement choices)
- **Continuous glucose monitor (CGM)** — a 2-week trial with a CGM like Freestyle Libre could provide incredible real-time glucose data and help David understand which foods spike him. Expensive without a prescription (~$75–150 for 2 weeks) but extremely informative.
- **Heart rate variability (HRV) tracking** — a measure of autonomic nervous system balance and recovery readiness. Requires a wearable (Oura Ring, Whoop, Apple Watch). Considered for future ADONIS integration if David acquires a wearable.
- **Gut microbiome testing** — services like Viome or GI-MAP provide detailed microbiome analysis. Interesting data but not actionable enough yet to prioritize.
- **Advanced hormone panel** — DHEA-S, IGF-1, cortisol (4-point salivary), pregnenolone. Useful for complete endocrine picture but not needed until the basics are dialed in.
- **Heavy metal testing** — relevant if exposure history exists. Not a current priority.
- **Sleep study follow-up** — if BiPAP settings haven't been titrated recently and sleep quality doesn't improve meaningfully with alcohol cessation, a follow-up polysomnography may be warranted to re-titrate pressures.
