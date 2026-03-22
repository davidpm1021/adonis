# ADONIS Implementation Plan v2

**Scope:** Unimplemented spec features + user feedback + Garmin integration + proactive guided experience

---

## Part 1: Fix Data Connectivity (Disconnected Systems)

Right now, several features exist in multiple places but don't talk to each other. This is the highest priority because it undermines trust in the data.

### 1A. Supplement Toggle Sync

**Problem:** The dashboard's "Supplements" non-negotiable toggle writes a boolean to `daily_log.supplementsTaken`, but the `/supplements` page uses the `supplement_log` table with individual per-supplement entries. Toggling one doesn't affect the other.

**Fix:**

- When all supplements for a given time-of-day group are marked as taken on `/supplements`, auto-set `daily_log.supplementsTaken = 1` via a cross-table sync call.
- When the dashboard toggle for supplements is flipped ON, auto-mark all supplements in the `supplement_log` for today as `taken = 1` (with a confirmation toast: "Mark all supplements taken?").
- When the dashboard toggle is flipped OFF, mark all `supplement_log` entries for today as `taken = 0`.
- Add a new API endpoint `POST /api/supplements/sync` that accepts a date and direction (daily_log -> supplement_log or vice versa) and reconciles both tables.
- The dashboard's `DashboardStreakHub` / `TodaysProgress` component for "Supplements" should show actual supplement compliance (e.g., "8/10 taken") rather than a simple boolean.

**Files to modify:**
- `src/components/dashboard/non-negotiables.tsx` -- toggle handler calls sync endpoint
- `src/app/api/supplements/log/[date]/route.ts` -- after toggling, update `daily_log`
- `src/app/api/daily-log/[date]/route.ts` -- when supplementsTaken changes, update `supplement_log`
- New: `src/app/api/supplements/sync/route.ts`

### 1B. Weight Logging Unification

**Problem:** Weight can be logged from the dashboard (MetricsSnapshot), from `/body-metrics`, and potentially from the daily log. These may create separate entries or not update each other.

**Fix:**

- Establish a single source of truth: `body_metrics` table is the canonical weight store.
- All weight entry points (dashboard quick-log, body metrics page, daily log vitals section) write to the same `POST /api/metrics` endpoint.
- The dashboard reads weight from `body_metrics` (it already does this).
- Add a lightweight "quick weight entry" modal that can be invoked from anywhere and posts to the same endpoint.
- Deduplicate: if a `body_metrics` entry already exists for today, an update (PUT) is issued instead of a new INSERT.

**Files to modify:**
- `src/components/dashboard/metrics-snapshot.tsx` -- use shared weight entry modal
- `src/app/api/metrics/route.ts` -- add upsert logic (if entry exists for date, update)
- New: `src/components/shared/quick-weight-modal.tsx` -- reusable modal component

### 1C. Daily Log vs. Individual Section Pages

**Problem:** The daily log form has toggles for morning walk, strength training, mobility, etc. But the training page, sleep page, and other section pages have their own data entry that doesn't sync back to the daily log.

**Fix:**

- Create a unified "daily status" API (`GET /api/daily-status/:date`) that aggregates data from all tables (daily_log, supplement_log, sleep_log, workouts, nutrition_log, body_metrics, vitals_log) into a single status object for a given date.
- The dashboard reads from this unified endpoint.
- When a workout is logged on `/training`, auto-set `daily_log.strengthTraining = 1`.
- When sleep is logged on `/sleep`, mark the sleep streak as complete.
- When vitals are logged on `/vitals`, mark the daily log's vitals as complete.
- Each section page's save handler should call a shared `syncDailyLog(date, field, value)` function.

**Files to modify:**
- New: `src/app/api/daily-status/[date]/route.ts`
- `src/app/api/workouts/route.ts` -- after POST, sync daily_log
- `src/app/api/sleep/route.ts` -- after POST, sync daily_log
- `src/app/api/vitals/route.ts` -- after POST, sync daily_log
- New: `src/lib/sync-daily-log.ts` -- shared server-side sync utility

---

## Part 2: Garmin Watch Integration

There is no official Garmin API for personal/self-hosted use. The official Garmin Connect Developer Program is push-based and designed for business applications. However, there are well-maintained unofficial libraries that work for personal use.

### Recommended Approach: `garmin-connect` npm package

