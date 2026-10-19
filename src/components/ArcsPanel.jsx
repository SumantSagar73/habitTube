import { activeArcs, arcDay, MAX_ACTIVE_ARCS, needsReview, pendingWeek, staleDays } from '../arcs'

const ghostBtn =
  'rounded-full border border-neutral-200 px-3.5 py-1.5 text-xs font-semibold text-neutral-700 transition hover:border-neutral-400 disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-200 dark:hover:border-neutral-500'

// Active arcs as cards. `compact` (Today tab) shows a slim line per arc; the Plan
// tab shows full cards, paused arcs and the "Start an arc" entry point.
export default function ArcsPanel({ data, compact = false, onNew, onResolveArc, onCheckin, onReview }) {
  const arcs = data.arcs || []
  const active = activeArcs(arcs)
  const paused = arcs.filter((a) => a.status === 'paused')

  if (compact && !active.length) return null

  return (
    <section className="mb-6">
      {!compact && (
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">Arcs</p>
          <button
            onClick={onNew}
            className="rounded-full bg-neutral-900 px-4 py-1.5 text-xs font-bold text-white transition hover:opacity-90 dark:bg-white dark:text-neutral-900"
          >
            + Start an arc
          </button>
        </div>
      )}

      {!compact && !arcs.length && (
        <div className="rounded-2xl border border-dashed border-neutral-300 p-5 text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
          An arc is a 1–3 month push you name yourself — “Winter arc”, “Exam sprint”. Answer a few questions and get a week-by-week path, habits and your first week of tasks.
        </div>
      )}

      <div className="space-y-3">
        {active.map((a) => {
          const { day, total, weekIdx, ended, pct } = arcDay(a)
          const wk = a.weeks?.[weekIdx] || {}
          const quiet = staleDays(a, data)
          const nextWeek = pendingWeek(a)
          const review = needsReview(a)
          return (
            <div key={a.id} className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-bold text-neutral-900 dark:text-white">{a.title}</p>
                  <p className="text-xs font-medium text-neutral-400 dark:text-neutral-500">
                    {ended ? 'Finished' : `Day ${day}/${total}`} · Week {weekIdx + 1}{wk.theme ? `: ${wk.theme}` : ''}
                  </p>
                </div>
                {!compact && (
                  <div className="flex shrink-0 gap-2">
                    <button className={ghostBtn} onClick={() => onResolveArc(a.id, 'pause')}>Pause</button>
                    <button className={ghostBtn} onClick={() => onResolveArc(a.id, 'close')}>{ended ? 'Close' : 'End'}</button>
                  </div>
                )}
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                <div className="h-full rounded-full bg-neutral-900 dark:bg-white" style={{ width: `${pct}%` }} />
              </div>
              {!compact && wk.milestone && (
                <p className="mt-3 text-sm text-neutral-700 dark:text-neutral-200">
                  <span className="font-bold">This week:</span> {wk.milestone}
                </p>
              )}
              {!compact && a.weeks?.length > 0 && (
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer text-xs font-semibold text-neutral-500 dark:text-neutral-400">Week-by-week path</summary>
                  <ol className="mt-2 space-y-1.5">
                    {a.weeks.map((w, i) => (
                      <li key={i} className={i === weekIdx ? 'font-semibold text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400'}>
                        W{i + 1} · {w.theme}{w.milestone ? ` — ${w.milestone}` : ''}
                      </li>
                    ))}
                  </ol>
                </details>
              )}
              {a.minDay && (
                <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                  <span className="font-bold">Bad day? </span>{a.minDay}
                </p>
              )}
              {review && (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-neutral-900 p-3 text-white dark:bg-white dark:text-neutral-900">
                  <p className="text-xs font-semibold">This arc has finished. Review it and plan what’s next.</p>
                  <button className="shrink-0 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-neutral-900 dark:bg-neutral-900 dark:text-white" onClick={() => onReview(a.id)}>Review arc</button>
                </div>
              )}
              {nextWeek != null && (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-neutral-900 p-3 text-white dark:bg-white dark:text-neutral-900">
                  <p className="text-xs font-semibold">Week {nextWeek + 1} is ready to plan — 1 minute check-in.</p>
                  <button className="shrink-0 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-neutral-900 dark:bg-neutral-900 dark:text-white" onClick={() => onCheckin(a.id)}>Plan week {nextWeek + 1}</button>
                </div>
              )}
              {quiet > 0 && (
                <div className="mt-3 rounded-xl bg-neutral-100 p-3 dark:bg-neutral-800">
                  <p className="mb-2 text-xs font-semibold text-neutral-700 dark:text-neutral-200">
                    Quiet for {quiet} days. Pick up where you left off, or step back?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button className={ghostBtn} onClick={() => onResolveArc(a.id, 'resume')}>I’m back</button>
                    <button className={ghostBtn} onClick={() => onResolveArc(a.id, 'pause')}>Pause</button>
                    <button className={ghostBtn} onClick={() => onResolveArc(a.id, 'close')}>Close</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {!compact && paused.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">Paused</p>
          {paused.map((a) => (
            <div key={a.id} className="mb-2 flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 px-4 py-3 dark:border-neutral-800">
              <p className="truncate text-sm font-semibold text-neutral-700 dark:text-neutral-200">{a.title}</p>
              <div className="flex shrink-0 gap-2">
                <button
                  className={ghostBtn}
                  disabled={active.length >= MAX_ACTIVE_ARCS}
                  title={active.length >= MAX_ACTIVE_ARCS ? 'Pause or close another arc first' : ''}
                  onClick={() => onResolveArc(a.id, 'resume')}
                >
                  Resume
                </button>
                <button className={ghostBtn} onClick={() => onResolveArc(a.id, 'close')}>Close</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
