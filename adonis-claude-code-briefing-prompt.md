# Claude Code Prompt: ADONIS Daily Briefing — AI-First Experience

Read `adonis-implementation-plan.md` and `SPEC.md` for full context. This prompt is about fundamentally changing how the ADONIS dashboard works.

## The Problem

The current dashboard is a tracker with action cards and checkboxes. It feels like MyFitnessPal. That's not what ADONIS is supposed to be. ADONIS is supposed to feel like opening a conversation with a personal coach, trainer, and dietician who knows everything about David — his data, his history, his struggles, his medications, his goals. The app should GUIDE him through his day, not wait for him to figure out what to do.

## What to Build: AI Daily Briefing

Replace the current Action Queue with an AI-generated Daily Briefing that is the primary dashboard experience. When David opens ADONIS, the first thing he sees is a personalized message from his coach that covers everything he needs to know and do right now.

### How It Works

1. On first dashboard load each day (or when the user pulls to refresh), call Claude Sonnet to generate a Daily Briefing.
2. The briefing is generated from ALL of David's data: weight trends, yesterday's nutrition, sleep quality, supplement compliance, training schedule, sobriety streak, recent lab results, active goals, what time of day it is.
3. The briefing is written in a direct, coaching voice — not generic motivational fluff. It references specific numbers, specific days, specific patterns.
4. Cache the briefing so it doesn't regenerate on every page load. Regenerate when: (a) it's a new day, (b) the user explicitly refreshes, or (c) significant new data is logged (weight, meals, workout).
5. Below the briefing text, render contextual inline action forms that correspond to what the coach just told David to do.

### Daily Briefing Structure

The AI should generate a briefing with these sections (in markdown, rendered nicely):

**Opening** — Greeting with time of day, sobriety day count, a one-liner motivational anchor. Not generic — reference something specific from recent data.

**Body Status** — Current weight, trend direction, how it compares to goal. If weight is stalling, say so and say why. If it's dropping well, reinforce. Reference Mounjaro if relevant.

**Right Now** — What to do immediately based on time of day:
- Morning: supplements to take (list them with doses), log weight, take blood pressure
- Midday: lunch reminder with specific protein target, remaining macros
- Evening: dinner, evening supplements, daily check-in
- Night: sleep log, before-bed supplements

**Training** — Is today a training day or rest day? What's the prescribed workout? If training has been missed recently, call it out. If there's a streak, reinforce it.

