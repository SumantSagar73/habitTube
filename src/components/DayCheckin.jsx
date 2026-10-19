import { useState } from 'react'
import { Check } from 'lucide-react'
import { activeArcs } from '../arcs'
import { todayKey } from '../utils'

const MATCH = [
  { id: 'yes', label: 'Yes, on plan' },
  { id: 'partly', label: 'Partly' },
  { id: 'no', label: 'Not really' },
]
const BLOCKERS = ['No time', 'Low energy', 'Distractions', 'Unexpected stuff', 'Lost motivation']

const chip = (active) =>
  `rounded-full px-3.5 py-2 text-sm font-bold transition ${
    active
      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
      : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'
  }`

// 30-second evening check-in: did today match the plan, what got in the way, one-line win.
// Quiet before 4pm unless the user opens it. Feeds the coach and weekly planning.
export default function DayCheckin({ data, onSave }) {
  const key = todayKey()
  const done = data.dayCheckins?.[key]
  const [open, setOpen] = useState(false)
  const [match, setMatch] = useState('')
  const [blockers, setBlockers] = useState([])
  const [win, setWin] = useState('')

  const late = new Date().getHours() >= 16
  const minDay = activeArcs(data.arcs).find((a) => a.minDay)?.minDay

  if (done) {
    const label = MATCH.find((m) => m.id === done.match)?.label
    return (
      <div className="mb-6 rounded-2xl border border-neutral-200 px-4 py-3 text-sm text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
        <span className="font-bold text-neutral-900 dark:text-white"><Check className="mr-1 inline h-4 w-4 align-[-2px]" />Checked in</span> {label}
        {done.win ? ` · ${done.win}` : ''}
      </div>
    )
  }

  if (!late && !open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-6 w-full rounded-2xl border border-dashed border-neutral-300 px-4 py-3 text-left text-sm font-semibold text-neutral-400 transition hover:border-neutral-500 dark:border-neutral-700 dark:text-neutral-500"
      >
        Evening check-in — how is today going?
      </button>
    )
  }

  const toggle = (b) => setBlockers((l) => (l.includes(b) ? l.filter((x) => x !== b) : [...l, b]))

  return (
    <section className="mb-6 glass rounded-2xl p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">Check-in · 30 seconds</p>
      <p className="mt-2 font-bold text-neutral-900 dark:text-white">Did today match the plan?</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {MATCH.map((m) => (
          <button key={m.id} className={chip(match === m.id)} onClick={() => setMatch(m.id)}>{m.label}</button>
        ))}
      </div>

      {(match === 'partly' || match === 'no') && (
        <>
          <p className="mt-4 text-sm font-semibold text-neutral-700 dark:text-neutral-200">What got in the way?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {BLOCKERS.map((b) => (
              <button key={b} className={chip(blockers.includes(b))} onClick={() => toggle(b)}>{b}</button>
            ))}
          </div>
          {minDay && (
            <p className="mt-3 rounded-xl bg-neutral-100 p-3 text-sm text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
              <span className="font-bold">Still time for the minimum day:</span> {minDay}
            </p>
          )}
        </>
      )}

      {match && (
        <>
          <input
            className="mt-4 w-full rounded-xl border border-neutral-200 bg-transparent px-4 py-2.5 text-sm font-medium text-neutral-900 outline-none transition focus:border-neutral-900 dark:border-neutral-800 dark:text-white dark:focus:border-white"
            value={win}
            maxLength={120}
            onChange={(e) => setWin(e.target.value)}
            placeholder="One win from today (optional)"
          />
          <button
            className="mt-3 w-full rounded-full bg-neutral-900 py-2.5 text-sm font-bold text-white transition hover:opacity-90 dark:bg-white dark:text-neutral-900"
            onClick={() => onSave(key, { match, blockers, win: win.trim(), at: Date.now() })}
          >
            Save check-in
          </button>
        </>
      )}
    </section>
  )
}
