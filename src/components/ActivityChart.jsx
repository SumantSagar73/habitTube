import { useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { addDays, dailyCountSeries, dailyCountSeriesBetween, dateKey, monthlyAvgSeries, todayKey } from '../utils'

const RANGES = [
  { id: 'week', label: 'Weekly' },
  { id: 'month', label: 'Monthly' },
  { id: 'year', label: 'Yearly' },
  { id: 'custom', label: 'Custom' },
]

function ChartTooltip({ active, payload, label, yearly }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm shadow-lg dark:border-neutral-700 dark:bg-[#161616]">
      <p className="font-semibold text-neutral-900 dark:text-white">{label}</p>
      <p className="text-neutral-500 dark:text-neutral-400">
        {payload[0].value} habit{payload[0].value === 1 ? '' : 's'} {yearly ? 'per day (avg)' : 'completed'}
      </p>
    </div>
  )
}

export default function ActivityChart({ habits, completions, dark }) {
  const [range, setRange] = useState('week')
  const today = todayKey()
  const [from, setFrom] = useState(dateKey(addDays(new Date(), -29)))
  const [to, setTo] = useState(today)

  const customValid = from && to && from <= to
  const data =
    range === 'week'
      ? dailyCountSeries(habits, completions, 7)
      : range === 'month'
        ? dailyCountSeries(habits, completions, 30)
        : range === 'year'
          ? monthlyAvgSeries(habits, completions)
          : customValid
            ? dailyCountSeriesBetween(habits, completions, from, to > today ? today : to)
            : []

  const ink = dark ? '#f5f5f5' : '#171717'
  const axisColor = dark ? '#737373' : '#a3a3a3'
  const gridColor = dark ? '#262626' : '#e5e5e5'
  const yMax = Math.max(10, habits.length, ...data.map((d) => d.count), 0)

  const subtitle =
    range === 'year'
      ? 'Average habits completed per day, each month this year'
      : range === 'custom'
        ? customValid
          ? `Habits completed each day, ${from} → ${to > today ? today : to}`
          : 'Pick a valid date range (start must be before end)'
        : `Habits completed each day, last ${range === 'week' ? '7' : '30'} days`

  const dateInputCls =
    'rounded-xl border border-neutral-200 bg-transparent px-3 py-1.5 text-xs font-semibold text-neutral-800 outline-none transition focus:border-neutral-900 dark:border-neutral-800 dark:text-neutral-100 dark:focus:border-white dark:[color-scheme:dark]'

  return (
    <section className="rounded-3xl border border-neutral-200 p-6 dark:border-neutral-800 dark:bg-[#111]">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold tracking-tight text-neutral-900 dark:text-white">Activity</h3>
          <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {range === 'custom' && (
            <div className="flex items-center gap-2">
              <input type="date" value={from} max={today} onChange={(e) => setFrom(e.target.value)} className={dateInputCls} />
              <span className="text-xs font-bold text-neutral-400">→</span>
              <input type="date" value={to} max={today} onChange={(e) => setTo(e.target.value)} className={dateInputCls} />
            </div>
          )}
          <div className="flex gap-1 rounded-full border border-neutral-200 p-1 dark:border-neutral-800">
            {RANGES.map((r) => (
              <button
                key={r.id}
                onClick={() => setRange(r.id)}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                  range === r.id
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                    : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex h-[300px] items-center justify-center rounded-2xl border border-dashed border-neutral-300 text-sm font-medium text-neutral-400 dark:border-neutral-700 dark:text-neutral-500">
          Select a valid start and end date to draw the chart.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: axisColor, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              minTickGap={24}
            />
            <YAxis
              domain={[0, yMax]}
              allowDecimals={false}
              tick={{ fill: axisColor, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<ChartTooltip yearly={range === 'year'} />} />
            <Line
              type="monotone"
              dataKey="count"
              stroke={ink}
              strokeWidth={2.5}
              dot={data.length <= 12 ? { r: 3.5, fill: ink, strokeWidth: 0 } : false}
              activeDot={{ r: 5, fill: ink, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </section>
  )
}
