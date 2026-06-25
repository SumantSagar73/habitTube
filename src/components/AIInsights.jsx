import { useState } from 'react'
import { aiInsights } from '../ai'
import AIText from './AIText'

export default function AIInsights({ enabled, model, cached, habits, completions, goals, tasks, missNotes, moods, onSave }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function generate() {
    setLoading(true)
    setError('')
    try {
      const text = await aiInsights({ habits, completions, goals, tasks, missNotes, moods }, model)
      onSave({ text, at: Date.now() })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (!enabled) return null

  return (
    <section className="rounded-3xl border border-neutral-200 p-6 dark:border-neutral-800 dark:bg-[#111]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-neutral-900 dark:text-white">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-neutral-900 text-[11px] font-bold text-white dark:bg-white dark:text-neutral-900">AI</span>
          Coach analysis
        </h3>
        <button
          onClick={generate}
          disabled={loading}
          className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          {loading ? 'Analyzing…' : cached ? 'Regenerate' : 'Generate insights'}
        </button>
      </div>

      {error ? (
        <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{error}</p>
      ) : cached ? (
        <AIText text={cached.text} />
      ) : (
        <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500">
          Let the AI read your streaks, completion rates and skip-reasons, then tell you what’s working and what to change.
        </p>
      )}
    </section>
  )
}
