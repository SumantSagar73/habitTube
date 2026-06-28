# HabitTube

A full-stack habit tracking and goal management web app built with React 19, Supabase, and an AI coaching layer. Designed to help users build consistent routines through a structured Year → Day goal cascade, real-time sync, and actionable AI-driven insights.

**Live demo:** _add your deployment URL here_

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, Tailwind CSS 4 |
| Backend / DB | Supabase (PostgreSQL + Realtime) |
| AI | Groq API (LLaMA) via dev-proxy middleware |
| Charts | Recharts |
| Export | SheetJS (xlsx) |
| PWA | Web App Manifest + Service Worker |

---

## Key Features

- **5-Level Goal Cascade** — Year → Quarter → Month → Week → Day planning with hybrid rollup scoring
- **AI Coach** — conversational habit coach powered by Groq/LLaMA; streamed responses via Vite proxy
- **AI Insights Dashboard** — automated analysis of streaks, completion rates, and goal alignment
- **Focus Timer** — Pomodoro-style timer tied to daily goals
- **Heatmap & Activity Charts** — GitHub-style contribution heatmap + Recharts-based trend graphs
- **Achievements System** — milestone badges unlocked by streak and completion data
- **Mood & Journal** — daily check-in entries stored in Supabase
- **Reminders** — browser notification reminders for habits
- **PWA / Offline** — installable on mobile, works offline with local state sync
- **Excel Export** — one-click data export via SheetJS
- **JSON Backup / Restore** — full data portability

---

## Architecture Highlights

```
src/
├── components/         # 30+ React components (views, modals, charts)
├── useStore.js         # Global state with local persistence
├── useSync.js          # Supabase realtime sync hook
├── sync.js             # Conflict resolution between local and remote state
├── ai.js               # Groq API client with streaming support
├── planUtils.js        # Goal cascade scoring and rollup logic
├── exportExcel.js      # SheetJS export utility
└── utils/supabase.js   # Supabase client config
```

- **Optimistic UI** — local state updates immediately; Supabase sync runs in the background
- **Proxy middleware** — Vite dev server proxies `/api/ai` to avoid CORS and hide the Groq key
- **Data model** — habits, goals, journal entries, and moods stored as normalized Supabase tables

---

## Getting Started

```bash
# 1. Clone
git clone https://github.com/SumantSagar73/habitTube.git
cd habitTube

# 2. Install dependencies
npm install

# 3. Set environment variables
cp .env.example .env.local
# Fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, GROQ_API_KEY

# 4. Run migrations (first time only)
node migrate.js

# 5. Start dev server
npm run dev
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `GROQ_API_KEY` | Groq API key for AI coach |

---

## Screenshots

_Add screenshots here_

---

## What I Built / Learned

- Designed and implemented a multi-level relational data model in PostgreSQL via Supabase
- Built a custom realtime sync layer with optimistic updates and conflict resolution
- Integrated a streaming LLM API behind a server-side proxy to keep credentials secure
- Architected a 30+ component React app with zero external state management libraries
- Shipped PWA features including offline support, installability, and push notifications

---

## License

MIT
