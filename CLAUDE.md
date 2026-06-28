# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (required for AI features — Groq proxy only runs here)
npm run build     # Production build
npm run lint      # ESLint
node migrate.js   # Run Supabase migrations (first-time setup only)
```

There are no automated tests.

## Architecture

**Single-page React app** — no routing library. `App.jsx` owns all state and passes handlers down as props. Tab navigation (`today | plan | habits | insights | calendar`) is local state.

### State layer (`useStore.js`)

`useStore` is a plain `useState` hook over a single large object persisted to `localStorage` under the key `habittube-data-v1`. The full shape is documented in `DEFAULT_DATA` at the top of that file. All state mutations in `App.jsx` use the functional `setData(d => ({...d, ...patch}))` pattern — never direct assignment.

### Sync layer (`useSync.js` + `sync.js`)

Offline-first, last-write-wins by timestamp. On mount: pull Supabase, adopt if remote `updatedAt` is newer than `localStorage('habittube-updated-at')`. On every `data` change: debounce 1200ms, push the whole state blob to Supabase table `states` (upsert on `userId`). `userId` is a random ID persisted in `localStorage('habittube-user-id')` — there is no auth yet. `syncStatus` (`offline | syncing | synced`) is shown in the header.

### Goal cascade (`planUtils.js`)

Goals have 4 levels: `year → quarter → month → week`. Each goal has a `period` key (`"2026"`, `"2026-Q2"`, `"2026-06"`, `"2026-W25"`), a `parentId`, and either `type: "checklist"` (done/not done) or `type: "numeric"` (current/target). `goalPercent()` computes rollup: if a goal has children it averages their percentages; otherwise uses `manualPct` or `current/target`. `currentPeriods()` returns all four period keys for today's date.

### AI layer (`ai.js`)

All AI calls go to `/groq/chat/completions` — a Vite dev-server middleware in `vite.config.js` that proxies to `https://api.groq.com` and injects `GROQ_API_KEY` server-side. **AI features do not work with `npm run build` / production — they require the dev server.** Default model is `llama-3.3-70b-versatile`. Streaming uses the SSE `stream: true` path (`aiChatStream`); non-streaming (`chat()`) is a plain fetch. `parseProposal()` extracts a `{"plan":[...]}` JSON block from a coach reply and returns `{ clean, proposal }`.

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
VITE_SUPABASE_ANON_KEY=...
GROQ_API_KEY=...
```

`GROQ_API_KEY` is server-only (no `VITE_` prefix) — loaded in `vite.config.js` via `loadEnv(..., '')` and never exposed to the browser bundle.
