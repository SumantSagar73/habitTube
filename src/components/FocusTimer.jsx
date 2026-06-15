import { useState } from 'react'
import Select from './Select'

const DURATIONS = [25, 15, 50]

export function fmtClock(secs) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function FocusTimer({ focus, goals, totalToday, onStart, onPause, onResume, onStop }) {
  const [duration, setDuration] = useState(25)
  const [goalId, setGoalId] = useState('')
  const [label, setLabel] = useState('')

  const full = focus.durationMin * 60
  const idle = !focus.running && focus.remaining >= full
  const paused = !focus.running && focus.remaining < full && focus.remaining > 0
  const active = focus.running || paused
  const pct = active ? Math.round((1 - focus.remaining / (focus.durationMin * 60)) * 100) : 0

  return (
    <section className="rounded-3xl border border-neutral-200 p-6 dark:border-neutral-800 dark:bg-[#111]">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">
          ⏱️ Focus
        </h3>
        {totalToday > 0 && (
          <span className="text-xs font-bold text-neutral-400 dark:text-neutral-500">{totalToday} min today</span>
        )}
      </div>

      {active ? (
        <div className="flex flex-col items-center gap-4 py-2">
          <span className="font-mono text-5xl font-extrabold tabular-nums tracking-tight text-neutral-900 dark:text-white">
            {fmtClock(focus.remaining)}
          </span>
          {focus.label || focus.goalId ? (
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              {focus.label || goals.find((g) => g.id === focus.goalId)?.title}
            </p>
          ) : null}
          <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
            <div className="h-full rounded-full bg-neutral-900 transition-all dark:bg-white" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex gap-2">
            {focus.running ? (
              <button onClick={onPause} className="rounded-full border border-neutral-200 px-5 py-2 text-sm font-semibold text-neutral-700 transition hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-200">
                Pause
              </button>
            ) : (
              <button onClick={onResume} className="rounded-full bg-neutral-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900">
                Resume
              </button>
            )}
            <button onClick={onStop} className="rounded-full border border-neutral-200 px-5 py-2 text-sm font-semibold text-neutral-700 transition hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-200">
              Stop
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-1.5">
            {DURATIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition ${
                  duration === d
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                    : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'
                }`}
              >
                {d} min
              </button>
            ))}
          </div>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="What are you focusing on? (optional)"
            className="w-full rounded-xl border border-neutral-200 bg-transparent px-3.5 py-2 text-sm font-medium text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 dark:border-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-600 dark:focus:border-white"
          />
          {goals.length > 0 && (
            <Select value={goalId} onChange={(e) => setGoalId(e.target.value)}>
              <option value="">Toward… (no goal)</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </Select>
          )}
          <button
            onClick={() => onStart(duration, goalId || null, label.trim())}
            className="w-full rounded-full bg-neutral-900 py-2.5 font-semibold text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Start {duration}-minute session
          </button>
        </div>
      )}
    </section>
  )
}