The `garmin-connect` npm package (or `@flow-js/garmin-connect` fork with better TypeScript types) provides access to Garmin Connect data using the same OAuth authentication as the official app. It supports: steps, heart rate, sleep data, stress, SpO2, body composition, activities, and more.

### Data to Sync from Garmin

| Garmin Data | ADONIS Table | Fields |
|---|---|---|
| Daily steps | `vitals_log` or new `garmin_daily` | totalSteps, dailyStepGoal |
| Resting heart rate | `vitals_log` | restingHeartRate |
| Heart rate (all-day) | new `garmin_heart_rate` | averageHR, maxHR, minHR |
| Sleep | `sleep_log` | bedtime, wakeTime, totalHours, sleepQuality (mapped from Garmin's sleep score) |
| Activities/Workouts | `workouts` | date, type, duration, calories, avgHR |
| SpO2 | `vitals_log` | spo2 |
| Stress | new `garmin_stress` or `daily_log.stress` | averageStress |
| Body Battery | new field on `daily_log` | bodyBattery (morning reading) |
| Steps intraday | optional: new `garmin_steps_intraday` | for detailed charts |

### Implementation Plan

**Phase 1: Polling-based sync (simplest, most reliable)**

1. New DB table: `garmin_sync_config` -- stores encrypted Garmin email/password, last sync timestamp, sync interval, enabled flag.
2. New DB table: `garmin_daily_summary` -- stores raw daily summaries from Garmin (steps, floors, calories, distance, activeMinutes, bodyBattery, averageStress).
3. New API routes:
   - `POST /api/garmin/auth` -- validate Garmin credentials and store (encrypted)
   - `GET /api/garmin/status` -- connection status, last sync time
   - `POST /api/garmin/sync` -- manually trigger a sync
   - `DELETE /api/garmin/auth` -- disconnect
4. Server-side sync function:
   - Runs on an interval (every 15 minutes via a Next.js cron route or setInterval)
   - Authenticates to Garmin Connect
   - Pulls today's data + any missing days since last sync
   - Maps Garmin data to ADONIS tables (vitals_log, sleep_log, daily_log fields)
   - Avoids overwriting manually-entered data (Garmin data gets `source = 'garmin'` flag)
5. Settings page: Add a "Garmin Connect" section with connect/disconnect, sync status, and a manual sync button.

**Phase 2: Enhanced integration**

- Auto-populate walk duration from Garmin walking activities
- Map Garmin "Intensity Minutes" to mobility/activity tracking
- Pull Garmin's sleep stages for richer sleep analysis
- Show real-time step count on dashboard (poll more frequently or on page load)
- Body Battery correlation with daily log energy/mood scores

**Schema additions:**

```sql
CREATE TABLE garmin_daily_summary (
  id SERIAL PRIMARY KEY,
  date TEXT NOT NULL UNIQUE,
  total_steps INTEGER,
  step_goal INTEGER,
  floors_climbed INTEGER,
  active_minutes INTEGER,
  calories_total INTEGER,
  calories_active INTEGER,
  distance_meters REAL,
  average_stress INTEGER,
  max_stress INTEGER,
  body_battery_high INTEGER,
  body_battery_low INTEGER,
  average_hr INTEGER,
  max_hr INTEGER,
  min_hr INTEGER,
  resting_hr INTEGER,
  spo2_average REAL,
  raw_json TEXT, -- full Garmin response for debugging
  synced_at TEXT,
  created_at TEXT
);

CREATE TABLE garmin_sync_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  enabled INTEGER DEFAULT 0,
  garmin_email TEXT,
  garmin_password_encrypted TEXT,
  last_sync_at TEXT,
  sync_interval_minutes INTEGER DEFAULT 15,
  created_at TEXT,
  updated_at TEXT
);
```

**Key dependencies to add:** `garmin-connect` or `@flow-js/garmin-connect`

**Important notes:**
- Garmin Connect has rate limits. The sync should be conservative (every 15-30 min, not every minute).
- Store the Garmin session/tokens to avoid re-authenticating on every sync.
- If Garmin changes their internal API, the unofficial library may break temporarily. The app should handle this gracefully.
- Mark all Garmin-sourced data with `source = 'garmin'` so manually-entered data always takes priority.

---

## Part 3: Proactive Guided Experience ("Just Open It and Go")

This is the biggest UX shift. Right now ADONIS is a passive tracker. It needs to become an active coach that tells you what to do next. The goal: open the app, and it immediately shows you what needs your attention, in priority order, with one-tap actions.

### 3A. Morning Briefing / Daily Action Queue

**Concept:** When you open ADONIS, instead of (or above) the current dashboard, show a "Today's Action Queue" -- a prioritized, sequential list of things to do right now. Items are contextual based on time of day, what's been logged, and what's missing.

**Morning (before noon):**
1. "Good morning, David. Day 392 sober." (motivational anchor)
2. "Log your weight" -- inline weight entry, one tap to expand, one tap to save
3. "Take your morning supplements" -- shows the morning group with checkboxes, inline
4. "Morning walk?" -- toggle + duration entry
5. "Log your vitals" -- blood pressure, heart rate (or auto-filled from Garmin)

**Midday (noon-5pm):**
1. "Have you had lunch?" -- Yes/No. If Yes: "What did you eat?" (opens natural language food logger inline). If No: "Here are some suggestions based on your remaining macros..." (auto-generates meal suggestions)
2. "Protein check: You're at 45g of 160g. You need 115g more today."
3. If it's a training day: "Today is a training day (Tuesday). Your prescribed workout: [Phase X, Workout Y]. Ready to log?"

**Evening (after 5pm):**
1. "Have you had dinner?" -- same flow as lunch
2. "Evening supplements" -- checklist
3. "Daily check-in" -- streamlined: energy, mood, stress, soreness (4 taps)
4. "Wins today?" / "Struggles today?" -- optional text fields
5. "Before bed supplements" -- checklist

**Late night:**
1. "Log your sleep from last night" (if not yet logged)
2. "BiPAP used? Yes/No"

**Implementation:**

- New component: `src/components/dashboard/action-queue.tsx` -- a client component that fetches the unified daily status and renders a priority-ordered list of action items
- New API: `GET /api/action-queue` -- returns a sorted list of actions based on: time of day (ET), what's been logged today, what's missing, training schedule, supplement schedule
- Each action item is a self-contained mini-form: expand it, complete it, collapse it. No page navigation required for common tasks.
- Actions get checked off as completed and animate away (or gray out with a checkmark)
- Unacted items float to the top; completed items sink to the bottom

**Action Queue Logic (server-side):**

```typescript
interface ActionItem {
  id: string;
  priority: number; // 1 = highest
  type: 'weight' | 'supplements' | 'meal' | 'workout' | 'vitals' | 'checkin' | 'sleep' | 'motivation';
  title: string;
  subtitle?: string;
  status: 'pending' | 'completed' | 'skipped';
  timeWindow: 'morning' | 'midday' | 'evening' | 'night' | 'anytime';
  component: string; // which inline form to render
  data?: any; // pre-populated data (e.g., remaining macros, supplement list)
}
```

### 3B. AI-Powered Daily Nudges

**Concept:** The AI Coach doesn't just wait for you to open the chat. It generates short, contextual nudges that appear on the dashboard and in the action queue.

**Examples:**
- "You've hit your protein target 5 of the last 7 days. Keep it up -- consistency compounds."
- "Your sleep quality averaged 4.2 this week. Try taking magnesium 30 minutes earlier tonight."
- "You haven't logged a workout in 4 days. Even a 15-minute walk counts. Get moving."
- "Your weight is trending down 1.2 lbs/week -- right in the sweet spot. Don't change anything."
- "Tomorrow is a training day. Make sure you eat enough protein today to fuel recovery."

**Implementation:**
- New API: `POST /api/nudges/generate` -- called once daily (or on first dashboard load), uses Claude Sonnet (not Opus, for cost) with a focused prompt and today's data to generate 2-3 short nudges.
- Cache nudges for the day in a new `daily_nudges` table.
- Display as dismissible cards at the top of the dashboard or woven into the action queue.

### 3C. Smart Meal Flow

**Concept:** When asked "Have you eaten?", the flow should be nearly frictionless:

1. "What did you have?" -- text input with placeholder "e.g., 3 eggs, toast, coffee"
2. Hit enter -- AI parses it instantly (Sonnet, cached)
3. Shows parsed result with macros: "Scrambled eggs (3) -- 240cal, 18g protein..."
4. "Looks right? Save" / "Edit" -- one tap to confirm
5. Immediately updates the dashboard macro bars

No page navigation. No form fields to fill in. Type what you ate, confirm, done.

### 3D. Supplement Guidance (Not Just Tracking)

**Problem:** The supplement page shows a checklist but doesn't tell you what each supplement does or why you're taking it.

**Fix:**
- Add a `purpose` field to the supplement stack (already in the SPEC's health manual).
- Show a brief "Why:" tooltip next to each supplement.
- When marking supplements taken, show the dose clearly: "Fish Oil -- 2 capsules with breakfast"
- Morning supplements prompt should include: "Take with food for best absorption"

### 3E. ADHD-Friendly Design Principles

Apply these throughout the app:

1. **Reduce decision fatigue:** Never ask "what do you want to do?" Instead, tell the user what to do next. The action queue handles this.
2. **One thing at a time:** The action queue shows one expanded item at a time. Complete it or skip it, then the next one appears.
3. **Instant gratification:** Every completed action shows a satisfying micro-animation (checkmark, progress bar filling, streak incrementing).
4. **Streak psychology:** Make streaks visible everywhere. "You've logged meals 12 days in a row." Breaking a streak hurts more than the effort of maintaining it.
5. **Low-friction defaults:** Smart defaults everywhere. Alcohol-free = yes. BiPAP = yes. Today's date pre-filled. Supplement doses pre-filled.
6. **No blank screens:** If there's nothing logged for today, don't show empty charts. Show the action queue with what needs to be done.
7. **Momentum indicators:** A daily "completion percentage" that fills as you check things off. "You're 60% done with today's checklist."

---

## Part 4: Unimplemented SPEC Features

### 4A. Trends: Correlations (SPEC Section 9)

**Status:** Not implemented. The trends page has weight, consistency, and streaks, but no correlations.

**To build:**
- `GET /api/trends/correlations` -- compute correlations between:
  - Sleep quality vs. energy level
  - Training consistency vs. mood
  - Weight trend vs. nutrition compliance
  - Sobriety days vs. sleep quality
  - Protein intake vs. energy level
- New component: `src/components/trends/correlation-charts.tsx`
- Use Recharts scatter plots with trend lines
- AI-generated insight text for each significant correlation

### 4B. Trends: Lab Trajectory (SPEC Section 9)

**Status:** Not implemented.

**To build:**
- `GET /api/trends/labs` -- returns all lab results for each biomarker over time
- Multi-line chart with reference range bands
- Normalize biomarkers to their reference ranges for comparable visualization
- Show projected next lab date and targets
- Annotations for major lifestyle events (quit alcohol, started exercise, started Mounjaro)

### 4C. Monthly Report Generation (SPEC Section 9)

**Status:** Weekly reports exist. Monthly reports do not.

**To build:**
- `POST /api/reports/monthly/generate` -- aggregates 4 weeks of data, generates a comprehensive monthly summary via Claude Opus
- UI: Reports page should have a "Monthly" tab alongside Weekly
- Auto-generate on the 1st of each month (or on demand)

### 4D. Grocery/Meal Prep Suggestions (SPEC Section 2.5)

**Status:** Not implemented.

**To build:**
- `POST /api/nutrition/meal-prep` -- AI-generated weekly meal prep plan based on: favorite meals, macro targets, recent patterns, variety
- `POST /api/nutrition/grocery-list` -- generates grocery list from meal prep plan
- UI: Add a "Meal Prep" section to the nutrition page with a "Generate This Week's Plan" button
- Output: copyable/printable list

### 4E. Adaptive Dashboard Widgets (SPEC Addition 3)

**Status:** Partially implemented. The dashboard doesn't adapt based on data maturity.

**To build:**
- Calculate "data maturity" based on days since first daily log
- Weeks 1-4: Large sobriety counter, streak tracker, simple consistency, encouragement messaging
- Weeks 5-12: Add weight trend chart, training volume, nutrition compliance %, lab retest countdown
- Month 3+: Multi-metric dashboard, lab trajectory, correlation insights, monthly comparison
- The action queue (Part 3A) naturally adapts since it's based on what's been logged

### 4F. Adaptive Sleep Recommendations (SPEC Section 1.3)

**Status:** Sleep logging exists. Adaptive recommendations do not.

**To build:**
- Weekly AI evaluation of sleep data (rolled into weekly report generation)
- Detect patterns: high time-to-fall-asleep, increasing wake-ups, low quality trends
- Surface recommendations as nudges (Part 3B) and in weekly reports
- Track sleep quality improvement vs. sobriety timeline as a first-class insight

### 4G. Nutrition Pattern Insights (SPEC Section 2.4)

**Status:** The `nutrition_insights` table exists. Generation logic does not.

**To build:**
- `POST /api/insights/nutrition/generate` -- runs bi-weekly, analyzes:
  - Average protein by day of week
  - Fiber trends over time
  - Meal timing patterns
  - Takeout frequency
  - Correlation between nutrition compliance and energy/mood
- Store insights in `nutrition_insights` table
- Display as cards on the nutrition page and in weekly reports

### 4H. Photo-Based Food Logging (SPEC Method 2)

**Status:** API route exists (`/api/nutrition/photo`). UI does not.

**To build:**
- Add camera/photo upload button to the food log form
- Mobile: use device camera API
- Desktop: file upload
- Send base64 image to existing `/api/nutrition/photo` endpoint
- Show parsed results for review before saving

### 4I. Optional Field Handling

**Problem:** Some fields require devices or data sources the user may not have. They should be clearly optional and hideable.

**Fields to mark as optional (collapsible/hideable):**
- SpO2 (requires pulse oximeter)
- Blood pressure (requires monitor)
- Body fat percentage (requires DEXA or calipers)
- DEXA scan fields (all)
- Body measurements (waist, chest, arm, thigh, neck)
- Cold exposure, heat exposure, foam rolling (Phase 2+ habits)

**Implementation:**
- Settings page: "Tracked Metrics" section where toggles control which optional fields appear
- New DB table or JSON field on `user_profile`: `tracked_metrics` -- a JSON object with boolean flags
- All forms check these flags and conditionally render optional fields
- Default: only show fields the user has devices for or has previously logged

---

## Part 5: Implementation Priority & Phasing

### Sprint 1: Foundation Fixes (Week 1-2)
1. Data connectivity fixes (Part 1: A, B, C)
2. Optional field handling (Part 4I)
3. Unified daily status API

### Sprint 2: Guided Experience (Week 3-4)
1. Action Queue (Part 3A)
2. Smart Meal Flow inline (Part 3C)
3. Supplement guidance improvements (Part 3D)
4. ADHD-friendly design pass (Part 3E)

### Sprint 3: Garmin Integration (Week 5-6)
1. Garmin auth + sync (Part 2, Phase 1)
2. Auto-populate vitals, steps, sleep from Garmin
3. Settings page Garmin section

### Sprint 4: AI Proactivity (Week 7-8)
1. Daily nudges (Part 3B)
2. Adaptive sleep recommendations (Part 4F)
3. Nutrition pattern insights (Part 4G)

### Sprint 5: Advanced Features (Week 9-10)
1. Correlations (Part 4A)
2. Lab trajectory charts (Part 4B)
3. Monthly reports (Part 4C)
4. Photo food logging (Part 4H)

### Sprint 6: Polish (Week 11-12)
1. Grocery/meal prep suggestions (Part 4D)
2. Adaptive dashboard maturity (Part 4E)
3. Garmin Phase 2 enhancements
4. Performance optimization and bug fixes

---

## Technical Notes

### New Dependencies
- `garmin-connect` or `@flow-js/garmin-connect` -- Garmin Connect API wrapper
- Consider `node-cron` for scheduled sync tasks (Garmin polling, daily nudge generation)

### New Database Tables
- `garmin_daily_summary`
- `garmin_sync_config`
- `daily_nudges`
- `tracked_metrics` (or as JSON field on user_profile)

### New API Routes
- `GET /api/daily-status/:date` -- unified daily status
- `GET /api/action-queue` -- prioritized action items
- `POST /api/supplements/sync` -- cross-table supplement sync
- `POST /api/garmin/auth`
- `GET /api/garmin/status`
- `POST /api/garmin/sync`
- `DELETE /api/garmin/auth`
- `POST /api/nudges/generate`
- `GET /api/nudges/today`
- `POST /api/reports/monthly/generate`
- `POST /api/nutrition/meal-prep`
- `POST /api/nutrition/grocery-list`
- `POST /api/insights/nutrition/generate`
- `GET /api/trends/correlations`
- `GET /api/trends/labs`

### Cost Considerations
- Daily nudges: Use Sonnet, not Opus. Cache for the day. ~$0.01-0.02/day.
- Meal prep/grocery: Use Sonnet. On-demand only. ~$0.02 per generation.
- Nutrition insights: Bi-weekly via Sonnet. ~$0.02 per run.
- Monthly reports: Opus, once/month. ~$0.10 per report.
- Garmin sync: No AI cost, just API calls.
