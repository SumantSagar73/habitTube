import { useMemo, useState } from 'react'
import { Check, ChevronDown, ExternalLink, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { parseKey } from '../utils'
import {
  clearRevise, flagRevise, isComplete, linkLabel, markRevised, progress, RESOURCE_TYPES, setPartDone, setSectionDone,
} from '../resources'
import { TypeIcon } from './resourceIcons'

const iconBtn =
  'rounded-lg p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-white'
const ghostBtn =
  'rounded-full border border-neutral-200 px-3 py-1 text-xs font-semibold text-neutral-600 transition hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500'

const shortDate = (key) => parseKey(key).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

// [{ name, parts }] in order; parts without a section sit in an unnamed group.
function groupBySection(parts) {
  const groups = []
  for (const p of parts) {
    const last = groups[groups.length - 1]
    if (last && last.name === p.section) last.parts.push(p)
    else groups.push({ name: p.section, parts: [p] })
  }
  return groups
}

function PartRow({ part, today, onToggle, onFlag, onRevised, onClear }) {
  const due = part.revise && part.reviseDue && part.reviseDue <= today
  return (
    <li className="group flex items-center gap-2.5 rounded-lg px-1 py-1">
      <button
        type="button"
        onClick={onToggle}
        aria-label={`${part.done ? 'Mark not done' : 'Mark done'}: ${part.title}`}
        aria-pressed={part.done}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition ${
          part.done ? 'border-neutral-900 bg-neutral-900 dark:border-white dark:bg-white' : 'border-neutral-300 hover:border-neutral-500 dark:border-neutral-600'
        }`}
      >
        {part.done && <Check className="h-3.5 w-3.5 text-white dark:text-neutral-900" strokeWidth={3} />}
      </button>
      <span className={`min-w-0 flex-1 truncate text-sm font-medium ${part.done ? 'text-neutral-400 line-through dark:text-neutral-600' : 'text-neutral-800 dark:text-neutral-100'}`}>
        {part.title}
      </span>
      {part.minutes ? <span className="shrink-0 text-[11px] font-medium text-neutral-400 dark:text-neutral-500">{part.minutes} min</span> : null}
      {part.revise ? (
        <span className="flex shrink-0 items-center gap-1">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${due ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'}`}>
            {due ? 'Revise now' : `Revise ${shortDate(part.reviseDue)}`}
          </span>
          <button type="button" onClick={onRevised} className={iconBtn} aria-label={`Revised: ${part.title}`} title="I revised it">
            <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
          <button type="button" onClick={onClear} className={iconBtn} aria-label={`Stop revising: ${part.title}`} title="Stop revising">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={onFlag}
          className={`${iconBtn} ${part.done ? '' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'}`}
          aria-label={`Mark to revise: ${part.title}`}
          title="Mark to revise (comes back after 1, 3, 7 and 14 days)"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      )}
    </li>
  )
}

function ResourceRow({ res, arcs, goals, today, onEdit, onUpdate, onDelete }) {
  const [open, setOpen] = useState(false)
  const { done, total, revise, pct } = progress(res)
  const dueCount = res.parts.filter((p) => p.revise && p.reviseDue && p.reviseDue <= today).length
  const groups = useMemo(() => groupBySection(res.parts), [res.parts])
  const single = res.parts.length === 1
  const typeLabel = RESOURCE_TYPES.find((t) => t.id === res.type)?.label || res.type

  const act = (fn) => onUpdate(res.id, fn)

  return (
    <div className="p-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={`${open ? 'Hide' : 'Show'} ${res.title}`}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <ChevronDown className={`h-4 w-4 shrink-0 text-neutral-400 transition ${open ? '' : '-rotate-90'}`} />
          <TypeIcon type={res.type} className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400" />
          <span className="min-w-0">
            <span className={`block truncate font-bold ${isComplete(res) ? 'text-neutral-400 line-through dark:text-neutral-500' : 'text-neutral-900 dark:text-white'}`}>{res.title}</span>
            <span className="block truncate text-xs font-medium text-neutral-400 dark:text-neutral-500">
              {typeLabel} · {linkLabel(res, arcs, goals)}
              {dueCount > 0 ? ` · ${dueCount} to revise now` : revise > 0 ? ` · ${revise} to revise` : ''}
            </span>
          </span>
        </button>
        <div className="hidden w-24 shrink-0 sm:block">
          <div className="h-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
            <div className="h-full rounded-full bg-neutral-900 dark:bg-white" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <span className="w-12 shrink-0 text-right text-xs font-bold tabular-nums text-neutral-700 dark:text-neutral-200">{done}/{total}</span>
      </div>

      {open && (
        <div className="mt-3 space-y-4 pl-7">
          <div className="flex flex-wrap items-center gap-1">
            {res.url && (
              <a href={res.url} target="_blank" rel="noopener noreferrer" className={`${ghostBtn} flex items-center gap-1.5`}>
                <ExternalLink className="h-3 w-3" /> Open
              </a>
            )}
            <button type="button" onClick={onEdit} className={`${ghostBtn} flex items-center gap-1.5`}>
              <Pencil className="h-3 w-3" /> Edit
            </button>
            <button type="button" onClick={onDelete} className={`${ghostBtn} flex items-center gap-1.5`} aria-label={`Delete ${res.title}`}>
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          </div>

          {single ? (
            <ul>
              <PartRow
                part={res.parts[0]}
                today={today}
                onToggle={() => act((r) => setPartDone(r, res.parts[0].id, !res.parts[0].done, today))}
                onFlag={() => act((r) => flagRevise(r, res.parts[0].id, today))}
                onRevised={() => act((r) => markRevised(r, res.parts[0].id, today))}
                onClear={() => act((r) => clearRevise(r, res.parts[0].id))}
              />
            </ul>
          ) : (
            groups.map((g, gi) => {
              const gDone = g.parts.filter((p) => p.done).length
              return (
                <div key={`${g.name}-${gi}`}>
                  {g.name && (
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{g.name}</p>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="text-[11px] font-semibold tabular-nums text-neutral-400 dark:text-neutral-500">{gDone}/{g.parts.length}</span>
                        <button
                          type="button"
                          className="text-[11px] font-bold text-neutral-500 underline-offset-2 hover:underline dark:text-neutral-400"
                          onClick={() => act((r) => setSectionDone(r, g.name, gDone !== g.parts.length, today))}
                        >
                          {gDone === g.parts.length ? 'Undo all' : 'Mark all done'}
                        </button>
                      </span>
                    </div>
                  )}
                  <ul>
                    {g.parts.map((p) => (
                      <PartRow
                        key={p.id}
                        part={p}
                        today={today}
                        onToggle={() => act((r) => setPartDone(r, p.id, !p.done, today))}
                        onFlag={() => act((r) => flagRevise(r, p.id, today))}
                        onRevised={() => act((r) => markRevised(r, p.id, today))}
                        onClear={() => act((r) => clearRevise(r, p.id))}
                      />
                    ))}
                  </ul>
                </div>
              )
            })
          )}

          <div>
            <label htmlFor={`notes-${res.id}`} className="mb-1 block text-xs font-bold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">Notes</label>
            <textarea
              id={`notes-${res.id}`}
              value={res.notes || ''}
              onChange={(e) => act((r) => ({ ...r, notes: e.target.value, updatedAt: Date.now() }))}
              rows={3}
              placeholder="What clicked, what to revisit, links, snippets…"
              className="w-full resize-y rounded-xl border border-neutral-200 bg-transparent px-3 py-2 text-sm font-medium text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 dark:border-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-600 dark:focus:border-white"
            />
          </div>
        </div>
      )}
    </div>
  )
}

