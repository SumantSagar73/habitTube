import { useState } from 'react'
import { addDays, dateKey, dayRate, todayKey, WEEKDAYS } from '../utils'
import DayTimeline from './DayTimeline'

const MOOD_FACE = { 1: '😣', 2: '😕', 3: '😐', 4: '🙂', 5: '😄' }
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function CalendarView({ habits, completions, tasks, moods, goals = [], onUpdateTask, onToggleTask, onAddTask, onDeleteTask }) {
  const now = new Date()
  const [view, setView] = useState('month')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [dayDate, setDayDate] = useState(now)
  const today = todayKey()

  const first = new Date(year, month, 1)
  const startPad = first.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < startPad; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)

  function shiftMonth(delta) {
    const m = month + delta
    setMonth(((m % 12) + 12) % 12)
    setYear(year + Math.floor(m / 12))
  }
  function openDay(d) {
    setDayDate(d)
    setView('day')
  }
  function nav(delta) {
    if (view === 'month') shiftMonth(delta)
    else setDayDate((d) => addDays(d, delta))
  }
  function goToday() {
    if (view === 'month') {
      setYear(now.getFullYear())
      setMonth(now.getMonth())
    } else {
      setDayDate(new Date())
    }
  }

  return (
    <div className="rounded-3xl border border-neutral-200 p-4 dark:border-neutral-800 dark:bg-[#111] sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
          {view === 'month' ? `${MONTHS[month]} ${year}` : 'Day plan'}
        </h2>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-full border border-neutral-200 p-1 dark:border-neutral-800">
            {[
              ['month', 'Month'],
              ['day', 'Day'],
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setView(id)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                  view === id ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {view === 'month' && (
            <div className="flex items-center gap-1">
              <button onClick={() => nav(-1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition hover:border-neutral-400 dark:border-neutral-800 dark:text-neutral-400">‹</button>
              <button onClick={goToday} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-bold text-neutral-500 transition hover:border-neutral-400 dark:border-neutral-800 dark:text-neutral-400">
                Today
              </button>
              <button onClick={() => nav(1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition hover:border-neutral-400 dark:border-neutral-800 dark:text-neutral-400">›</button>
            </div>
          )}
        </div>
      </div>

      {view === 'day' ? (
        <DayTimeline
          key={dateKey(dayDate)}
          initialDate={dayDate}
          tasks={tasks}
          goals={goals}
          onUpdateTask={onUpdateTask}
          onToggleTask={onToggleTask}
          onAddTask={onAddTask}
          onDeleteTask={onDeleteTask}
        />
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1.5">
            {WEEKDAYS.map((w) => (
              <div key={w} className="pb-1 text-center text-[10px] font-bold uppercase tracking-[0.08em] text-neutral-400 dark:text-neutral-500">
                {w}
              </div>
            ))}
            {cells.map((d, i) => {
              if (!d) return <div key={i} />
              const key = dateKey(d)
              const isToday = key === today
              const rate = dayRate(habits, completions, d)
              const dayTasks = tasks[key] || []
              const doneTasks = dayTasks.filter((t) => t.done).length
              const mood = moods[key]
              return (
                <button
                  key={key}
                  onClick={() => openDay(d)}
                  title="Open this day"
                  className={`flex min-h-[68px] flex-col rounded-xl border p-1.5 text-left transition hover:border-neutral-400 dark:hover:border-neutral-600 ${
                    isToday ? 'border-neutral-900 dark:border-white' : 'border-neutral-200 dark:border-neutral-800'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className={`text-xs font-bold ${isToday ? 'rounded-md bg-neutral-900 px-1.5 text-white dark:bg-white dark:text-neutral-900' : 'text-neutral-500 dark:text-neutral-400'}`}>
                      {d.getDate()}
                    </span>
                    {mood && <span className="text-sm leading-none">{MOOD_FACE[mood]}</span>}
                  </div>
                  <div className="mt-auto space-y-1">
                    {rate != null && (
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                        <div className="h-full rounded-full bg-neutral-900 dark:bg-white" style={{ width: `${Math.round(rate * 100)}%` }} />
                      </div>
                    )}
                    {dayTasks.length > 0 && <p className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500">✓ {doneTasks}/{dayTasks.length}</p>}
                  </div>
                </button>
              )
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[11px] font-medium text-neutral-400 dark:text-neutral-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-6 rounded-full bg-neutral-900 dark:bg-white" /> habit completion
            </span>
            <span>✓ done/total tasks</span>
            <span>🙂 mood</span>
            <span>· tap a day to plan it</span>
          </div>
        </>
      )}
    </div>
  )
}
