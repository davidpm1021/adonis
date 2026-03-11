# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ADONIS ("Rebuild the machine.") is a personalized health and fitness tracking application with adaptive AI intelligence. It is designed for a single user (David) and centers on training program management, intelligent nutrition tracking with AI-assisted food logging, lab result tracking, sleep/supplement/body metrics monitoring, and an AI Coach that learns from data patterns over time.

**Current status:** Pre-implementation. The repository contains `SPEC.md` (the complete project specification). No application code exists yet.

## Specification Reference

`SPEC.md` is the single source of truth for all requirements. Key sections:

- **Rebrand** — All branding uses "ADONIS" (JetBrains Mono, dark theme, geometric logo replacing the "O")
- **Adaptive Intelligence** — Training plans, nutrition targets, sleep recommendations, goals, and weekly reports all auto-adjust based on logged data. The AI Coach evaluates weekly and generates recommendations requiring user approval.
- **Smart Food Logging** — Four input methods: natural language parsing (Claude Sonnet), photo-based logging (Claude Vision / stretch), quick-add favorites, and manual entry.
- **Adaptive Dashboard** — UI adapts what it shows based on data maturity (Weeks 1-4 vs 5-12 vs Month 3+).

## Architecture Decisions (from spec)

### AI Model Routing

```typescript
const MODELS = {
  COACHING: "claude-opus-4-6",              // Complex analysis, coaching, reports
  FOOD_PARSE: "claude-sonnet-4-5-20250929", // Food parsing, simple structured output
  PHOTO_PARSE: "claude-opus-4-6",           // Vision tasks need Opus
  MEAL_SUGGEST: "claude-sonnet-4-5-20250929", // Meal suggestions
};
```

Cost management is critical: cache repeated food parses, use Sonnet (not Opus) for food parsing, batch weekly report data into single API calls, rate-limit the AI Coach (50 messages/day), and display token usage in settings.

### Database

SQLite with these tables (defined in SPEC.md with full schemas):
- `training_phases` — Adaptive training plan storage (JSON fields for workouts and progression rules)
- `nutrition_targets` — Time-varying macro targets with AI-generated rationale
- `goal_history` — Goal lifecycle tracking (created/updated/achieved/archived)
- `weekly_reports` — AI-generated weekly intelligence reports (markdown + JSON)
- `favorite_meals` — Quick-add meal favorites with usage tracking
- `nutrition_insights` — AI-generated nutrition pattern analysis
- Plus original tables: goals, daily_logs, exercises, lab_results, supplements, sleep_logs, body_metrics

### API Routes

All routes are documented in SPEC.md under "Updated API Routes." Key endpoints:
- `POST /api/nutrition/parse` — Natural language food parsing
- `POST /api/nutrition/photo` — Photo-based food logging (stretch)
- `GET /api/nutrition/suggestions` — "What should I eat?" remaining-macro-aware suggestions
- `POST /api/training/phases` — AI-generated training phase creation
- `POST /api/reports/weekly/generate` — Trigger weekly intelligence report

## MCP Servers — Install Before Building

The following MCP servers should be configured in Claude Code before starting implementation. They are not yet installed. Use `claude mcp add` or edit `~/.claude.json` to set them up.

### Must-Have (P0)

**Context7** — Pulls up-to-date, version-specific documentation for any library directly into context. Use this instead of guessing at APIs. Supports the Anthropic SDK, React, Express, SQLite libraries, Chart.js, and thousands more. Add "use context7" to prompts or configure as a rule.
- `npx -y @upstash/context7-mcp`

**Sequential Thinking** — Structured step-by-step reasoning with the ability to revise and branch. Use for complex architectural decisions, debugging multi-step data flows, and reasoning through the adaptive intelligence algorithms.
- `npx -y @modelcontextprotocol/server-sequentialthinking`

**SQLite MCP** — Direct database access: list tables, describe schemas, execute queries. Use for inspecting the ADONIS database, debugging data issues, running analytics on health data, and verifying migrations.
- `uvx mcp-server-sqlite --db-path /path/to/adonis.db`

