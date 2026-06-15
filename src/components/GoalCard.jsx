import { useState } from 'react'
import { goalPercent, numericCurrent } from '../planUtils'

export default function GoalCard({ goal, ctx, parentTitle, onUpdate, onEdit, onDelete }) {
  const [overriding, setOverriding] = useState(false)
  const [draft, setDraft] = useState('')
  const pct = goalPercent(goal, ctx)
  const overridden = goal.manualPct != null

  function saveOverride() {
    const v = Math.max(0, Math.min(100, Math.round(Number(draft))))
    onUpdate(goal.id, { manualPct: Number.isFinite(v) ? v : null })
    setOverriding(false)
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-[#111]">
      <div className="flex items-start gap-3">
        <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: goal.color }} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-bold text-neutral-900 dark:text-white">{goal.title}</p>
            <span className="shrink-0 rounded-full border border-neutral-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-neutral-400 dark:border-neutral-700 dark:text-neutral-500">
              {goal.type}
            </span>
          </div>
          {parentTitle && (
            <p className="mt-0.5 truncate text-xs font-medium text-neutral-400 dark:text-neutral-500">
              ↳ advances: {parentTitle}
            </p>
          )}
        </div>
        <span className="shrink-0 text-lg font-extrabold tabular-nums tracking-tight text-neutral-900 dark:text-white">
          {pct}%
        </span>
      </div>

      {/* progress bar */}
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: goal.color }}
        />
      </div>

      {/* type-specific controls */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {goal.type === 'numeric' && !overridden && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onUpdate(goal.id, { current: Math.max(0, (goal.current || 0) - 1) })}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-200 font-bold text-neutral-600 transition hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-300"
            >
              −
            </button>
            <span className="min-w-[78px] text-center text-sm font-bold tabular-nums text-neutral-900 dark:text-white">
              {goal.current || 0} / {goal.target} {goal.unit}
            </span>
            <button
              onClick={() => onUpdate(goal.id, { current: (goal.current || 0) + 1 })}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-200 font-bold text-neutral-600 transition hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-300"
            >
              +
            </button>
          </div>
        )}

        {goal.type === 'habit' && (
          <span className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">
            {numericCurrent(goal, ctx)} / {goal.habitTarget} completions
          </span>
        )}

        {goal.type === 'checklist' && !overridden && (
          ctx.goals.some((g) => g.parentId === goal.id) ||
          Object.values(ctx.tasks).some((arr) => arr.some((t) => t.goalId === goal.id)) ? (
            <span className="text-sm font-medium text-neutral-400 dark:text-neutral-500">
              rolls up from {ctx.goals.filter((g) => g.parentId === goal.id).length} sub-goal(s) & linked tasks
            </span>
          ) : (
            <button
              onClick={() => onUpdate(goal.id, { done: !goal.done })}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                goal.done
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                  : 'border border-neutral-200 text-neutral-600 hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-300'
              }`}
            >
              {goal.done ? '✓ Done' : 'Mark done'}
            </button>
          )
        )}

        {/* hybrid manual override */}
        <div className="ml-auto flex items-center gap-1.5">
          {overriding ? (
            <>
              <input
                autoFocus
                type="number"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveOverride()}
                placeholder="%"
                className="w-16 rounded-lg border border-neutral-200 bg-transparent px-2 py-1 text-sm font-bold text-neutral-900 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:text-white"
              />
              <button onClick={saveOverride} className="rounded-lg bg-neutral-900 px-2.5 py-1 text-xs font-bold text-white dark:bg-white dark:text-neutral-900">
                Set
              </button>
            </>
          ) : overridden ? (
            <button
              onClick={() => onUpdate(goal.id, { manualPct: null })}
              title="Clear manual override, go back to auto"
              className="rounded-full border border-neutral-200 px-2.5 py-1 text-[11px] font-bold text-neutral-500 transition hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-400"
            >
              manual · reset to auto
            </button>
          ) : (
            <button
              onClick={() => {
                setDraft(String(pct))
                setOverriding(true)
              }}
              title="Override percent manually"
              className="text-neutral-300 transition hover:text-neutral-600 dark:text-neutral-600 dark:hover:text-neutral-300"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          )}
          <button
            onClick={() => onEdit(goal)}
            className="text-neutral-300 transition hover:text-neutral-600 dark:text-neutral-600 dark:hover:text-neutral-300"
            title="Edit goal"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(goal)}
            className="text-neutral-300 transition hover:text-neutral-600 dark:text-neutral-600 dark:hover:text-neutral-300"
            title="Delete goal"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
