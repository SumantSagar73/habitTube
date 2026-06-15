import { computeBadges, computeStats } from '../achievements'

export default function Achievements({ data }) {
  const stats = computeStats(data)
  const badges = computeBadges(stats)
  const earned = badges.filter((b) => b.earned).length

  return (
    <section className="rounded-3xl border border-neutral-200 p-6 dark:border-neutral-800 dark:bg-[#111]">
      {/* level bar */}
      <div className="mb-5 flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
          <span className="text-[9px] font-bold uppercase tracking-wider opacity-70">Lvl</span>
          <span className="text-xl font-extrabold leading-none">{stats.level}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between">
            <h3 className="text-lg font-extrabold tracking-tight text-neutral-900 dark:text-white">Achievements</h3>
            <span className="text-xs font-bold text-neutral-400 dark:text-neutral-500">
              {earned}/{badges.length} unlocked
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
            <div className="h-full rounded-full bg-neutral-900 transition-all duration-500 dark:bg-white" style={{ width: `${stats.levelProgress}%` }} />
          </div>
          <p className="mt-1 text-xs font-medium text-neutral-400 dark:text-neutral-500">
            {stats.xp} XP · {stats.xpToNext} to level {stats.level + 1}
          </p>
        </div>
      </div>

      {/* badge grid */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {badges.map((b) => (
          <div
            key={b.id}
            title={b.desc}
            className={`flex items-center gap-3 rounded-2xl border p-3 transition ${
              b.earned
                ? 'border-neutral-900 dark:border-white'
                : 'border-neutral-200 opacity-70 dark:border-neutral-800'
            }`}
          >
            <span className={`text-2xl ${b.earned ? '' : 'grayscale'}`}>{b.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-neutral-900 dark:text-white">{b.name}</p>
              {b.earned ? (
                <p className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500">Unlocked</p>
              ) : (
                <p className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500">
                  {b.cur}/{b.target}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
