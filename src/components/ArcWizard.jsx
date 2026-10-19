import { useState } from 'react'
import { aiGenerateArc } from '../ai'
import { activeArcs, MAX_ACTIVE_ARCS, staleDays } from '../arcs'

const THEMES = ['Get fit', 'Exam / study', 'Learn a skill', 'Reset my habits', 'Build a project', 'Career push']
const WEEKS = [4, 6, 8, 12]
const TIMES = ['30 min', '1 hour', '2 hours', '3+ hours']
const LEVELS = ['Complete beginner', 'Some experience', 'Experienced']
const OBSTACLES = ['Motivation fades', 'Too ambitious', 'No time', 'Distractions', 'Inconsistent']

const labelCls = 'mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500'
const inputCls =
  'w-full rounded-xl border border-neutral-200 bg-transparent px-4 py-2.5 font-medium text-neutral-900 outline-none transition focus:border-neutral-900 dark:border-neutral-800 dark:text-white dark:focus:border-white'
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

export default function ArcWizard({ data, aiEnabled, seed = '', onApply, onResolveArc, onClose }) {
  const [answers, setAnswers] = useState({ theme: seed, outcome: '', weeks: 4, dailyTime: '1 hour', level: '', obstacles: [], extra: '' })
  const [plan, setPlan] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const arcs = data.arcs || []
  const active = activeArcs(arcs)
  const stale = active.filter((a) => staleDays(a, data) > 0)
  const set = (patch) => setAnswers((a) => ({ ...a, ...patch }))
  const toggleObstacle = (o) =>
    set({ obstacles: answers.obstacles.includes(o) ? answers.obstacles.filter((x) => x !== o) : [...answers.obstacles, o] })

  async function generate() {
    setBusy(true)
    setError('')
    try {
      setPlan(await aiGenerateArc(answers, data, data.aiModel))
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const removeAt = (key, i) => setPlan((p) => ({ ...p, [key]: p[key].filter((_, j) => j !== i) }))

  let body
  if (stale.length) {
    // Soft gate: a quiet arc must be resumed, paused or closed before starting another.
    body = (
      <>
        <p className="mb-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">
          Before starting a new arc, deal with the one that has gone quiet:
        </p>
        {stale.map((a) => (
          <div key={a.id} className="mb-3 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
            <p className="font-bold text-neutral-900 dark:text-white">{a.title}</p>
            <p className="mb-3 text-sm text-neutral-400 dark:text-neutral-500">No activity for {staleDays(a, data)} days.</p>
            <div className="flex flex-wrap gap-2">
              <button className={ghostBtn} onClick={() => onResolveArc(a.id, 'resume')}>Resume</button>
              <button className={ghostBtn} onClick={() => onResolveArc(a.id, 'pause')}>Pause</button>
              <button className={ghostBtn} onClick={() => onResolveArc(a.id, 'close')}>Close</button>
            </div>
          </div>
        ))}
      </>
    )
  } else if (active.length >= MAX_ACTIVE_ARCS) {
    body = (
      <>
        <p className="mb-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">
          You already have {MAX_ACTIVE_ARCS} active arcs. Pause or close one to start another.
        </p>
        {active.map((a) => (
          <div key={a.id} className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
            <p className="font-bold text-neutral-900 dark:text-white">{a.title}</p>
            <div className="flex gap-2">
              <button className={ghostBtn} onClick={() => onResolveArc(a.id, 'pause')}>Pause</button>
              <button className={ghostBtn} onClick={() => onResolveArc(a.id, 'close')}>Close</button>
            </div>
          </div>
        ))}
      </>
    )
  } else if (!aiEnabled) {
    body = <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Turn AI on in Settings to generate an arc.</p>
  } else if (plan) {
    body = (
      <>
        <h3 className="text-xl font-extrabold text-neutral-900 dark:text-white">{plan.title}</h3>
        {plan.why && <p className="mt-1 text-sm font-medium text-neutral-500 dark:text-neutral-400">{plan.why}</p>}

        <label className={`${labelCls} mt-5`}>Weekly path</label>
        <ol className="space-y-1.5 text-sm">
          {plan.weeks.map((w, i) => (
            <li key={i} className="text-neutral-700 dark:text-neutral-200">
              <span className="font-bold">W{i + 1}</span> · {w.theme}
              {w.milestone && <span className="text-neutral-400 dark:text-neutral-500"> — {w.milestone}</span>}
            </li>
          ))}
        </ol>

        {plan.target && (
          <p className="mt-4 text-sm text-neutral-700 dark:text-neutral-200">
            <span className="font-bold">Target:</span> {plan.target.title} ({plan.target.n} {plan.target.unit})
          </p>
        )}

        {plan.habits.length > 0 && (
          <>
            <label className={`${labelCls} mt-5`}>Habits</label>
            {plan.habits.map((h, i) => (
              <div key={i} className="flex items-center justify-between py-1 text-sm text-neutral-700 dark:text-neutral-200">
                <span>{h.emoji} {h.name}</span>
                <button className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white" onClick={() => removeAt('habits', i)} aria-label="Remove habit">✕</button>
              </div>
            ))}
          </>
        )}

        {plan.tasks.length > 0 && (
          <>
            <label className={`${labelCls} mt-5`}>First week tasks</label>
            {plan.tasks.map((t, i) => (
              <div key={i} className="flex items-center justify-between py-1 text-sm text-neutral-700 dark:text-neutral-200">
                <span>{t.title}</span>
                <button className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white" onClick={() => removeAt('tasks', i)} aria-label="Remove task">✕</button>
              </div>
            ))}
          </>
        )}

        {plan.minDay && (
          <p className="mt-5 rounded-xl bg-neutral-100 p-3 text-sm text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
            <span className="font-bold">Minimum day:</span> {plan.minDay}
          </p>
        )}

        <div className="mt-6 flex gap-2">
          <button className={ghostBtn} onClick={generate} disabled={busy}>{busy ? 'Regenerating…' : 'Regenerate'}</button>
          <button className={primaryBtn} onClick={() => onApply(plan)}>Start this arc</button>
        </div>
      </>
    )
  } else {
    body = (
      <>
        <label className={labelCls}>What is this arc about?</label>
        <input className={inputCls} value={answers.theme} onChange={(e) => set({ theme: e.target.value })} placeholder="Name it — e.g. Winter arc, Exam sprint" maxLength={60} />
        <div className="mt-2 flex flex-wrap gap-2">
          {THEMES.map((t) => (
            <button key={t} type="button" className={chip(answers.theme === t)} onClick={() => set({ theme: t })}>{t}</button>
          ))}
        </div>

        <label className={`${labelCls} mt-5`}>What does success look like?</label>
        <input className={inputCls} value={answers.outcome} onChange={(e) => set({ outcome: e.target.value })} placeholder="A number if you can — e.g. run 5 km, 120 study hours" maxLength={120} />

        <label className={`${labelCls} mt-5`}>How long?</label>
        <div className="flex flex-wrap gap-2">
          {WEEKS.map((w) => (
            <button key={w} type="button" className={chip(answers.weeks === w)} onClick={() => set({ weeks: w })}>{w} weeks</button>
          ))}
        </div>

        <label className={`${labelCls} mt-5`}>Time you can give daily</label>
        <div className="flex flex-wrap gap-2">
          {TIMES.map((t) => (
            <button key={t} type="button" className={chip(answers.dailyTime === t)} onClick={() => set({ dailyTime: t })}>{t}</button>
          ))}
        </div>

        <label className={`${labelCls} mt-5`}>Where are you starting from?</label>
        <div className="flex flex-wrap gap-2">
          {LEVELS.map((l) => (
            <button key={l} type="button" className={chip(answers.level === l)} onClick={() => set({ level: l })}>{l}</button>
          ))}
        </div>

        <label className={`${labelCls} mt-5`}>What got in the way before? (optional)</label>
        <div className="flex flex-wrap gap-2">
          {OBSTACLES.map((o) => (
            <button key={o} type="button" className={chip(answers.obstacles.includes(o))} onClick={() => toggleObstacle(o)}>{o}</button>
          ))}
        </div>

        <label className={`${labelCls} mt-5`}>Anything the plan should know? (optional)</label>
        <textarea
          className={`${inputCls} resize-none`}
          rows={3}
          maxLength={400}
          value={answers.extra}
          onChange={(e) => set({ extra: e.target.value })}
          placeholder="Current routine, equipment, injuries, exam date, what you want to avoid…"
        />

        {error && <p className="mt-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">{error}</p>}
        <button className={`${primaryBtn} mt-6`} onClick={generate} disabled={busy || !answers.theme.trim()}>
          {busy ? 'Designing your arc…' : 'Generate my arc'}
        </button>
      </>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm dark:bg-black/60"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-neutral-900">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-neutral-900 dark:text-white">Start an arc</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white" aria-label="Close">✕</button>
        </div>
        {body}
      </div>
    </div>
  )
}
