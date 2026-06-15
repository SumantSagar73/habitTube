import { useState, useMemo } from 'react'
import { goalPercent, LEVEL_LABEL, numericCurrent, periodLabel } from '../planUtils'

const RANK = { year: 0, quarter: 1, month: 2, week: 3 }
const sortFn = (a, b) =>
  RANK[a.level] - RANK[b.level] || a.period.localeCompare(b.period) || a.createdAt.localeCompare(b.createdAt)

function build(goals, searchQuery, filterLevel, filterStatus) {
  // Filter goals first
  let filtered = goals
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase()
    filtered = filtered.filter(g => g.title.toLowerCase().includes(q))
  }
  if (filterLevel !== 'all') {
    filtered = filtered.filter(g => g.level === filterLevel)
  }

  // Create a fast lookup for checking if node is in the search match
  const matchedIds = new Set(filtered.map(g => g.id))
  
  // If we are filtering, we also want to keep parents of matched nodes so the hierarchy is complete
  const keptIds = new Set()
  const walkUp = (id) => {
    if (!id || keptIds.has(id)) return
    keptIds.add(id)
    const node = goals.find(g => g.id === id)
    if (node && node.parentId) walkUp(node.parentId)
  }
  filtered.forEach(g => walkUp(g.id))

  const activeGoals = goals.filter(g => keptIds.has(g.id))
  const ids = new Set(activeGoals.map((g) => g.id))
  const byParent = new Map()
  const roots = []

  for (const g of activeGoals) {
    if (g.parentId && ids.has(g.parentId)) {
      if (!byParent.has(g.parentId)) byParent.set(g.parentId, [])
      byParent.get(g.parentId).push(g)
    } else {
      roots.push(g)
    }
  }

  const childrenOf = (id) => (byParent.get(id) || []).slice().sort(sortFn)
  return { roots: roots.slice().sort(sortFn), childrenOf, matchedIds }
}

