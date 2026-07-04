import { useEffect, useRef, useState } from 'react'
import useRoom, { MY_ID } from '../useRoom'

const DURATIONS = [25, 50, 90]

function fmtClock(secs) {
  const s = Math.max(0, Math.round(secs))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export function newRoomUrl() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let c = ''
  for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random() * chars.length)]
  const code = c.slice(0, 3) + '-' + c.slice(3)
  return `${window.location.pathname}?room=${code}`
}

function StatusDot({ status }) {
  if (status === 'focusing') return <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
  if (status === 'break')    return <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-amber-400" />
  if (status === 'done')     return <span className="shrink-0 text-xs text-neutral-400">✓</span>
  return <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-neutral-300 dark:bg-neutral-700" />
}

export default function RoomPage({ roomCode, roomPin, user, onSaveSession }) {
  // ── PIN gate ──────────────────────────────────────────────────────────────
  const [pinInput, setPinInput] = useState('')
  const [pinVerified, setPinVerified] = useState(!roomPin)
  const [pinError, setPinError] = useState(false)

  // ── join state ────────────────────────────────────────────────────────────
  const [joined, setJoined] = useState(false)
  const [nameInput, setNameInput] = useState(user?.email?.split('@')[0] || '')
  const [subjectInput, setSubjectInput] = useState('')

  // ── timer state ───────────────────────────────────────────────────────────
  const [duration, setDuration] = useState(25)
  const [remaining, setRemaining] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const [isBreak, setIsBreak] = useState(false)
  const [sessionsDone, setSessionsDone] = useState(0)

  // refs so interval callbacks always read fresh values
  const endAtRef    = useRef(null)
  const isBreakRef  = useRef(false)
  const durationRef = useRef(25)
  const sessionsRef = useRef(0)
  const nameRef     = useRef('')
  const subjectRef  = useRef('')

  const { participants, connected, track } = useRoom(roomCode)

  // keep refs in sync
  useEffect(() => { isBreakRef.current = isBreak }, [isBreak])
  useEffect(() => { durationRef.current = duration }, [duration])

  // timerKey increments each time we start a new phase — forces effect re-run
  // even when `running` was already true (work→break transition)
  const [timerKey, setTimerKey] = useState(0)

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      const left = Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000))
      setRemaining(left)
      if (left % 5 === 0) broadcast(left)
      if (left === 0) { clearInterval(id); phaseComplete() }
    }, 500)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, timerKey])

  function broadcast(rem) {
    track({
      name: nameRef.current,
      subject: subjectRef.current,
      status: isBreakRef.current ? 'break' : 'focusing',
      remaining: rem,
      sessionsDone: sessionsRef.current,
    })
  }

  function phaseComplete() {
    if (!isBreakRef.current) {
      // work session done → start break
      const newCount = sessionsRef.current + 1
      sessionsRef.current = newCount
      setSessionsDone(newCount)
      if (onSaveSession) onSaveSession(durationRef.current)
      const breakMin = durationRef.current <= 25 ? 5 : durationRef.current <= 50 ? 10 : 15
      isBreakRef.current = true
      setIsBreak(true)
      endAtRef.current = Date.now() + breakMin * 60 * 1000
      setRemaining(breakMin * 60)
      setTimerKey((k) => k + 1) // force effect re-run even though running stays true
      track({ name: nameRef.current, subject: subjectRef.current, status: 'break', remaining: breakMin * 60, sessionsDone: newCount })
    } else {
      // break done → back to idle
      isBreakRef.current = false
      setIsBreak(false)
      setRunning(false)
      endAtRef.current = null
      setRemaining(durationRef.current * 60)
      track({ name: nameRef.current, subject: subjectRef.current, status: 'idle', remaining: durationRef.current * 60, sessionsDone: sessionsRef.current })
    }
  }

  function startSession() {
    isBreakRef.current = false
    setIsBreak(false)
    endAtRef.current = Date.now() + duration * 60 * 1000
    setRemaining(duration * 60)
    setRunning(true)
    setTimerKey((k) => k + 1)
    track({ name: nameRef.current, subject: subjectRef.current, status: 'focusing', remaining: duration * 60, durationMin: duration, sessionsDone: sessionsRef.current })
  }

  function stopSession() {
    setRunning(false)
    isBreakRef.current = false
    setIsBreak(false)
    endAtRef.current = null
    setRemaining(duration * 60)
    track({ name: nameRef.current, subject: subjectRef.current, status: 'idle', remaining: duration * 60, sessionsDone: sessionsRef.current })
  }

  function joinRoom(e) {
    e.preventDefault()
    if (!nameInput.trim()) return
    nameRef.current = nameInput.trim()
    subjectRef.current = subjectInput.trim()
    track({ name: nameRef.current, subject: subjectRef.current, status: 'idle', remaining: duration * 60, durationMin: duration, sessionsDone: 0 })
    setJoined(true)
  }

  const shareUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`
  const me = participants.find((p) => p.id === MY_ID)
  const focusingCount = participants.filter((p) => p.status === 'focusing').length
  const active = running
  const full = (isBreak ? (duration <= 25 ? 5 : duration <= 50 ? 10 : 15) : duration) * 60
  const pct = active ? Math.min(100, Math.round((1 - remaining / full) * 100)) : 0

  // ── PIN gate ──────────────────────────────────────────────────────────────
  if (!pinVerified) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 dark:bg-[#0a0a0a]">
        <div className="w-full max-w-xs text-center">
          <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-50 text-2xl dark:border-neutral-800 dark:bg-neutral-900">
            🔒
          </div>
          <h1 className="mb-1 text-xl font-extrabold text-neutral-900 dark:text-white">
            Protected room
          </h1>
          <p className="mb-6 text-sm font-medium text-neutral-400 dark:text-neutral-500">
            Enter the PIN to join <span className="font-mono font-bold text-neutral-700 dark:text-neutral-300">{roomCode}</span>
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (pinInput.trim() === String(roomPin)) {
                setPinVerified(true)
                setPinError(false)
              } else {
                setPinError(true)
                setPinInput('')
              }
            }}
            className="space-y-3"
          >
            <input
              autoFocus
              value={pinInput}
              onChange={(e) => { setPinInput(e.target.value); setPinError(false) }}
              placeholder="PIN"
              inputMode="numeric"
              maxLength={4}
              className={`w-full rounded-xl border bg-transparent px-4 py-3 text-center font-mono text-2xl font-extrabold tracking-[0.4em] outline-none transition placeholder:text-neutral-300 placeholder:tracking-normal dark:placeholder:text-neutral-700 ${
                pinError
                  ? 'border-red-400 text-red-500 dark:border-red-600'
                  : 'border-neutral-200 text-neutral-900 focus:border-neutral-900 dark:border-neutral-800 dark:text-white dark:focus:border-white'
              }`}
            />
            {pinError && (
              <p className="text-xs font-semibold text-red-500">Incorrect PIN — try again</p>
            )}
            <button
              type="submit"
              disabled={pinInput.length < 4}
              className="w-full rounded-full bg-neutral-900 py-3 font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-40 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              Unlock
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── join form ─────────────────────────────────────────────────────────────
  if (!joined) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 dark:bg-[#0a0a0a]">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2">
            <svg className="h-5 w-5 text-neutral-900 dark:text-white" viewBox="0 0 24 24" fill="currentColor">
              <rect x="2" y="4" width="20" height="16" rx="3" />
              <path d="M10 8.5l6 3.5-6 3.5V8.5z" fill="white" />
            </svg>
            <span className="text-sm font-extrabold tracking-tight text-neutral-900 dark:text-white">HabitTube</span>
          </div>

          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-neutral-200 px-3 py-1 dark:border-neutral-800">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            <span className="font-mono text-xs font-bold tracking-widest text-neutral-500 dark:text-neutral-400">{roomCode}</span>
          </div>

          <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
            Join focus room
          </h1>
          <p className="mb-6 text-sm font-medium text-neutral-400 dark:text-neutral-500">
            {participants.length > 0
              ? `${participants.length} person${participants.length > 1 ? 's' : ''} already in here`
              : 'Be the first to join — share the link with friends'}
          </p>

          <form onSubmit={joinRoom} className="space-y-3">
            <input
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-xl border border-neutral-200 bg-transparent px-4 py-3 text-sm font-medium text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 dark:border-neutral-800 dark:text-white dark:placeholder:text-neutral-600 dark:focus:border-white"
            />
            <input
              value={subjectInput}
              onChange={(e) => setSubjectInput(e.target.value)}
              placeholder="What are you studying? (optional)"
              className="w-full rounded-xl border border-neutral-200 bg-transparent px-4 py-3 text-sm font-medium text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 dark:border-neutral-800 dark:text-white dark:placeholder:text-neutral-600 dark:focus:border-white"
            />
            <button
              type="submit"
              disabled={!nameInput.trim() || !connected}
              className="w-full rounded-full bg-neutral-900 py-3 font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              {connected ? 'Join room' : 'Connecting…'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── room view ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a]">
      <div className="mx-auto max-w-2xl px-4 py-8">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="mb-1 flex items-center gap-3">
              <span className="font-mono text-xl font-extrabold tracking-widest text-neutral-900 dark:text-white">
                {roomCode}
              </span>
              {roomPin && (
                <span className="rounded-full border border-neutral-200 px-2 py-0.5 text-xs font-bold text-neutral-400 dark:border-neutral-700">
                  🔒 protected
                </span>
              )}
              {focusingCount > 0 && (
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  {focusingCount} focusing
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500">
              {participants.length} in the room
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigator.clipboard.writeText(shareUrl).then(() => alert('Link copied! Share it with your study group.'))}
              className="flex items-center gap-1.5 rounded-full border border-neutral-200 px-3.5 py-2 text-xs font-bold text-neutral-600 transition hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              Invite
            </button>
            <button
              onClick={() => { window.location.href = window.location.pathname }}
              className="rounded-full border border-neutral-200 px-3.5 py-2 text-xs font-bold text-neutral-400 transition hover:border-neutral-400 hover:text-neutral-700 dark:border-neutral-700 dark:text-neutral-500 dark:hover:border-neutral-500 dark:hover:text-neutral-300"
            >
              Leave
            </button>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">

          {/* ── My timer ── */}
          <div className="rounded-3xl border border-neutral-200 p-6 dark:border-neutral-800 dark:bg-[#111]">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                Your session
              </h3>
              {sessionsDone > 0 && (
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(sessionsDone, 6) }).map((_, i) => (
                    <div key={i} className="h-2 w-2 rounded-full bg-neutral-900 dark:bg-white" />
                  ))}
                  <span className="ml-1 text-[10px] font-bold text-neutral-400 dark:text-neutral-500">
                    {sessionsDone}×
                  </span>
                </div>
              )}
            </div>

            {isBreak && (
              <div className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                ☕ Break time · next session starts after this
              </div>
            )}

            <div className="mb-4 text-center">
              <span className="font-mono text-6xl font-extrabold tabular-nums leading-none text-neutral-900 dark:text-white">
                {fmtClock(remaining)}
              </span>
              {me?.subject && (
                <p className="mt-2 text-sm font-medium text-neutral-400 dark:text-neutral-500">{me.subject}</p>
              )}
            </div>

            {active && (
              <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                <div
                  className="h-full rounded-full bg-neutral-900 transition-all dark:bg-white"
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}

            {!active && !isBreak && (
              <div className="mb-4 flex gap-2">
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => { setDuration(d); durationRef.current = d; setRemaining(d * 60) }}
                    className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition ${
                      duration === d
                        ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                        : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'
                    }`}
                  >
                    {d}m
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              {!running ? (
                <button
                  onClick={isBreak ? stopSession : startSession}
                  className="flex-1 rounded-full bg-neutral-900 py-3 text-sm font-semibold text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                >
                  {isBreak ? 'Skip break' : active ? 'Resume' : `Start ${duration}-min focus`}
                </button>
              ) : (
                <button
                  onClick={stopSession}
                  className="flex-1 rounded-full border border-neutral-200 py-3 text-sm font-semibold text-neutral-700 transition hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-200 dark:hover:border-neutral-500"
                >
                  {isBreak ? 'End break' : 'Stop'}
                </button>
              )}
            </div>
          </div>

          {/* ── Participants ── */}
          <div className="rounded-3xl border border-neutral-200 p-6 dark:border-neutral-800 dark:bg-[#111]">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
              Room · {participants.length} {participants.length === 1 ? 'person' : 'people'}
            </h3>

            {participants.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-neutral-200 p-6 text-center dark:border-neutral-800">
                <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500">
                  No one else yet.<br />Share the link to study together.
                </p>
                <button
                  onClick={() => navigator.clipboard.writeText(shareUrl).then(() => alert('Copied!'))}
                  className="mt-4 rounded-full border border-neutral-200 px-4 py-2 text-xs font-bold text-neutral-600 transition hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-300"
                >
                  Copy invite link
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {participants.map((p) => (
                  <div
                    key={p.id}
                    className={`flex items-center gap-3 rounded-2xl border p-3.5 transition ${
                      p.id === MY_ID
                        ? 'border-neutral-900 bg-neutral-50 dark:border-white dark:bg-neutral-900/40'
                        : 'border-neutral-100 dark:border-neutral-800/60'
                    }`}
                  >
                    <StatusDot status={p.status || 'idle'} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-bold text-neutral-900 dark:text-white">
                          {p.name || 'Anonymous'}
                        </span>
                        {p.id === MY_ID && (
                          <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                            you
                          </span>
                        )}
                      </div>
                      {p.subject && (
                        <p className="truncate text-xs font-medium text-neutral-400 dark:text-neutral-500">
                          {p.subject}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      {p.status === 'focusing' && p.remaining > 0 && (
                        <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          {fmtClock(p.remaining)}
                        </span>
                      )}
                      {p.status === 'break' && (
                        <span className="text-xs font-bold text-amber-500">☕ break</span>
                      )}
                      {p.sessionsDone > 0 && (
                        <div className="mt-0.5 flex justify-end gap-0.5">
                          {Array.from({ length: Math.min(p.sessionsDone, 5) }).map((_, i) => (
                            <div key={i} className="h-1.5 w-1.5 rounded-full bg-neutral-300 dark:bg-neutral-600" />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Logged-out nudge */}
        {!user && (
          <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
            <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500">
              Sign in to save sessions and see group focus insights.
            </p>
            <a
              href={window.location.pathname}
              className="shrink-0 rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-neutral-900"
            >
              Sign in
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
