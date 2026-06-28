import { bestStreak, currentStreak } from '../utils'

export default function StreakLeaderboard({ habits, completions }) {
  const rows = habits
    .map((h) => ({ h, cur: currentStreak(h, completions), best: bestStreak(h, completions) }))
    .filter((x) => x.cur > 0 || x.best > 0)
    .sort((a, b) => b.cur - a.cur || b.best - a.best)
    .slice(0, 5)

  if (rows.length === 0) return null

  return (
    <section className="rounded-3xl border border-neutral-200 p-6 dark:border-neutral-800 dark:bg-[#111]">
      <div className="mb-3 flex items-center gap-2">
        <svg className="h-4 w-4 text-neutral-400 dark:text-neutral-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">Streak leaders</h3>
      </div>
      <div className="space-y-2.5">
        {rows.map(({ h, cur, best }, i) => (
          <div key={h.id} className="flex items-center gap-3">
            <span className="w-4 shrink-0 text-center text-xs font-bold text-neutral-300 dark:text-neutral-700">{i + 1}</span>
            <span className="text-xl">{h.emoji}</span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-neutral-800 dark:text-neutral-100">{h.name}</span>
            <div className="flex shrink-0 items-center gap-1.5">
              <span className="flex items-center gap-1 text-sm font-extrabold text-neutral-900 dark:text-white">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2c0 6-6 8-6 14a6 6 0 0 0 12 0c0-6-6-8-6-14z"/><path d="M12 18a2 2 0 0 1-2-2c0-2 2-3 2-5 0 2 2 3 2 5a2 2 0 0 1-2 2z"/></svg>
                {cur}
              </span>
              {best > cur && (
                <span className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500">
                  best {best}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
