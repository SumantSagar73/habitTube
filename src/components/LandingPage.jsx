import { useEffect, useRef, useState } from 'react'

const DURATIONS = [25, 50, 90]

function fmtClock(secs) {
  const m = Math.floor(Math.max(0, secs) / 60)
  const s = Math.max(0, secs) % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function LandingPage({ onOpenAuth }) {
  const [duration, setDuration] = useState(25)
  const [subject, setSubject] = useState('')
  const [remaining, setRemaining] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const [sessions, setSessions] = useState(0)
  const endAtRef = useRef(null)
  const [timerKey, setTimerKey] = useState(0)

  useEffect(() => {
    if (!running) { setRemaining(duration * 60); return }
    const id = setInterval(() => {
      const left = Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000))
      setRemaining(left)
      if (left === 0) {
        clearInterval(id)
        setRunning(false)
        setSessions((s) => s + 1)
        endAtRef.current = null
      }
    }, 500)
    return () => clearInterval(id)
  }, [running, timerKey])

  // sync display when idle + duration changes
  useEffect(() => {
    if (!running) setRemaining(duration * 60)
  }, [duration, running])

  function start() {
    endAtRef.current = Date.now() + duration * 60 * 1000
    setRemaining(duration * 60)
    setRunning(true)
    setTimerKey((k) => k + 1)
  }
  function stop() { setRunning(false); setRemaining(duration * 60); endAtRef.current = null }

  const active = running || (remaining < duration * 60 && remaining > 0)
  const pct = active ? Math.round((1 - remaining / (duration * 60)) * 100) : 0

  return (
    <>
    <div className="flex min-h-screen flex-col bg-white dark:bg-[#0a0a0a]">
      {/* Nav */}
      <header className="flex items-center justify-between border-b border-neutral-100 px-6 py-4 dark:border-neutral-900">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-neutral-900 dark:text-white" viewBox="0 0 24 24" fill="currentColor">
            <rect x="2" y="4" width="20" height="16" rx="3" />
            <path d="M10 8.5l6 3.5-6 3.5V8.5z" fill="white" className="dark:fill-[#0a0a0a]" />
          </svg>
          <span className="text-sm font-extrabold tracking-tight text-neutral-900 dark:text-white">HabitTube</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAuth}
            className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Sign in
          </button>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        {/* Hero */}
        <div className="mb-12 max-w-lg text-center">
          <h1 className="mb-4 text-5xl font-extrabold leading-[1.1] tracking-tight text-neutral-900 dark:text-white">
            Build habits.<br />Reach goals.
          </h1>
          <p className="text-lg font-medium text-neutral-400 dark:text-neutral-500">
            Track what you do every day. See the streak grow. Stay accountable.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onOpenAuth}
              className="rounded-full bg-neutral-900 px-6 py-3 font-semibold text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              Start for free →
            </button>
          </div>
        </div>

        {/* Focus timer card */}
        <div className="w-full max-w-sm">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
            Try it now — no account needed
          </p>

          <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-[#111]">
            {/* Session dots */}
            {sessions > 0 && (
              <div className="mb-4 flex items-center justify-center gap-1.5">
                {Array.from({ length: sessions }).map((_, i) => (
                  <div key={i} className="h-2.5 w-2.5 rounded-full bg-neutral-900 dark:bg-white" />
                ))}
                <span className="ml-1 text-xs font-semibold text-neutral-400 dark:text-neutral-500">
                  {sessions} session{sessions > 1 ? 's' : ''} done
                </span>
              </div>
            )}

            {/* Timer */}
            <div className="mb-6 text-center">
              <span
                className="font-mono font-extrabold tabular-nums leading-none text-neutral-900 dark:text-white"
                style={{ fontSize: 'clamp(3.5rem, 20vw, 5.5rem)' }}
              >
                {fmtClock(remaining)}
              </span>
              {subject && (
                <p className="mt-2 text-sm font-medium text-neutral-400 dark:text-neutral-500">{subject}</p>
              )}
            </div>

            {/* Progress bar */}
            {active && (
              <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                <div className="h-full rounded-full bg-neutral-900 transition-all dark:bg-white" style={{ width: `${pct}%` }} />
              </div>
            )}

            {/* Study input */}
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What are you studying?"
              className="mb-4 w-full rounded-xl border border-neutral-200 bg-transparent px-4 py-2.5 text-sm font-medium text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 dark:border-neutral-700 dark:text-neutral-100 dark:placeholder:text-neutral-600 dark:focus:border-white"
            />

            {/* Duration selector */}
            {!active && (
              <div className="mb-4 flex gap-2">
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
            )}

            {/* Actions */}
            {!running ? (
              <button
                onClick={active ? start : start}
                className="w-full rounded-full bg-neutral-900 py-3 text-base font-semibold text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
              >
                {active ? 'Resume' : `Start ${duration}-min focus`}
              </button>
            ) : (
              <div className="flex gap-2">
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
          </div>

          {/* Sign-in nudge */}
          <p className="mt-5 text-center text-sm font-medium text-neutral-400 dark:text-neutral-500">
            Sign in to save sessions, build streaks, and reach goals.{' '}
            <button onClick={onOpenAuth} className="font-bold text-neutral-900 underline underline-offset-2 dark:text-white hover:opacity-70 transition">
              Create free account →
            </button>
          </p>
        </div>
      </main>
    </div>
    </>
  )
}
