import { useState } from 'react'
import { X } from 'lucide-react'

const labelCls = 'mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500'

function DomainChips({ list, onRemove }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {list.map((d) => (
        <span key={d} className="flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
          {d}
          <button onClick={() => onRemove?.(d)} className="opacity-60 transition hover:opacity-100" aria-label={`Remove ${d}`}>
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
    </div>
  )
}

function DomainAdder({ placeholder, onAdd }) {
  const [input, setInput] = useState('')
  function add() {
    if (input.trim()) {
      onAdd?.(input)
      setInput('')
    }
  }
  return (
    <div className="mb-2 flex gap-2">
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && add()}
        placeholder={placeholder}
        className="min-w-0 flex-1 rounded-xl border border-neutral-200 bg-transparent px-3.5 py-2 text-sm font-medium text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 dark:border-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-600 dark:focus:border-white"
      />
      <button onClick={add} className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-bold text-white dark:bg-white dark:text-neutral-900">Add</button>
    </div>
  )
}

// Site rules for the HabitTube Focus browser extension. Three tiers: allowed (load
// normally), off-limits (hard-blocked, no temporary pass) and everything else
// (blocked, but a one-time 10-minute pass is offered).
export default function FocusBlockerSettings({ allowlist = [], blocklist = [], installed, onAddAllow, onRemoveAllow, onAddBlock, onRemoveBlock }) {
  const youtubeAllowed = allowlist.includes('youtube.com')
  return (
    <div className="space-y-5">
      <div className="glass flex items-center justify-between gap-4 rounded-2xl p-4">
        <div>
          <p className="font-bold text-neutral-900 dark:text-white">Extension status</p>
          <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500">
            {installed ? 'HabitTube Focus is installed — sites are enforced during focus sessions.' : 'Not detected. Rules below apply once the extension is installed.'}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${installed ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'}`}>
          {installed ? 'On' : 'Off'}
        </span>
      </div>
      {!installed && (
        <p className="text-xs leading-relaxed font-medium text-neutral-400 dark:text-neutral-500">
          Install the free <span className="font-bold text-neutral-600 dark:text-neutral-300">HabitTube Focus</span> extension: Edge → <span className="font-mono">edge://extensions</span> → Developer mode → Load unpacked → pick the <span className="font-mono">extension/</span> folder.
        </p>
      )}

      <div className="glass flex items-center justify-between gap-4 rounded-2xl p-4">
        <div>
          <p className="font-bold text-neutral-900 dark:text-white">Allow YouTube during focus</p>
          <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500">{youtubeAllowed ? 'Allowed — loads normally' : 'Off-limits — hard-blocked, no exceptions'}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={youtubeAllowed}
          aria-label="Allow YouTube during focus"
          onClick={() => (youtubeAllowed ? onAddBlock?.('youtube.com') : onAddAllow?.('youtube.com'))}
          className={`relative h-7 w-12 shrink-0 rounded-full transition ${youtubeAllowed ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-200 dark:bg-neutral-700'}`}
        >
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition dark:bg-neutral-900 ${youtubeAllowed ? 'left-6' : 'left-1'}`} />
        </button>
      </div>

      <div>
        <label className={labelCls}>Allowed — only these load during focus</label>
        <DomainAdder placeholder="e.g. leetcode.com" onAdd={onAddAllow} />
        {allowlist.length === 0 ? (
          <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500">No sites yet — add the resources you study on.</p>
        ) : (
          <DomainChips list={allowlist} onRemove={onRemoveAllow} />
        )}
      </div>

      <div>
        <label className={labelCls}>Off-limits — always blocked, no temporary pass</label>
        <DomainAdder placeholder="e.g. instagram.com" onAdd={onAddBlock} />
        {blocklist.length === 0 ? (
          <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500">Nothing hard-blocked yet.</p>
        ) : (
          <DomainChips list={blocklist} onRemove={onRemoveBlock} />
        )}
      </div>

      <p className="text-xs leading-relaxed font-medium text-neutral-400 dark:text-neutral-500">
        Anything not on either list is blocked too, but offers a one-time 10-minute pass for genuine lookups.
      </p>
    </div>
  )
}
