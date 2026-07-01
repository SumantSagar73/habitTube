# HabitTube

A full-stack habit and goal tracking system — built as a **web app** (React + Vite, deployed) and a **React Native mobile app** (Expo), sharing the same Supabase backend and business logic.

---

## Table of Contents

1. [What is HabitTube?](#what-is-habittube)
2. [Monorepo Structure](#monorepo-structure)
3. [System Architecture](#system-architecture)
4. [Web App — How It Works](#web-app--how-it-works)
   - [State Layer](#state-layer-usestorejs)
   - [Sync Layer](#sync-layer-usesyncjs--syncjs)
   - [AI Layer](#ai-layer-aijs)
   - [Goal Cascade](#goal-cascade-planutilsjs)
   - [Focus Timer](#focus-timer)
   - [Groq Proxy](#groq-proxy-viteconfigjs)
5. [Mobile App — How It Works](#mobile-app--how-it-works)
   - [Key Differences from Web](#key-differences-from-web)
   - [Navigation](#navigation-expo-router)
   - [Shared Logic](#shared-logic)
6. [Feature Deep-Dives](#feature-deep-dives)
   - [Habit Scheduling & Streaks](#habit-scheduling--streaks)
   - [Goal Cascade (Year → Week)](#goal-cascade-year--week)
   - [AI Coach](#ai-coach)
   - [Insights & Analytics](#insights--analytics)
   - [XP & Achievements](#xp--achievements)
   - [Settings & Sync](#settings--sync)
7. [Database Schema](#database-schema)
8. [Environment Variables](#environment-variables)
9. [Running Locally](#running-locally)
10. [Tech Stack](#tech-stack)

---

## What is HabitTube?

HabitTube is a personal productivity system built around three ideas:

1. **Habits are the mechanism** — daily actions you commit to and track
2. **Goals are the why** — a 4-level cascade (Year → Quarter → Month → Week) that keeps daily actions connected to long-term ambitions
3. **Accountability is the fuel** — strict-mode miss tracking, AI coaching, streaks, and an XP/badge system that makes progress visible

It is intentionally **monochrome** — no colorful gradients, no gamification gimmicks. White on black.

---

## Monorepo Structure

```
habittube/                        ← monorepo root (= the web git repo)
├── src/                          ← web app source
│   ├── components/               ← 40+ React components
│   ├── App.jsx                   ← root: all state, all handlers
│   ├── useStore.js               ← localStorage state hook
│   ├── useSync.js                ← Supabase sync hook
│   ├── sync.js                   ← pullState / pushState
│   ├── ai.js                     ← Groq API calls
│   ├── planUtils.js              ← goal cascade logic
│   ├── utils.js                  ← date helpers, streak math
│   └── achievements.js           ← XP + badge engine
├── vite.config.js                ← Groq proxy middleware lives here
├── migrate.js                    ← Supabase table setup script
├── app/                          ← React Native app (own git repo)
│   ├── app/
│   │   ├── _layout.jsx           ← root layout: store + sync context
│   │   └── (tabs)/
│   │       ├── index.jsx         ← Today screen
│   │       ├── habits.jsx        ← Habits screen
│   │       ├── plan.jsx          ← Plan screen
│   │       ├── insights.jsx      ← Insights screen (4 sub-tabs)
│   │       └── settings.jsx      ← Settings screen
│   └── src/
│       ├── models/               ← utils.js, planUtils.js, achievements.js (ported)
│       ├── services/             ← ai.js, sync.js, supabase.js (ported)
│       └── store/                ← useStore.js, useSync.js, StoreContext.js
└── .gitignore                    ← app/ excluded from web git
```

The two projects share the same Supabase project and the same data schema. The mobile `app/` folder is in `.gitignore` so the web git history stays clean. Each is its own git repo.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                        │
│                                                         │
│  Web (React + Vite)          Mobile (Expo React Native) │
│  ┌──────────────┐            ┌──────────────────────┐   │
│  │  App.jsx     │            │  app/_layout.jsx     │   │
│  │  (root state)│            │  (StoreContext)       │   │
│  └──────┬───────┘            └──────────┬───────────┘   │
│         │ useState                      │ useState       │
│  ┌──────▼───────┐            ┌──────────▼───────────┐   │
│  │ useStore.js  │            │ useStore.js           │   │
│  │ localStorage │            │ AsyncStorage          │   │
│  └──────┬───────┘            └──────────┬───────────┘   │
│         │ debounced 1.2s                │ debounced 1.2s │
│  ┌──────▼───────┐            ┌──────────▼───────────┐   │
│  │ useSync.js   │            │ useSync.js            │   │
│  └──────┬───────┘            └──────────┬───────────┘   │
└─────────┼───────────────────────────────┼───────────────┘
          │                               │
          ▼                               ▼
┌─────────────────────────────────────────────────────────┐
│                    SUPABASE (Backend)                    │
│                                                         │
│   Table: states                                         │
│   ┌─────────────┬──────────────┬──────────────────┐    │
│   │  userId     │  state (json)│  updatedAt (int) │    │
│   │  u_abc123   │  { habits,   │  1751234567890   │    │
│   │             │    goals,    │                  │    │
│   │             │    tasks...} │                  │    │
│   └─────────────┴──────────────┴──────────────────┘    │
└─────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────┐
│                    AI LAYER (Groq)                       │
│                                                         │
│  Web: Vite dev-server proxy (/groq/*) hides the key     │
│  Mobile: direct fetch to api.groq.com (key in env)      │
│                                                         │
│  Models: LLaMA 3.3 70B (coach / insights)               │
│          LLaMA 3.1 8B  (daily motivation)               │
└─────────────────────────────────────────────────────────┘
```

**Key design decisions:**

| Decision | Why |
|---|---|
| Single JSON blob in Supabase | No schema migrations needed as features grow. The whole app state is one upsert. |
| Last-write-wins by timestamp | Simple enough for a single-user app. `updatedAt` is set client-side at push time. |
| localStorage / AsyncStorage as primary | App works fully offline. Supabase sync is best-effort. |
| No auth | User identified by a random ID in local storage (`u_` + random). Sharing that ID across devices syncs data. |
| Groq proxy in Vite middleware | `GROQ_API_KEY` never leaves the server in the web build. The mobile app calls Groq directly with `EXPO_PUBLIC_` env (acceptable for dev; production would need a proxy). |

---

## Web App — How It Works

### State Layer (`useStore.js`)

The entire app state lives in one React `useState` hook. Every field has a default in `DEFAULT_DATA`:

```js
// from src/useStore.js
const DEFAULT_DATA = {
  habits: [],
  completions: {},    // { "2026-07-01": ["habitId1", "habitId2"] }
  tasks: {},          // { "2026-07-01": [{ id, title, done, goalId }] }
  goals: [],          // [{ id, level, period, parentId, title, type, ... }]
  focusLog: [],       // [{ date, minutes, goalId, label }]
  moods: {},          // { "2026-07-01": 3 }  (1–5 scale)
  theme: 'dark',
  aiEnabled: true,
  // ... 20 more fields
}
```

Every mutation in `App.jsx` uses the functional update pattern to avoid stale closures:

```js
// toggling a habit completion in App.jsx
setData(d => {
  const prev = d.completions[key] || []
  const next = prev.includes(id)
    ? prev.filter(x => x !== id)
    : [...prev, id]
  return { ...d, completions: { ...d.completions, [key]: next } }
})
```

A `useEffect` persists to `localStorage` on every `data` change:

```js
// from src/useStore.js
useEffect(() => {
  localStorage.setItem('habittube-data-v1', JSON.stringify(data))
}, [data])
```

---

### Sync Layer (`useSync.js` + `sync.js`)

**On mount:** pull from Supabase. If remote `updatedAt` is newer than the local timestamp, adopt the remote state:

```js
// from src/useSync.js
const remote = await pullState(resolvedId)
const localUpdated = Number(localStorage.getItem('habittube-updated-at') || 0)
if ((remote.updatedAt || 0) > localUpdated) {
  setData(d => ({ ...d, ...remote.state }))
  localStorage.setItem('habittube-updated-at', String(remote.updatedAt))
}
```

**On every change:** debounce 1.2 seconds, then push the whole state blob:

```js
// from src/useSync.js
const t = setTimeout(async () => {
  const updatedAt = Date.now()
  await pushState(userIdRef.current, data, updatedAt)
  setStatus('synced')
}, 1200)
```

**Sync status** (`offline | syncing | synced`) is shown in the header so the user always knows if their data is saved.

The sync client (`sync.js`) is a thin Supabase wrapper:

```js
// from src/sync.js
export async function pushState(userId, state, updatedAt) {
  return supabase
    .from('states')
    .upsert({ userId, state, updatedAt }, { onConflict: 'userId' })
    .select().single()
}
```

---

### AI Layer (`ai.js`)

Three types of AI features, all powered by Groq's LLaMA models:

**1. Daily motivation** — a 2-3 sentence nudge, generated once and cached in the store:
```js
// from src/ai.js — uses fast 8B model, just needs a quick sentence
export async function aiDailyMotivation(habits, completions, goals, ...) {
  return chat([{ role: 'user', content: `Habits: ${names}. Give me a nudge.` }], MODELS.fast)
}
```

**2. Insights** — structured markdown analysis of what's working and what's slipping:
```js
// from src/ai.js — uses smart 70B model for pattern reasoning
// Returns markdown with three sections:
// "What's working", "What's slipping", "Try this"
export async function aiInsights(habits, completions, goals, tasks, missNotes, moods) { ... }
```

**3. Coach chat** — a persistent conversation with a strict "1% improvement coach" persona:
```js
// from src/ai.js
const COACH_SYSTEM = `You are a 1% improvement coach — scope-limited to habits and goals only.
When proposing a plan, output a JSON block inside triple backticks like:
\`\`\`json
{"plan": [{"type": "habit"|"goal", "title": "...", "days": [0-6]}]}
\`\`\``
```

When the coach proposes a plan, `parseProposal()` strips the JSON from the chat bubble and the UI shows a confirm/reject card. On confirm, `applyPlan()` in `App.jsx` writes the goals and habits directly into the store.

---

### Goal Cascade (`planUtils.js`)

Goals have 4 levels: `year → quarter → month → week`. Each goal has a `period` key:

| Level | Period key | Meaning |
|---|---|---|
| `year` | `"2026"` | Goal for all of 2026 |
| `quarter` | `"2026-Q3"` | Goal for Jul–Sep 2026 |
| `month` | `"2026-07"` | Goal for July 2026 |
| `week` | `"2026-W27"` | ISO week 27 of 2026 |

**Progress rollup** (`goalPercent`) — children average upward:

```js
// from src/planUtils.js
export function goalPercent(goal, ctx, memo = new Map()) {
  if (goal.manualPct != null) return goal.manualPct   // manual override wins

  if (goal.type === 'numeric')
    return clamp((goal.current / goal.target) * 100)  // e.g. 8/10 books = 80%

  if (goal.type === 'habit')
    return clamp((habitCompletionsInPeriod(...) / goal.habitTarget) * 100)

  // checklist type: average children + linked tasks
  const children = ctx.goals.filter(g => g.parentId === goal.id)
  const linkedTasks = /* all tasks where t.goalId === goal.id */
  const parts = [
    ...children.map(c => goalPercent(c, ctx, memo)),
    ...linkedTasks.map(t => t.done ? 100 : 0),
  ]
  return parts.reduce((a, b) => a + b, 0) / parts.length
}
```

So a Year goal's percentage = average of its Quarter children → average of Month children → average of Week tasks. The rollup is memoized to avoid recomputing shared children.

Period keys are computed deterministically from any `Date`:

```js
// from src/planUtils.js
periodKeys(new Date("2026-07-01"))
// → { year: "2026", quarter: "2026-Q3", month: "2026-07", week: "2026-W27" }
```

---

### Focus Timer

Timer state lives entirely in `App.jsx` as local React state — it is **not** persisted to the store. A page refresh resets it. This is intentional: a timer is a live session, not saved history.

```js
// from App.jsx — timer uses wall-clock time, not a countdown variable
const [focus, setFocus] = useState({
  running: false, paused: false,
  endsAt: null,   // epoch ms when the session ends
  goalId: null,   label: '',
})

// recomputed every second
remaining = Math.max(0, (focus.endsAt - Date.now()) / 1000)
```

Using `endsAt` instead of a countdown means the timer is accurate even when the tab is backgrounded. When a session finishes, it pushes to `data.focusLog`:

```js
setData(d => ({
  ...d,
  focusLog: [...d.focusLog, { date: todayKey(), minutes: 25, goalId, label }]
}))
```

---

### Groq Proxy (`vite.config.js`)

`GROQ_API_KEY` must never reach the browser. A custom Vite dev-server middleware intercepts `/groq/*` requests:

```js
// from vite.config.js — runs server-side only
server.middlewares.use('/groq', (req, res) => {
  const upstream = await fetch('https://api.groq.com/openai/v1' + req.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },  // key injected here
    body,
  })
  // SSE streaming piped straight through to the browser
  Readable.fromWeb(upstream.body).pipe(res)
})
```

The browser calls `/groq/chat/completions` — it never sees the key. The pipe also handles SSE streaming so the coach chat streams tokens in real-time.

> **Important:** This proxy only runs with `npm run dev`. `npm run build` does not include it — AI features are dev-only on the web app.

---

## Mobile App — How It Works

### Key Differences from Web

| Concern | Web | Mobile |
|---|---|---|
| Storage | `localStorage` | `AsyncStorage` (async) |
| AI calls | Via Vite proxy → Groq | Direct `fetch` to `api.groq.com` |
| State sharing | Props drilled from `App.jsx` | `StoreContext` (React Context) |
| Navigation | `tab` state in `useState` | Expo Router file-based tabs |
| Theme | `dark` class on `<html>` | `backgroundColor` in `StyleSheet` |
| Store loading | Synchronous | Async — returns `ready` flag |

Because `AsyncStorage` is async, the mobile `useStore.js` returns a `ready` flag. The root layout shows a spinner until ready:

```js
// from app/src/store/useStore.js
export default function useStore() {
  const [data, setData] = useState(DEFAULT_DATA)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem('habittube-data-v1')
      .then(raw => setData(raw ? { ...DEFAULT_DATA, ...JSON.parse(raw) } : DEFAULT_DATA))
      .finally(() => setReady(true))
  }, [])

  return [data, setData, ready]
}
```

---

### Navigation (Expo Router)

Expo Router uses the filesystem as the route definition. The `(tabs)` folder name is a route group — it doesn't appear in the URL:

```
app/
  _layout.jsx          ← wraps everything in StoreContext.Provider
  (tabs)/
    _layout.jsx        ← defines the 5 tab bar items with icons
    index.jsx          ← Today  (route: /)
    habits.jsx         ← Habits (route: /habits)
    plan.jsx           ← Plan   (route: /plan)
    insights.jsx       ← Insights (route: /insights)
    settings.jsx       ← Settings (route: /settings)
```

All screens share state through context rather than props:

```js
// app/_layout.jsx — provides store to the whole app
<StoreContext.Provider value={{ data, setData, syncStatus }}>
  <Stack screenOptions={{ headerShown: false }} />
</StoreContext.Provider>

// any screen — reads store directly
const { data, setData } = useStoreContext()
```

---

### Shared Logic

These files are **identical in logic** between web and mobile (only import paths differ):

| File | What it does | Why unchanged |
|---|---|---|
| `models/utils.js` | Date math, streak calc, habit scheduling | Pure JS — no DOM or RN APIs |
| `models/planUtils.js` | Goal cascade, period keys, rollup math | Pure JS |
| `models/achievements.js` | XP calculation, 15 badge definitions | Pure JS |

Example: `currentStreak` runs identically on both platforms:

```js
// from src/models/utils.js (mobile) = src/utils.js (web)
export function currentStreak(habit, completions) {
  let streak = 0
  let d = new Date()
  for (let i = 0; i < 3700; i++) {
    const key = dateKey(d)
    if (key < habit.createdAt) break
    if (isScheduled(habit, d)) {
      if (isDone(habit, completions, key)) streak++
      else if (i > 0) break      // past gap → streak ends
      // i === 0 means today is still pending → don't break
    }
    d = addDays(d, -1)
  }
  return streak
}
```

---

## Feature Deep-Dives

### Habit Scheduling & Streaks

Each habit stores a `days` array (0 = Sunday … 6 = Saturday):

```js
// A habit scheduled Monday–Friday
{ id: "abc", name: "Read", emoji: "📚", days: [1, 2, 3, 4, 5], createdAt: "2026-01-01" }
```

`habitsForDate` filters by both `days` and `createdAt` so habits don't appear on dates before they were created:

```js
// from src/utils.js
export function habitsForDate(habits, date) {
  const key = dateKey(date)
  return habits.filter(h => h.createdAt <= key && isScheduled(h, date))
}
```

Completions are stored as an array of IDs per date key:

```js
completions = {
  "2026-07-01": ["abc", "def"],   // two habits done
  "2026-07-02": ["abc"],          // one habit done
}
```

**Strict mode:** if you missed habits yesterday and haven't explained why, today's checklist is blurred and locked:

```js
// from src/components/TodayView.jsx
const unexplained = yMissed.filter(h => !(missNotes[h.id]?.[yKey] || '').trim())
const locked = unexplained.length > 0
```

The user must write a reason or mark the habit as "Did it" before today unlocks. Quick-pick presets (`'Lack of time'`, `'Too tired'`, `'Forgot'`, etc.) speed this up.

---

### Goal Cascade (Year → Week)

Every goal knows its level, period, and optional parent:

```js
// Example: "Get fit" goal tree
[
  { id: "g1", level: "year",    period: "2026",    parentId: null, title: "Get fit",  type: "checklist" },
  { id: "g2", level: "quarter", period: "2026-Q3", parentId: "g1", title: "Run 50km", type: "numeric", target: 50, current: 12 },
  { id: "g3", level: "month",   period: "2026-07", parentId: "g2", title: "Run 18km", type: "numeric", target: 18, current: 5  },
]
// goalPercent("g1") = average([goalPercent("g2"), ...])
//                   = average([24%, ...]) = 24%
// goalPercent("g2") = 12/50 = 24%
// goalPercent("g3") = 5/18  = 28%
```

A goal can also be **type: "habit"** — it tracks how many times a specific habit was completed within the period vs. a target count:

```js
// "Run 3x this week" goal
{ type: "habit", habitId: "run-habit-id", habitTarget: 3, level: "week", period: "2026-W27" }
// progress = habitCompletionsInPeriod(habit, completions, "week", "2026-W27") / 3
```

---

### AI Coach

The coach system prompt defines the persona and output format:

```js
// from src/ai.js
const COACH_SYSTEM = `You are a 1% improvement coach — scope-limited to habits and goals only.
Be direct, warm, specific. When proposing a plan, output:
\`\`\`json
{"plan": [{"type": "habit"|"goal", "title": "...", "days": [0-6], "level": "week"|"month"|"year"}]}
\`\`\``
```

Before every message, `buildCoachContext` assembles a live snapshot of the user's data so the AI has full context:

```js
// from src/ai.js
export function buildCoachContext(data) {
  return `
Habits: ${habits.map(h => `${h.emoji} ${h.name} (${rate}% 30d)`).join(', ')}
Active goals: ${goals.map(g => g.title).join(', ')}
Today: ${doneCount}/${totalDue} habits done
Recent misses and reasons: ${...}
  `
}
```

When the AI proposes a plan, `parseProposal()` extracts the JSON block:

```js
// from src/ai.js
export function parseProposal(text) {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (!match) return { clean: text, proposal: null }
  const proposal = JSON.parse(match[1])
  const clean = text.replace(/```[\s\S]*?```/, '').trim()
  return { clean, proposal }  // clean = text to show, proposal = plan to confirm
}
```

The UI strips the JSON from the chat bubble and shows a "Apply plan / Reject" card instead.

---

### Insights & Analytics

The Insights tab has 4 sub-tabs:

**Overview**
- XP level bar (level = floor(totalXP / 250) + 1)
- 15-badge achievement grid (earned vs. locked with progress)
- 14-day mood strip

**Habits**
- 7-day completion bar chart (% of scheduled habits done each day)
- 30-day scoreboard per habit (sorted by completion rate)
- Best day of week analysis (90-day lookback, which weekday you complete the most)
- Streak leaderboard (top 5 habits with active streaks)
- Habit pairs — habits you most often complete together (60-day co-occurrence):

```js
// from app/app/(tabs)/insights.jsx
for (let i = 0; i < habits.length; i++) {
  for (let j = i + 1; j < habits.length; j++) {
    let both = 0
    for (let d = 0; d < 60; d++) {
      const dk = dateKey(addDays(new Date(), -d))
      if (isDone(habits[i], completions, dk) && isDone(habits[j], completions, dk))
        both++
    }
    if (both >= 5)
      results.push({ a: habits[i], b: habits[j], rate: Math.round(both / 60 * 100) })
  }
}
```

**Goals**
- Progress by horizon (year/quarter/month/week averages)
- All goals with individual progress bars and numeric values

**Focus**
- Total minutes and session count
- 7-day focus bar chart
- Full session history (last 15 sessions)

---

### XP & Achievements

XP is computed on-the-fly from raw data every render — nothing is stored:

```js
// from src/achievements.js
const xp =
  totalCheckins  * 10  +  // every habit check-off
  goalsCompleted * 150 +  // completing any goal to 100%
  perfectDays    * 20  +  // days where ALL scheduled habits were done
  reviewsDone    * 40  +  // completing a period review
  focusSessions  * 15  +  // finishing a focus timer session
  moodsLogged    * 5      // logging a daily mood

const level = Math.floor(xp / 250) + 1
```

15 badges from beginner to elite:

| Badge | Icon | Unlock condition |
|---|---|---|
| First step | 🌱 | Create 1 habit |
| Getting going | ✅ | 10 total checkins |
| Centurion | 💯 | 100 checkins |
| Unstoppable | 🚀 | 500 checkins |
| On fire | 🔥 | 7-day streak |
| Locked in | 🌟 | 30-day streak |
| Centenarian | 👑 | 100-day streak |
| Perfect day | ⭐ | One 100% day |
| Ten out of ten | ✨ | Ten 100% days |
| Goal crusher | 🏆 | Complete a goal |
| Consistent | 📅 | Active 30 days |
| Mindful | 🧘 | Log mood 7 times |
| Deep worker | ⏱️ | 5 focus sessions |

Locked badges show `current/target` progress so you always know what's next.

---

### Settings & Sync

**Cross-device sync** — share your user ID to sync across devices:

```js
// from src/sync.js — ID is a random string, generated once
export function getUserId() {
  let id = localStorage.getItem('habittube-user-id')
  if (!id) {
    id = 'u_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem('habittube-user-id', id)
  }
  return id
}
// Example ID: u_3k9m2x1q8b2026abc
// Paste this into another device's Settings → Sync → "Use a different ID"
```

**Data backup** — exports the entire `data` object as a timestamped JSON file. Restore validates the structure before replacing state:

```js
// from src/components/SettingsModal.jsx
const parsed = JSON.parse(raw)
if (!parsed.habits || !parsed.completions)
  throw new Error('Not a valid HabitTube backup')
setData(d => ({ ...d, ...parsed }))
```

**AI settings** — toggle AI on/off, choose the model, test the Groq connection with a single call.

**Theme** — `light`, `dark`, or `auto`. Auto follows `prefers-color-scheme` on web and system theme on mobile.

---

## Database Schema

One table. One row per user.

```sql
-- from migrate.js
CREATE TABLE states (
  "userId"    TEXT PRIMARY KEY,
  state       JSONB NOT NULL,
  "updatedAt" BIGINT NOT NULL DEFAULT 0
);
```

The `state` column holds the entire app state as JSONB:

```json
{
  "habits":      [{ "id": "abc", "name": "Read", "emoji": "📚", "days": [1,2,3,4,5], "createdAt": "2026-01-01" }],
  "completions": { "2026-07-01": ["abc"] },
  "goals":       [{ "id": "g1", "level": "year", "period": "2026", "title": "Get fit", "type": "checklist" }],
  "tasks":       { "2026-07-01": [{ "id": "t1", "title": "Gym", "done": false, "priority": "high" }] },
  "focusLog":    [{ "date": "2026-07-01", "minutes": 25, "label": "Deep work", "goalId": "g1" }],
  "moods":       { "2026-07-01": 4 },
  "notes":       { "2026-07-01": "Good day overall." },
  "missNotes":   { "habitId": { "2026-06-30": "Was travelling" } },
  "reviews":     { "2026-Q2": { "done": true, "note": "Solid quarter", "ratedAt": 1751234567 } },
  "theme":       "dark",
  "aiEnabled":   true,
  "aiModel":     "llama-3.3-70b-versatile"
}
```

---

## Environment Variables

### Web (`habittube/.env.local`)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
GROQ_API_KEY=gsk_...        # server-only — never exposed to the browser
```

### Mobile (`habittube/app/.env.local`)
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
EXPO_PUBLIC_GROQ_API_KEY=gsk_...     # bundled into app — use a proxy for production
```

Both apps connect to the **same Supabase project**. The mobile app uses `EXPO_PUBLIC_` prefix so Expo exposes the values at runtime.

---

## Running Locally

### Web

```bash
cd habittube
npm install
npm run dev          # http://localhost:5173
```

First-time Supabase setup (creates the `states` table):
```bash
node migrate.js
```

AI features require `GROQ_API_KEY` in `.env.local` and the dev server running. They do **not** work with `npm run build`.

### Mobile

```bash
cd habittube/app
npm install
npx expo start --clear
```

- Press `a` → Android emulator
- Press `i` → iOS simulator (macOS only)
- Scan QR with **Expo Go** on your phone (fastest for development)

Copy `.env.example` → `.env.local` and fill in your keys.

---

## Tech Stack

### Web
| Layer | Technology | Version |
|---|---|---|
| Framework | React | 19 |
| Build tool | Vite | 8 |
| Styling | Tailwind CSS | 4 |
| Charts | Recharts | 3 |
| Animations | Lottie (`@lottiefiles/dotlottie-react`) | — |
| Backend | Supabase (PostgreSQL) | — |
| AI | Groq — LLaMA 3.3 70B, LLaMA 3.1 8B | — |
| Deployment | Vercel | — |

### Mobile
| Layer | Technology | Version |
|---|---|---|
| Framework | React Native | 0.85 |
| Toolchain | Expo SDK | 56 |
| Navigation | Expo Router | 56 |
| Storage | AsyncStorage | 3 |
| Icons | @expo/vector-icons (Ionicons) | 15 |
| File access | expo-file-system + expo-sharing + expo-document-picker | — |
| Backend | Same Supabase project | — |
| AI | Groq API (direct fetch) | — |

### Shared
| Concern | Approach |
|---|---|
| Business logic | Pure JS modules (`utils.js`, `planUtils.js`, `achievements.js`) |
| Data format | Identical JSON schema on both platforms |
| Backend | Same Supabase project, same `states` table, same `userId` key |
| AI models | Same Groq API, same system prompts |
