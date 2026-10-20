import { useMemo, useState } from 'react'
import { Sparkles, X } from 'lucide-react'
import { aiOrganizeResource } from '../ai'
import { parseOutline } from '../resourceParse'
import { RESOURCE_TYPES } from '../resources'
import { TypeIcon } from './resourceIcons'
import Select from './Select'

const labelCls = 'mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500'
const inputCls =
  'w-full rounded-xl border border-neutral-200 bg-transparent px-4 py-2.5 font-medium text-neutral-900 outline-none transition focus:border-neutral-900 dark:border-neutral-800 dark:text-white dark:focus:border-white'
const chip = (active) =>
  `flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-bold transition ${
    active
      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
      : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'
  }`
const ghostBtn =
  'rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:border-neutral-400 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:border-neutral-500'

const LEVEL = { year: 'Year', quarter: 'Quarter', month: 'Month', week: 'Week' }

// Add or edit a resource. Pasted text (an outline, playlist titles, a table of contents) is
// parsed by code first; "Organize with AI" is offered only when the paste looked messy.
export default function ResourceModal({ initial, arcs, goals, aiEnabled, model, onSave, onClose }) {
  const editing = Boolean(initial)
  const [type, setType] = useState(initial?.type || 'udemy')
  const [title, setTitle] = useState(initial?.title || '')
  const [url, setUrl] = useState(initial?.url || '')
  const [link, setLink] = useState(initial?.arcId ? `a:${initial.arcId}` : initial?.goalId ? `g:${initial.goalId}` : '')
  const [paste, setPaste] = useState('')
  const [aiParts, setAiParts] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const parsed = useMemo(() => parseOutline(paste), [paste])
  const parts = aiParts ?? parsed.parts
  const sections = new Set(parts.map((p) => p.section).filter(Boolean)).size
  const minutes = parts.reduce((s, p) => s + (p.minutes || 0), 0)

  async function organize() {
    setBusy(true)
    setError('')
    try {
      setAiParts(await aiOrganizeResource(paste, type, model))
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  function submit(e) {
    e.preventDefault()
    if (!title.trim()) return
    onSave(
      {
        type,
        title: title.trim(),
        url: url.trim(),
        arcId: link.startsWith('a:') ? link.slice(2) : null,
        goalId: link.startsWith('g:') ? link.slice(2) : null,
      },
      parts,
    )
  }

  const linkable = arcs.filter((a) => a.status !== 'closed')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm dark:bg-black/60"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={submit}
        role="dialog"
        aria-label={editing ? 'Edit resource' : 'Add resource'}
        className="glass-strong max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-neutral-900 dark:text-white">{editing ? 'Edit resource' : 'Add a resource'}</h2>
          <button type="button" onClick={onClose} className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className={labelCls}>Type</label>
        <div className="flex flex-wrap gap-2">
          {RESOURCE_TYPES.map((t) => (
            <button key={t.id} type="button" className={chip(type === t.id)} onClick={() => setType(t.id)} aria-pressed={type === t.id}>
              <TypeIcon type={t.id} className="h-3.5 w-3.5" /> {t.label}
            </button>
          ))}
        </div>

        <label className={`${labelCls} mt-5`}>Title</label>
        <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. The Complete React Course" maxLength={140} autoFocus />

        <label className={`${labelCls} mt-5`}>Link (optional)</label>
        <input className={inputCls} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" inputMode="url" />

        <label className={`${labelCls} mt-5`}>Belongs to</label>
        <Select value={link} onChange={(e) => setLink(e.target.value)}>
          <option value="">Unsorted — link it later</option>
          {linkable.length > 0 && (
            <optgroup label="Arcs">
              {linkable.map((a) => <option key={a.id} value={`a:${a.id}`}>{a.title}</option>)}
            </optgroup>
          )}
          {goals.length > 0 && (
            <optgroup label="Goals">
              {goals.filter((g) => !g.done).map((g) => <option key={g.id} value={`g:${g.id}`}>{LEVEL[g.level]} · {g.title}</option>)}
            </optgroup>
          )}
        </Select>

        <label className={`${labelCls} mt-5`}>{editing ? 'Add more parts (paste)' : 'Paste the contents (optional)'}</label>
        <textarea
          className={`${inputCls} resize-y font-mono text-xs`}
          rows={6}
          value={paste}
          onChange={(e) => { setPaste(e.target.value); setAiParts(null) }}
          placeholder={'A course curriculum, playlist titles, a table of contents or a README checklist, one per line.\n\nSection 1: Basics\n1. Welcome   03:21\n2. Setup   05:10'}
        />

        {paste.trim() && (
          <div className="mt-3 rounded-2xl border border-neutral-200 p-3 text-sm dark:border-neutral-800">
            <p className="font-semibold text-neutral-800 dark:text-neutral-100">
              {parts.length} part{parts.length === 1 ? '' : 's'}
              {sections > 0 && ` in ${sections} section${sections === 1 ? '' : 's'}`}
              {minutes > 0 && ` · about ${minutes >= 90 ? `${Math.round(minutes / 6) / 10} h` : `${minutes} min`}`}
              {aiParts && <span className="ml-2 text-xs font-bold uppercase tracking-wide text-neutral-400">organized by AI</span>}
            </p>
            {parts.length > 0 && (
              <ul className="mt-2 space-y-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                {parts.slice(0, 5).map((p, i) => (
                  <li key={i} className="truncate">{p.section ? `${p.section} › ` : ''}{p.title}</li>
                ))}
                {parts.length > 5 && <li>…and {parts.length - 5} more</li>}
              </ul>
            )}
            {!aiParts && parsed.lowConfidence && (
              <div className="mt-3 rounded-xl bg-neutral-100 p-3 dark:bg-neutral-800">
                <p className="text-xs font-medium text-neutral-600 dark:text-neutral-300">{parsed.reason} Want the AI to find the outline?</p>
                <button type="button" className={`${ghostBtn} mt-2 flex items-center gap-1.5 py-1.5 text-xs`} onClick={organize} disabled={busy || !aiEnabled}>
                  <Sparkles className="h-3.5 w-3.5" /> {busy ? 'Organizing…' : aiEnabled ? 'Organize with AI' : 'Turn AI on in Settings'}
                </button>
              </div>
            )}
            {aiParts && (
              <button type="button" className="mt-2 text-xs font-semibold text-neutral-500 underline-offset-2 hover:underline dark:text-neutral-400" onClick={() => setAiParts(null)}>
                Use the plain parse instead
              </button>
            )}
            {error && <p className="mt-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">{error}</p>}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className={ghostBtn} onClick={onClose}>Cancel</button>
          <button
            type="submit"
            disabled={!title.trim()}
            className="rounded-full bg-neutral-900 px-5 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-40 dark:bg-white dark:text-neutral-900"
          >
            {editing ? 'Save changes' : 'Add resource'}
          </button>
        </div>
      </form>
    </div>
  )
}
