# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (required for AI features — Groq proxy only runs here)
npm run build     # Production build
npm run lint      # ESLint
npm run test:e2e  # Playwright e2e (system Edge by default; PW_CHANNEL=chrome or empty to change)
node migrate.js   # Legacy one-off: copies old local MongoDB states into Supabase (not needed for new setups)
```

Playwright e2e tests live in `tests/e2e` (`npm run test:e2e`); Supabase and the AI are mocked, see `tests/e2e/helpers.js`.

## Architecture

**Single-page React app** — no routing library. `App.jsx` owns all state and passes handlers down as props. Tab navigation (`today | plan | habits | insights | coach`) is local state; the old Calendar tab now lives in Insights → History. Heavy tab views (Plan, Insights, Calendar, Coach, Landing) are `React.lazy`-loaded.

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

### Icons

**No emoji in the UI.** Use lucide (`lucide-react`). `icons.jsx` has a registry of habit/badge icons keyed by short strings, `HabitIcon` (renders by key) and `MoodIcon`. Habits and templates store the key in the existing `emoji` field; legacy saved emoji still render through `toIconKey()`. `iconKeys.js` is the plain list used by the habit picker and AI prompts (the AI is asked for icon keys, never emoji). Header, profile menu and settings use lucide directly.

### Shell

`AppHeader` (logo, 5 tabs, sync, New menu with Habit/Goal/Arc, bell, profile menu holding Settings/Export/Manual/Theme/Sign out). Settings is `SettingsPanel`: a large dialog with a section sidebar (General, Notifications, AI coach, Data & backup, Sharing).

### Design system

Tailwind CSS 4, dark mode via the `dark` class on `<html>`. **Monochrome frosted glass**: white/black only, no accent hue. `index.css` defines (inside `@layer components`, so utilities like `border-neutral-900` can still override) `.glass` (frosted cards: translucent fill + backdrop blur), `.glass-strong` (modals, popovers, tooltips), `.glass-bar` (bottom nav), `.glow-mono` (the one high-contrast hero card) and `.app-bg` (fixed ambient glows behind the glass so the blur has something to frost). `var(--accent)` is just neutral-900/neutral-100. Primary buttons stay `neutral-900/white`. For new cards use `glass rounded-2xl p-4` instead of border + bg classes. `palette.js` `GOAL_COLORS` are the only colours (goal nodes). Today is built around `TodayHero` + `AICoach` (coach strip with one-tap openers that start a seeded chat).

## Environment variables

`.env.local` (never committed):
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
GROQ_API_KEY=...
GEMINI_API_KEY=...   # optional; enables the hosted Gemini models
```

Provider keys are server-only (no `VITE_` prefix) — loaded in `vite.config.js` via `loadEnv(..., '')` and never exposed to the browser bundle. On Vercel set `GROQ_API_KEY`, `GEMINI_API_KEY`, `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (the proxy uses the Supabase pair to verify sessions).
