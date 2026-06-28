import { useMemo, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell,
  RadialBar, RadialBarChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { goalPercent, LEVEL_LABEL, LEVELS, periodLabel } from '../planUtils'
import { addDays, dateKey, habitRate, parseKey } from '../utils'
import Achievements from './Achievements'
import Select from './Select'
import ActivityChart from './ActivityChart'
import AIInsights from './AIInsights'
import BestDayHour from './BestDayHour'
import HabitCorrelation from './HabitCorrelation'
import Heatmap from './Heatmap'
import MoodHabitOverlay from './MoodHabitOverlay'

const MOOD_FACE = { 1: '😣', 2: '😕', 3: '😐', 4: '🙂', 5: '😄' }

function MoodStrip({ moods }) {
  const days = []
  for (let i = 13; i >= 0; i--) days.push(addDays(new Date(), -i))
  return (
    <section className="rounded-3xl border border-neutral-200 p-6 dark:border-neutral-800 dark:bg-[#111]">
      <h3 className="mb-1 text-lg font-extrabold tracking-tight text-neutral-900 dark:text-white">Mood</h3>
      <p className="mb-4 text-sm font-medium text-neutral-400 dark:text-neutral-500">Last 14 days</p>
      <div className="flex flex-wrap gap-1.5">
        {days.map((d) => {
          const v = moods[dateKey(d)]
          return (
            <div
              key={dateKey(d)}
              title={d.toLocaleDateString()}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-lg dark:border-neutral-800"
            >
              {v ? MOOD_FACE[v] : <span className="text-neutral-300 dark:text-neutral-700">·</span>}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function FocusChart({ focusLog = [], dark }) {
  const data = useMemo(() => {
    const out = []
    for (let i = 6; i >= 0; i--) {
      const d = addDays(new Date(), -i)
      const key = dateKey(d)
      const mins = focusLog.filter((f) => f.date === key).reduce((s, f) => s + (f.minutes || 0), 0)
      out.push({
        label: d.toLocaleDateString(undefined, { weekday: 'short' }),
        minutes: mins,
      })
    }
    return out
  }, [focusLog])

  const totalMins = useMemo(() => focusLog.reduce((s, f) => s + (f.minutes || 0), 0), [focusLog])

  const ink = dark ? '#f5f5f5' : '#171717'
  const axisColor = dark ? '#737373' : '#a3a3a3'
  const gridColor = dark ? '#262626' : '#e5e5e5'

  return (
    <section className="rounded-3xl border border-neutral-200 p-6 dark:border-neutral-800 dark:bg-[#111]">
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <h3 className="text-lg font-extrabold tracking-tight text-neutral-900 dark:text-white">Focus time</h3>
          <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500">Last 7 days</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-extrabold text-neutral-900 dark:text-white">{totalMins} min</p>
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Total logged</p>
        </div>
      </div>

      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: axisColor, fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: axisColor, fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip
              cursor={{ fill: dark ? '#26262640' : '#e5e5e560' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                return (
                  <div className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm shadow-lg dark:border-neutral-700 dark:bg-[#161616]">
                    <p className="font-semibold text-neutral-900 dark:text-white">{payload[0].payload.label}</p>
                    <p className="text-neutral-500 dark:text-neutral-400">{payload[0].value} minutes focused</p>
                  </div>
                )
              }}
            />
            <Bar dataKey="minutes" fill={ink} radius={[4, 4, 0, 0]} barSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm shadow-lg dark:border-neutral-700 dark:bg-[#161616]">
      <p className="font-semibold text-neutral-900 dark:text-white">{label}</p>
      <p className="text-neutral-500 dark:text-neutral-400">{payload[0].value}% completed</p>
    </div>
  )
}

function periodEndDate(level, period) {
  if (!period) return null
  try {
    if (level === 'year') return new Date(Number(period), 11, 31)
    if (level === 'quarter') {
      const [y, q] = period.split('-Q').map(Number)
      return new Date(y, q * 3, 0) // last day of quarter
    }
    if (level === 'month') {
      const [y, m] = period.split('-').map(Number)
      return new Date(y, m, 0) // last day of month
    }
    if (level === 'week') {
      const [y, w] = period.replace('W', '').split('-').map(Number)
      const jan4 = new Date(y, 0, 4)
      const weekStart = addDays(jan4, (w - 1) * 7 - ((jan4.getDay() + 6) % 7))
      return addDays(weekStart, 6)
    }
  } catch { return null }
  return null
}

function GoalProgressCard({ goal, ctx }) {
  const pct = goalPercent(goal, ctx)
  const isDone = pct >= 100

  const typeIconSvg = {
    checklist: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M8 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2h-2"/><polyline points="9 11 11 13 15 9"/></svg>,
    numeric: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>,
    habit: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>,
  }
  const icon = typeIconSvg[goal.type] || <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
  const parent = goal.parentId ? ctx.goals.find((g) => g.id === goal.parentId) : null

  let progressText = ''
  if (goal.type === 'numeric') progressText = `${goal.current || 0} / ${goal.target} ${goal.unit || ''}`
  else if (goal.type === 'habit') {
    const habit = ctx.habits.find((h) => h.id === goal.habitId)
    progressText = habit ? `Completions: ${goal.habitTarget || 0}` : ''
  }

  const endDate = periodEndDate(goal.level, goal.period)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const daysLeft = endDate ? Math.ceil((endDate - today) / 86400000) : null
  const isAtRisk = !isDone && daysLeft != null && daysLeft <= 7 && daysLeft >= 0 && pct < 80

  return (
    <div
      className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-neutral-200 bg-white p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-[#151515]"
      style={{ borderLeftWidth: '5px', borderLeftColor: goal.color }}
    >
      {isAtRisk && (
        <div className="mb-2 flex items-center gap-1.5 rounded-xl bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-950/20 dark:text-amber-400">
          ⚠ {daysLeft === 0 ? 'Ends today' : `${daysLeft}d left`} · {pct}% complete
        </div>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-neutral-500 dark:text-neutral-400" title={`${goal.type} goal`}>{icon}</span>
            <h4 className="truncate text-sm font-bold text-neutral-800 dark:text-neutral-100">{goal.title}</h4>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-neutral-400 dark:text-neutral-500">
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-bold uppercase tracking-wider text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
              {LEVEL_LABEL[goal.level]}
            </span>
            <span>·</span>
            <span>{periodLabel(goal.level, goal.period)}</span>
            {parent && (
              <>
                <span>·</span>
                <span className="truncate text-neutral-500 dark:text-neutral-400">↳ feeds "{parent.title}"</span>
              </>
            )}
          </div>
        </div>
        {isDone ? (
          <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400">
            ✓ Done
          </span>
        ) : (
          <span className="shrink-0 font-mono text-sm font-extrabold tabular-nums text-neutral-800 dark:text-white">
            {pct}%
          </span>
        )}
      </div>
      {progressText && (
        <p className="mt-3 text-xs font-bold text-neutral-600 dark:text-neutral-400">{progressText}</p>
      )}
      <div className="mt-3.5 h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, backgroundColor: goal.color, boxShadow: isDone ? `0 0 10px ${goal.color}80` : 'none' }}
        />
      </div>
    </div>
  )
}

// ── GoalChartView ──────────────────────────────────────────────────────────
function GoalChartView({ filteredGoals, ctx, dark }) {
  // ── 1. Radial arcs data (one ring per goal, capped at 100)
  const radialData = filteredGoals.map((g) => ({
    name: g.title.length > 22 ? g.title.slice(0, 21) + '…' : g.title,
    pct: goalPercent(g, ctx),
    fill: g.color,
    color: g.color,
    level: LEVEL_LABEL[g.level],
  }))

  // ── 2. Level-average bar data
  const levelData = LEVELS.map((lvl) => {
    const lvlGoals = filteredGoals.filter((g) => g.level === lvl)
    if (!lvlGoals.length) return null
    const avg = Math.round(lvlGoals.reduce((s, g) => s + goalPercent(g, ctx), 0) / lvlGoals.length)
    return { level: LEVEL_LABEL[lvl], avg, count: lvlGoals.length }
  }).filter(Boolean)

  const axisColor = dark ? '#737373' : '#a3a3a3'
  const gridColor = dark ? '#262626' : '#e5e5e5'
  const tooltipBg = dark ? '#161616' : '#ffffff'
  const tooltipBorder = dark ? '#404040' : '#e5e5e5'

  const RadialTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return (
      <div style={{ background: tooltipBg, border: `1px solid ${tooltipBorder}` }}
        className="rounded-xl px-3 py-2 text-sm shadow-lg">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.fill }} />
          <p className="font-bold text-neutral-900 dark:text-white">{d.name}</p>
        </div>
        <p className="text-neutral-500 dark:text-neutral-400 ml-[18px]">
          {d.pct}% complete · {d.level}
        </p>
      </div>
    )
  }

  const LevelTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{ background: tooltipBg, border: `1px solid ${tooltipBorder}` }}
        className="rounded-xl px-3 py-2 text-sm shadow-lg">
        <p className="font-bold text-neutral-900 dark:text-white">{label} goals</p>
        <p className="text-neutral-500 dark:text-neutral-400">
          {payload[0].value}% avg · {payload[0].payload.count} goal{payload[0].payload.count > 1 ? 's' : ''}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* ── Panel 1: Radial progress arcs ── */}
      {radialData.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">
            Progress arcs
          </p>
          <p className="mb-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">
            Each ring is one goal — fuller = further along. Hover for details.
          </p>
          <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-start">
            {/* Radial chart */}
            <div style={{ width: '100%', maxWidth: 360, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height={Math.min(360, 60 + radialData.length * 38)}>
                <RadialBarChart
                  cx="50%" cy="50%"
                  innerRadius="12%"
                  outerRadius="95%"
                  data={radialData}
                  startAngle={180}
                  endAngle={-180}
                  barSize={14}
                  barGap={4}
                >
                  <RadialBar
                    dataKey="pct"
                    minAngle={4}
                    cornerRadius={7}
                    background={{ fill: dark ? '#1f1f1f' : '#f5f5f5', radius: 7 }}
                    label={false}
                  >
                    {radialData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </RadialBar>
                  <Tooltip content={<RadialTooltip />} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>

            {/* Legend — scrollable on mobile */}
            <div className="flex w-full flex-col gap-2 overflow-y-auto" style={{ maxHeight: 320 }}>
              {radialData.map((d, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-neutral-100 px-3 py-2.5 dark:border-neutral-800">
                  {/* colored arc swatch */}
                  <div className="relative h-9 w-9 shrink-0">
                    <svg viewBox="0 0 36 36" className="h-9 w-9 -rotate-90">
                      <circle cx="18" cy="18" r="14" fill="none" strokeWidth="5"
                        stroke={dark ? '#1f1f1f' : '#f0f0f0'} />
                      <circle cx="18" cy="18" r="14" fill="none" strokeWidth="5"
                        stroke={d.fill}
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 14}`}
                        strokeDashoffset={`${2 * Math.PI * 14 * (1 - Math.min(d.pct, 100) / 100)}`}
                        style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-extrabold tabular-nums" style={{ color: d.fill }}>
                      {d.pct > 99 ? '✓' : `${d.pct}%`}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-neutral-800 dark:text-neutral-100">{d.name}</p>
                    <p className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500">{d.level}</p>
                  </div>
                  <span className="shrink-0 font-mono text-sm font-extrabold tabular-nums" style={{ color: d.pct >= 100 ? '#10b981' : d.fill }}>
                    {d.pct >= 100 ? '✓ Done' : `${d.pct}%`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Panel 2: Level average bars ── */}
      {levelData.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">
            Avg completion by time horizon
          </p>
          <p className="mb-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">
            How far along are you on Year vs Quarter vs Month vs Week goals?
          </p>
          <ResponsiveContainer width="100%" height={Math.max(120, levelData.length * 56)}>
            <BarChart data={levelData} layout="vertical" margin={{ top: 0, right: 48, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
              <XAxis
                type="number" domain={[0, 100]}
                tick={{ fill: axisColor, fontSize: 11 }} tickLine={false} axisLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis
                type="category" dataKey="level" width={70}
                tick={{ fill: axisColor, fontSize: 12, fontWeight: 700 }} tickLine={false} axisLine={false}
              />
              <Tooltip content={<LevelTooltip />} cursor={{ fill: dark ? '#ffffff08' : '#00000008' }} />
              <Bar dataKey="avg" radius={[0, 8, 8, 0]} barSize={28} label={false}>
                {levelData.map((entry, i) => {
                  // soft gradient-like colors per level tier
                  const levelColors = { Year: '#6366f1', Quarter: '#8b5cf6', Month: '#06b6d4', Week: '#10b981' }
                  return <Cell key={i} fill={levelColors[entry.level] || '#a3a3a3'} />
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {/* inline legend */}
          <div className="mt-3 flex flex-wrap gap-3">
            {[['Year', '#6366f1'], ['Quarter', '#8b5cf6'], ['Month', '#06b6d4'], ['Week', '#10b981']]
              .filter(([lvl]) => levelData.some((d) => d.level === lvl))
              .map(([lvl, color]) => (
                <div key={lvl} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
                  <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">{lvl}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function InsightsView({
  habits,
  completions,
  goals,
  tasks,
  missNotes,
  moods,
  dark,
  aiEnabled,
  aiModel,
  aiInsightsCache,
  onSaveInsights,
  appData,
}) {
  const [levelFilter, setLevelFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [periodFilter, setPeriodFilter] = useState('all')
  const [goalChartMode, setGoalChartMode] = useState('cards') // 'cards' | 'chart'
  const [habitTab, setHabitTab] = useState('trends') // 'trends' | 'heatmap' | 'advanced'
  const [activeSubTab, setActiveSubTab] = useState('overview') // 'overview' | 'habits' | 'goals' | 'focus'

  const ctx = useMemo(() => ({ goals, tasks: tasks || {}, habits, completions }), [goals, tasks, habits, completions])

  const changeLevelFilter = (lvl) => {
    setLevelFilter(lvl)
    setPeriodFilter('all')
  }

  // Get unique period keys matching the selected levelFilter
  const availablePeriods = useMemo(() => {
    if (levelFilter === 'all') return []
    const periods = goals
      .filter((g) => g.level === levelFilter && g.period)
      .map((g) => g.period)
    return Array.from(new Set(periods)).sort((a, b) => b.localeCompare(a))
  }, [goals, levelFilter])

  // Filter goals dynamically based on selected filters
  const filteredGoals = useMemo(() => {
    return goals.filter((g) => {
      const pct = goalPercent(g, ctx)
      const matchesLevel = levelFilter === 'all' || g.level === levelFilter
      const matchesPeriod = periodFilter === 'all' || g.period === periodFilter
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && pct < 100) ||
        (statusFilter === 'completed' && pct >= 100)
      return matchesLevel && matchesPeriod && matchesStatus
    })
  }, [goals, levelFilter, periodFilter, statusFilter, ctx])

  // Calculate summary metrics for the filtered goals
  const { avgCompletion, completedGoals, activeGoals } = useMemo(() => {
    if (filteredGoals.length === 0) return { avgCompletion: 0, completedGoals: 0, activeGoals: 0 }
    const totalPct = filteredGoals.reduce((acc, g) => acc + goalPercent(g, ctx), 0)
    const avg = Math.round(totalPct / filteredGoals.length)
    const completed = filteredGoals.filter((g) => goalPercent(g, ctx) >= 100).length
    return {
      avgCompletion: avg,
      completedGoals: completed,
      activeGoals: filteredGoals.length - completed,
    }
  }, [filteredGoals, ctx])
  const perHabit = habits.map((h) => ({
    name: `${h.emoji} ${h.name.length > 14 ? h.name.slice(0, 13) + '…' : h.name}`,
    rate: habitRate(h, completions, 30),
  }))
  const goalsByLevel = LEVELS.map((lvl) => ({ lvl, items: goals.filter((g) => g.level === lvl) })).filter((x) => x.items.length)

  const ink = dark ? '#f5f5f5' : '#171717'
  const axisColor = dark ? '#737373' : '#a3a3a3'
  const gridColor = dark ? '#262626' : '#e5e5e5'

  if (habits.length === 0 && goals.length === 0 && (!moods || Object.keys(moods).length === 0)) {
    return (
      <div className="rounded-3xl border border-dashed border-neutral-300 p-12 text-center font-medium text-neutral-400 dark:border-neutral-700 dark:text-neutral-500">
        Add a habit or a goal to unlock insights.
      </div>
    )
  }

  return (
    <div className="space-y-7">
      {/* Sub Navigation Bar */}
      <div className="flex gap-1.5 overflow-x-auto pb-3 border-b border-neutral-200 dark:border-neutral-800">
        {[
          {
            id: 'overview', label: 'Overview',
            icon: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
          },
          {
            id: 'habits', label: 'Habits',
            icon: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>,
          },
          {
            id: 'goals', label: 'Goals',
            icon: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
          },
          {
            id: 'focus', label: 'Focus',
            icon: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
          },
        ].map((sub) => (
          <button
            key={sub.id}
            onClick={() => setActiveSubTab(sub.id)}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition shrink-0 ${
              activeSubTab === sub.id
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white'
            }`}
          >
            {sub.icon}
            <span>{sub.label}</span>
          </button>
        ))}
      </div>
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          <AIInsights
            enabled={aiEnabled}
            model={aiModel}
            cached={aiInsightsCache}
            habits={habits}
            completions={completions}
            goals={goals}
            tasks={tasks}
            missNotes={missNotes}
            moods={moods}
            onSave={onSaveInsights}
          />

          {appData && <Achievements data={appData} />}

          {moods && Object.keys(moods).length > 0 && <MoodStrip moods={moods} />}
        </div>
      )}

      {activeSubTab === 'habits' && habits.length > 0 && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-100 pb-4 dark:border-neutral-900/50">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-neutral-900 dark:text-white">Habit Analytics</h2>
              <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500">Explore consistency, trends, and correlations</p>
            </div>
            
            <div className="flex gap-1 rounded-full border border-neutral-200 p-1 dark:border-neutral-800 self-start sm:self-auto bg-white dark:bg-transparent">
              {[
                ['trends', 'Trends & Scoreboard'],
                ['heatmap', 'Consistency Heatmap'],
                ['advanced', 'Correlations & Weekdays'],
              ].map(([id, lbl]) => (
                <button
                  key={id}
                  onClick={() => setHabitTab(id)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                    habitTab === id
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                      : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {habitTab === 'trends' && (
            <div className="space-y-6">
              {/* all-habits activity line chart */}
              <ActivityChart habits={habits} completions={completions} dark={dark} />

              {/* per-habit rates */}
              <section className="rounded-3xl border border-neutral-200 p-6 dark:border-neutral-800 dark:bg-[#111]">
                <div className="mb-4 flex items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
                    <svg className="h-4 w-4 text-neutral-600 dark:text-neutral-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                  </span>
                  <div>
                    <h3 className="text-lg font-extrabold tracking-tight text-neutral-900 dark:text-white">Scoreboard</h3>
                    <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500">Completion rate per habit, last 30 days</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={Math.max(160, habits.length * 44)}>
                  <BarChart data={perHabit} layout="vertical" margin={{ top: 5, right: 12, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fill: axisColor, fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" width={130} tick={{ fill: axisColor, fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: dark ? '#26262640' : '#e5e5e560' }} />
                    <Bar dataKey="rate" radius={[0, 6, 6, 0]} barSize={18} fill={ink} />
                  </BarChart>
                </ResponsiveContainer>
              </section>
            </div>
          )}

          {habitTab === "heatmap" && (
            <section className="rounded-3xl border border-neutral-200 p-6 dark:border-neutral-800 dark:bg-[#111]">
              <div className="mb-5 flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
                  <svg className="h-4 w-4 text-neutral-600 dark:text-neutral-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </span>
                <div>
                  <h3 className="text-lg font-extrabold tracking-tight text-neutral-900 dark:text-white">{new Date().getFullYear()} &mdash; year at a glance</h3>
                  <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500">Every square is a day &mdash; fill the wall, don&apos;t break the chain.</p>
                </div>
              </div>
              <Heatmap habits={habits} completions={completions} dark={dark} />
            </section>
          )}

          {habitTab === 'advanced' && (
            <div className="grid gap-6 lg:grid-cols-2">
              <BestDayHour habits={habits} completions={completions} />
              <HabitCorrelation habits={habits} completions={completions} />
              <div className="col-span-1 lg:col-span-2">
                <MoodHabitOverlay habits={habits} completions={completions} moods={moods} dark={dark} />
              </div>
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'goals' && goals.length > 0 && (
        <section className="rounded-3xl border border-neutral-200 p-6 dark:border-neutral-800 dark:bg-[#111]">
          <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-4 mb-5">
            <div>
              <h3 className="text-lg font-extrabold tracking-tight text-neutral-900 dark:text-white">Goal statistics</h3>
              <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500">
                Track your active objectives and cascade rates
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Cards / Chart toggle */}
              <div className="flex gap-1 rounded-full border border-neutral-200 p-1 dark:border-neutral-800">
                {[['cards', 'Cards'], ['chart', 'Chart']].map(([id, lbl]) => (
                  <button
                    key={id}
                    onClick={() => setGoalChartMode(id)}
                    className={`rounded-full px-3.5 py-1 text-xs font-bold transition ${
                      goalChartMode === id
                        ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                        : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                    }`}
                  >
                    {id === 'chart' && (
                      <svg className="mr-1 inline h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" />
                      </svg>
                    )}
                    {lbl}
                  </button>
                ))}
              </div>

              {/* Summary pills */}
              <div className="flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                <div className="rounded-2xl bg-neutral-50 px-4 py-2 dark:bg-neutral-900">
                  Avg: <span className="font-mono text-sm font-extrabold text-neutral-900 dark:text-white ml-1">{avgCompletion}%</span>
                </div>
                <div className="rounded-2xl bg-neutral-50 px-4 py-2 dark:bg-neutral-900">
                  Done: <span className="font-mono text-sm font-extrabold text-neutral-900 dark:text-white ml-1">{completedGoals}/{filteredGoals.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-b border-neutral-100 py-4 mb-6 dark:border-neutral-900/50">
            <div className="flex flex-wrap gap-1.5 items-center">
              <div className="flex gap-1 rounded-full border border-neutral-200 p-1 dark:border-neutral-800">
                {['all', 'year', 'quarter', 'month', 'week'].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => changeLevelFilter(lvl)}
                    className={`rounded-full px-3.5 py-1 text-xs font-bold transition uppercase tracking-wider ${
                      levelFilter === lvl
                        ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                        : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>

              {levelFilter !== 'all' && availablePeriods.length > 0 && (
                <div className="flex items-center gap-2 ml-1">
                  <span className="text-xs font-bold text-neutral-400 dark:text-neutral-500">Period:</span>
                  <Select
                    value={periodFilter}
                    onChange={(e) => setPeriodFilter(e.target.value)}
                    compact
                    className="w-40"
                  >
                    <option value="all">All periods</option>
                    {availablePeriods.map((p) => (
                      <option key={p} value={p}>
                        {periodLabel(levelFilter, p)}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-1 rounded-full border border-neutral-200 p-1 dark:border-neutral-800">
              {['all', 'active', 'completed'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`rounded-full px-3.5 py-1 text-xs font-bold transition uppercase tracking-wider ${
                    statusFilter === status
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                      : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Cards / Chart content */}
          {filteredGoals.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-300 p-12 text-center text-sm font-semibold text-neutral-400 dark:border-neutral-700 dark:text-neutral-500">
              No matching goals found. Try adjusting your filters.
            </div>
          ) : goalChartMode === 'chart' ? (
            <GoalChartView filteredGoals={filteredGoals} ctx={ctx} dark={dark} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredGoals.map((g) => (
                <GoalProgressCard key={g.id} goal={g} ctx={ctx} />
              ))}
            </div>
          )}
        </section>
      )}

      {activeSubTab === 'focus' && (
        <div className="space-y-6">
          {appData && <FocusChart focusLog={appData.focusLog} dark={dark} />}

          {/* Focus session history */}
          {appData?.focusLog?.length > 0 && (
            <section className="rounded-3xl border border-neutral-200 p-6 dark:border-neutral-800 dark:bg-[#111]">
              <div className="mb-4 flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
                  <svg className="h-4 w-4 text-neutral-600 dark:text-neutral-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                </span>
                <div>
                  <h3 className="text-lg font-extrabold tracking-tight text-neutral-900 dark:text-white">Session log</h3>
                  <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500">
                    {appData.focusLog.length} sessions · {appData.focusLog.reduce((s, f) => s + f.minutes, 0)} min total
                  </p>
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto space-y-1.5 pr-1">
                {[...appData.focusLog].reverse().map((s, i) => {
                  const goal = goals.find((g) => g.id === s.goalId)
                  return (
                    <div key={i} className="flex items-center gap-3 rounded-xl border border-neutral-100 px-4 py-2.5 dark:border-neutral-900/60">
                      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-neutral-400 dark:text-neutral-500 w-20">{s.date}</span>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                        {s.label || 'Focus session'}
                      </span>
                      {goal && (
                        <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400 truncate max-w-[100px]">
                          {goal.title}
                        </span>
                      )}
                      <span className="shrink-0 font-mono text-sm font-extrabold text-neutral-900 dark:text-white">{s.minutes}m</span>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
