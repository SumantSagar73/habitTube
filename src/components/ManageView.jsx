import { useRef, useState } from 'react'
import { bestStreak, currentStreak, habitRate, WEEKDAYS } from '../utils'
import HabitGrid from './HabitGrid'
import HabitTemplates from './HabitTemplates'

export default function ManageView({ habits, completions, onOpen, onEdit, onDelete, onAdd, onToggleOn, onReorder, onInstallPack }) {
  const [view, setView] = useState('list')
  const [showTemplates, setShowTemplates] = useState(false)
  const dragId = useRef(null)
  const dragOverId = useRef(null)

  function handleDragStart(id) { dragId.current = id }
  function handleDragOver(e, id) { e.preventDefault(); dragOverId.current = id }
  function handleDrop() {
    if (!dragId.current || dragId.current === dragOverId.current) return
    const from = habits.findIndex((h) => h.id === dragId.current)
    const to = habits.findIndex((h) => h.id === dragOverId.current)
    if (from === -1 || to === -1) return
    const next = [...habits]
    next.splice(to, 0, next.splice(from, 1)[0])
    onReorder(next)
    dragId.current = null
    dragOverId.current = null
  }

  if (habits.length === 0) {
    return (
      <>
        <div className="rounded-3xl border border-dashed border-neutral-300 p-12 text-center dark:border-neutral-700">
          <p className="mb-1 font-bold text-neutral-900 dark:text-white">No habits yet</p>
          <p className="mb-6 text-sm font-medium text-neutral-400 dark:text-neutral-500">
            Start small — one tiny habit done daily beats ten abandoned ones.
          </p>
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={onAdd}
              className="rounded-full bg-neutral-900 px-6 py-2.5 font-semibold text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              + Create your first habit
            </button>
            <button
              onClick={() => setShowTemplates(true)}
              className="text-sm font-semibold text-neutral-400 transition hover:text-neutral-700 dark:hover:text-neutral-200"
            >
              Or browse habit library →
            </button>
          </div>
        </div>
        {showTemplates && (
          <HabitTemplates existingHabits={habits} onInstall={onInstallPack} onClose={() => setShowTemplates(false)} />
        )}
      </>
    )
  }

  return (
    <div className="space-y-2.5">
      {/* list / grid toggle */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500">
          {view === 'list' ? 'Drag to reorder · click to open heatmap.' : 'Tap cells to tick habits across the days.'}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTemplates(true)}
            className="rounded-full border border-neutral-200 px-3.5 py-1.5 text-xs font-bold text-neutral-600 transition hover:border-neutral-400 dark:border-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-600"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            Library
          </button>
          <div className="flex gap-1 rounded-full border border-neutral-200 p-1 dark:border-neutral-800">
            {[['list', 'List'], ['grid', 'Grid']].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setView(id)}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                  view === id
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                    : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {view === 'grid' && <HabitGrid habits={habits} completions={completions} onToggleOn={onToggleOn} />}

      {view === 'list' && habits.map((h) => {
        const streak = currentStreak(h, completions)
        const best = bestStreak(h, completions)
        const rate = habitRate(h, completions, 30)
        return (
          <div
            key={h.id}
            draggable
            onDragStart={() => handleDragStart(h.id)}
            onDragOver={(e) => handleDragOver(e, h.id)}
            onDrop={handleDrop}
            onClick={() => onOpen(h)}
            className="flex cursor-pointer flex-wrap items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-4 transition hover:border-neutral-400 dark:border-neutral-800 dark:bg-[#111] dark:hover:border-neutral-600"
          >
            {/* drag handle */}
            <span
              className="shrink-0 cursor-grab text-neutral-300 dark:text-neutral-700 active:cursor-grabbing"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
              </svg>
            </span>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-2xl dark:bg-neutral-800">
              {h.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-neutral-900 dark:text-white">{h.name}</p>
              <p className="text-xs font-medium text-neutral-400 dark:text-neutral-500">
                {h.days.length === 7 ? 'Every day' : h.days.map((d) => WEEKDAYS[d]).join(' · ')}
                {h.time && ` · ${h.time}`}
              </p>
            </div>

            <div className="flex items-center gap-6 text-center">
              <div>
                <p className="text-lg font-extrabold tracking-tight text-neutral-900 dark:text-white">{streak}</p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-400">streak</p>
              </div>
              <div>
                <p className="text-lg font-extrabold tracking-tight text-neutral-900 dark:text-white">{best}</p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-400">best</p>
              </div>
              <div>
                <p className="text-lg font-extrabold tracking-tight text-neutral-900 dark:text-white">{rate}%</p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-400">30 days</p>
              </div>
            </div>

            <div className="flex gap-1.5">
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(h) }}
                title="Edit"
                className="rounded-lg p-2 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white"
              >
                <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(h) }}
                title="Delete"
                className="rounded-lg p-2 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white"
              >
                <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        )
      })}

      {showTemplates && (
        <HabitTemplates existingHabits={habits} onInstall={onInstallPack} onClose={() => setShowTemplates(false)} />
      )}
    </div>
  )
}
