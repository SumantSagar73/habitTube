import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Select from './Select'

const DURATIONS = [10, 25, 50, 90]

export function fmtClock(secs) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function FocusTimer({ focus, goals, totalToday, todaySessions = [], onStart, onPause, onResume, onStop, onFsChange }) {
  const [duration, setDuration] = useState(25)
  const [goalId, setGoalId] = useState('')
  const [label, setLabel] = useState('')
  const [isFs, setIsFs] = useState(false)

  // Lock scroll behind the overlay and notify parent
  useEffect(() => {
    document.documentElement.classList.toggle('overflow-hidden', isFs)
    onFsChange?.(isFs)
    // Ensure scroll lock is cleaned up if this component unmounts
    return () => {
      if (isFs) {
        document.documentElement.classList.remove('overflow-hidden')
      }
    }
  }, [isFs])

  const full = focus.durationMin * 60
  const paused = !focus.running && focus.remaining < full && focus.remaining > 0
  const active = focus.running || paused
  const pct = active ? Math.round((1 - focus.remaining / full) * 100) : 0

  // ── Fullscreen overlay ───────────────────────────────────────────────────────
  if (isFs) {
    return createPortal(
      <div
        style={{
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100vh',
          minHeight: '100dvh',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
        className="bg-white dark:bg-[#0a0a0a]"
      >
        {/* HabitTube branding — top left */}
        <div style={{ position: 'absolute', top: 20, left: 24 }} className="flex items-center gap-2">
          <svg className="h-5 w-5 text-neutral-900 dark:text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <rect x="2" y="4" width="20" height="16" rx="3" />
            <path d="M10 8.5l6 3.5-6 3.5V8.5z" fill="white" className="dark:fill-neutral-900" />
          </svg>
          <span className="text-sm font-extrabold tracking-tight text-neutral-900 dark:text-white">HabitTube</span>
        </div>

        {/* exit button — top right corner */}
        <button
          onClick={() => setIsFs(false)}
          title="Exit fullscreen"
          style={{ position: 'absolute', top: 20, right: 20 }}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-neutral-400 transition hover:text-neutral-900 dark:text-neutral-500 dark:hover:text-white"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
          </svg>
        </button>

        {/* all content centered */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.5rem',
            width: '100%',
            maxWidth: '400px',
            padding: '0 1.5rem',
            boxSizing: 'border-box',
          }}
        >
          {/* session dots */}
          {(todaySessions.length > 0 || focus.running) && (
            <div className="flex items-center gap-3">
              {todaySessions.map((s, i) => (
                <div key={i} title={`Session ${i + 1}: ${s.minutes} min${s.label ? ` — ${s.label}` : ''}`}
                  className="h-4 w-4 rounded-full bg-emerald-500" />
              ))}
              {focus.running && <div className="h-4 w-4 animate-pulse rounded-full bg-neutral-300 dark:bg-neutral-600" />}
            </div>
          )}

          {active ? (
            <>
              <span className="font-mono font-extrabold leading-none tabular-nums tracking-tight text-neutral-900 dark:text-white"
                style={{ fontSize: 'clamp(3.5rem, 20vw, 9rem)' }}>
                {fmtClock(focus.remaining)}
              </span>
              {(focus.label || focus.goalId) && (
                <p className="text-xl font-medium text-neutral-500 dark:text-neutral-400">
                  {focus.label || goals.find((g) => g.id === focus.goalId)?.title}
                </p>
              )}
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                <div className="h-full rounded-full bg-neutral-900 transition-all dark:bg-white" style={{ width: `${pct}%` }} />
              </div>
              <div className="flex gap-3">
                {focus.running ? (
                  <button onClick={onPause} className="rounded-full border border-neutral-300 px-7 py-3 text-base font-semibold text-neutral-700 transition hover:border-neutral-500 dark:border-neutral-700 dark:text-neutral-200">
                    Pause
                  </button>
                ) : (
                  <button onClick={onResume} className="rounded-full bg-neutral-900 px-7 py-3 text-base font-semibold text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900">
                    Resume
                  </button>
                )}
                <button onClick={onStop} className="rounded-full border border-neutral-300 px-7 py-3 text-base font-semibold text-neutral-700 transition hover:border-neutral-500 dark:border-neutral-700 dark:text-neutral-200">
                  Stop
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                {DURATIONS.map((d) => (
                  <button key={d} onClick={() => setDuration(d)}
                    style={{ flex: 1 }}
                    className={`rounded-xl py-3 text-base font-bold transition ${
                      duration === d
                        ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                        : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'
                    }`}>
                    {d}m
                  </button>
                ))}
              </div>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="What are you focusing on? (optional)"
                className="w-full rounded-xl border border-neutral-200 bg-transparent px-4 py-3 text-base font-medium text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 dark:border-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-600 dark:focus:border-white"
              />
              {goals.length > 0 && (
                <Select value={goalId} onChange={(e) => setGoalId(e.target.value)}>
                  <option value="">Toward… (no goal)</option>
                  {goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
                </Select>
              )}
              <button
                onClick={() => onStart(duration, goalId || null, label.trim())}
                className="w-full rounded-full bg-neutral-900 py-4 text-lg font-semibold text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
              >
                Start {duration}-minute session
              </button>
            </>
          )}
        </div>
      </div>,
      document.body
    )
  }

  // ── Normal card ──────────────────────────────────────────────────────────────
  return (
    <section className="rounded-3xl border border-neutral-200 p-6 dark:border-neutral-800 dark:bg-[#111]">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">
          ⏱️ Focus
        </h3>
        <div className="flex items-center gap-2">
          {totalToday > 0 && (
            <span className="text-xs font-bold text-neutral-400 dark:text-neutral-500">{totalToday} min today</span>
          )}
          <button
            onClick={() => setIsFs(true)}
            title="Fullscreen"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 transition hover:text-neutral-900 dark:text-neutral-500 dark:hover:text-white"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          </button>
        </div>
      </div>

      {/* session dots */}
      {(todaySessions.length > 0 || focus.running) && (
        <div className="mb-3 flex items-center gap-1.5">
          {todaySessions.map((s, i) => (
            <div key={i} title={`Session ${i + 1}: ${s.minutes} min${s.label ? ` — ${s.label}` : ''}`}
              className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          ))}
          {focus.running && <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-neutral-300 dark:bg-neutral-600" />}
        </div>
      )}

      {active ? (
        <div className="flex flex-col items-center gap-4 py-2">
          <span className="font-mono text-5xl font-extrabold tabular-nums tracking-tight text-neutral-900 dark:text-white">
            {fmtClock(focus.remaining)}
          </span>
          {(focus.label || focus.goalId) && (
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              {focus.label || goals.find((g) => g.id === focus.goalId)?.title}
            </p>
          )}
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
              <button key={d} onClick={() => setDuration(d)}
                className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition ${
                  duration === d
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                    : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'
                }`}>
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
              {goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
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
