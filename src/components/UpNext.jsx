import { Check, Play, Sparkles } from 'lucide-react'
import { HabitIcon } from '../icons'
import { habitsForDate, isDone } from '../utils'

const hourLabel = (hm) => {
  const [h, m] = hm.split(':').map(Number)
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

// What to do right now, by this rule: a timed habit whose time has come, then a high
// priority task, then the next timed habit, then any other open task, then untimed habits.
export function pickUpNext({ habits, completions, skips, tasks, key, nowHM, date = new Date() }) {
  const skipped = (h) => (skips?.[h.id] || []).includes(key)
  const pendingHabits = habitsForDate(habits, date).filter((h) => !isDone(h, completions, key) && !skipped(h))
  const openTasks = (tasks[key] || []).filter((t) => !t.done)
  const byTime = (a, b) => a.time.localeCompare(b.time)

  const due = pendingHabits.filter((h) => h.time && h.time <= nowHM).sort(byTime)
  const upcoming = pendingHabits.filter((h) => h.time && h.time > nowHM).sort(byTime)
  const untimed = pendingHabits.filter((h) => !h.time)
  const rank = { high: 0, medium: 1, low: 2 }
  const tasksByPriority = [...openTasks].sort((a, b) => (rank[a.priority] ?? 1) - (rank[b.priority] ?? 1))
  const highTasks = tasksByPriority.filter((t) => t.priority === 'high')
  const otherTasks = tasksByPriority.filter((t) => t.priority !== 'high')

  const queue = [
    ...due.map((h) => ({ kind: 'habit', item: h, why: `Due at ${hourLabel(h.time)}` })),
    ...highTasks.map((t) => ({ kind: 'task', item: t, why: 'High priority' })),
    ...upcoming.map((h) => ({ kind: 'habit', item: h, why: `Next, at ${hourLabel(h.time)}` })),
    ...otherTasks.map((t) => ({ kind: 'task', item: t, why: 'Open task' })),
    ...untimed.map((h) => ({ kind: 'habit', item: h, why: 'Any time today' })),
  ]
  return { next: queue[0] || null, more: Math.max(0, queue.length - 1) }
}

// The one thing to do now, with a way to finish it or focus on it.
export default function UpNext({ pick, onDoneHabit, onDoneTask, onFocus, onPlan, dayKey }) {
  const { next, more } = pick

  if (!next) {
    return (
      <section className="glass flex items-center justify-between gap-4 rounded-3xl p-5 sm:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">Up next</p>
          <p className="mt-1 text-xl font-extrabold tracking-tight text-neutral-900 dark:text-white">You’re clear for now.</p>
          <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500">Nothing due. Add a task, or let the coach plan the rest of your day.</p>
        </div>
        {onPlan && (
          <button
            onClick={onPlan}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-200 dark:hover:border-neutral-500"
          >
            <Sparkles className="h-4 w-4" /> Plan my day
          </button>
        )}
      </section>
    )
  }

  const { kind, item, why } = next
  const title = kind === 'habit' ? item.name : item.title
  const finish = () => (kind === 'habit' ? onDoneHabit(item.id) : onDoneTask(dayKey, item.id))

  return (
    <section className="glow-mono rounded-3xl p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">Up next</p>
        {more > 0 && <p className="text-xs font-semibold text-white/50">{more} more after this</p>}
      </div>
      <div className="mt-3 flex items-center gap-4">
        {kind === 'habit' && (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10">
            <HabitIcon value={item.emoji} className="h-6 w-6" />
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</p>
          <p className="text-sm font-medium text-white/60">{why}</p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          onClick={finish}
          className="flex items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-neutral-900 transition hover:bg-neutral-200"
        >
          <Check className="h-4 w-4" strokeWidth={2.5} /> Mark done
        </button>
        <button
          onClick={() => onFocus(25, kind === 'task' ? item.goalId || null : null, title)}
          className="flex items-center gap-1.5 rounded-full border border-white/25 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/10"
        >
          <Play className="h-4 w-4" strokeWidth={2.25} /> Focus 25 min
        </button>
      </div>
    </section>
  )
}
