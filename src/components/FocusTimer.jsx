import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Select from './Select'

const DURATIONS = [10, 25, 50, 90]

export function fmtClock(secs) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function FocusTimer({ focus, goals, totalToday, todaySessions = [], onStart, onPause, onResume, onStop, onFsChange, allowlist = [], blocklist = [], onAddAllowDomain, onRemoveAllowDomain, onAddBlockDomain, onRemoveBlockDomain, blockerInstalled }) {
  const [duration, setDuration] = useState(25)
  const [goalId, setGoalId] = useState('')
  const [label, setLabel] = useState('')
  const [isFs, setIsFs] = useState(false)
  const [autoBreak, setAutoBreak] = useState(false)

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
  const pct = active ? Math.min(100, Math.max(0, Math.round((1 - focus.remaining / full) * 100))) : 0
  const isBreak = focus.isBreak

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
              {isBreak && (
                <span className="rounded-full bg-neutral-100 px-4 py-1.5 text-sm font-bold uppercase tracking-wide text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                  Break time ☕
                </span>
              )}
              <span className="font-mono font-extrabold leading-none tabular-nums tracking-tight text-neutral-900 dark:text-white"
                style={{ fontSize: 'clamp(3.5rem, 20vw, 9rem)' }}>
                {fmtClock(focus.remaining)}
              </span>
              {!isBreak && (focus.label || focus.goalId) && (
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
                  {isBreak ? 'Skip break' : 'Stop'}
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
              <div className="flex w-full items-center justify-between rounded-xl border border-neutral-200 px-4 py-3 dark:border-neutral-800">
                <div>
                  <p className="text-sm font-bold text-neutral-700 dark:text-neutral-200">Auto-break</p>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500">
                    {duration <= 25 ? '25/5' : duration <= 50 ? '50/10' : '90/15'} · break starts automatically
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoBreak((v) => !v)}
                  className={`relative h-6 w-11 rounded-full transition ${autoBreak ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-200 dark:bg-neutral-700'}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition dark:bg-neutral-900 ${autoBreak ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
              <button
                onClick={() => onStart(duration, goalId || null, label.trim(), autoBreak)}
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
          {isBreak && (
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
              Break time ☕
            </span>
          )}
          <span className="font-mono text-5xl font-extrabold tabular-nums tracking-tight text-neutral-900 dark:text-white">
            {fmtClock(focus.remaining)}
          </span>
          {!isBreak && (focus.label || focus.goalId) && (
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
              {isBreak ? 'Skip break' : 'Stop'}
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
          <div className="flex items-center justify-between rounded-xl border border-neutral-200 px-3.5 py-2 dark:border-neutral-800">
            <div>
              <p className="text-xs font-bold text-neutral-700 dark:text-neutral-200">Auto-break</p>
              <p className="text-[10px] text-neutral-400 dark:text-neutral-500">
                {duration <= 25 ? '25/5' : duration <= 50 ? '50/10' : '90/15'} · break starts automatically
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAutoBreak((v) => !v)}
              className={`relative h-6 w-11 rounded-full transition ${autoBreak ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-200 dark:bg-neutral-700'}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition dark:bg-neutral-900 ${autoBreak ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>
          <FocusBlocker
            allowlist={allowlist}
            blocklist={blocklist}
            onAddAllow={onAddAllowDomain}
            onRemoveAllow={onRemoveAllowDomain}
            onAddBlock={onAddBlockDomain}
            onRemoveBlock={onRemoveBlockDomain}
            installed={blockerInstalled}
          />
          <button
            onClick={() => onStart(duration, goalId || null, label.trim(), autoBreak)}
            className="w-full rounded-full bg-neutral-900 py-2.5 font-semibold text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Start {duration}-min session
          </button>
        </div>
      )}
    </section>
  )
}

