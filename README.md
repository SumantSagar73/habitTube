# HabitTube

A personal system for people who have already decided to change something. HabitTube turns a decision into a time-boxed **arc**, runs the daily habits and tasks around it, and has an AI coach that plans, checks in and adapts with you.

Built for one user first (the author), so it is opinionated: monochrome, frosted glass, calm.

> The React Native companion app lives in its own repository and is ignored here (`app/`).

## What it does

| Area | What you get |
| --- | --- |
| **Today** | Greeting and one status line, week dots, **Up next** (the one thing to do now, with Mark done / Focus 25 min), habit checklist, tasks, your arc, a focus timer, the coach with one-tap openers, and a wrap-up card (mood, journal, check-in) that opens in the evening |
| **Arcs** | Name your own 1–3 month push ("Winter arc", "Exam sprint"). A short intake generates a week-by-week path, habits and your first week of tasks. Max 2 active; a quiet arc must be resumed, paused or closed before starting another |
| **Weekly check-in** | When a new arc week starts, say how last week felt and what got in the way. The coach plans the next week from your real results |
| **Arc review** | When an arc ends: numbers, an honest AI read, close it and roll into the next one |
| **Plan** | Year → Quarter → Month → Week goal cascade with rollups, daily tasks, reviews |
| **Habits** | Scheduling, streaks, freeze days, miss reasons (strict mode), templates |
| **Coach** | Streaming chat that knows your habits, goals, arcs and check-ins; proposes plans you confirm with one click |
| **Insights** | Overview, Habits, Goals, History (the month calendar) and Focus views: trends, heatmaps, goal progress, mood overlay |
| **Focus blocker** | MV3 browser extension (`extension/`) that blocks non-allowlisted sites during a focus session |
| **Platform** | Offline-first PWA, reminders, JSON backup/restore, point-in-time snapshots, public profile |

## Quick start

```bash
npm install
cp .env.example .env.local   # or create it — see below
npm run dev                  # http://localhost:5173
```

`.env.local` (never committed):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
GROQ_API_KEY=...
GEMINI_API_KEY=...        # optional: enables the hosted Gemini models
```

Provider keys have no `VITE_` prefix, so they are read only by the dev server / Vercel function and never reach the browser bundle.

### Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Dev server, including the AI proxy |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Playwright end-to-end suite (see below) |

## Architecture

Single-page React 19 + Vite + Tailwind 4 app, with lucide icons (no emoji in the UI). No router: `App.jsx` owns all state and passes handlers down; tabs are local state. Heavy views (Plan, Insights, Calendar, Coach, Landing) are lazy-loaded.

```
src/
  App.jsx            all state + handlers, tab shell, modals
  useStore.js        one big object in localStorage (habittube-data-v1)
  useSync.js         offline-first sync to Supabase (last write wins)
  ai.js              chat/stream, arc + weekly + review generators, proposal parsing
  byok.js            bring-your-own-key provider config (kept out of synced data)
  arcs.js            arc model: plan normalizing, week stats, patches, staleness
  planUtils.js       goal cascade + rollups
  components/        Today, Plan, Arc*, Coach*, Settings, ...
api/ai.js            Vercel edge proxy for hosted AI
extension/           HabitTube Focus (MV3)
supabase/            SQL for snapshots + RLS
tests/e2e/           Playwright suite
```

### State and sync

State is a single object persisted to `localStorage`; shape documented in `DEFAULT_DATA` (`useStore.js`). Mutations use `setData(d => ({ ...d, ... }))`.

Sync is offline-first and last-write-wins: on login pull Supabase and adopt the remote copy if newer, then debounce-push the whole blob (table `states`, keyed by the Supabase auth user id). Daily snapshots go to `state_snapshots` for restore.

**Row-level security matters.** Run [`supabase/state_snapshots.sql`](supabase/state_snapshots.sql) and make sure `states` has an `auth.uid()`-scoped policy too, otherwise any key holder can read every user's data.

### AI

- **Hosted**: the app calls `/ai/chat/completions`. Locally that is a Vite middleware; in production it is `api/ai.js`, which requires a Supabase session, allowlists models, caps tokens and rate-limits per user. The upstream (Groq or Gemini, both OpenAI-compatible) is chosen from the model id. Keep the model lists in `ai.js`, `api/ai.js` and `vite.config.js` in sync.
- **Bring your own key**: Settings → AI. Gemini, OpenAI, Groq or OpenRouter. The key is stored only in this browser's localStorage and requests go straight to the provider. Models are listed from the provider's `/models` endpoint with your key, or typed.
- **Cheap on tokens**: plans use a compact array schema, only week 1 is generated up front, later weeks are planned at the weekly check-in, and truncated plans keep every complete item.

### Arcs in one paragraph

An arc is stored in `data.arcs`. Applying a generated plan creates a month goal (under the current quarter goal if there is one), a week goal, habits and first-week tasks, all tagged with `arcId`. Staleness is computed from real activity (habit completions, ticked tasks) rather than stored. Each arc remembers its intake (`meta`), weekly check-ins and final review.

## Testing

```bash
npm run test:e2e
```

The suite drives the real app in a browser with **Supabase and the AI fully mocked** (`tests/e2e/helpers.js`): a fake session is injected, REST calls are intercepted, and the dev server is started with a dummy Supabase URL so nothing touches a real project. It covers the landing page, Today hero and coach, coach quick actions, settings toggles and BYOK storage, the arc flow and the evening check-in.

It uses the system Edge by default. On another machine set `PW_CHANNEL=chrome`, or `PW_CHANNEL=` and run `npx playwright install chromium`.

## Deploying

Vercel. Set `GROQ_API_KEY`, `GEMINI_API_KEY`, `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (the proxy uses the Supabase pair to verify sessions). `vercel.json` rewrites `/ai/*` to the edge function. CI (`.github/workflows/ci.yml`) runs lint and build on every push and PR.

## Focus blocker extension

See [`extension/README.md`](extension/README.md). It only talks to `localhost` and `habit-tube.vercel.app` by default; add your own domain to `content_scripts.matches` if you deploy elsewhere.

## Design

Monochrome, frosted glass, dark-first with a light theme. Cards use `.glass` (translucent fill + backdrop blur over fixed ambient glows), floating UI uses `.glass-strong`, and the hero stat card is the one high-contrast block. No accent colour; the goal-tree colours in `palette.js` are the only hues.
