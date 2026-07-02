import { useEffect, useRef, useState } from 'react'

const DURATIONS = [
  { label: '25 min', value: 25 },
  { label: '50 min', value: 50 },
  { label: '90 min', value: 90 },
]

function fmtClock(secs) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function LandingPage({ onOpenAuth }) {
  const [duration, setDuration] = useState(25)
  const [subject, setSubject] = useState('')
  const [remaining, setRemaining] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const [sessions, setSessions] = useState(0)
  const intervalRef = useRef(null)
  const endAtRef = useRef(null)

  // sync remaining with selected duration when idle
  useEffect(() => {
    if (!running && remaining === endAtRef.current) return
    if (!running) setRemaining(duration * 60)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration])

  useEffect(() => {
    if (running) {
      endAtRef.current = Date.now() + remaining * 1000
      intervalRef.current = setInterval(() => {
        const left = Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000))
        setRemaining(left)
        if (left === 0) {
          clearInterval(intervalRef.current)
          setRunning(false)
          setSessions((s) => s + 1)
          endAtRef.current = null
        }
      }, 500)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [running])

  const active = running || (remaining < duration * 60 && remaining > 0)
  const pct = active ? Math.round((1 - remaining / (duration * 60)) * 100) : 0

  function start() {
    setRemaining(duration * 60)
    setRunning(true)
  }

  function stop() {
    setRunning(false)
    setRemaining(duration * 60)
    endAtRef.current = null
  }

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-[#0a0a0a]">
      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-900">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-neutral-900 dark:text-white" viewBox="0 0 24 24" fill="currentColor">
            <rect x="2" y="4" width="20" height="16" rx="3" />
            <path d="M10 8.5l6 3.5-6 3.5V8.5z" fill="white" className="dark:fill-[#0a0a0a]" />
          </svg>
          <span className="text-sm font-extrabold tracking-tight text-neutral-900 dark:text-white">HabitTube</span>
        </div>
        <button
          onClick={onOpenAuth}
          className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          Sign in
        </button>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12 gap-12">
        {/* Hero text */}
        <div className="text-center max-w-md">
          <h1 className="text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white mb-3">
            Stay focused.<br />Build better habits.
          </h1>
          <p className="text-base text-neutral-500 dark:text-neutral-400">
            Start a focus session right now — no account needed. Sign in to save your streaks and goals.
          </p>
        </div>

        {/* Pomodoro card */}
        <div className="w-full max-w-sm rounded-3xl border border-neutral-200 dark:border-neutral-800 dark:bg-[#111] p-8 flex flex-col items-center gap-6">
          {/* Session dots */}
          {sessions > 0 && (
            <div className="flex items-center gap-2">
              {Array.from({ length: sessions }).map((_, i) => (
                <div key={i} className="h-3 w-3 rounded-full bg-neutral-900 dark:bg-white" />
              ))}
              <span className="text-xs text-neutral-400 dark:text-neutral-500 ml-1">
                {sessions} session{sessions > 1 ? 's' : ''} done
              </span>
            </div>
          )}

          {/* Timer display */}
          <span
            className="font-mono font-extrabold tabular-nums tracking-tight text-neutral-900 dark:text-white"
            style={{ fontSize: 'clamp(3rem, 18vw, 5rem)', lineHeight: 1 }}
          >
            {fmtClock(remaining)}
          </span>

          {/* Progress bar */}
          {active && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
              <div
                className="h-full rounded-full bg-neutral-900 transition-all dark:bg-white"
                style={{ width: `${pct}%` }}
              />
            </div>
          )}

          {/* Subject input */}
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="What are you studying?"
            className="w-full rounded-xl border border-neutral-200 bg-transparent px-4 py-2.5 text-sm font-medium text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 dark:border-neutral-700 dark:text-neutral-100 dark:placeholder:text-neutral-600 dark:focus:border-white"
          />

          {/* Duration selector — only when idle */}
          {!active && (
            <div className="flex w-full gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setDuration(d.value)}
                  className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition ${
                    duration === d.value
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                      : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          )}

          {/* Action buttons */}
          {!running ? (
            <button
              onClick={active ? () => setRunning(true) : start}
              className="w-full rounded-full bg-neutral-900 py-3 text-base font-semibold text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              {active ? 'Resume' : `Start ${duration}-min session`}
            </button>
          ) : (
            <div className="flex w-full gap-3">
              <button
                onClick={() => setRunning(false)}
                className="flex-1 rounded-full border border-neutral-200 py-3 text-sm font-semibold text-neutral-700 transition hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-200"
              >
                Pause
              </button>
              <button
                onClick={stop}
                className="flex-1 rounded-full border border-neutral-200 py-3 text-sm font-semibold text-neutral-700 transition hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-200"
              >
                Stop
              </button>
            </div>
          )}

          <p className="text-xs text-neutral-400 dark:text-neutral-600 text-center">
            Sign in to save sessions, track streaks, and reach your goals.
          </p>
          <button
            onClick={onOpenAuth}
            className="text-sm font-semibold text-neutral-900 underline underline-offset-2 dark:text-white hover:opacity-70 transition"
          >
            Create free account →
          </button>
        </div>
      </main>
    </div>
  )
}
