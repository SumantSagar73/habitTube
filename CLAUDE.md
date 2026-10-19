# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (required for AI features — Groq proxy only runs here)
npm run build     # Production build
npm run lint      # ESLint
node migrate.js   # Legacy one-off: copies old local MongoDB states into Supabase (not needed for new setups)
```

There are no automated tests.

## Architecture

**Single-page React app** — no routing library. `App.jsx` owns all state and passes handlers down as props. Tab navigation (`today | plan | habits | insights | calendar | coach`) is local state. Heavy tab views (Plan, Insights, Calendar, Coach, Landing) are `React.lazy`-loaded.

### State layer (`useStore.js`)

`useStore` is a plain `useState` hook over a single large object persisted to `localStorage` under the key `habittube-data-v1`. The full shape is documented in `DEFAULT_DATA` at the top of that file. All state mutations in `App.jsx` use the functional `setData(d => ({...d, ...patch}))` pattern — never direct assignment.

### Sync layer (`useSync.js` + `sync.js`)

Offline-first, last-write-wins by timestamp. On login: pull Supabase, adopt if remote `updatedAt` is newer than `localStorage('habittube-updated-at')`. On every `data` change: debounce 1200ms, push the whole state blob to Supabase table `states` (upsert on `userId`). `userId` is the **Supabase auth user id**; a legacy random ID in `localStorage('habittube-user-id')` is only read once to migrate old data on first login. `syncStatus` (`offline | syncing | synced`) is shown in the header. Row-level security on `states` / `state_snapshots` must scope rows to `auth.uid()` (see `supabase/state_snapshots.sql`).

### Goal cascade (`planUtils.js`)

Goals have 4 levels: `year → quarter → month → week`. Each goal has a `period` key (`"2026"`, `"2026-Q2"`, `"2026-06"`, `"2026-W25"`), a `parentId`, and either `type: "checklist"` (done/not done) or `type: "numeric"` (current/target). `goalPercent()` computes rollup: if a goal has children it averages their percentages; otherwise uses `manualPct` or `current/target`. `currentPeriods()` returns all four period keys for today's date.

### AI layer (`ai.js`, `byok.js`)

Hosted calls go to `/ai/chat/completions` (legacy `/groq/*` is an alias). Locally this is a Vite middleware in `vite.config.js`; in production it is the Vercel edge function `api/ai.js`, which requires a valid Supabase session, allowlists models, caps tokens/body size and rate-limits per user. Both pick the upstream from the model id (Groq or Gemini, OpenAI-compatible) and inject `GROQ_API_KEY` / `GEMINI_API_KEY` server-side. **Keep the model lists in `ai.js` (AI_MODELS), `api/ai.js` and `vite.config.js` in sync.** Default model is `openai/gpt-oss-120b`; the old Llama models were retired by Groq. Streaming uses SSE (`aiChatStream`); non-streaming is `chat()`, which can request JSON mode (`json: true`, retried as plain text on a 400) and a reasoning effort. `parseProposal()` extracts a `{"plan":[...]}` block from a coach reply and salvages complete items from a truncated one.

**BYOK:** Settings → AI lets a user paste their own Gemini/OpenAI/Groq/OpenRouter key. `byok.js` stores it ONLY in its own localStorage entry (never in the synced data blob) and `aiTarget()` then calls the provider directly instead of the proxy. Models are discovered from the provider's `/models` endpoint.

### Arcs (`arcs.js`, `ArcWizard`, `ArcsPanel`, `ArcCheckin`, `ArcReview`, `DayCheckin`)

An arc is a user-named 1-3 month push stored in `data.arcs`. The wizard generates a compact JSON plan; applying it creates a month goal (under the current quarter goal), a week goal, habits and week-1 tasks, all tagged with `arcId`. Max 2 active arcs; an arc quiet for 5+ days must be resumed, paused or closed before a new one starts. Each new week offers a check-in (`pendingWeek` -> `aiNextWeek`) that plans the next week from real results; finished arcs get an end review (`needsReview` -> `aiArcReview`). `data.dayCheckins` holds the evening check-ins and feeds the coach context.

### Coach system (`CoachWidget.jsx` + `CoachChat.jsx`)

`CoachWidget` is a floating button that opens `CoachChat`. Chat messages live in `data.chat.messages` (persisted in the store). When the coach proposes a plan, the JSON is stripped from the displayed text and rendered as a confirm/reject UI via `applyPlan()` in `App.jsx`, which writes goals and tasks into the store.

### Focus timer

Timer state (`focus`) lives entirely in `App.jsx` as local React state (not persisted). `endsAt` is an epoch timestamp; the interval recomputes `remaining = (endsAt - Date.now()) / 1000`. Completed sessions are pushed to `data.focusLog` (`[{ date, minutes, goalId, label }]`).

### Key utilities (`utils.js`)

- `todayKey()` / `dateKey(date)` → `"YYYY-MM-DD"` strings used as keys everywhere
- `uid()` → random ID for habits/goals/tasks
- `habitsForDate(habits, date)` → filters by `days` array (0=Sun…6=Sat)
- `isDone(habit, completions, key)` → checks `completions[key]`
- `currentStreak` / `habitRate` → streak and 30-day completion math

### Design system

Tailwind CSS 4 with dark mode via the `dark` class on `<html>`. The app is intentionally **monochrome** — `neutral-900/white` primary, no colorful gradients. `palette.js` exports `GOAL_COLORS` (the only accent colors, used for goal nodes in the plan tree).

## Environment variables

`.env.local` (never committed):
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
GROQ_API_KEY=...
GEMINI_API_KEY=...   # optional; enables the hosted Gemini models
```

Provider keys are server-only (no `VITE_` prefix) — loaded in `vite.config.js` via `loadEnv(..., '')` and never exposed to the browser bundle. On Vercel set `GROQ_API_KEY`, `GEMINI_API_KEY`, `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (the proxy uses the Supabase pair to verify sessions).
