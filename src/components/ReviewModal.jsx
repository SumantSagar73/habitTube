import { useState } from 'react'
import { aiReview } from '../ai'
import {
  goalPercent,
  goalsAt,
  LEVEL_LABEL,
  nextPeriodLabel,
  periodLabel,
  tasksInPeriod,
} from '../planUtils'
import { formatNice } from '../utils'
import AIText from './AIText'

export default function ReviewModal({ level, periodKey, ctx, review, aiEnabled, aiModel, onSaveReview, onCarryTask, onClose }) {
  const [aiText, setAiText] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')

  async function askAI() {
    setAiLoading(true)
    setAiError('')
    try {
      const text = await aiReview(
        {
          level,
          period: periodKey,
          goals: ctx.goals,
          tasks: ctx.tasks,
          habits: ctx.habits,
          completions: ctx.completions,
          reviews: { [periodKey]: review || {} },
        },
        aiModel
      )
      setAiText(text)
    } catch (e) {
      setAiError(e.message)
    } finally {
      setAiLoading(false)
    }
  }
  const goals = goalsAt(ctx.goals, level, periodKey)
  const unfinished = tasksInPeriod(ctx.tasks, level, periodKey).filter((t) => !t.done)
  const note = review?.note || ''
  const goalNotes = review?.goalNotes || {}
  const nextLabel = nextPeriodLabel(level, periodKey)

  function patch(p) {
    onSaveReview(periodKey, { ...review, ...p })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm dark:bg-black/60"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="animate-fade-up max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-neutral-200 bg-white p-7 shadow-2xl dark:border-neutral-800 dark:bg-[#111]">
        <div className="mb-1 flex items-start justify-between gap-3">
          <h2 className="text-xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
            {LEVEL_LABEL[level]} review
          </h2>
          <button
            onClick={onClose}
            className="rounded-full border border-neutral-200 p-2 text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-900 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-600 dark:hover:text-white"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <p className="mb-6 text-sm font-medium text-neutral-400 dark:text-neutral-500">{periodLabel(level, periodKey)}</p>

        {/* goal results + why-short reasons */}
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">
          How did your goals go?
        </h3>
        {goals.length === 0 ? (
          <p className="mb-6 rounded-2xl border border-dashed border-neutral-300 p-5 text-center text-sm font-medium text-neutral-400 dark:border-neutral-700 dark:text-neutral-500">
            No goals were set for this period.
          </p>
        ) : (
          <div className="mb-6 space-y-2.5">
            {goals.map((g) => {
              const pct = goalPercent(g, ctx)
              const hit = pct >= 100
              return (
                <div key={g.id} className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate font-bold text-neutral-900 dark:text-white">{g.title}</p>
                    <span className={`shrink-0 text-sm font-extrabold tabular-nums ${hit ? 'text-neutral-900 dark:text-white' : 'text-neutral-400'}`}>
                      {hit ? '✓ ' : ''}{pct}%
                    </span>
                  </div>
                  {!hit && (
                    <input
                      value={goalNotes[g.id] || ''}
                      onChange={(e) => patch({ goalNotes: { ...goalNotes, [g.id]: e.target.value } })}
                      placeholder="What got in the way? (the honest answer)"
                      className="mt-2.5 w-full rounded-xl border border-neutral-200 bg-transparent px-3.5 py-2 text-sm font-medium text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 dark:border-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-600 dark:focus:border-white"
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* carry-forward unfinished tasks */}
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">
          Unfinished tasks
        </h3>
        {unfinished.length === 0 ? (
          <p className="mb-6 rounded-2xl border border-dashed border-neutral-300 p-5 text-center text-sm font-medium text-neutral-400 dark:border-neutral-700 dark:text-neutral-500">
            Nothing left hanging. Clean slate. 🎉
          </p>
        ) : (
          <div className="mb-6 space-y-2">
            {unfinished.map((t) => (
              <div key={t.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-neutral-200 p-3.5 dark:border-neutral-800">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-neutral-800 dark:text-neutral-100">{t.title}</span>
                  <span className="text-xs font-medium text-neutral-400 dark:text-neutral-500">{formatNice(t.date)}</span>
                </span>
                <button
                  onClick={() => onCarryTask(t, level, periodKey)}
                  className="shrink-0 rounded-full border border-neutral-200 px-3.5 py-1.5 text-xs font-bold text-neutral-700 transition hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-200 dark:hover:border-neutral-500"
                >
                  Carry to {nextLabel} →
                </button>
              </div>
            ))}
          </div>
        )}

        {/* AI summary */}
        {aiEnabled && (
          <div className="mb-6 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
            <div className="flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-neutral-900 text-[10px] text-white dark:bg-white dark:text-neutral-900">AI</span>
                Coach summary
              </h3>
              <button
                onClick={askAI}
                disabled={aiLoading}
                className="rounded-full border border-neutral-200 px-3.5 py-1.5 text-xs font-bold text-neutral-700 transition hover:border-neutral-400 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:border-neutral-500"
              >
                {aiLoading ? 'Thinking…' : aiText ? 'Regenerate' : 'Ask AI'}
              </button>
            </div>
            {aiError ? (
              <p className="mt-3 text-sm font-medium text-neutral-500 dark:text-neutral-400">{aiError}</p>
            ) : aiText ? (
              <div className="mt-3">
                <AIText text={aiText} />
                <button
                  onClick={() => patch({ note: review?.note ? `${review.note}\n${aiText}` : aiText })}
                  className="mt-3 text-xs font-bold text-neutral-500 underline underline-offset-2 transition hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                >
                  ↓ Add to my reflection
                </button>
              </div>
            ) : (
              <p className="mt-2 text-sm font-medium text-neutral-400 dark:text-neutral-500">
                Get an honest read on how this period went and what to focus on next.
              </p>
            )}
          </div>
        )}

        {/* reflection */}
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">
          Reflection
        </h3>
        <textarea
          value={note}
          onChange={(e) => patch({ note: e.target.value })}
          rows={3}
          placeholder="What worked? What single change would make next time better?"
          className="mb-6 w-full resize-y rounded-xl border border-neutral-200 bg-transparent px-4 py-3 text-sm font-medium text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 dark:border-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-600 dark:focus:border-white"
        />

        <button
          onClick={() => {
            patch({ done: !review?.done, ratedAt: Date.now() })
          }}
          className={`w-full rounded-full py-2.5 font-semibold transition ${
            review?.done
              ? 'border border-neutral-200 text-neutral-600 hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-300'
              : 'bg-neutral-900 text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200'
          }`}
        >
          {review?.done ? 'Reopen review' : 'Mark review complete ✓'}
        </button>
      </div>
    </div>
  )
}
