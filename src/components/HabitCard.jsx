import { currentStreak } from '../utils'

export default function HabitCard({ habit, done, completions, onToggle, overdue }) {
  const streak = currentStreak(habit, completions)

  return (
    <button
      onClick={onToggle}
      className={`group flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-200 ${
        done
          ? 'border-neutral-100 bg-neutral-50 opacity-60 dark:border-neutral-900 dark:bg-neutral-900/60'
          : 'border-neutral-200 bg-white hover:border-neutral-400 dark:border-neutral-800 dark:bg-[#111] dark:hover:border-neutral-600'
      }`}
    >
      {/* checkbox */}
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          done
            ? 'border-neutral-900 bg-neutral-900 dark:border-white dark:bg-white'
            : 'border-neutral-300 group-hover:border-neutral-500 dark:border-neutral-700 dark:group-hover:border-neutral-500'
        }`}
      >
        {done && (
          <svg className="h-5 w-5 animate-pop text-white dark:text-neutral-900" viewBox="0 0 20 20" fill="none">
            <path d="M5 10.5l3.5 3.5L15 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>

      <span className="text-2xl">{habit.emoji}</span>

      <span className="min-w-0 flex-1">
        <span
          className={`block truncate font-semibold ${
            done ? 'text-neutral-400 line-through dark:text-neutral-600' : 'text-neutral-900 dark:text-white'
          }`}
        >
          {habit.name}
        </span>
        {habit.time && (
          <span className={`text-xs font-medium ${overdue && !done ? 'text-neutral-900 underline underline-offset-2 dark:text-white' : 'text-neutral-400 dark:text-neutral-500'}`}>
            {habit.time}
            {overdue && !done && ' · overdue'}
          </span>
        )}
      </span>

      {streak > 0 && (
        <span className="shrink-0 rounded-full border border-neutral-200 px-3 py-1 text-xs font-bold text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">
          🔥 {streak}
        </span>
      )}
    </button>
  )
}
