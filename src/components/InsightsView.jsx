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

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm shadow-lg dark:border-neutral-700 dark:bg-[#161616]">
      <p className="font-semibold text-neutral-900 dark:text-white">{label}</p>
      <p className="text-neutral-500 dark:text-neutral-400">{payload[0].value}% completed</p>
    </div>
  )
}

function GoalBar({ goal, ctx }) {
  const pct = goalPercent(goal, ctx)
  return (
    <div className="flex items-center gap-3">
      <span className="w-1/3 min-w-0 shrink-0">
        <span className="block truncate text-sm font-semibold text-neutral-800 dark:text-neutral-100">{goal.title}</span>
        <span className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500">{periodLabel(goal.level, goal.period)}</span>
      </span>
      <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
        <span className="block h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: goal.color }} />
      </span>
      <span className="w-10 shrink-0 text-right text-sm font-extrabold tabular-nums text-neutral-900 dark:text-white">{pct}%</span>
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
      {/* AI coach analysis */}
      <AIInsights
        enabled={aiEnabled}
        model={aiModel}
        cached={aiInsightsCache}
        habits={habits}
        completions={completions}
        goals={goals}
        missNotes={missNotes}
        onSave={onSaveInsights}
      />

      {appData && <Achievements data={appData} />}

      {moods && Object.keys(moods).length > 0 && <MoodStrip moods={moods} />}

      {/* goal progress */}
      {goals.length > 0 && (
        <section className="rounded-3xl border border-neutral-200 p-6 dark:border-neutral-800 dark:bg-[#111]">
          <h3 className="mb-1 text-lg font-extrabold tracking-tight text-neutral-900 dark:text-white">Goal progress</h3>
          <p className="mb-5 text-sm font-medium text-neutral-400 dark:text-neutral-500">
            Every goal across your cascade, rolled up to today.
          </p>
          <div className="space-y-6">
            {goalsByLevel.map(({ lvl, items }) => (
              <div key={lvl}>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">
                  {LEVEL_LABEL[lvl]}
                </p>
                <div className="space-y-2.5">
                  {items.map((g) => (
                    <GoalBar key={g.id} goal={g} ctx={ctx} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

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
