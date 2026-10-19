import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { activeArcs, arcDay, MAX_ACTIVE_ARCS, needsReview, pendingWeek, staleDays } from '../arcs'

const ghostBtn =
  'rounded-full border border-neutral-200 px-3.5 py-1.5 text-xs font-semibold text-neutral-700 transition hover:border-neutral-400 disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-200 dark:hover:border-neutral-500'
const inverseBtn =
  'shrink-0 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-neutral-900 dark:bg-neutral-900 dark:text-white'

// The things an arc needs from you right now: plan the new week, review the finished arc,
// or decide about a quiet one. Shown under Up next on Today and inside the arc row on Plan.
function ArcAlerts({ arc, data, onResolveArc, onCheckin, onReview }) {
  const nextWeek = pendingWeek(arc)
  const review = needsReview(arc)
  const quiet = staleDays(arc, data)
  return (
    <>
      {review && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-neutral-900 p-3 text-white dark:bg-white dark:text-neutral-900">
          <p className="text-xs font-semibold">This arc has finished. Review it and plan what’s next.</p>
          <button className={inverseBtn} onClick={() => onReview(arc.id)}>Review arc</button>
        </div>
      )}
      {nextWeek != null && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-neutral-900 p-3 text-white dark:bg-white dark:text-neutral-900">
          <p className="text-xs font-semibold">Week {nextWeek + 1} is ready to plan — 1 minute check-in.</p>
          <button className={inverseBtn} onClick={() => onCheckin(arc.id)}>Plan week {nextWeek + 1}</button>
        </div>
      )}
      {quiet > 0 && (
        <div className="rounded-xl bg-neutral-100 p-3 dark:bg-neutral-800">
          <p className="mb-2 text-xs font-semibold text-neutral-700 dark:text-neutral-200">
            Quiet for {quiet} days. Pick up where you left off, or step back?
          </p>
          <div className="flex flex-wrap gap-2">
            <button className={ghostBtn} onClick={() => onResolveArc(arc.id, 'resume')}>I’m back</button>
            <button className={ghostBtn} onClick={() => onResolveArc(arc.id, 'pause')}>Pause</button>
            <button className={ghostBtn} onClick={() => onResolveArc(arc.id, 'close')}>Close</button>
          </div>
        </div>
      )}
    </>
  )
}

// One arc as a single line; the week-by-week path and the bad-day plan open on demand.
function ArcRow({ arc, data, onResolveArc, onCheckin, onReview }) {
  const [open, setOpen] = useState(false)
  const { day, total, weekIdx, ended, pct } = arcDay(arc)
  const wk = arc.weeks?.[weekIdx] || {}
  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={`${open ? 'Hide' : 'Show'} details for ${arc.title}`}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <ChevronDown className={`h-4 w-4 shrink-0 text-neutral-400 transition ${open ? '' : '-rotate-90'}`} />
          <span className="min-w-0">
            <span className="block truncate font-bold text-neutral-900 dark:text-white">{arc.title}</span>
            <span className="block truncate text-xs font-medium text-neutral-400 dark:text-neutral-500">
              {ended ? 'Finished' : `Day ${day}/${total}`} · Week {weekIdx + 1}{wk.theme ? `: ${wk.theme}` : ''}
            </span>
            <span className="mt-1.5 block h-1 w-full max-w-xs overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
              <span className="block h-full rounded-full bg-neutral-900 dark:bg-white" style={{ width: `${pct}%` }} />
            </span>
          </span>
        </button>
        <div className="flex shrink-0 gap-2">
          <button className={ghostBtn} onClick={() => onResolveArc(arc.id, 'pause')}>Pause</button>
          <button className={ghostBtn} onClick={() => onResolveArc(arc.id, 'close')}>{ended ? 'Close' : 'End'}</button>
        </div>
      </div>
      {open && (
        <div className="space-y-2 pl-7 text-sm">
          {wk.milestone && (
            <p className="text-neutral-700 dark:text-neutral-200"><span className="font-bold">This week:</span> {wk.milestone}</p>
          )}
          <ol className="space-y-1">
            {arc.weeks.map((w, i) => (
              <li key={i} className={i === weekIdx ? 'font-semibold text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400'}>
                W{i + 1} · {w.theme}{w.milestone ? ` — ${w.milestone}` : ''}
              </li>
            ))}
          </ol>
          {arc.minDay && <p className="text-xs text-neutral-500 dark:text-neutral-400"><span className="font-bold">Bad day? </span>{arc.minDay}</p>}
        </div>
      )}
      <ArcAlerts arc={arc} data={data} onResolveArc={onResolveArc} onCheckin={onCheckin} onReview={onReview} />
    </div>
  )
}

// Plan tab: all arcs, tidy. Today passes `compact alertsOnly` to show only what needs action.
export default function ArcsPanel({ data, compact = false, alertsOnly = false, onNew, onResolveArc, onCheckin, onReview }) {
  const arcs = data.arcs || []
  const active = activeArcs(arcs)
  const paused = arcs.filter((a) => a.status === 'paused')
  const needsAction = (a) => pendingWeek(a) != null || needsReview(a) || staleDays(a, data) > 0

  if (compact || alertsOnly) {
    const flagged = active.filter(needsAction)
    if (!flagged.length) return null
    return (
      <div className="space-y-3">
        {flagged.map((a) => (
          <section key={a.id} className="glass space-y-3 rounded-2xl p-4">
            <p className="text-sm font-bold text-neutral-900 dark:text-white">{a.title}</p>
            <ArcAlerts arc={a} data={data} onResolveArc={onResolveArc} onCheckin={onCheckin} onReview={onReview} />
          </section>
        ))}
      </div>
    )
  }

  return (
    <section className="mb-5">
      {arcs.length === 0 ? (
        <div className="glass flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3">
          <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
            No arc running. An arc is a 1–3 month push you name yourself — “Winter arc”, “Exam sprint”.
          </p>
          <button
            onClick={onNew}
            className="rounded-full bg-neutral-900 px-4 py-1.5 text-xs font-bold text-white transition hover:opacity-90 dark:bg-white dark:text-neutral-900"
          >
            + Start an arc
          </button>
        </div>
      ) : (
        <>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">Arcs</p>
            <button
              onClick={onNew}
              className="rounded-full bg-neutral-900 px-4 py-1.5 text-xs font-bold text-white transition hover:opacity-90 dark:bg-white dark:text-neutral-900"
            >
              + Start an arc
            </button>
          </div>
          {active.length > 0 && (
            <div className="glass divide-y divide-neutral-200/70 rounded-2xl dark:divide-neutral-800">
              {active.map((a) => (
                <ArcRow key={a.id} arc={a} data={data} onResolveArc={onResolveArc} onCheckin={onCheckin} onReview={onReview} />
              ))}
            </div>
          )}
          {paused.length > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-bold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">
                Paused ({paused.length})
              </summary>
              <div className="mt-2 space-y-2">
                {paused.map((a) => (
                  <div key={a.id} className="glass flex items-center justify-between gap-3 rounded-2xl px-4 py-3">
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
            </details>
          )}
        </>
      )}
    </section>
  )
}