**GitHub MCP** — 80+ tools for repo management, PRs, issues, code reviews, actions, and security scanning. Use for all GitHub workflow operations.
- `gh extension install github/gh-mcp` or Docker: `ghcr.io/github/github-mcp-server`
- Requires `GITHUB_PERSONAL_ACCESS_TOKEN` env var.

### High Value (P1)

**Playwright** — Browser automation for end-to-end testing. Navigate pages, click elements, fill forms, take screenshots. Use for testing the adaptive dashboard UI, food logging forms, and cross-browser validation.
- `npx @playwright/mcp@latest`

**Memory** — Persistent knowledge graph that survives across sessions. Stores entities, relations, and observations locally. Use to remember architectural decisions, known bugs, David's preferences, and project context between coding sessions.
- `npx -y @modelcontextprotocol/server-memory`

**Fetch** — Fetches any URL and extracts content as clean markdown. Use for pulling API documentation, Anthropic pricing pages, health data references, or any web resource.
- `npx -y @modelcontextprotocol/server-fetch`

**Desktop Commander** — Terminal command execution + filesystem operations + process management. Replaces the basic Filesystem MCP. Use for running build commands, starting dev servers, managing long-running processes.
- `npx @wonderwhy-er/desktop-commander@latest setup`

### Nice to Have (P2)

**Sentry** — Production error monitoring with AI-powered fix suggestions. Connect after deployment to track errors in the health app.
- Hosted remote server with OAuth (nothing to install).

**Figma** — Converts Figma designs to structured code-ready output. Use if dashboard mockups are designed in Figma.
- Available as remote server via Figma Desktop.

**Supabase** — Full Supabase management (projects, migrations, schemas, SQL queries, TypeScript types). Use if ADONIS migrates from SQLite to Supabase/PostgreSQL for auth, real-time, or cloud hosting.
- `npx supabase mcp` (available at `localhost:54321/mcp` with Supabase CLI).

**ESLint MCP** — Lets Claude run ESLint directly for linting and code analysis during development.
- `npx @eslint/mcp@latest`

### Example Configuration (`~/.claude.json`)

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    },
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequentialthinking"]
    },
    "sqlite": {
      "command": "uvx",
      "args": ["mcp-server-sqlite", "--db-path", "./adonis.db"]
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    },
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    },
    "fetch": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch"]
    },
    "desktop-commander": {
      "command": "npx",
      "args": ["-y", "@wonderwhy-er/desktop-commander"]
    }
  }
}
```

## Built-in Claude Code Tools — Use These

### WebSearch & WebFetch

Use proactively when working on features that integrate with external APIs or libraries. Look up current Anthropic API docs before implementing food parsing, AI Coach, photo logging, or weekly reports. Search for framework best practices, SQLite JSON storage patterns, and nutrition data references.

### Task Management (TaskCreate, TaskList, TaskGet, TaskUpdate)

ADONIS has a 21-item phased build roadmap. Break each phase into trackable tasks with `blockedBy` dependencies before starting implementation. Mark tasks `in_progress` when starting, `completed` when done, and use `TaskList` to find the next unblocked task.

### EnterPlanMode

Use before starting any non-trivial implementation: framework selection, database migration strategy, AI Coach architecture, food parsing pipeline design, and adaptive dashboard component structure.

## Build Priorities

**MVP (Phase 1):** DB schema + seed data, dashboard with sobriety counter/streaks/adaptive widgets, daily log form, natural language food logging, daily nutrition dashboard with live macro totals, body metrics/weight tracking, AI Coach chat, lab tracker with seed data.

**Phase 2:** Favorite meals, workout logging, meal suggestions, supplement checklist, sleep log, weekly intelligence reports.

**Phase 3:** Photo-based food logging, adaptive training/nutrition/goals, trends & analytics, nutrition insights, grocery/meal prep suggestions, settings/export/backup.
