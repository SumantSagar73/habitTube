import { useState } from 'react'
import { addDays, dateKey, isDone, isScheduled, todayKey, WEEKDAYS } from '../utils'

const WINDOW = 14 // days shown at once

export default function HabitGrid({ habits, completions, onToggleOn }) {
  const [endOffset, setEndOffset] = useState(0) // days the window-end sits before today
  const today = todayKey()
  const todayDate = new Date()

  const dates = []
  for (let i = WINDOW - 1; i >= 0; i--) dates.push(addDays(todayDate, -(endOffset + i)))

  const rangeLabel = `${dates[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${dates[
    dates.length - 1
  ].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`

  return (
    <div className="rounded-3xl border border-neutral-200 p-4 dark:border-neutral-800 dark:bg-[#111] sm:p-5">
      {/* window navigation */}
      <div className="mb-4 flex items-center justify-between gap-3 px-1">
        <p className="text-sm font-bold text-neutral-900 dark:text-white">{rangeLabel}</p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setEndOffset((o) => o + 7)}
            title="Earlier"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition hover:border-neutral-400 dark:border-neutral-800 dark:text-neutral-400"
          >
            ‹
          </button>
          <button
            onClick={() => setEndOffset((o) => Math.max(0, o - 7))}
            disabled={endOffset === 0}
            title="Later"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition hover:border-neutral-400 disabled:opacity-40 dark:border-neutral-800 dark:text-neutral-400"
          >
            ›
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-white p-2 text-left dark:bg-[#111]">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">Habit</span>
              </th>
              {dates.map((d) => {
                const key = dateKey(d)
                const isToday = key === today
                return (
                  <th key={key} className="p-1">
                    <div
                      className={`mx-auto flex w-9 flex-col items-center rounded-md py-1 ${
                        isToday ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : 'text-neutral-400 dark:text-neutral-500'
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase">{WEEKDAYS[d.getDay()][0]}</span>
                      <span className="text-xs font-bold">{d.getDate()}</span>
                    </div>
                  </th>
                )
              })}
              <th className="p-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">Done</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {habits.map((h) => {
              let doneCount = 0
              return (
                <tr key={h.id} className="group">
                  <td className="sticky left-0 z-10 bg-white py-1.5 pr-3 dark:bg-[#111]">
                    <div className="flex items-center gap-2 group-hover:opacity-100">
                      <span className="text-lg">{h.emoji}</span>
                      <span className="max-w-[150px] truncate text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                        {h.name}
                      </span>
                    </div>
                  </td>
                  {dates.map((d) => {
                    const key = dateKey(d)
                    const scheduled = key >= h.createdAt && isScheduled(h, d)
                    const future = d > todayDate && key !== today
                    const done = isDone(h, completions, key)
                    if (done) doneCount++
                    return (
                      <td key={key} className="p-1 text-center">
                        {!scheduled ? (
                          <span className="inline-block text-neutral-300 dark:text-neutral-700">·</span>
                        ) : future ? (
                          <span className="mx-auto block h-8 w-8 rounded-md border-2 border-dashed border-neutral-200 dark:border-neutral-800" />
                        ) : (
                          <button
                            onClick={() => onToggleOn(h.id, key)}
                            title={`${h.name} — ${d.toLocaleDateString()}`}
                            className={`mx-auto flex h-8 w-8 items-center justify-center rounded-md border-2 transition ${
                              done
                                ? 'border-emerald-500 bg-emerald-500'
                                : 'border-neutral-300 hover:border-emerald-400 dark:border-neutral-600 dark:hover:border-emerald-500'
                            }`}
                          >
                            {done && (
                              <svg className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="none">
                                <path d="M5 10.5l3.5 3.5L15 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </button>
                        )}
                      </td>
                    )
                  })}
                  <td className="px-2 text-center">
                    <span className="text-sm font-extrabold tabular-nums text-neutral-900 dark:text-white">{doneCount}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 px-1 text-xs font-medium text-neutral-400 dark:text-neutral-500">
        Tap any box to mark it done — it turns <span className="font-bold text-emerald-500">green</span>. Dots are rest
        days; dashed boxes are upcoming.
      </p>
    </div>
  )
}
