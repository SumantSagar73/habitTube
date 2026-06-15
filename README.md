# HabitTube ⚡

HabitTube is a premium, offline-first habit tracker, goal cascade planner, focus timer, and AI-powered life coach designed to help you build consistency and direct your life goals. 

It is built with **React**, **Vite**, **Tailwind CSS v4**, and uses **Supabase** for database synchronization, alongside **Groq** for server-side proxying of high-performance LLM coach interactions.

---

## 🚀 Key Features

*   **Offline-First & Auto-Sync:** Works completely offline using local state (`localStorage`) and a custom Service Worker. It syncs changes back to **Supabase** in the background using a document-level last-write-wins protocol.
*   **Strict Mode (Yesterday's Misses):** To keep you accountable, today's checklist remains locked until you provide written explanations for any habits missed yesterday (or retroactively check them off).
*   **AI Daily Motivation & Analytics:** Receives automated analysis of your streaks, moods, and skip reasons to deliver a direct daily motivation and concrete behavioral insights.
*   **Interactive AI Life Coach:** Talk directly with a simulated coach that reads your actual data context. It can propose cascade plans (yearly, quarterly, monthly, weekly goals) and daily tasks that you can add or update with a single click.
*   **Focus Timer:** A built-in Pomodoro deep-work timer linked to your goals, tracking your daily focus minutes.
*   **Daily Journal & Mood Tracking:** Log your daily mood with emojis and write a reflection journal entry.
*   **Achievements & Gamification:** Gain XP and rank up through your check-ins, focus minutes, perfect days, and reviews. Unlock 15 unique milestone badges.
*   **Google-style Calendar & Scheduling:** Switch between a monthly view showing habit completion bars, and a daily timeline where you can drag-and-drop tasks onto a schedule.
*   **Excel Export & Local Backup:** Download all your data as a clean Excel workbook (`.xlsx`) or export/restore raw JSON configuration backups.

---

## 🛠️ Local Setup

### 1. Prerequisites
You will need **Node.js** and **npm** installed on your system.

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env.local` file in the root of the project to add your Groq API key:
```env
# Groq API Key (Proxy server-side only; never leaked to browser bundle)
GROQ_API_KEY=your_groq_api_key_here
```

Your Supabase connection parameters are set in the `.env` file:
```env
VITE_SUPABASE_URL=https://your-supabase-url.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🗄️ Database Setup (Supabase)

To enable data synchronization across devices, you must create a `states` table in your Supabase database. Run the following SQL query in the **Supabase SQL Editor**:

```sql
-- Create states table for storing device state
create table states (
  "userId" text primary key,
  state jsonb not null,
  "updatedAt" bigint not null
);

-- Enable Row Level Security (RLS) if desired, or set public permissions
-- depending on your authentication model.
alter table states enable row level security;

-- Create policy to allow public reads and writes by userId matching
create policy "Allow public access to states"
on states for all
using (true)
with check (true);
```

> [!NOTE]
> The app uses an anonymous device-generated ID stored in `localStorage` to identify your account. You can view or change this **Sync User ID** in the app's settings menu to sync data to a new device.

---

## ⚠️ Important Note on Production Deployment

*   **Vite Dev Server Proxy:** The `/groq/` endpoints used to chat with the AI are proxied locally by the Vite server (`vite.config.js`) to secure your API key and prevent CORS errors.
*   **Hosting:** If you deploy this app as a static bundle (e.g., GitHub Pages or Netlify static hosting), **the AI features will fail** unless you host a serverless function (like Vercel Functions or Netlify Edge) to act as the backend API proxy to Groq.

---

## 📱 Installation as a PWA
HabitTube is configured as a Progressive Web App (PWA). You can install it on your desktop, iOS, or Android device by using your browser's **"Add to Home Screen"** or **"Install App"** option while viewing the site in production mode.
