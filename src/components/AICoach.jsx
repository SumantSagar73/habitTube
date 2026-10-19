import { useEffect, useState } from 'react'
import { aiDailyMotivation } from '../ai'
import { todayKey } from '../utils'

// One-tap openers: each starts a fresh coach chat with the question already asked.
const ACTIONS = [
  { label: 'Plan my day', prompt: 'Plan my day. Pick my top 3 priorities from today’s habits and tasks and tell me what to do first.' },
  { label: 'I’m stuck', prompt: 'I’m stuck and low on energy. Give me the minimum version of today that still counts.' },
  { label: 'Adjust today', prompt: 'Adjust today’s plan realistically for the time I have left. What should I drop or move?' },
  { label: 'How am I doing?', prompt: 'How am I doing this week? Be honest and tell me the one thing to fix.' },
]

// Only one mounted instance should fire the daily generation (Today renders it for two breakpoints).
let autoRanFor = null

// The coach, front and centre on Today: today's read on your day + one-tap ways in.
export default function AICoach({ enabled, model, motivation, habits, completions, tasks, goals, onSave, onOpenCoach }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const today = todayKey()
  const fresh = motivation?.date === today

  async function generate() {
    setLoading(true)
    setError('')
    try {
      const text = await aiDailyMotivation({ habits, completions, tasks, goals }, model)
      onSave({ date: today, text })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // auto-generate once per day
  useEffect(() => {
    if (!enabled || fresh) return
    // Deferred so the guard is only set by the instance that actually fires (StrictMode remounts).
    const t = setTimeout(() => {
      if (autoRanFor === today) return
      autoRanFor = today
      generate()
    }, 0)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, today, fresh])

  if (!enabled) return null

  return (
    <section className="glass rounded-3xl p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-sm font-extrabold text-white dark:bg-white dark:text-neutral-900">
          AI
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">Your coach says</p>
            <button
              onClick={generate}
              disabled={loading}
              className="text-xs font-semibold text-neutral-400 transition hover:text-neutral-700 disabled:opacity-50 dark:text-neutral-500 dark:hover:text-neutral-200"
            >
              {loading ? 'Thinking…' : 'Refresh'}
            </button>
          </div>
          {error ? (
            <p className="mt-2 text-sm font-medium text-neutral-500 dark:text-neutral-400">{error}</p>
          ) : loading && !motivation ? (
            <p className="mt-2 text-sm font-medium text-neutral-400 dark:text-neutral-500">Reading your day…</p>
          ) : motivation ? (
            <p className="mt-2 line-clamp-4 font-serif text-lg italic leading-snug text-neutral-800 dark:text-neutral-100">{motivation.text}</p>
          ) : (
            <p className="mt-2 text-sm font-medium text-neutral-400 dark:text-neutral-500">Your daily read will appear here.</p>
          )}

          {onOpenCoach && (
            <div className="mt-4 flex flex-wrap gap-2">
              {ACTIONS.map((a) => (
                <button
                  key={a.label}
                  onClick={() => onOpenCoach(a.prompt)}
                  className="rounded-full border border-neutral-200 px-3.5 py-1.5 text-sm font-semibold text-neutral-700 transition hover:border-[var(--accent)] hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-200 dark:hover:border-[var(--accent)] dark:hover:text-white"
                >
                  {a.label}
                </button>
              ))}
              <button
                onClick={() => onOpenCoach('')}
                className="rounded-full px-3.5 py-1.5 text-sm font-bold text-neutral-900 underline underline-offset-4 transition hover:opacity-70 dark:text-white"
              >
                Open chat →
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
