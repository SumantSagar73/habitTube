import { useEffect, useState } from 'react'
import { fetchPublicSnapshot } from '../sync'
import { currentStreak, habitRate } from '../utils'

function Bar({ pct, label }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-semibold text-neutral-500 dark:text-neutral-400">
        <span className="truncate max-w-[70%]">{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
        <div className="h-full rounded-full bg-neutral-900 dark:bg-white transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function StatCard({ value, label }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800 dark:bg-[#111]">
      <span className="text-3xl font-extrabold tabular-nums text-neutral-900 dark:text-white">{value}</span>
      <span className="mt-1 text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">{label}</span>
    </div>
  )
}

export default function PublicProfile({ userId, onBack }) {
  const [snapshot, setSnapshot] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchPublicSnapshot(userId)
      .then((d) => {
        if (d?.snapshot) setSnapshot(d.snapshot)
        else setError('Profile not found or not public.')
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [userId])

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.origin + '?p=' + userId)
      .then(() => alert('Link copied!'))
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-[#0a0a0a]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900 dark:border-neutral-700 dark:border-t-white" />
      </div>
    )
  }

  if (error || !snapshot) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-4 dark:bg-[#0a0a0a]">
        <p className="text-base font-medium text-neutral-500 dark:text-neutral-400">{error || 'Profile not available.'}</p>
        {onBack && <button onClick={onBack} className="text-sm font-bold underline text-neutral-900 dark:text-white">← Back</button>}
      </div>
    )
  }

  const { habits = [], completions = {}, goals = [], focusLog = [], displayName } = snapshot
  const totalFocusMin = focusLog.reduce((a, s) => a + (s.minutes || 0), 0)
  const topHabits = [...habits]
    .map((h) => ({ ...h, streak: currentStreak(h, completions), rate: habitRate(h, completions) }))
    .sort((a, b) => b.streak - a.streak)
    .slice(0, 6)
  const topGoals = goals.filter((g) => g.level === 'year' || g.level === 'quarter').slice(0, 4)

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a]">
      <div className="mx-auto max-w-2xl px-4 py-10">
        {/* Header */}
        <div className="mb-10 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <svg className="h-5 w-5 text-neutral-900 dark:text-white" viewBox="0 0 24 24" fill="currentColor">
                <rect x="2" y="4" width="20" height="16" rx="3" />
                <path d="M10 8.5l6 3.5-6 3.5V8.5z" fill="white" />
              </svg>
              <span className="text-xs font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">HabitTube</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
              {displayName || 'Habit Tracker'}
            </h1>
            <p className="mt-1 text-sm font-medium text-neutral-400 dark:text-neutral-500">Public progress profile</p>
          </div>
          <button
            onClick={copyLink}
            className="flex items-center gap-2 rounded-full border border-neutral-200 px-4 py-2 text-xs font-bold text-neutral-600 transition hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
            Copy link
          </button>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-3 gap-3">
          <StatCard value={habits.length} label="Habits" />
          <StatCard value={Math.round(totalFocusMin / 60) + 'h'} label="Focus time" />
          <StatCard value={topHabits[0]?.streak || 0} label="Best streak" />
        </div>

        {/* Top habits */}
        {topHabits.length > 0 && (
          <section className="mb-8 rounded-3xl border border-neutral-200 p-6 dark:border-neutral-800 dark:bg-[#111]">
            <h2 className="mb-5 text-xs font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Habits</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {topHabits.map((h) => (
                <div key={h.id} className="flex items-center gap-3 rounded-2xl border border-neutral-100 p-3 dark:border-neutral-800">
                  <span className="text-2xl">{h.emoji}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-neutral-900 dark:text-white">{h.name}</p>
                    <p className="text-xs font-semibold text-neutral-400 dark:text-neutral-500">
                      🔥 {h.streak} · {h.rate}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Goals */}
        {topGoals.length > 0 && (
          <section className="mb-8 rounded-3xl border border-neutral-200 p-6 dark:border-neutral-800 dark:bg-[#111]">
            <h2 className="mb-5 text-xs font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Goals</h2>
            <div className="space-y-4">
              {topGoals.map((g) => {
                const pct = g.type === 'numeric' && g.target > 0
                  ? Math.min(100, Math.round((g.current / g.target) * 100))
                  : g.done ? 100 : (g.manualPct ?? 0)
                return <Bar key={g.id} pct={pct} label={`${g.title}`} />
              })}
            </div>
          </section>
        )}

        <p className="text-center text-xs font-medium text-neutral-300 dark:text-neutral-700">
          Made with HabitTube · Track your habits at habittube.app
        </p>

        {onBack && (
          <button onClick={onBack} className="mt-6 block mx-auto text-sm font-bold text-neutral-900 underline dark:text-white">
            ← Back
          </button>
        )}
      </div>
    </div>
  )
}
