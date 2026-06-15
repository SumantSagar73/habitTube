import { useState } from 'react'
import { goalPercent, LEVEL_LABEL, numericCurrent, periodLabel } from '../planUtils'

const RANK = { year: 0, quarter: 1, month: 2, week: 3 }
const sortFn = (a, b) =>
  RANK[a.level] - RANK[b.level] || a.period.localeCompare(b.period) || a.createdAt.localeCompare(b.createdAt)

function build(goals) {
  const ids = new Set(goals.map((g) => g.id))
  const byParent = new Map()
  const roots = []
  for (const g of goals) {
    if (g.parentId && ids.has(g.parentId)) {
      if (!byParent.has(g.parentId)) byParent.set(g.parentId, [])
      byParent.get(g.parentId).push(g)
    } else {
      roots.push(g)
    }
  }
  const childrenOf = (id) => (byParent.get(id) || []).slice().sort(sortFn)
  return { roots: roots.slice().sort(sortFn), childrenOf }
}

function Node({ goal, depth, childrenOf, expanded, toggle, ctx, onEdit, onDelete, onUpdate, onAddSub }) {
  const kids = childrenOf(goal.id)
  const hasKids = kids.length > 0
  const open = expanded.has(goal.id)
  const pct = goalPercent(goal, ctx)
  const linkedTasks = Object.values(ctx.tasks).some((arr) => arr.some((t) => t.goalId === goal.id))
  const showCheckbox = goal.type === 'checklist' && !hasKids && !linkedTasks && goal.manualPct == null
  const showStepper = goal.type === 'numeric' && goal.manualPct == null

  return (
    <>
      <div
        className="group flex items-center gap-2 rounded-lg py-2 pr-1.5 transition hover:bg-neutral-50 dark:hover:bg-neutral-800/40"
        style={{ paddingLeft: depth * 20 + 4 }}
      >
        {hasKids ? (
          <button
            onClick={() => toggle(goal.id)}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-neutral-400 transition hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            {open ? '▾' : '▸'}
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}

        {showCheckbox ? (
          <button
            onClick={() => onUpdate(goal.id, { done: !goal.done })}
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition ${
              goal.done ? 'border-neutral-900 bg-neutral-900 dark:border-white dark:bg-white' : 'border-neutral-300 dark:border-neutral-600'
            }`}
          >
            {goal.done && (
              <svg className="h-3 w-3 text-white dark:text-neutral-900" viewBox="0 0 20 20" fill="none">
                <path d="M5 10.5l3.5 3.5L15 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        ) : (
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: goal.color }} />
        )}

        <span className="hidden w-14 shrink-0 text-[10px] font-bold uppercase tracking-[0.08em] text-neutral-400 sm:block dark:text-neutral-500">
          {LEVEL_LABEL[goal.level]}
        </span>

        <button onClick={() => onEdit(goal)} className="min-w-0 flex-1 truncate text-left">
          <span className={`font-semibold ${goal.done && showCheckbox ? 'text-neutral-400 line-through dark:text-neutral-600' : 'text-neutral-800 dark:text-neutral-100'}`}>
            {goal.title}
          </span>
          <span className="ml-2 text-xs font-medium text-neutral-400 dark:text-neutral-500">{periodLabel(goal.level, goal.period)}</span>
        </button>

        {showStepper ? (
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              onClick={() => onUpdate(goal.id, { current: Math.max(0, (goal.current || 0) - 1) })}
              className="flex h-6 w-6 items-center justify-center rounded-md border border-neutral-200 text-sm font-bold text-neutral-500 transition hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-300"
            >
              −
            </button>
            <span className="min-w-[64px] text-center text-xs font-bold tabular-nums text-neutral-700 dark:text-neutral-200">
              {goal.current || 0}/{goal.target} {goal.unit}
            </span>
            <button
              onClick={() => onUpdate(goal.id, { current: (goal.current || 0) + 1 })}
              className="flex h-6 w-6 items-center justify-center rounded-md border border-neutral-200 text-sm font-bold text-neutral-500 transition hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-300"
            >
              +
            </button>
          </div>
        ) : goal.type === 'habit' ? (
          <span className="hidden shrink-0 text-xs font-semibold text-neutral-400 sm:block dark:text-neutral-500">
            {numericCurrent(goal, ctx)}/{goal.habitTarget}
          </span>
        ) : (
          <span className="hidden h-2 w-20 overflow-hidden rounded-full bg-neutral-100 sm:block dark:bg-neutral-800">
            <span className="block h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: goal.color }} />
          </span>
        )}

        <span className="w-9 shrink-0 text-right text-sm font-extrabold tabular-nums text-neutral-900 dark:text-white">{pct}%</span>

        <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
          {goal.level !== 'week' && (
            <button
              onClick={() => onAddSub(goal)}
              title="Add a goal under this"
              className="flex h-6 w-6 items-center justify-center rounded-md text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-700 dark:hover:text-white"
            >
              +
            </button>
          )}
          <button
            onClick={() => onDelete(goal)}
            title="Delete"
            className="flex h-6 w-6 items-center justify-center rounded-md text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-700 dark:hover:text-white"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" />
            </svg>
          </button>
        </span>
      </div>

      {open && kids.map((k) => (
        <Node
          key={k.id}
          goal={k}
          depth={depth + 1}
          childrenOf={childrenOf}
          expanded={expanded}
          toggle={toggle}
          ctx={ctx}
          onEdit={onEdit}
          onDelete={onDelete}
          onUpdate={onUpdate}
          onAddSub={onAddSub}
        />
      ))}
    </>
  )
}

export default function PlanTree({ goals, ctx, onEdit, onDelete, onUpdate, onAddSub }) {
  const { roots, childrenOf } = build(goals)
  // expand the first root by default so the tree doesn't look empty/flat
  const [expanded, setExpanded] = useState(() => new Set(roots[0] ? [roots[0].id] : []))
  const toggle = (id) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  return (
    <section className="rounded-3xl border border-neutral-200 px-3 py-2 dark:border-neutral-800 dark:bg-[#111] sm:px-5">
      {roots.map((g) => (
        <Node
          key={g.id}
          goal={g}
          depth={0}
          childrenOf={childrenOf}
          expanded={expanded}
          toggle={toggle}
          ctx={ctx}
          onEdit={onEdit}
          onDelete={onDelete}
          onUpdate={onUpdate}
          onAddSub={onAddSub}
        />
      ))}
    </section>
  )
}
