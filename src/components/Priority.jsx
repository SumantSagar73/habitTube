import { PRIORITY_LABEL, PRIORITIES } from '../utils'

// Grayscale dots keep the monochrome look: solid = high, mid-gray = medium,
// hollow = low. Weight conveys priority without adding color.
const DOT = {
  high: 'bg-neutral-900 dark:bg-white',
  medium: 'bg-neutral-400 dark:bg-neutral-500',
  low: 'border-2 border-neutral-300 dark:border-neutral-600',
}

export function PriorityDot({ priority = 'medium', onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`Priority: ${PRIORITY_LABEL[priority] || 'Medium'} — click to change`}
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition hover:bg-neutral-100 dark:hover:bg-neutral-800"
    >
      <span className={`h-2.5 w-2.5 rounded-full ${DOT[priority] || DOT.medium}`} />
    </button>
  )
}

export function PrioritySelect({ value = 'medium', onChange }) {
  return (
    <div className="flex items-center gap-0.5" title="Priority">
      {PRIORITIES.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          title={PRIORITY_LABEL[p]}
          className={`flex h-7 w-7 items-center justify-center rounded-lg border transition ${
            value === p ? 'border-neutral-900 dark:border-white' : 'border-transparent hover:border-neutral-200 dark:hover:border-neutral-700'
          }`}
        >
          <span className={`h-2.5 w-2.5 rounded-full ${DOT[p]}`} />
        </button>
      ))}
    </div>
  )
}
