import { addDays, dateKey } from '../utils'

const fmtMinutes = (m) => {
  const h = Math.floor(m / 60)
  const r = Math.round(m % 60)
  return h ? `${h}h ${String(r).padStart(2, '0')}m` : `${r}m`
}

function greeting(hour) {
  if (hour < 5) return 'Still up'
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

// Minutes of focus per day for the last 7 days, oldest first.
function weekFocus(focusLog = []) {
  const today = new Date()
  const days = Array.from({ length: 7 }, (_, i) => dateKey(addDays(today, i - 6)))
  const byDay = Object.fromEntries(days.map((d) => [d, 0]))
  for (const f of focusLog) if (f.date in byDay) byDay[f.date] += f.minutes || 0
  return days.map((d) => byDay[d])
}

// Top of the Today tab: who/when, then three at-a-glance cards.
export default function TodayHero({ name, focusMinutesToday, focusRunning, habitsDone, habitsTotal, tasksDone, tasksTotal, focusLog }) {
  const now = new Date()
  const week = weekFocus(focusLog)
  const weekTotal = week.reduce((a, b) => a + b, 0)
  const peak = Math.max(1, ...week)
  const habitPct = habitsTotal ? Math.round((habitsDone / habitsTotal) * 100) : 0
  const left = habitsTotal - habitsDone + (tasksTotal - tasksDone)
  const date = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <header className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500">{date}</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-4xl dark:text-white">
            {greeting(now.getHours())}{name ? `, ${name}` : ''}.
          </h1>
        </div>
        <p className="rounded-full border border-neutral-200 px-4 py-1.5 text-sm font-semibold text-neutral-600 dark:border-neutral-800 dark:text-neutral-300">
          {left > 0 ? `${left} thing${left === 1 ? '' : 's'} left today` : 'Everything done — nice.'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* deep work */}
        <div className="glow-mono relative flex min-h-[148px] flex-col justify-between overflow-hidden rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white/80">Deep work</p>
            {focusRunning && (
              <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/80">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Live
              </span>
            )}
          </div>
          <div>
            <p className="text-4xl font-extrabold tracking-tight">{fmtMinutes(focusMinutesToday)}</p>
            <p className="mt-1 text-xs font-medium text-white/60">focused today</p>
          </div>
        </div>

        {/* habits + tasks */}
        <div className="glass flex min-h-[148px] flex-col justify-between rounded-3xl p-5">
          <p className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">Today’s progress</p>
          <div>
            <p className="text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white">{habitPct}%</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
              <div className="h-full rounded-full bg-[var(--accent)] transition-all duration-500" style={{ width: `${habitPct}%` }} />
            </div>
            <p className="mt-2 text-xs font-medium text-neutral-400 dark:text-neutral-500">
              {habitsDone}/{habitsTotal} habits · {tasksDone}/{tasksTotal} tasks
            </p>
          </div>
        </div>

        {/* focus rhythm */}
        <div className="glass flex min-h-[148px] flex-col justify-between rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">Focus this week</p>
            <p className="text-xs font-bold text-neutral-900 dark:text-white">{fmtMinutes(weekTotal)}</p>
          </div>
          <div className="flex h-16 items-end gap-1.5" aria-label="Focus minutes per day, last 7 days">
            {week.map((m, i) => (
              <div
                key={i}
                title={fmtMinutes(m)}
                className={`flex-1 rounded-md ${i === 6 ? 'bg-[var(--accent)]' : 'bg-neutral-200 dark:bg-neutral-700'}`}
                style={{ height: `${Math.max(6, (m / peak) * 100)}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </header>
  )
}
