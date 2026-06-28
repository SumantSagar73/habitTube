import { useMemo } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { addDays, dateKey, habitsForDate, isDone } from '../utils'

export default function MoodHabitOverlay({ habits, completions, moods, dark }) {
  const data = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const d = addDays(new Date(), -(29 - i))
      const key = dateKey(d)
      const due = habitsForDate(habits, d)
      const rate = due.length > 0
        ? Math.round((due.filter((h) => isDone(h, completions, key)).length / due.length) * 100)
        : null
      const moodVal = moods[key] ? moods[key] * 20 : null
      return {
        label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        rate,
        mood: moodVal,
      }
    })
  }, [habits, completions, moods])

  if (!data.some((d) => d.mood != null)) return null

  const axisColor = dark ? '#737373' : '#a3a3a3'
  const gridColor = dark ? '#262626' : '#e5e5e5'
  const strokeHabit = dark ? '#f5f5f5' : '#171717'
  const strokeMood = dark ? '#737373' : '#a3a3a3'

  return (
    <section className="rounded-3xl border border-neutral-200 p-6 dark:border-neutral-800 dark:bg-[#111]">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
          <svg className="h-4 w-4 text-neutral-600 dark:text-neutral-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        </span>
        <div>
          <h3 className="text-lg font-extrabold tracking-tight text-neutral-900 dark:text-white">Mood & habits</h3>
          <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500">Correlation over the last 30 days</p>
        </div>
      </div>
      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: axisColor, fontSize: 10 }} tickLine={false} axisLine={false} interval={7} />
            <YAxis tick={{ fill: axisColor, fontSize: 10 }} tickLine={false} axisLine={false} domain={[0, 100]} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                return (
                  <div className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-neutral-700 dark:bg-[#161616]">
                    <p className="mb-1 font-semibold text-neutral-900 dark:text-white">{label}</p>
                    {payload.map((p) => (
                      <p key={p.dataKey} style={{ color: p.stroke }}>
                        {p.dataKey === 'rate' ? 'Habits' : 'Mood'}:{' '}
                        {p.value != null ? `${p.value}%` : '—'}
                      </p>
                    ))}
                  </div>
                )
              }}
            />
            <Area type="monotone" dataKey="rate" stroke={strokeHabit} fill={strokeHabit} fillOpacity={0.06} strokeWidth={2} dot={false} connectNulls />
            <Area type="monotone" dataKey="mood" stroke={strokeMood} fill={strokeMood} fillOpacity={0.04} strokeWidth={1.5} strokeDasharray="5 3" dot={false} connectNulls />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex gap-5 text-xs font-semibold text-neutral-400 dark:text-neutral-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5 rounded bg-neutral-900 dark:bg-neutral-100" />
          Habit completion
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5 rounded bg-neutral-400 dark:bg-neutral-600" />
          Mood
        </span>
      </div>
    </section>
  )
}
