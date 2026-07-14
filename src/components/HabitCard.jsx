import { useState } from 'react'
import { currentStreak } from '../utils'
import LottieStreak from './LottieStreak'

function fmt12h(timeStr) {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = ((h + 11) % 12) + 1
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

const SKIP_PRESETS = ['No time', 'Too tired', 'Forgot', 'Travelling', 'Sick']

export default function HabitCard({ habit, done, completions, onToggle, overdue, skipped, skipReason, onSkip, onUnskip }) {
  const streak = currentStreak(habit, completions)
  const [skipOpen, setSkipOpen] = useState(false)
  const [reason, setReason] = useState('')

  function confirmSkip() {
    onSkip?.(habit.id, reason.trim())
    setSkipOpen(false)
    setReason('')
  }

  return (
    <div className="group relative">
      <button
        onClick={onToggle}
        className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-200 ${
          done || skipped
            ? 'border-neutral-100 bg-neutral-50 opacity-60 dark:border-neutral-900 dark:bg-neutral-900/60'
            : 'border-neutral-200 bg-white hover:border-neutral-400 dark:border-neutral-800 dark:bg-[#111] dark:hover:border-neutral-600'
        }`}
      >
        {/* checkbox */}
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          done
            ? 'border-neutral-900 bg-neutral-900 dark:border-white dark:bg-white'
            : skipped
              ? 'border-neutral-300 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800'
              : 'border-neutral-300 group-hover:border-neutral-500 dark:border-neutral-700 dark:group-hover:border-neutral-500'
        }`}>
          {done && (
            <svg className="h-5 w-5 animate-pop text-white dark:text-neutral-900" viewBox="0 0 20 20" fill="none">
              <path d="M5 10.5l3.5 3.5L15 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {skipped && !done && <span className="text-xs text-neutral-400">—</span>}
        </span>

        <span className="text-2xl">{habit.emoji}</span>

        <span className="min-w-0 flex-1">
          <span className={`block truncate font-semibold ${done || skipped ? 'text-neutral-400 line-through dark:text-neutral-600' : 'text-neutral-900 dark:text-white'}`}>
            {habit.name}
          </span>
          {skipped && !done
            ? <span className="text-xs font-medium text-neutral-400 dark:text-neutral-500">Skipped today{skipReason ? ` · ${skipReason}` : ''}</span>
            : habit.time && (
              <span className={`text-xs font-medium ${overdue && !done ? 'text-neutral-900 underline underline-offset-2 dark:text-white' : 'text-neutral-400 dark:text-neutral-500'}`}>
                {fmt12h(habit.time)}{overdue && !done && ' · overdue'}
              </span>
            )
          }
        </span>

        {streak > 0 && !skipped && (
          <span className="shrink-0 rounded-full border border-neutral-200 px-3 py-1 text-xs font-bold text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">
            <LottieStreak size={18} />{streak}
          </span>
        )}
      </button>

      {/* Skipped → undo affordance */}
      {skipped && !done && onUnskip && (
        <button
          onClick={() => onUnskip(habit.id)}
          title="Undo skip"
          className="absolute right-2 top-2 rounded-lg border border-neutral-200 bg-white px-2 py-1 text-[11px] font-bold text-neutral-500 opacity-0 transition group-hover:opacity-100 hover:border-neutral-400 hover:text-neutral-900 dark:border-neutral-700 dark:bg-[#111] dark:hover:border-neutral-500 dark:hover:text-white"
        >
          Undo
        </button>
      )}

      {/* Overdue → skip-with-reason affordance */}
      {overdue && !done && !skipped && onSkip && (
        skipOpen ? (
          <div className="mt-2 rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-[#111]">
            <p className="mb-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
              Already missed it? Log why and skip for today.
            </p>
            <input
              value={reason}
              autoFocus
              onChange={(e) => setReason(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') confirmSkip(); if (e.key === 'Escape') setSkipOpen(false) }}
              placeholder="Reason (optional)…"
              className="w-full rounded-lg border border-neutral-200 bg-transparent px-3 py-1.5 text-sm font-medium text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 dark:border-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-600 dark:focus:border-white"
            />
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {SKIP_PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => setReason(p)}
                  className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[10px] font-semibold text-neutral-600 transition hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
                >
                  {p}
                </button>
              ))}
              <div className="ml-auto flex gap-1.5">
                <button onClick={() => setSkipOpen(false)} className="rounded-lg px-3 py-1 text-xs font-bold text-neutral-500 transition hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">Cancel</button>
                <button onClick={confirmSkip} className="rounded-lg bg-neutral-900 px-3 py-1 text-xs font-bold text-white dark:bg-white dark:text-neutral-900">Skip today</button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setSkipOpen(true)}
            title="Skip with a reason"
            className="absolute right-2 top-2 rounded-lg border border-neutral-200 bg-white px-2 py-1 text-[11px] font-bold text-neutral-500 opacity-0 transition group-hover:opacity-100 hover:border-neutral-400 hover:text-neutral-900 dark:border-neutral-700 dark:bg-[#111] dark:hover:border-neutral-500 dark:hover:text-white"
          >
            Skip
          </button>
        )
      )}
    </div>
  )
}