function DomainChips({ list, onRemove, tone = 'neutral' }) {
  const cls = tone === 'block'
    ? 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300'
    : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200'
  return (
    <div className="flex flex-wrap gap-1.5">
      {list.map((d) => (
        <span key={d} className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${cls}`}>
          {d}
          <button onClick={() => onRemove?.(d)} className="opacity-60 hover:opacity-100" title="Remove">×</button>
        </span>
      ))}
    </div>
  )
}

function DomainAdder({ placeholder, onAdd }) {
  const [input, setInput] = useState('')
  function add() { if (input.trim()) { onAdd?.(input); setInput('') } }
  return (
    <div className="mb-2 flex gap-1.5">
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && add()}
        placeholder={placeholder}
        className="min-w-0 flex-1 rounded-lg border border-neutral-200 bg-transparent px-3 py-1.5 text-xs font-medium text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 dark:border-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-600 dark:focus:border-white"
      />
      <button onClick={add} className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-bold text-white dark:bg-white dark:text-neutral-900">Add</button>
    </div>
  )
}

// Focus site settings for the HabitTube Focus browser extension. Three tiers:
// allowed (load), off-limits (hard-blocked, no temp escape), everything else
// (blocked but a 10-min temp-allow is offered).
function FocusBlocker({ allowlist = [], blocklist = [], onAddAllow, onRemoveAllow, onAddBlock, onRemoveBlock, installed }) {
  const [open, setOpen] = useState(false)
  const youtubeAllowed = allowlist.includes('youtube.com')

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between px-3.5 py-2 text-left">
        <span className="flex items-center gap-1.5">
          <svg className="h-3.5 w-3.5 text-neutral-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span className="text-xs font-bold text-neutral-700 dark:text-neutral-200">Focus blocker</span>
          <span className={`ml-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${installed ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'}`}>
            {installed ? 'On' : 'Extension off'}
          </span>
        </span>
        <span className="text-xs text-neutral-400">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="space-y-4 border-t border-neutral-100 px-3.5 py-3 dark:border-neutral-800/60">
          {!installed && (
            <p className="text-[11px] leading-relaxed font-medium text-neutral-400 dark:text-neutral-500">
              Install the free <span className="font-bold text-neutral-600 dark:text-neutral-300">HabitTube Focus</span> extension (Edge → <span className="font-mono">edge://extensions</span> → Developer mode → Load unpacked → pick the <span className="font-mono">extension/</span> folder) to enforce this while you focus.
            </p>
          )}

          {/* YouTube — the classic temptation, toggled on/off */}
          <div className="flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2.5 dark:bg-neutral-900/40">
            <div>
              <p className="text-xs font-bold text-neutral-800 dark:text-neutral-100">Allow YouTube during focus</p>
              <p className="text-[10px] text-neutral-400 dark:text-neutral-500">{youtubeAllowed ? 'Allowed — loads normally' : 'Off-limits — hard-blocked, no exceptions'}</p>
            </div>
            <button
              type="button"
              onClick={() => (youtubeAllowed ? onAddBlock?.('youtube.com') : onAddAllow?.('youtube.com'))}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${youtubeAllowed ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-200 dark:bg-neutral-700'}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition dark:bg-neutral-900 ${youtubeAllowed ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>

          {/* Allowed */}
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Allowed — only these load during focus</p>
            <DomainAdder placeholder="e.g. leetcode.com" onAdd={onAddAllow} />
            {allowlist.length === 0
              ? <p className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500">No sites yet — add the resources you study on.</p>
              : <DomainChips list={allowlist} onRemove={onRemoveAllow} />}
          </div>

          {/* Off-limits */}
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Off-limits — always blocked, no temp-allow</p>
            <DomainAdder placeholder="e.g. instagram.com" onAdd={onAddBlock} />
            {blocklist.length === 0
              ? <p className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500">Nothing hard-blocked yet.</p>
              : <DomainChips list={blocklist} onRemove={onRemoveBlock} tone="block" />}
          </div>

          <p className="text-[10px] leading-relaxed text-neutral-400 dark:text-neutral-500">
            Anything not on either list is blocked too, but offers a one-time 10-minute pass for genuine lookups.
          </p>
        </div>
      )}
    </div>
  )
}
