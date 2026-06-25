import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { goalPercent, LEVEL_LABEL, LEVELS, periodLabel } from '../planUtils'
import { addDays, dateKey, habitRate } from '../utils'
import Achievements from './Achievements'
import ActivityChart from './ActivityChart'
import AIInsights from './AIInsights'
import Heatmap from './Heatmap'

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

function GoalProgressCard({ goal, ctx }) {
  const pct = goalPercent(goal, ctx)
  const isDone = pct >= 100

  const typeIcons = {
    checklist: '📋',
    numeric: '🔢',
    habit: '🔁',
  }
  const icon = typeIcons[goal.type] || '🎯'

  const parent = goal.parentId ? ctx.goals.find((g) => g.id === goal.parentId) : null

  let progressText = ''
  if (goal.type === 'numeric') {
    progressText = `${goal.current || 0} / ${goal.target} ${goal.unit || ''}`
  } else if (goal.type === 'habit') {
    const habit = ctx.habits.find((h) => h.id === goal.habitId)
    progressText = habit ? `Completions: ${goal.habitTarget || 0}` : ''
  }

  return (
    <div 
      className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-neutral-200 bg-white p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-[#151515]"
      style={{ borderLeftWidth: '5px', borderLeftColor: goal.color }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base" title={`${goal.type} goal`}>{icon}</span>
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
        <p className="mt-3 text-xs font-bold text-neutral-600 dark:text-neutral-400">
          {progressText}
        </p>
      )}

      <div className="mt-3.5 h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
        <div 
          className="h-full rounded-full transition-all duration-700 ease-out" 
          style={{ 
            width: `${pct}%`, 
            backgroundColor: goal.color,
            boxShadow: isDone ? `0 0 10px ${goal.color}80` : 'none'
          }} 
        />
      </div>
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

  const ctx = { goals, tasks: tasks || {}, habits, completions }
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

      {appData && <FocusChart focusLog={appData.focusLog} dark={dark} />}

      {/* goal progress */}
      {goals.length > 0 && (() => {
        const avgCompletion = Math.round(goals.reduce((acc, g) => acc + goalPercent(g, ctx), 0) / goals.length)
        const completedGoals = goals.filter((g) => goalPercent(g, ctx) >= 100).length
        const activeGoals = goals.length - completedGoals

        return (
          <section className="rounded-3xl border border-neutral-200 p-6 dark:border-neutral-800 dark:bg-[#111]">
            <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-4 mb-5">
              <div>
                <h3 className="text-lg font-extrabold tracking-tight text-neutral-900 dark:text-white">Goal statistics</h3>
                <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500">
                  Track your active objectives and cascade rates
                </p>
              </div>
              
              <div className="flex flex-wrap gap-2.5 text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                <div className="rounded-2xl bg-neutral-50 px-4 py-2 dark:bg-neutral-900">
                  Avg Progress: <span className="font-mono text-sm font-extrabold text-neutral-900 dark:text-white ml-1">{avgCompletion}%</span>
                </div>
                <div className="rounded-2xl bg-neutral-50 px-4 py-2 dark:bg-neutral-900">
                  Completed: <span className="font-mono text-sm font-extrabold text-neutral-900 dark:text-white ml-1">{completedGoals}/{goals.length}</span>
                </div>
                <div className="rounded-2xl bg-neutral-50 px-4 py-2 dark:bg-neutral-900">
                  Active: <span className="font-mono text-sm font-extrabold text-neutral-900 dark:text-white ml-1">{activeGoals}</span>
                </div>
              </div>
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-b border-neutral-100 py-4 mb-6 dark:border-neutral-900/50">
              <div className="flex flex-wrap gap-1 rounded-full border border-neutral-200 p-1 dark:border-neutral-800">
                {['all', 'year', 'quarter', 'month', 'week'].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setLevelFilter(lvl)}
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

            {/* Cards Grid */}
            {(() => {
              const filteredGoals = goals.filter((g) => {
                const pct = goalPercent(g, ctx)
                const matchesLevel = levelFilter === 'all' || g.level === levelFilter
                const matchesStatus =
                  statusFilter === 'all' ||
                  (statusFilter === 'active' && pct < 100) ||
                  (statusFilter === 'completed' && pct >= 100)
                return matchesLevel && matchesStatus
              })

              if (filteredGoals.length === 0) {
                return (
                  <div className="rounded-2xl border border-dashed border-neutral-300 p-12 text-center text-sm font-semibold text-neutral-400 dark:border-neutral-700 dark:text-neutral-500">
                    No matching goals found. Try adjusting your filters.
                  </div>
                )
              }

              return (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredGoals.map((g) => (
                    <GoalProgressCard key={g.id} goal={g} ctx={ctx} />
                  ))}
                </div>
              )
            })()}
          </section>
        )
      })()}

      {habits.length > 0 && (
        <>
          {/* year heatmap: January → December */}
          <section className="rounded-3xl border border-neutral-200 p-6 dark:border-neutral-800 dark:bg-[#111]">
            <h3 className="mb-1 text-lg font-extrabold tracking-tight text-neutral-900 dark:text-white">
              {new Date().getFullYear()} — your year at a glance
            </h3>
            <p className="mb-5 text-sm font-medium text-neutral-400 dark:text-neutral-500">
              January to December. Every square is a day — fill the wall, don’t break the chain.
            </p>
            <Heatmap habits={habits} completions={completions} dark={dark} />
          </section>

          {/* all-habits activity line chart */}
          <ActivityChart habits={habits} completions={completions} dark={dark} />

          {/* per-habit rates */}
          <section className="rounded-3xl border border-neutral-200 p-6 dark:border-neutral-800 dark:bg-[#111]">
            <h3 className="mb-1 text-lg font-extrabold tracking-tight text-neutral-900 dark:text-white">Habit scoreboard</h3>
            <p className="mb-4 text-sm font-medium text-neutral-400 dark:text-neutral-500">
              Completion rate per habit, last 30 days
            </p>
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
        </>
      )}
    </div>
  )
}
