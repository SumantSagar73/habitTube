import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { aiNextWeek } from '../ai'
import { arcDay, weekStats } from '../arcs'

const RATINGS = ['Too easy', 'Just right', 'Too hard']
const BLOCKERS = ['No time', 'Low energy', 'Lost motivation', 'Distractions', 'Plan was unclear', 'Got sick / travelled']

const labelCls = 'mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500'
const chip = (active) =>
  `rounded-full px-3.5 py-2 text-sm font-bold transition ${
    active
      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
      : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'
  }`
const primaryBtn =
  'w-full rounded-full bg-neutral-900 py-3 font-bold text-white transition hover:opacity-90 disabled:opacity-40 dark:bg-white dark:text-neutral-900'
const ghostBtn =
  'rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-200 dark:hover:border-neutral-500'

// Weekly check-in: look back at last week, say how it went, get next week's tasks.
export default function ArcCheckin({ arc, weekIdx, data, onApply, onClose }) {
  const [rating, setRating] = useState('')
  const [blockers, setBlockers] = useState([])
  const [extra, setExtra] = useState('')
  const [plan, setPlan] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const stats = useMemo(() => weekStats(arc, data, weekIdx - 1), [arc, data, weekIdx])
  const { total } = arcDay(arc)
  const prev = arc.weeks[weekIdx - 1] || {}
  const cur = arc.weeks[weekIdx] || {}
  const habitPct = stats.habitDue ? Math.round((stats.habitDone / stats.habitDue) * 100) : null
  const toggle = (b) => setBlockers((l) => (l.includes(b) ? l.filter((x) => x !== b) : [...l, b]))
  const feedback = { rating: rating.toLowerCase(), blockers, extra }

  async function generate() {
    setBusy(true)
    setError('')
    try {
      setPlan(await aiNextWeek(arc, weekIdx, stats, feedback, data.aiModel))
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const removeTask = (i) => setPlan((p) => ({ ...p, tasks: p.tasks.filter((_, j) => j !== i) }))

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm dark:bg-black/60"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div role="dialog" aria-label="Week check-in" className="max-h-[90vh] w-full max-w-lg overflow-y-auto glass-strong rounded-3xl p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-neutral-900 dark:text-white">Week {weekIdx + 1} check-in</h2>
            <p className="text-xs font-medium text-neutral-400 dark:text-neutral-500">{arc.title} · {arc.weeks.length} weeks · {total} days</p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>

        {plan ? (
          <>
            {plan.note && <p className="mb-4 text-sm font-medium text-neutral-600 dark:text-neutral-300">{plan.note}</p>}
            <p className="text-sm text-neutral-700 dark:text-neutral-200">
              <span className="font-bold">This week:</span> {plan.milestone || cur.milestone || cur.theme}
            </p>
            <label className={`${labelCls} mt-5`}>Tasks</label>
            {plan.tasks.map((t, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-1 text-sm text-neutral-700 dark:text-neutral-200">
                <span>{t.title}</span>
                <button className="shrink-0 text-neutral-400 hover:text-neutral-900 dark:hover:text-white" onClick={() => removeTask(i)} aria-label="Remove task"><X className="h-4 w-4" /></button>
              </div>
            ))}
            <div className="mt-6 flex gap-2">
              <button className={ghostBtn} onClick={generate} disabled={busy}>{busy ? 'Regenerating…' : 'Regenerate'}</button>
              <button className={primaryBtn} onClick={() => onApply(plan, feedback)}>Start week {weekIdx + 1}</button>
            </div>
          </>
        ) : (
          <>
            <div className="glass rounded-2xl p-4">
              <p className="text-sm font-bold text-neutral-900 dark:text-white">
                Last week{prev.theme ? `: ${prev.theme}` : ''}
              </p>
              {prev.milestone && <p className="text-xs text-neutral-400 dark:text-neutral-500">Goal: {prev.milestone}</p>}
              <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-200">
                Tasks {stats.taskDone}/{stats.taskTotal}
                {habitPct != null && <> · Habits {habitPct}%</>}
              </p>
            </div>

            <label className={`${labelCls} mt-5`}>How did it feel?</label>
            <div className="flex flex-wrap gap-2">
              {RATINGS.map((r) => (
                <button key={r} type="button" className={chip(rating === r)} onClick={() => setRating(r)}>{r}</button>
              ))}
            </div>

            <label className={`${labelCls} mt-5`}>What got in the way? (optional)</label>
            <div className="flex flex-wrap gap-2">
              {BLOCKERS.map((b) => (
                <button key={b} type="button" className={chip(blockers.includes(b))} onClick={() => toggle(b)}>{b}</button>
              ))}
            </div>

            <textarea
              className="mt-4 w-full resize-none rounded-xl border border-neutral-200 bg-transparent px-4 py-2.5 font-medium text-neutral-900 outline-none transition focus:border-neutral-900 dark:border-neutral-800 dark:text-white dark:focus:border-white"
              rows={2}
              maxLength={300}
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              placeholder="Anything else? (optional)"
            />

            {error && <p className="mt-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">{error}</p>}
            <button className={`${primaryBtn} mt-6`} onClick={generate} disabled={busy || !rating}>
              {busy ? 'Planning your week…' : `Plan week ${weekIdx + 1}`}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
