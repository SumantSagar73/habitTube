import { ArrowRight, Rocket } from 'lucide-react'
import { activeArcs, arcDay } from '../arcs'
import { addDays, dateKey, dayRate } from '../utils'

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

const hourLabel = (h) => `${((h + 11) % 12) + 1} ${h < 12 ? 'AM' : 'PM'}`

// Minutes of focus per day for the last 7 days, oldest first.
function weekFocus(focusLog = []) {
  const today = new Date()
  const days = Array.from({ length: 7 }, (_, i) => dateKey(addDays(today, i - 6)))
  const byDay = Object.fromEntries(days.map((d) => [d, 0]))
  for (const f of focusLog) if (f.date in byDay) byDay[f.date] += f.minutes || 0
  return days.map((d) => byDay[d])
}

// The hour of day you focus most, once there are enough timestamped sessions.
function bestFocusHour(focusLog = []) {
  const byHour = {}
  let n = 0
  for (const f of focusLog) {
    if (!f.at) continue
    const h = new Date(f.at).getHours()
    byHour[h] = (byHour[h] || 0) + (f.minutes || 0)
    n++
  }
  if (n < 3) return null
  return Number(Object.entries(byHour).sort((a, b) => b[1] - a[1])[0][0])
}

function Ring({ pct, size = 30, active }) {
  const r = size / 2 - 3
  const c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="3" className="stroke-neutral-200 dark:stroke-neutral-800" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct)}
        className={active ? 'stroke-neutral-900 dark:stroke-white' : 'stroke-neutral-500 dark:stroke-neutral-400'}
      />
    </svg>
  )
}

// Monday → Sunday, each with that day's habit completion.
function WeekStrip({ habits, completions }) {
  const now = new Date()
  const monday = addDays(now, -((now.getDay() + 6) % 7))
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  const todayK = dateKey(now)
  return (
    <div className="glass grid grid-cols-7 gap-1 rounded-3xl p-2 sm:p-3" aria-label="This week">
      {days.map((d) => {
        const k = dateKey(d)
        const isToday = k === todayK
        const future = k > todayK
        const rate = future ? 0 : (dayRate(habits, completions, d) ?? 0)
        return (
          <div
            key={k}
            className={`flex flex-col items-center gap-1.5 rounded-2xl py-2 ${isToday ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : future ? 'opacity-45' : ''}`}
          >
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isToday ? 'opacity-70' : 'text-neutral-400 dark:text-neutral-500'}`}>
              {d.toLocaleDateString(undefined, { weekday: 'short' })}
            </span>
            <span className="text-sm font-extrabold leading-none">{d.getDate()}</span>
            {isToday ? (
              <span className="h-[30px] text-[11px] font-bold leading-[30px]">{Math.round(rate * 100)}%</span>
            ) : (
              <Ring pct={rate} active={rate >= 1} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// Top of Today: greeting, the week at a glance, then three cards (deep work, arc, focus rhythm).
export default function TodayHero({
  name, message, focusMinutesToday, focusRunning, habitsDone, habitsTotal, tasksDone, tasksTotal,
  focusLog, habits, completions, arcs, onNewArc,
}) {
  const now = new Date()
  const week = weekFocus(focusLog)
  const weekTotal = week.reduce((a, b) => a + b, 0)
  const peak = Math.max(1, ...week)
  const best = bestFocusHour(focusLog)
  const left = habitsTotal - habitsDone + (tasksTotal - tasksDone)
  const date = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
  const arc = activeArcs(arcs)[0]
  const info = arc ? arcDay(arc) : null
  const wk = arc ? arc.weeks?.[info.weekIdx] || {} : {}

  return (
    <header className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500">{date}</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-4xl dark:text-white">
            {greeting(now.getHours())}{name ? `, ${name}` : ''}.
          </h1>
          {message && <p className="mt-1.5 max-w-xl text-sm font-medium text-neutral-500 dark:text-neutral-400">{message}</p>}
        </div>
        <p className="rounded-full border border-neutral-200 px-4 py-1.5 text-sm font-semibold text-neutral-600 dark:border-neutral-800 dark:text-neutral-300">
          {left > 0 ? `${left} thing${left === 1 ? '' : 's'} left today` : 'Everything done — nice.'}
        </p>
      </div>

      <WeekStrip habits={habits} completions={completions} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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

        {/* arc */}
        {arc ? (
          <div className="glass flex min-h-[148px] flex-col justify-between rounded-3xl p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-semibold text-neutral-500 dark:text-neutral-400">{arc.title}</p>
              <span className="shrink-0 text-xs font-bold text-neutral-900 dark:text-white">Day {info.day}/{info.total}</span>
            </div>
            <div>
              <p className="line-clamp-2 text-lg font-extrabold leading-snug tracking-tight text-neutral-900 dark:text-white">
                {wk.milestone || wk.theme || `Week ${info.weekIdx + 1}`}
              </p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                <div className="h-full rounded-full bg-neutral-900 transition-all duration-500 dark:bg-white" style={{ width: `${info.pct}%` }} />
              </div>
              <p className="mt-2 text-xs font-medium text-neutral-400 dark:text-neutral-500">Week {info.weekIdx + 1} of {arc.weeks.length}</p>
            </div>
          </div>
        ) : (
          <button
            onClick={onNewArc}
            className="glass group flex min-h-[148px] flex-col justify-between rounded-3xl p-5 text-left transition hover:-translate-y-0.5"
          >
            <Rocket className="h-5 w-5 text-neutral-500 dark:text-neutral-400" strokeWidth={1.75} />
            <div>
              <p className="text-lg font-extrabold tracking-tight text-neutral-900 dark:text-white">Start an arc</p>
              <p className="mt-1 flex items-center gap-1 text-xs font-medium text-neutral-400 dark:text-neutral-500">
                A 1–3 month push, planned with your coach <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
              </p>
            </div>
          </button>
        )}

        {/* focus rhythm */}
        <div className="glass flex min-h-[148px] flex-col justify-between rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">Focus this week</p>
            <p className="text-xs font-bold text-neutral-900 dark:text-white">{fmtMinutes(weekTotal)}</p>
          </div>
          <div className="flex h-14 items-end gap-1.5" aria-label="Focus minutes per day, last 7 days">
            {week.map((m, i) => (
              <div
                key={i}
                title={fmtMinutes(m)}
                className={`flex-1 rounded-md ${i === 6 ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-200 dark:bg-neutral-700'}`}
                style={{ height: `${Math.max(6, (m / peak) * 100)}%` }}
              />
            ))}
          </div>
          <p className="text-xs font-medium text-neutral-400 dark:text-neutral-500">
            {best != null ? `You focus best around ${hourLabel(best)}` : 'Finish a few sessions to see your best hour'}
          </p>
        </div>
      </div>
      <p className="sr-only">{habitsDone}/{habitsTotal} habits and {tasksDone}/{tasksTotal} tasks done today</p>
    </header>
  )
}
