import { useMemo } from 'react'
import { addDays, dateKey, dayRate, formatNice } from '../utils'

const LEVELS_DARK = ['#1c1c1c', '#3d3d3d', '#646464', '#a3a3a3', '#f5f5f5']
const LEVELS_LIGHT = ['#ececec', '#c9c9c9', '#9b9b9b', '#5a5a5a', '#171717']

// Calendar-year heatmap (January → December of the current year).
// Pass a single-element `habits` array with `single` for a per-habit wall.
export default function Heatmap({ habits, completions, dark, single = false }) {
  const levels = dark ? LEVELS_DARK : LEVELS_LIGHT

  const weeks = useMemo(() => {
    const today = new Date()
    const year = today.getFullYear()
    const jan1 = new Date(year, 0, 1)
    const dec31 = new Date(year, 11, 31)
    const start = addDays(jan1, -jan1.getDay()) // back to Sunday
    const end = addDays(dec31, 6 - dec31.getDay()) // forward to Saturday
    const out = []
    let week = []
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
      const outside = d < jan1 || d > dec31
      const future = !outside && d > today
      week.push({
        key: dateKey(d),
        outside,
        future,
        rate: outside || future ? null : dayRate(habits, completions, d),
        month: !outside && d.getDate() === 1 ? d.toLocaleDateString(undefined, { month: 'short' }) : null,
      })
      if (week.length === 7) {
        out.push(week)
        week = []
      }
    }
    return out
  }, [habits, completions])

  function cellColor(cell) {
    if (cell.outside) return 'transparent'
    if (cell.future) return levels[0]
    if (cell.rate === null || cell.rate === 0) return levels[0]
    if (cell.rate < 0.34) return levels[1]
    if (cell.rate < 0.67) return levels[2]
    if (cell.rate < 1) return levels[3]
    return levels[4]
  }

  function cellTitle(cell) {
    if (cell.outside || cell.future) return ''
    const day = formatNice(cell.key)
    if (single) {
      if (cell.rate === null) return `${day} — not scheduled`
      return `${day} — ${cell.rate === 1 ? 'completed ✓' : 'missed ✗'}`
    }
    return `${day} — ${cell.rate === null ? 'nothing scheduled' : `${Math.round(cell.rate * 100)}% done`}`
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max gap-[3px]">
        {weeks.map((week, i) => (
          <div key={i} className="flex flex-col gap-[3px]">
            <div className="h-4 text-[10px] font-medium text-neutral-400 dark:text-neutral-600">
              {week.find((c) => c.month)?.month || ''}
            </div>
            {week.map((cell) => (
              <div
                key={cell.key}
                title={cellTitle(cell)}
                className="h-3.5 w-3.5 rounded-[3px]"
                style={{ backgroundColor: cellColor(cell), opacity: cell.future ? 0.45 : 1 }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[11px] font-medium text-neutral-400 dark:text-neutral-600">
        Less
        {levels.map((c) => (
          <span key={c} className="h-3 w-3 rounded-[3px]" style={{ backgroundColor: c }} />
        ))}
        More
      </div>
    </div>
  )
}
