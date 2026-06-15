import { useEffect, useRef, useState } from 'react'
import { aiDailyMotivation } from '../ai'
import { todayKey } from '../utils'

export default function AICoach({ enabled, model, motivation, habits, completions, tasks, goals, onSave, onOpenCoach }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const ranFor = useRef(null)
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
    if (!enabled) return
    if (fresh) return
    if (ranFor.current === today) return
    ranFor.current = today
    generate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, today, fresh])

  if (!enabled) return null

  return (
    <section className="rounded-3xl border border-neutral-200 p-6 dark:border-neutral-800 dark:bg-[#111]">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-neutral-900 text-[10px] text-white dark:bg-white dark:text-neutral-900">AI</span>
          Your coach
        </h3>
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400 transition hover:text-neutral-700 disabled:opacity-50 dark:text-neutral-500 dark:hover:text-neutral-200"
        >
          <svg className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" />
          </svg>
          {loading ? 'Thinking…' : 'Refresh'}
        </button>
      </div>

      {error ? (
        <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
          {error}
        </p>
      ) : loading && !motivation ? (
        <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500">Reading your day…</p>
      ) : motivation ? (
        <p className="font-serif text-xl italic leading-snug text-neutral-800 dark:text-neutral-100">{motivation.text}</p>
      ) : (
        <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500">Your daily nudge will appear here.</p>
      )}

      {onOpenCoach && (
        <button
          onClick={onOpenCoach}
          className="mt-4 text-sm font-bold text-neutral-900 underline underline-offset-4 transition hover:opacity-70 dark:text-white"
        >
          Talk to your coach →
        </button>
      )}
    </section>
  )
}
