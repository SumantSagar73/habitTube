import { ArrowRight, Rocket } from 'lucide-react'
import { activeArcs, arcDay } from '../arcs'
import { addDays, dateKey, dayRate } from '../utils'

function greeting(hour) {
  if (hour < 5) return 'Still up'
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

// Seven small dots, Monday to Sunday: filled when the day's habits were all done.
function WeekDots({ habits, completions }) {
  const now = new Date()
  const monday = addDays(now, -((now.getDay() + 6) % 7))
  const todayK = dateKey(now)
  return (
    <div className="flex items-center gap-2" aria-label="This week">
      {Array.from({ length: 7 }, (_, i) => {
        const d = addDays(monday, i)
        const k = dateKey(d)
        const future = k > todayK
        const rate = future ? 0 : (dayRate(habits, completions, d) ?? 0)
        const label = `${d.toLocaleDateString(undefined, { weekday: 'long' })}: ${future ? 'upcoming' : `${Math.round(rate * 100)}%`}`
        return (
          <span
            key={k}
            title={label}
            className={`h-3 w-3 rounded-full border transition ${
              rate >= 1
                ? 'border-neutral-900 bg-neutral-900 dark:border-white dark:bg-white'
                : rate > 0
                  ? 'border-neutral-900 bg-neutral-900/40 dark:border-white dark:bg-white/40'
                  : 'border-neutral-300 dark:border-neutral-700'
            } ${k === todayK ? 'ring-2 ring-neutral-900/30 ring-offset-2 ring-offset-transparent dark:ring-white/40' : ''}`}
          />
        )
      })}
    </div>
  )
}

// Greeting, one line of status, and the week at a glance.
export function TodayHeader({ name, message, habits, completions }) {
  const now = new Date()
  const date = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500">{date}</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-4xl dark:text-white">
          {greeting(now.getHours())}{name ? `, ${name}` : ''}.
        </h1>
        {message && <p className="mt-1.5 max-w-xl text-sm font-medium text-neutral-500 dark:text-neutral-400">{message}</p>}
      </div>
      <WeekDots habits={habits} completions={completions} />
    </header>
  )
}

// Active arc in one card, or a quiet nudge to start one.
export function ArcCard({ arcs, onNewArc }) {
  const arc = activeArcs(arcs)[0]
  if (!arc) {
    return (
      <button
        onClick={onNewArc}
        className="glass group flex w-full items-center justify-between gap-3 rounded-3xl p-4 text-left transition hover:-translate-y-0.5"
      >
        <span className="flex items-center gap-3">
          <Rocket className="h-5 w-5 text-neutral-500 dark:text-neutral-400" strokeWidth={1.75} />
          <span>
            <span className="block font-extrabold tracking-tight text-neutral-900 dark:text-white">Start an arc</span>
            <span className="block text-xs font-medium text-neutral-400 dark:text-neutral-500">A 1–3 month push, planned with your coach</span>
          </span>
        </span>
        <ArrowRight className="h-4 w-4 text-neutral-400 transition group-hover:translate-x-0.5" />
      </button>
    )
  }
  const info = arcDay(arc)
  const wk = arc.weeks?.[info.weekIdx] || {}
  return (
    <section className="glass rounded-3xl p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-semibold text-neutral-500 dark:text-neutral-400">{arc.title}</p>
        <span className="shrink-0 text-xs font-bold text-neutral-900 dark:text-white">Day {info.day}/{info.total}</span>
      </div>
      <p className="mt-2 line-clamp-2 text-base font-extrabold leading-snug tracking-tight text-neutral-900 dark:text-white">
        {wk.milestone || wk.theme || `Week ${info.weekIdx + 1}`}
      </p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
        <div className="h-full rounded-full bg-neutral-900 transition-all duration-500 dark:bg-white" style={{ width: `${info.pct}%` }} />
      </div>
      <p className="mt-2 text-xs font-medium text-neutral-400 dark:text-neutral-500">Week {info.weekIdx + 1} of {arc.weeks.length}</p>
    </section>
  )
}
