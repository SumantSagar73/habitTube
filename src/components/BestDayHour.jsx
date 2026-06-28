import { useMemo } from 'react'
import { addDays, dateKey, habitsForDate, isDone } from '../utils'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function BestDayHour({ habits, completions }) {
  const byDay = useMemo(() => {
    const totals = Array(7).fill(0)
    const counts = Array(7).fill(0)
    for (let i = 0; i < 90; i++) {
      const d = addDays(new Date(), -i)
      const due = habitsForDate(habits, d)
      if (!due.length) continue
      const key = dateKey(d)
      const done = due.filter((h) => isDone(h, completions, key)).length
      totals[d.getDay()] += done / due.length
      counts[d.getDay()]++
    }
    return DAY_NAMES.map((name, i) => ({
      name,
      rate: counts[i] > 0 ? Math.round((totals[i] / counts[i]) * 100) : 0,
    }))
  }, [habits, completions])

  const maxRate = Math.max(...byDay.map((d) => d.rate), 1)
  const best = byDay.reduce((a, b) => (b.rate > a.rate ? b : a))

  return (
    <section className="rounded-3xl border border-neutral-200 p-6 dark:border-neutral-800 dark:bg-[#111]">
      <div className="mb-5 flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
          <svg className="h-4 w-4 text-neutral-600 dark:text-neutral-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>
        </span>
        <div>
          <h3 className="text-lg font-extrabold tracking-tight text-neutral-900 dark:text-white">Best day of the week</h3>
          <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500">
            Last 90 days{best?.rate > 0 && <> — strongest on <span className="font-semibold text-neutral-600 dark:text-neutral-300">{best.name}s</span></>}
          </p>
        </div>
      </div>
      <div className="flex items-end gap-1.5 h-28">
        {byDay.map((d) => {
          const h = Math.max(4, Math.round((d.rate / maxRate) * 96))
          return (
            <div key={d.name} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="text-[10px] font-extrabold tabular-nums text-neutral-500 dark:text-neutral-400">{d.rate > 0 ? `${d.rate}%` : ''}</span>
              <div className="w-full flex items-end" style={{ height: 80 }}>
                <div
                  className="w-full rounded-t-lg bg-neutral-900 dark:bg-white transition-all duration-500"
                  style={{ height: `${h}px` }}
                />
              </div>
              <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500">{d.name}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
