import { useState } from 'react'
import { currentPeriods, periodLabel } from '../planUtils'
import Select from './Select'

const TIMEFRAMES = [
  { level: 'week', label: 'This week' },
  { level: 'month', label: 'This month' },
  { level: 'quarter', label: 'This quarter' },
  { level: 'year', label: 'This year' },
]

const MEASURES = [
  { id: 'checklist', label: 'Just check it off', hint: 'Done or not done.' },
  { id: 'numeric', label: 'Count to a number', hint: 'e.g. save $500, read 12 books.' },
  { id: 'habit', label: 'Tie it to a habit', hint: 'Fills as you complete a habit.' },
]

export default function GoalWizard({ habits, onCreate, onClose }) {
  const periods = currentPeriods()
  const [title, setTitle] = useState('')
  const [level, setLevel] = useState('quarter')
  const [measure, setMeasure] = useState('checklist')
  const [target, setTarget] = useState(10)
  const [unit, setUnit] = useState('')
  const [habitId, setHabitId] = useState(habits[0]?.id || '')
  const [habitTarget, setHabitTarget] = useState(20)

  function submit(e) {
    e.preventDefault()
    if (!title.trim()) return
    if (measure === 'habit' && !habitId) return
    onCreate({
      level,
      period: periods[level],
      title: title.trim(),
      type: measure,
      target: Number(target) || 0,
      unit: unit.trim(),
      habitId: measure === 'habit' ? habitId : null,
      habitTarget: Number(habitTarget) || 0,
    })
  }

  const labelCls = 'mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500'
  const inputCls =
    'w-full rounded-xl border border-neutral-200 bg-transparent px-4 py-2.5 font-medium text-neutral-900 outline-none transition focus:border-neutral-900 dark:border-neutral-800 dark:text-white dark:focus:border-white'
  const pick = (active) =>
    `rounded-xl px-3 py-2.5 text-sm font-bold transition ${
      active
        ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
        : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'
    }`

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm dark:bg-black/60"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={submit}
        className="animate-fade-up max-h-[88vh] w-full max-w-md overflow-y-auto rounded-3xl border border-neutral-200 bg-white p-7 shadow-2xl dark:border-neutral-800 dark:bg-[#111]"
      >
        <h2 className="mb-1 text-xl font-extrabold tracking-tight text-neutral-900 dark:text-white">New goal</h2>
        <p className="mb-6 text-sm font-medium text-neutral-400 dark:text-neutral-500">
          Three quick choices — we’ll file it on the right level for you.
        </p>

        <label className={labelCls}>1 · What do you want to achieve?</label>
        <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Run a 10K" className={`mb-5 ${inputCls}`} />

        <label className={labelCls}>2 · By when?</label>
        <div className="mb-1.5 grid grid-cols-2 gap-1.5">
          {TIMEFRAMES.map((t) => (
            <button key={t.level} type="button" onClick={() => setLevel(t.level)} className={pick(level === t.level)}>
              {t.label}
            </button>
          ))}
        </div>
        <p className="mb-5 text-xs font-medium text-neutral-400 dark:text-neutral-500">
          Filed under {periodLabel(level, periods[level])}.
        </p>

        <label className={labelCls}>3 · How will you measure it?</label>
        <div className="mb-1.5 grid gap-1.5">
          {MEASURES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMeasure(m.id)}
              disabled={m.id === 'habit' && habits.length === 0}
              className={`flex items-center justify-between ${pick(measure === m.id)} disabled:cursor-not-allowed disabled:opacity-40`}
            >
              <span>{m.label}</span>
              <span className={`text-xs font-medium ${measure === m.id ? 'text-neutral-300 dark:text-neutral-500' : 'text-neutral-400'}`}>
                {m.id === 'habit' && habits.length === 0 ? 'no habits yet' : m.hint}
              </span>
            </button>
          ))}
        </div>

        {measure === 'numeric' && (
          <div className="mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Reach this number</label>
                <input type="number" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="50" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Of what?</label>
                <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="km / $ / books" className={inputCls} />
              </div>
            </div>
            <p className="mt-2 text-xs font-medium text-neutral-400 dark:text-neutral-500">
              e.g. reach <span className="font-bold">50 km</span>, <span className="font-bold">5000 $</span>, or <span className="font-bold">12 books</span>. You’ll tap +/− to count up.
            </p>
          </div>
        )}

        {measure === 'habit' && (
          <div className="mt-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className={labelCls}>Which habit?</label>
                <Select value={habitId} onChange={(e) => setHabitId(e.target.value)}>
                  {habits.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.emoji} {h.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className={labelCls}>How many times</label>
                <input type="number" value={habitTarget} onChange={(e) => setHabitTarget(e.target.value)} className={inputCls} />
              </div>
            </div>
            <p className="mt-2 text-xs font-medium text-neutral-400 dark:text-neutral-500">
              Counts up automatically each time you check that habit off.
            </p>
          </div>
        )}

        <div className="mt-7 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-neutral-200 py-2.5 font-semibold text-neutral-600 transition hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!title.trim()}
            className="flex-1 rounded-full bg-neutral-900 py-2.5 font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-40 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Create goal
          </button>
        </div>
      </form>
    </div>
  )
}
