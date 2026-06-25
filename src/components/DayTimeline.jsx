import { useState } from 'react'
import { addDays, dateKey, todayKey } from '../utils'
import GoalOptions from './GoalOptions'
import Select from './Select'
import { decodeLink, encodeLink } from './TodayView'

const pad = (n) => String(n).padStart(2, '0')
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6) // 6am → 11pm
const hourLabel = (h) => `${((h + 11) % 12) + 1} ${h < 12 ? 'AM' : 'PM'}`

function Chip({ task, dayKey, goals, habits, onToggleTask, onDeleteTask, onUpdateTask }) {
  const linkValue = encodeLink(task.goalId, task.habitId)
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', task.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      className="group flex cursor-grab items-center gap-2 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 active:cursor-grabbing dark:border-neutral-700 dark:bg-[#1a1a1a]"
    >
      <button
        onClick={() => onToggleTask(dayKey, task.id)}
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition ${
          task.done ? 'border-neutral-900 bg-neutral-900 dark:border-white dark:bg-white' : 'border-neutral-300 dark:border-neutral-600'
        }`}
      >
        {task.done && (
          <svg className="h-3 w-3 text-white dark:text-neutral-900" viewBox="0 0 20 20" fill="none">
            <path d="M5 10.5l3.5 3.5L15 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      <span className={`flex-1 truncate text-sm font-medium ${task.done ? 'text-neutral-400 line-through dark:text-neutral-600' : 'text-neutral-800 dark:text-neutral-100'}`}>
        {task.title}
      </span>
      {/* unified goal + habit link */}
      {(goals.length > 0 || habits.length > 0) && (
        <Select
          value={linkValue}
          onChange={(e) => {
            const { goalId, habitId } = decodeLink(e.target.value)
            onUpdateTask(dayKey, task.id, { goalId, habitId })
          }}
          compact
          className="w-28 shrink-0"
        >
          <option value="">no link</option>
          {goals.length > 0 && (
            <GoalOptions goals={goals} prefix="g_" />
          )}
          {habits.length > 0 && (
            <optgroup label="Habits">
              {habits.map((h) => (
                <option key={h.id} value={`h_${h.id}`}>
                  {h.emoji} {h.name}
                </option>
              ))}
            </optgroup>
          )}
        </Select>
      )}
      <Select
        value={task.time ? String(parseInt(task.time, 10)) : ''}
        onChange={(e) => onUpdateTask(dayKey, task.id, { time: e.target.value === '' ? null : `${pad(Number(e.target.value))}:00` })}
        title="Set a time"
        compact
        className="w-20 shrink-0"
      >
        <option value="">⏰</option>
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {hourLabel(h)}
          </option>
        ))}
      </Select>
      {task.time && (
        <Select
          value={task.duration || 1}
          onChange={(e) => onUpdateTask(dayKey, task.id, { duration: Number(e.target.value) })}
          title="Set duration"
          compact
          className="w-16 shrink-0"
        >
          {[1, 2, 3, 4, 5, 6, 7, 8].map((d) => (
            <option key={d} value={d}>
              {d} {d === 1 ? 'hr' : 'hrs'}
            </option>
          ))}
        </Select>
      )}
      <button
        onClick={() => onDeleteTask(dayKey, task.id)}
        className="text-neutral-300 transition hover:text-neutral-600 dark:text-neutral-600 dark:hover:text-neutral-300"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  )
}

export default function DayTimeline({ initialDate, tasks, goals = [], habits = [], onUpdateTask, onToggleTask, onAddTask, onDeleteTask }) {
  const [date, setDate] = useState(() => initialDate || new Date())
  const dk = dateKey(date)
  const list = tasks[dk] || []
  const unscheduled = list.filter((t) => !t.time)
  const isToday = dk === todayKey()
  const nowHour = new Date().getHours()
  const [text, setText] = useState('')
  const [over, setOver] = useState(null) // hour being dragged over
  const dayLabel = date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })

  function dropOn(e, time) {
    e.preventDefault()
    setOver(null)
    const id = e.dataTransfer.getData('text/plain')
    if (id) onUpdateTask(dk, id, { time })
  }
  function add() {
    if (!text.trim()) return
    onAddTask(dk, text.trim(), null, 'medium', null)
    setText('')
  }

  return (
    <div>
      {/* day navigation — lets you build tomorrow's (or any day's) routine */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-neutral-900 dark:text-white">
          {dayLabel} {isToday && <span className="text-neutral-400 dark:text-neutral-500">· today</span>}
        </p>
        <div className="flex items-center gap-1">
          <button onClick={() => setDate((d) => addDays(d, -1))} title="Previous day" className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition hover:border-neutral-400 dark:border-neutral-800 dark:text-neutral-400">‹</button>
          <button onClick={() => setDate(new Date())} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-bold text-neutral-500 transition hover:border-neutral-400 dark:border-neutral-800 dark:text-neutral-400">Today</button>
          <button onClick={() => setDate((d) => addDays(d, 1))} title="Next day" className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition hover:border-neutral-400 dark:border-neutral-800 dark:text-neutral-400">›</button>
        </div>
      </div>

      {/* quick add */}
      <div className="mb-3 flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Add a task, then drag it onto a time…"
          className="min-w-0 flex-1 rounded-xl border border-neutral-200 bg-transparent px-3.5 py-2 text-sm font-medium text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 dark:border-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-600 dark:focus:border-white"
        />
        <button onClick={add} className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-bold text-white dark:bg-white dark:text-neutral-900">
          Add
        </button>
      </div>

      {/* unscheduled tray (drop here to unschedule) */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => dropOn(e, null)}
        className="mb-4 rounded-2xl border border-dashed border-neutral-300 p-3 dark:border-neutral-700"
      >
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400 dark:text-neutral-500">Unscheduled</p>
        {unscheduled.length === 0 ? (
          <p className="text-sm font-medium text-neutral-400 dark:text-neutral-600">Nothing waiting — drag a task here to unschedule it.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {unscheduled.map((t) => (
              <div key={t.id} className="w-full sm:w-auto sm:min-w-[260px]">
                <Chip task={t} dayKey={dk} goals={goals} habits={habits} onToggleTask={onToggleTask} onDeleteTask={onDeleteTask} onUpdateTask={onUpdateTask} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* hourly timeline */}
      <div className="max-h-[60vh] overflow-y-auto rounded-2xl border border-neutral-200 dark:border-neutral-800">
        {HOURS.map((h) => {
          const time = `${pad(h)}:00`
          const inHour = list.filter((t) => {
            if (!t.time) return false
            const start = parseInt(t.time, 10)
            const dur = t.duration || 1
            return h >= start && h < start + dur
          })
          const current = isToday && h === nowHour
          return (
            <div
              key={h}
              onDragOver={(e) => {
                e.preventDefault()
                setOver(h)
              }}
              onDragLeave={() => setOver((o) => (o === h ? null : o))}
              onDrop={(e) => dropOn(e, time)}
              className={`flex min-h-[52px] border-b border-neutral-100 px-3 py-2 last:border-0 dark:border-neutral-800/60 ${
                over === h ? 'bg-neutral-100 dark:bg-neutral-800/60' : current ? 'bg-neutral-50 dark:bg-neutral-900/40' : ''
              }`}
            >
              <span className={`w-14 shrink-0 pt-1 text-xs font-bold ${current ? 'text-neutral-900 dark:text-white' : 'text-neutral-400 dark:text-neutral-500'}`}>
                {hourLabel(h)}
              </span>
              <div className="flex flex-1 flex-col gap-1.5">
                {inHour.map((t) => {
                  const startHour = parseInt(t.time, 10)
                  const isStart = h === startHour
                  if (isStart) {
                    return (
                      <Chip
                        key={t.id}
                        task={t}
                        dayKey={dk}
                        goals={goals}
                        habits={habits}
                        onToggleTask={onToggleTask}
                        onDeleteTask={onDeleteTask}
                        onUpdateTask={onUpdateTask}
                      />
                    )
                  } else {
                    return (
                      <div
                        key={`${t.id}-cont-${h}`}
                        className="flex items-center gap-2 rounded-lg border border-dashed border-neutral-200 bg-neutral-50/20 px-2.5 py-1 text-neutral-800/60 dark:border-neutral-800 dark:bg-neutral-950/10 dark:text-neutral-200/50"
                      >
                        <span className="h-4 w-4 shrink-0 rounded border border-neutral-300 dark:border-neutral-700 flex items-center justify-center bg-neutral-100 dark:bg-neutral-800/40">
                          {t.done && (
                            <svg className="h-2.5 w-2.5 text-neutral-400" viewBox="0 0 20 20" fill="none">
                              <path d="M5 10.5l3.5 3.5L15 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>
                        <span className={`flex-1 truncate text-xs font-medium italic ${t.done ? 'line-through' : ''}`}>
                          {t.title} <span className="not-italic text-[9px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-600">(continued)</span>
                        </span>
                      </div>
                    )
                  }
                })}
              </div>
            </div>
          )
        })}
      </div>
      <p className="mt-3 text-xs font-medium text-neutral-400 dark:text-neutral-500">
        Drag a task onto an hour to schedule it · drag it to another hour to move it · drag back to Unscheduled to clear the time.
      </p>
    </div>
  )
}