function Node({ 
  goal, 
  depth, 
  childrenOf, 
  matchedIds,
  expanded, 
  toggle, 
  ctx, 
  onEdit, 
  onDelete, 
  onUpdate, 
  onAddSub 
}) {
  const kids = childrenOf(goal.id)
  const hasKids = kids.length > 0
  const open = expanded.has(goal.id)
  const pct = goalPercent(goal, ctx)
  const linkedTasks = Object.values(ctx.tasks).some((arr) => arr.some((t) => t.goalId === goal.id))
  
  const showCheckbox = goal.type === 'checklist' && !hasKids && !linkedTasks && goal.manualPct == null
  const showStepper = goal.type === 'numeric' && goal.manualPct == null

  const isMatched = matchedIds.has(goal.id)

  // Circular progress SVG variables
  const radius = 10
  const circ = 2 * Math.PI * radius
  const strokeDashoffset = circ - (pct / 100) * circ

  return (
    <div className="relative">
      {/* Indentation lines overlay */}
      {Array.from({ length: depth }).map((_, i) => (
        <div 
          key={i} 
          className="absolute top-0 bottom-0 border-l border-neutral-200/80 dark:border-neutral-800/80" 
          style={{ left: i * 24 + 11 }} 
        />
      ))}

      <div
        className={`group relative flex items-center gap-3 rounded-2xl py-2.5 pr-2 transition-all duration-200 hover:bg-neutral-50/80 dark:hover:bg-neutral-850/60 ${
          isMatched ? 'bg-transparent' : 'opacity-60 hover:opacity-100'
        }`}
        style={{ paddingLeft: depth * 24 + 4 }}
      >
        {/* Toggle Collapse button */}
        {hasKids ? (
          <button
            onClick={() => toggle(goal.id)}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-neutral-100/50 text-neutral-400 transition hover:bg-neutral-200/60 hover:text-neutral-700 dark:bg-neutral-800/40 dark:hover:bg-neutral-700/60 dark:hover:text-neutral-200"
          >
            <svg 
              className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        ) : (
          <div className="flex h-6 w-6 shrink-0 items-center justify-center">
            <span className="h-1.5 w-1.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
          </div>
        )}

        {/* Checkbox or Color dot */}
        {showCheckbox ? (
          <button
            onClick={() => onUpdate(goal.id, { done: !goal.done })}
            className={`flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-lg border-2 transition-all ${
              goal.done 
                ? 'border-neutral-900 bg-neutral-900 dark:border-white dark:bg-white' 
                : 'border-neutral-300 hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-500'
            }`}
          >
            {goal.done && (
              <svg className="h-3.5 w-3.5 text-white dark:text-neutral-900" viewBox="0 0 20 20" fill="none">
                <path d="M5 10.5l3.5 3.5L15 7" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        ) : (
          <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/5 dark:border-white/10" style={{ backgroundColor: goal.color }} />
        )}

        {/* Level Badge */}
        <span 
          className="hidden rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider md:block shrink-0"
          style={{ 
            backgroundColor: `${goal.color}15`, 
            color: goal.color,
            border: `1px solid ${goal.color}30`
          }}
        >
          {LEVEL_LABEL[goal.level]}
        </span>

        {/* Title & Period */}
        <button onClick={() => onEdit(goal)} className="min-w-0 flex-1 text-left">
          <span className={`block truncate font-bold text-sm tracking-tight transition ${
            goal.done && showCheckbox 
              ? 'text-neutral-400 line-through dark:text-neutral-600' 
              : 'text-neutral-800 dark:text-neutral-100 group-hover:text-neutral-950 dark:group-hover:text-white'
          }`}>
            {goal.title}
          </span>
          <span className="block text-[10px] font-semibold text-neutral-400 dark:text-neutral-500">
            {periodLabel(goal.level, goal.period)}
          </span>
        </button>

        {/* Stepper / Habit Status */}
        {showStepper ? (
          <div className="flex shrink-0 items-center gap-1 rounded-xl bg-neutral-100/50 p-1 dark:bg-neutral-800/40">
            <button
              onClick={() => onUpdate(goal.id, { current: Math.max(0, (goal.current || 0) - 1) })}
              className="flex h-5 w-5 items-center justify-center rounded-lg border border-neutral-200 bg-white text-xs font-extrabold text-neutral-500 transition hover:bg-neutral-55 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
            >
              −
            </button>
            <span className="min-w-[60px] text-center text-[11px] font-bold tabular-nums text-neutral-700 dark:text-neutral-200">
              {goal.current || 0}/{goal.target} <span className="text-[10px] text-neutral-400 font-medium">{goal.unit}</span>
            </span>
            <button
              onClick={() => onUpdate(goal.id, { current: (goal.current || 0) + 1 })}
              className="flex h-5 w-5 items-center justify-center rounded-lg border border-neutral-200 bg-white text-xs font-extrabold text-neutral-500 transition hover:bg-neutral-55 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
            >
              +
            </button>
          </div>
        ) : goal.type === 'habit' ? (
          <span className="hidden rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-bold tabular-nums text-neutral-550 sm:block dark:bg-neutral-800 dark:text-neutral-400">
            {numericCurrent(goal, ctx)}/{goal.habitTarget}
          </span>
        ) : (
          <div className="hidden items-center gap-1 sm:flex shrink-0">
            {/* SVG Circle Progress */}
            <svg className="h-6 w-6" viewBox="0 0 24 24">
              <circle className="text-neutral-100 dark:text-neutral-800" strokeWidth="2.5" stroke="currentColor" fill="transparent" r={radius} cx="12" cy="12" />
              <circle 
                style={{ strokeDasharray: circ, strokeDashoffset, transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
                strokeWidth="2.5" 
                strokeLinecap="round" 
                stroke={goal.color} 
                fill="transparent" 
                r={radius} 
                cx="12" 
                cy="12" 
              />
            </svg>
          </div>
        )}

        {/* Percent Pill */}
        <span className="w-11 shrink-0 text-right text-xs font-extrabold tabular-nums text-neutral-800 dark:text-white">
          {pct}%
        </span>

        {/* Hover Quick Actions */}
        <span className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          {goal.level !== 'week' && (
            <button
              onClick={() => onAddSub(goal)}
              title={`Add child goal under ${goal.title}`}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 transition hover:bg-neutral-200 hover:text-neutral-800 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-white"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          )}
          <button
            onClick={() => onDelete(goal)}
            title="Delete goal"
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-500 transition hover:bg-red-100 hover:text-red-650 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-900/40"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </span>
      </div>

      {/* Children Nodes */}
      {open && kids.map((k) => (
        <Node
          key={k.id}
          goal={k}
          depth={depth + 1}
          childrenOf={childrenOf}
          matchedIds={matchedIds}
          expanded={expanded}
          toggle={toggle}
          ctx={ctx}
          onEdit={onEdit}
          onDelete={onDelete}
          onUpdate={onUpdate}
          onAddSub={onAddSub}
        />
      ))}
    </div>
  )
}

export default function PlanTree({ goals, ctx, onEdit, onDelete, onUpdate, onAddSub }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterLevel, setFilterLevel] = useState('all')

  const { roots, childrenOf, matchedIds } = useMemo(
    () => build(goals, searchQuery, filterLevel),
    [goals, searchQuery, filterLevel]
  )

  // Default expand the first item
  const [expanded, setExpanded] = useState(() => new Set(roots[0] ? [roots[0].id] : []))
  
  const toggle = (id) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const expandAll = () => {
    setExpanded(new Set(goals.map(g => g.id)))
  }

  const collapseAll = () => {
    setExpanded(new Set())
  }

  return (
    <div className="space-y-4">
      {/* Header controls bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white p-3.5 dark:border-neutral-800 dark:bg-[#111]">
        
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute inset-y-0 left-3 flex items-center text-neutral-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search outline goals..."
            className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2 pl-9 pr-4 text-xs font-semibold outline-none transition focus:border-neutral-900 dark:border-neutral-800 dark:bg-[#161616] dark:focus:border-white"
          />
        </div>

        {/* Level Filters */}
        <div className="flex flex-wrap items-center gap-1">
          {[
            ['all', 'All'],
            ['year', 'Years'],
            ['quarter', 'Quarters'],
            ['month', 'Months'],
            ['week', 'Weeks'],
          ].map(([lvl, label]) => (
            <button
              key={lvl}
              onClick={() => setFilterLevel(lvl)}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-extrabold transition ${
                filterLevel === lvl
                  ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950'
                  : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Expand / Collapse buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={expandAll}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[11px] font-bold text-neutral-600 transition hover:border-neutral-400 hover:text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-neutral-600"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[11px] font-bold text-neutral-600 transition hover:border-neutral-400 hover:text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-neutral-600"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Roots container */}
      <section className="rounded-3xl border border-neutral-200 bg-white px-3 py-3.5 dark:border-neutral-800 dark:bg-[#111] sm:px-5">
        {roots.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
              <svg className="h-6 w-6 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="mt-3 text-sm font-extrabold text-neutral-900 dark:text-white">No outline goals found</h3>
            <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
              Try modifying your search queries/filters, or add an advanced goal to start.
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {roots.map((g) => (
              <Node
                key={g.id}
                goal={g}
                depth={0}
                childrenOf={childrenOf}
                matchedIds={matchedIds}
                expanded={expanded}
                toggle={toggle}
                ctx={ctx}
                onEdit={onEdit}
                onDelete={onDelete}
                onUpdate={onUpdate}
                onAddSub={onAddSub}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
