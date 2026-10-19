import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { aiArcReview } from '../ai'
import { arcSummary } from '../arcs'

const ghostBtn =
  'rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:border-neutral-400 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:border-neutral-500'
const primaryBtn =
  'rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-40 dark:bg-white dark:text-neutral-900'
const labelCls = 'mb-2 mt-5 block text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500'

const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '—')

function Stat({ label, value }) {
  return (
  <div className="rounded-2xl border border-neutral-200 p-3 text-center dark:border-neutral-800">
    <p className="text-xl font-extrabold text-neutral-900 dark:text-white">{value}</p>
    <p className="text-xs font-medium text-neutral-400 dark:text-neutral-500">{label}</p>
  </div>
  )
}

// End-of-arc review: the numbers, an honest AI read of them, then close the arc or
// roll straight into the next one.
export default function ArcReview({ arc, data, aiEnabled, onFinish, onClose }) {
  const s = useMemo(() => arcSummary(arc, data), [arc, data])
  const [review, setReview] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function write() {
    setBusy(true)
    setError('')
    try {
      setReview(await aiArcReview(arc, s, data.aiModel))
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm dark:bg-black/60"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto glass-strong rounded-3xl p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-neutral-900 dark:text-white">Arc review</h2>
            <p className="text-xs font-medium text-neutral-400 dark:text-neutral-500">{arc.title} · {arc.weeks.length} weeks</p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Stat label="Habits done" value={pct(s.habitDone, s.habitDue)} />
          <Stat label="Tasks done" value={`${s.taskDone}/${s.taskTotal}`} />
          <Stat label="Goal progress" value={s.goalPct != null ? `${s.goalPct}%` : '—'} />
        </div>

        {review ? (
          <>
            <p className="mt-5 text-sm font-medium text-neutral-700 dark:text-neutral-200">{review.summary}</p>
            {review.wins.length > 0 && (
              <>
                <label className={labelCls}>Wins</label>
                <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-700 dark:text-neutral-200">
                  {review.wins.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </>
            )}
            {review.lessons.length > 0 && (
              <>
                <label className={labelCls}>Lessons</label>
                <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-700 dark:text-neutral-200">
                  {review.lessons.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </>
            )}
            {review.next && (
              <p className="mt-5 rounded-xl bg-neutral-100 p-3 text-sm text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                <span className="font-bold">Next arc idea:</span> {review.next.theme}
                {review.next.why ? ` — ${review.next.why}` : ''}
              </p>
            )}
          </>
        ) : (
          aiEnabled && (
            <>
              {error && <p className="mt-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">{error}</p>}
              <button className={`${primaryBtn} mt-5 w-full`} onClick={write} disabled={busy}>
                {busy ? 'Reading your arc…' : 'Write my review'}
              </button>
            </>
          )
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button className={ghostBtn} onClick={() => onFinish(review, null)}>Close arc</button>
          <button className={primaryBtn} onClick={() => onFinish(review, review?.next?.theme || '')}>Close &amp; plan next arc</button>
        </div>
      </div>
    </div>
  )
}
