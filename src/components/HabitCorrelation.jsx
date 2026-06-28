import { useMemo } from 'react'
import { addDays, dateKey, habitsForDate, isDone } from '../utils'

export default function HabitCorrelation({ habits, completions }) {
  const pairs = useMemo(() => {
    if (habits.length < 2) return []
    const map = {}
    for (let i = 0; i < 60; i++) {
      const d = addDays(new Date(), -i)
      const key = dateKey(d)
      const due = habitsForDate(habits, d)
      if (due.length < 2) continue
      for (let a = 0; a < due.length; a++) {
        for (let b = a + 1; b < due.length; b++) {
          const pk = [due[a].id, due[b].id].sort().join('::')
          if (!map[pk]) map[pk] = { ha: due[a], hb: due[b], both: 0, total: 0 }
          map[pk].total++
          if (isDone(due[a], completions, key) && isDone(due[b], completions, key)) map[pk].both++
        }
      }
    }
    return Object.values(map)
      .filter((p) => p.total >= 5)
      .map((p) => ({ ...p, rate: Math.round((p.both / p.total) * 100) }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 6)
  }, [habits, completions])

  if (pairs.length === 0) return null

  return (
    <section className="rounded-3xl border border-neutral-200 p-6 dark:border-neutral-800 dark:bg-[#111]">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
          <svg className="h-4 w-4 text-neutral-600 dark:text-neutral-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="12" r="4"/><circle cx="16" cy="12" r="4"/></svg>
        </span>
        <div>
          <h3 className="text-lg font-extrabold tracking-tight text-neutral-900 dark:text-white">Habit pairs</h3>
          <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500">Co-occurrence rate, last 60 days</p>
        </div>
      </div>
      <div className="space-y-3">
        {pairs.map((p, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="min-w-0 flex-1 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
              {p.ha.emoji} {p.ha.name}{' '}
              <span className="text-neutral-300 dark:text-neutral-700">+</span>{' '}
              {p.hb.emoji} {p.hb.name}
            </span>
            <div className="flex shrink-0 items-center gap-2">
              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                <div
                  className="h-full rounded-full bg-neutral-900 dark:bg-white transition-all duration-500"
                  style={{ width: `${p.rate}%` }}
                />
              </div>
              <span className="w-8 text-right text-xs font-extrabold tabular-nums text-neutral-900 dark:text-white">
                {p.rate}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