**Nutrition Snapshot** — What David ate yesterday (or so far today if it's afternoon+). Protein vs target. Calories vs target. Specific callouts: "You only had 89g protein yesterday, that's barely half your target. Prioritize protein at every meal today." Suggest specific meals based on his favorites and remaining macros.

**Patterns & Flags** — Anything the AI notices in recent data:
- Sleep quality declining? Call it out.
- Supplement compliance dropping? Name which ones.
- Mood/energy trending down? Suggest potential causes.
- Achilles pain mentioned in notes? Flag it.

**This Week** — Brief overview: training sessions remaining, upcoming lab retest dates, goal progress.

### API Design

**`POST /api/briefing/generate`**

Gathers all relevant data and calls Claude Sonnet to generate the briefing. Data to include in the prompt:

- User profile (age, weight goal, medications, conditions)
- Sobriety start date and day count
- Current weight + last 14 days of weight entries + trend
- Yesterday's full nutrition log (meals, macros, totals vs targets)
- Today's nutrition so far
- Last 7 days of daily logs (habits, scores, wins, struggles)
- Last 7 days of sleep data
- Supplement compliance last 7 days
- Current training phase + last 7 days of workouts
- Active goals and progress
- Today's date, day of week, whether it's a training day
- Current time of day (ET)
- Latest lab results with flags
- Most recent weekly report summary (if exists)

The system prompt should instruct Claude to:
- Write in second person, direct coaching voice
- Reference specific numbers and dates, never be vague
- Be honest about poor performance — don't sugarcoat
- Celebrate genuine wins and streaks
- Keep it under 500 words — dense and actionable, not rambling
- Format with markdown (headers, bold for emphasis, bullet lists where needed)
- Structure the response as: greeting, body_status, right_now, training, nutrition, patterns, week_ahead
- Return the briefing as a JSON object with sections so the frontend can render them with appropriate styling and intersperse action forms between sections

Response format:
```json
{
  "greeting": "Good morning, David. Day 11 sober. Let's get after it.",
  "body_status": "You're at 218.4 lbs, down 6.6...",
  "right_now": "Take your morning supplements...",
  "right_now_actions": ["weight", "supplements_morning", "vitals"],
  "training": "Today is Sunday — rest day...",
  "training_actions": ["walk"],
  "nutrition": "Yesterday you only logged 1,200 calories...",
  "nutrition_actions": ["meal"],
  "patterns": "Your sleep quality has dropped to 4.2...",
  "week_ahead": "Tuesday and Thursday are training days...",
  "generated_at": "2026-03-22T12:00:00Z"
}
```

**`GET /api/briefing/today`**

Returns the cached briefing for today. If none exists or it's stale, returns `null` so the frontend knows to call generate.

**`POST /api/briefing/refresh`**

Force regenerate the briefing (e.g., after logging a meal, the nutrition section should update).

### Database

New table: `daily_briefings`

```sql
CREATE TABLE daily_briefings (
  id SERIAL PRIMARY KEY,
  date TEXT NOT NULL,
  briefing_json TEXT NOT NULL, -- full JSON response from Claude
  model TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  stale INTEGER DEFAULT 0, -- set to 1 when new data is logged to trigger refresh
  created_at TEXT
);
```

Add this to `src/db/schema.ts` using Drizzle's pgTable. Use `npx drizzle-kit push` to apply (do NOT use migrations — the production DB was set up without Drizzle migrations).

### Frontend: Dashboard Redesign

Modify `src/app/dashboard/page.tsx` and create a new `src/components/dashboard/daily-briefing.tsx` component.

**Layout (top to bottom):**

1. **Briefing Header** — Sobriety counter (large), date, greeting line
2. **Coach Briefing** — The AI-generated text, rendered as styled markdown sections with the ADONIS dark theme. Each section has a subtle left border accent.
3. **Inline Actions** — After each briefing section that mentions actions, render the corresponding inline forms (weight entry, supplement checklist, meal logger, etc). These use the existing action form components (WeightForm, SupplementsForm, MealForm, etc) from action-queue.tsx.
4. **Below the fold** — The existing dashboard widgets (streak calendar, metrics snapshot, phase status, etc) remain but are secondary to the briefing.

**Briefing rendering:**
- The greeting is displayed large (text-xl or text-2xl) with the sobriety counter prominent
- Each section renders with a section header in accent-teal, body text in text-primary
- Action forms slide in below their section with a subtle animation
- Completed actions show a green checkmark and collapse
- The whole thing should feel like reading a message from your coach, with interactive elements woven in

**Refresh behavior:**
- On first load: check `/api/briefing/today`. If null or stale, call `/api/briefing/generate`.
- After completing an action (logging weight, meal, etc): set the briefing as stale and show a subtle "Update briefing" button (don't auto-regenerate to avoid API cost spam).
- On manual pull-to-refresh or clicking refresh: regenerate.

### The Alcohol-Free Confirmation

The briefing doesn't ask about alcohol as a checkbox. Instead, the sobriety counter IS the answer. It's always visible, always counting. If David breaks his streak, he updates his sobriety start date in settings. The daily log still tracks `alcoholFree` but it defaults to 1 (true) and only gets set to 0 if David explicitly reports drinking. This is by design — the streak is the accountability mechanism, not a daily checkbox.

However, the AI briefing SHOULD reference sobriety milestones: "Day 14 — two weeks. Your liver enzymes are likely already improving." And if David logs alcoholFree = 0, the briefing the next day should acknowledge it without judgment and refocus.

### Supplement Inline Display

When the briefing says "Take your morning supplements," the inline form below should show each supplement with its name, dose, and a one-line purpose:
- Fish Oil (2-3g EPA/DHA) — triglycerides, inflammation
- Vitamin D3 (5,000 IU) — bone health, immune function
- Vitamin K2 (200mcg) — D3 partner, arterial health
- B-Complex — methylation, energy
- Creatine (5g) — strength, brain function

Each is a checkbox. When all are checked, the section shows as complete.

### Existing Dashboard Widgets

Keep all existing widgets (StreakHub, MetricsSnapshot, StreakCalendar, QuickActions, PhaseStatus, WeeklyReportWidget) but move them BELOW the briefing. They become supporting detail, not the primary experience.

NudgeCards can be REMOVED — their function is now served by the briefing's "patterns" section, which is better because it's integrated into the narrative rather than being separate cards.

### Cost Management

- Use Claude Sonnet (not Opus) for briefing generation — it's a structured summary, not complex reasoning
- Cache aggressively — one generation per day unless stale
- The briefing prompt should be under 4000 tokens of context data (summarize, don't dump raw data)
- Display estimated cost in settings alongside existing AI usage tracking

### Critical Constraints

- All schema changes must be additive (new tables/columns only)
- Use `npx drizzle-kit push` for schema changes, not migrations
- Follow existing code patterns, UI design system, and naming conventions
- All dates in Eastern Time (America/New_York)
- Don't break existing functionality — the briefing is additive to the dashboard, not a replacement for existing pages

### Files to Create/Modify

**Create:**
- `src/app/api/briefing/generate/route.ts`
- `src/app/api/briefing/today/route.ts`
- `src/app/api/briefing/refresh/route.ts`
- `src/components/dashboard/daily-briefing.tsx`
- `src/components/dashboard/briefing-section.tsx`

**Modify:**
- `src/db/schema.ts` — add daily_briefings table
- `src/app/dashboard/page.tsx` — add DailyBriefing as the primary component above existing widgets
- `src/lib/constants.ts` — add briefing model config

**Can remove or demote:**
- `src/components/dashboard/nudge-cards.tsx` — functionality replaced by briefing
- `src/components/dashboard/action-queue.tsx` — inline forms are reused but the queue wrapper is replaced by the briefing layout

Start by building the API route that gathers data and generates the briefing. Get that working first, then build the frontend.