// Plan tab: everything you are studying, grouped by what it belongs to.
export default function ResourcesPanel({ resources = [], arcs = [], goals = [], today, onAdd, onEdit, onUpdate, onDelete }) {
  const [filter, setFilter] = useState('all') // 'all' | 'unsorted' | 'revise' | arc id

  const unsorted = resources.filter((r) => !r.arcId && !r.goalId).length
  const reviseDue = resources.filter((r) => r.parts.some((p) => p.revise && p.reviseDue && p.reviseDue <= today)).length
  const arcsWith = arcs.filter((a) => resources.some((r) => r.arcId === a.id))

  const visible = resources.filter((r) => {
    if (filter === 'all') return true
    if (filter === 'unsorted') return !r.arcId && !r.goalId
    if (filter === 'revise') return r.parts.some((p) => p.revise && p.reviseDue && p.reviseDue <= today)
    return r.arcId === filter
  })

  const chip = (id, label, count) => (
    <button
      key={id}
      type="button"
      onClick={() => setFilter(id)}
      aria-pressed={filter === id}
      className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold transition ${
        filter === id
          ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
          : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'
      }`}
    >
      {label}{count != null ? ` ${count}` : ''}
    </button>
  )

  return (
    <section className="mb-6" aria-label="Resources">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">Resources</p>
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1 rounded-full bg-neutral-900 px-4 py-1.5 text-xs font-bold text-white transition hover:opacity-90 dark:bg-white dark:text-neutral-900"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} /> Add resource
        </button>
      </div>

      {resources.length === 0 ? (
        <div className="glass rounded-2xl px-4 py-3 text-sm font-medium text-neutral-500 dark:text-neutral-400">
          Study something? Paste a course outline, a playlist or a table of contents and track it part by part, with notes and spaced revision. Tie it to an arc or a goal.
        </div>
      ) : (
        <>
          {resources.length > 1 && (
            <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
              {chip('all', 'All', resources.length)}
              {reviseDue > 0 && chip('revise', 'Revise now', reviseDue)}
              {unsorted > 0 && chip('unsorted', 'Unsorted', unsorted)}
              {arcsWith.map((a) => chip(a.id, a.title, resources.filter((r) => r.arcId === a.id).length))}
            </div>
          )}
          <div className="glass divide-y divide-neutral-200/70 rounded-2xl dark:divide-neutral-800">
            {visible.length === 0 ? (
              <p className="p-4 text-sm font-medium text-neutral-400 dark:text-neutral-500">Nothing here.</p>
            ) : (
              visible.map((r) => (
                <ResourceRow
                  key={r.id}
                  res={r}
                  arcs={arcs}
                  goals={goals}
                  today={today}
                  onEdit={() => onEdit(r)}
                  onUpdate={onUpdate}
                  onDelete={() => onDelete(r.id)}
                />
              ))
            )}
          </div>
        </>
      )}
    </section>
  )
}
