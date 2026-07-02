import { useState } from 'react'
import { EMOJIS } from '../palette'
import { WEEKDAYS } from '../utils'

export default function HabitModal({ initial, habits = [], onSave, onClose }) {
  const [name, setName] = useState(initial?.name || '')
  const [emoji, setEmoji] = useState(initial?.emoji || '💪')
  const [days, setDays] = useState(initial?.days || [0, 1, 2, 3, 4, 5, 6])
  const [time, setTime] = useState(initial?.time || '')
  const [stackAfter, setStackAfter] = useState(initial?.stackAfter || '')

  function toggleDay(i) {
    setDays((prev) => (prev.includes(i) ? prev.filter((d) => d !== i) : [...prev, i].sort()))
  }

  function submit(e) {
    e.preventDefault()
    if (!name.trim() || days.length === 0) return
    onSave({ name: name.trim(), emoji, days, time, stackAfter: stackAfter || null, color: initial?.color || '#171717' })
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
        className="animate-fade-up w-full max-w-md overflow-y-auto rounded-3xl border border-neutral-200 bg-white p-7 shadow-2xl dark:border-neutral-800 dark:bg-[#111]"
        style={{ maxHeight: '90dvh' }}
      >
        <h2 className="mb-6 text-xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
          {initial ? 'Edit habit' : 'New habit'}
        </h2>

        <label className={labelCls}>Name</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Read 20 minutes"
          className={`mb-5 ${inputCls}`}
        />

        <label className={labelCls}>Icon</label>
        <div className="mb-5 grid grid-cols-8 gap-1.5">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(e)}
              className={`rounded-lg p-1.5 text-xl transition hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
                emoji === e ? 'bg-neutral-100 ring-2 ring-neutral-900 dark:bg-neutral-800 dark:ring-white' : ''
              }`}
            >
              {e}
            </button>
          ))}
        </div>

        <label className={labelCls}>Repeat on</label>
        <div className="mb-5 flex gap-1.5">
          {WEEKDAYS.map((d, i) => (
            <button
              key={d}
              type="button"
              onClick={() => toggleDay(i)}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
                days.includes(i)
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                  : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        <label className={labelCls}>
          Reminder time <span className="font-normal normal-case tracking-normal">(optional)</span>
        </label>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className={`mb-5 ${inputCls} dark:[color-scheme:dark]`}
        />

        {habits.filter((h) => h.id !== initial?.id).length > 0 && (
          <>
            <label className={labelCls}>
              Habit stack <span className="font-normal normal-case tracking-normal">(optional — do this right after)</span>
            </label>
            <select
              value={stackAfter}
              onChange={(e) => setStackAfter(e.target.value)}
              className={`mb-7 ${inputCls} dark:[color-scheme:dark]`}
            >
              <option value="">None</option>
              {habits.filter((h) => h.id !== initial?.id).map((h) => (
                <option key={h.id} value={h.id}>{h.emoji} {h.name}</option>
              ))}
            </select>
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
            disabled={!name.trim() || days.length === 0}
            className="flex-1 rounded-full bg-neutral-900 py-2.5 font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-40 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            {initial ? 'Save changes' : 'Create habit'}
          </button>
        </div>
      </form>
    </div>
  )
}
