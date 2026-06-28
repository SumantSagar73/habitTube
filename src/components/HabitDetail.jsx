import { addDays, bestStreak, currentStreak, dateKey, formatNice, habitRate, isDone, isScheduled, todayKey, WEEKDAYS } from '../utils'
import Heatmap from './Heatmap'
import LottieStreak from './LottieStreak'

// Scheduled days the habit was missed (before today), most recent first.
function missedDays(habit, completions, limit = 14) {
  const out = []
  let d = addDays(new Date(), -1)
  for (let i = 0; i < 365 && out.length < limit; i++) {
    const key = dateKey(d)
    if (key < habit.createdAt) break
    if (isScheduled(habit, d) && !isDone(habit, completions, key)) out.push(key)
    d = addDays(d, -1)
  }
  return out
}

function Stat({ value, label }) {
  return (
    <div className="flex-1 rounded-2xl border border-neutral-200 p-4 text-center dark:border-neutral-800">
      <p className="text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-white">{value}</p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">{label}</p>
    </div>
  )
}

export default function HabitDetail({ habit, completions, missNotes, dark, onMissNote, onClose }) {
  const streak = currentStreak(habit, completions)
  const best = bestStreak(habit, completions)
  const rate = habitRate(habit, completions, 30)
  const missed = missedDays(habit, completions)
  const notes = missNotes[habit.id] || {}
  const doneToday = isDone(habit, completions, todayKey())

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm dark:bg-black/60"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="animate-fade-up max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-neutral-200 bg-white p-7 shadow-2xl dark:border-neutral-800 dark:bg-[#111]">
        {/* header */}
        <div className="mb-6 flex items-start gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 text-3xl dark:bg-neutral-800">
            {habit.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
              {habit.name}
            </h2>
            <p className="text-xs font-medium text-neutral-400 dark:text-neutral-500">
              {habit.days.length === 7 ? 'Every day' : habit.days.map((d) => WEEKDAYS[d]).join(' · ')}
              {habit.time && ` · ${habit.time}`}
              {doneToday && ' · done today ✓'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-neutral-200 p-2 text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-900 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-600 dark:hover:text-white"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* stats */}
        <div className="mb-6 flex gap-3">
          <Stat value={<span className="flex items-center justify-center gap-1"><LottieStreak size={22} />{streak}</span>} label="current streak" />
          <Stat value={best} label="best streak" />
          <Stat value={`${rate}%`} label="last 30 days" />
        </div>

        {/* personal heatmap */}
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">
          This year
        </h3>
        <Heatmap habits={[habit]} completions={completions} dark={dark} single />

        {/* miss log */}
        <h3 className="mt-7 mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">
          Missed days — own them
        </h3>
        <p className="mb-4 text-sm font-medium text-neutral-400 dark:text-neutral-500">
          Writing down why you skipped reveals the pattern that keeps breaking your plan.
        </p>
        {missed.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 p-6 text-center text-sm font-medium text-neutral-400 dark:border-neutral-700 dark:text-neutral-500">
            No misses on record. Keep it that way.
          </div>
        ) : (
          <div className="space-y-2.5">
            {missed.map((key) => (
              <div key={key} className="flex flex-col gap-2 rounded-2xl border border-neutral-200 p-4 sm:flex-row sm:items-center dark:border-neutral-800">
                <span className="w-44 shrink-0 text-sm font-bold text-neutral-900 dark:text-white">
                  {formatNice(key)}
                </span>
                <input
                  value={notes[key] || ''}
                  onChange={(e) => onMissNote(habit.id, key, e.target.value)}
                  placeholder="Why did you skip this day?"
                  className="flex-1 rounded-xl border border-neutral-200 bg-transparent px-3.5 py-2 text-sm font-medium text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 dark:border-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-600 dark:focus:border-white"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
