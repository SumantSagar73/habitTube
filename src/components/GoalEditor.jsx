import { useState } from 'react'
import { LEVEL_LABEL, periodLabel } from '../planUtils'
import Select from './Select'

const TYPES = [
  { id: 'checklist', label: 'Checklist', hint: 'Done / not done (or rolls up from sub-goals & tasks)' },
  { id: 'numeric', label: 'Numeric', hint: 'Track a number toward a target' },
  { id: 'habit', label: 'Habit-linked', hint: 'Driven by an existing habit’s completions' },
]

export default function GoalEditor({ initial, level, period, parents, habits, defaultColor, defaultParentId, onSave, onClose }) {
  const [title, setTitle] = useState(initial?.title || '')
  const [type, setType] = useState(initial?.type || 'checklist')
  const [parentId, setParentId] = useState(initial?.parentId || defaultParentId || '')
  const [target, setTarget] = useState(initial?.target ?? 10)
  const [current, setCurrent] = useState(initial?.current ?? 0)
  const [unit, setUnit] = useState(initial?.unit || '')
  const [habitId, setHabitId] = useState(initial?.habitId || habits[0]?.id || '')
  const [habitTarget, setHabitTarget] = useState(initial?.habitTarget ?? 20)

  function submit(e) {
    e.preventDefault()
    if (!title.trim()) return
    if (type === 'habit' && !habitId) return
    onSave({
      title: title.trim(),
      type,
      parentId: parentId || null,
      color: initial?.color || defaultColor || '#171717',
      target: Number(target) || 0,
      current: Number(current) || 0,
      unit: unit.trim(),
      habitId: type === 'habit' ? habitId : null,
      habitTarget: Number(habitTarget) || 0,
    })
  }

  const labelCls = 'mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500'
  const inputCls =
    'w-full rounded-xl border border-neutral-200 bg-transparent px-4 py-2.5 font-medium text-neutral-900 outline-none transition focus:border-neutral-900 dark:border-neutral-800 dark:text-white dark:focus:border-white'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm dark:bg-black/60"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={submit}
        className="animate-fade-up max-h-[88vh] w-full max-w-md overflow-y-auto rounded-3xl border border-neutral-200 bg-white p-7 shadow-2xl dark:border-neutral-800 dark:bg-[#111]"
      >
        <h2 className="text-xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
          {initial ? 'Edit goal' : `New ${LEVEL_LABEL[level].toLowerCase()} goal`}
        </h2>
        <p className="mb-6 mt-1 text-sm font-medium text-neutral-400 dark:text-neutral-500">
          {LEVEL_LABEL[level]} · {periodLabel(level, period)}
        </p>

        <label className={labelCls}>Title</label>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Run a 10K"
          className={`mb-5 ${inputCls}`}
        />

        <label className={labelCls}>Type</label>
        <div className="mb-2 grid grid-cols-3 gap-1.5">
          {TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setType(t.id)}
              disabled={t.id === 'habit' && habits.length === 0}
              className={`rounded-xl py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                type === t.id
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                  : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="mb-5 text-xs font-medium text-neutral-400 dark:text-neutral-500">
          {TYPES.find((t) => t.id === type).hint}
        </p>

        {type === 'numeric' && (
          <>
            <div className="mb-1.5 grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Start at</label>
                <input type="number" value={current} onChange={(e) => setCurrent(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Reach</label>
                <input type="number" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="50" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Of what?</label>
                <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="km / $" className={inputCls} />
              </div>
            </div>
            <p className="mb-5 text-xs font-medium text-neutral-400 dark:text-neutral-500">
              e.g. go from <span className="font-bold">0</span> to <span className="font-bold">50 km</span>.
            </p>
          </>
        )}

        {type === 'habit' && (
          <div className="mb-5 grid grid-cols-3 gap-3">
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
              <label className={labelCls}>How many</label>
              <input type="number" value={habitTarget} onChange={(e) => setHabitTarget(e.target.value)} className={inputCls} />
            </div>
          </div>
        )}

        {parents.length > 0 && (
          <>
            <label className={labelCls}>
              Ladders up to <span className="font-normal normal-case tracking-normal">(optional)</span>
            </label>
            <Select value={parentId} onChange={(e) => setParentId(e.target.value)} className="mb-6">
              <option value="">— standalone —</option>
              {parents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </Select>
          </>
        )}

        <div className="flex gap-3">
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
            {initial ? 'Save' : 'Create goal'}
          </button>
        </div>
      </form>
    </div>
  )
}
