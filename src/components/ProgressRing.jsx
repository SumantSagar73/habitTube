export default function ProgressRing({ done, total, size = 120 }) {
  const pct = total === 0 ? 0 : done / total
  const stroke = 8
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-neutral-100 dark:stroke-neutral-800"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className="stroke-neutral-900 dark:stroke-white"
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
          {total === 0 ? '—' : `${Math.round(pct * 100)}%`}
        </span>
        <span className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500">
          {done}/{total} done
        </span>
      </div>
    </div>
  )
}
