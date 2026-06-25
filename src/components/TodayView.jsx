import { useState } from 'react'
import { quoteOfTheDay } from '../quotes'
import { addDays, dateKey, formatNice, habitsForDate, isDone, nextPriority, sortByPriority, todayKey } from '../utils'
import AICoach from './AICoach'
import DayTimeline from './DayTimeline'
import FocusTimer from './FocusTimer'
import GoalOptions from './GoalOptions'
import HabitCard from './HabitCard'
import { PriorityDot, PrioritySelect } from './Priority'
import ProgressRing from './ProgressRing'
import Select from './Select'

function accountabilityMessage(pendingHabits, doneHabits, totalHabits, pendingTasks, doneTasks, totalTasks, hour) {
  const total = totalHabits + totalTasks
  const pending = pendingHabits + pendingTasks
  const doneCount = doneHabits + doneTasks

  if (total === 0) return 'Nothing scheduled today. Add a habit or task to get rolling.'
  if (pending === 0) return 'Perfect day — everything completed. This is how change happens.'
  if (hour >= 20) return `The day is almost over and ${pending} item${pending > 1 ? 's are' : ' is'} still waiting. Finish strong.`
  if (doneCount === 0 && hour >= 12) return `You haven't started yet — pick the easiest one and just begin. ${pending} to go.`
  if (doneCount > 0) return `Nice momentum — ${doneCount} down, ${pending} to go. Finish strong.`
  return `${pending} item${pending > 1 ? 's' : ''} on today's plan. Future you is counting on present you.`
}

function formatTime12h(timeStr) {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = ((h + 11) % 12) + 1
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

const pad = (n) => String(n).padStart(2, '0')
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6) // 6am → 11pm
const hourLabel = (h) => `${((h + 11) % 12) + 1} ${h < 12 ? 'AM' : 'PM'}`

// Unified link selector value helpers
// goals use prefix "g_<id>", habits use prefix "h_<id>"
export function encodeLink(goalId, habitId) {
  if (goalId) return `g_${goalId}`
  if (habitId) return `h_${habitId}`
  return ''
}
export function decodeLink(value) {
  if (!value) return { goalId: null, habitId: null }
  if (value.startsWith('g_')) return { goalId: value.slice(2), habitId: null }
  if (value.startsWith('h_')) return { goalId: null, habitId: value.slice(2) }
  return { goalId: null, habitId: null }
}

function LinkSelect({ goals, habits, value, onChange, compact, className }) {
  return (
    <Select value={value} onChange={onChange} compact={compact} className={className}>
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
  )
}

export default function TodayView({
  habits,
  completions,
  notes,
  missNotes,
  tasks,
  goals,
  moods,
  onToggle,
  onToggleOn,
  onNoteChange,
  onMissNote,
  onSetMood,
  onAddTask,
  onToggleTask,
  onUpdateTask,
  onDeleteTask,
  aiEnabled,
  aiModel,
  motivation,
  onSaveMotivation,
  onOpenCoach,
  focus,
  focusMinutesToday,
  onStartFocus,
  onPauseFocus,
  onResumeFocus,
  onStopFocus,
}) {
  const key = todayKey()
  const now = new Date()
  const due = habitsForDate(habits, now)
  const doneCount = due.filter((h) => isDone(h, completions, key)).length
  const pending = due.length - doneCount
  const todayTasksList = tasks[key] || []
  const doneTasksCount = todayTasksList.filter((t) => t.done).length
  const totalTasksCount = todayTasksList.length
  const pendingTasksCount = totalTasksCount - doneTasksCount
  const quote = quoteOfTheDay(key)
  const nowHM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  const yesterday = addDays(now, -1)
  const yKey = dateKey(yesterday)
  const yMissed = habitsForDate(habits, yesterday).filter((h) => !isDone(h, completions, yKey))
  // Strict mode: today's checklist stays locked until every miss from
  // yesterday has a written reason.
  const unexplained = yMissed.filter((h) => !(missNotes[h.id]?.[yKey] || '').trim())
  const locked = unexplained.length > 0
  // Allow user to dismiss the miss panel once all misses are explained
  const [missesHidden, setMissesHidden] = useState(
    () => localStorage.getItem(`misses-hidden-${yKey}`) === '1'
  )
  function hideMisses() {
    localStorage.setItem(`misses-hidden-${yKey}`, '1')
    setMissesHidden(true)
  }

  const sorted = [...due].sort((a, b) => {
    const da = isDone(a, completions, key)
    const db = isDone(b, completions, key)
    if (da !== db) return da ? 1 : -1
    return (a.time || '99:99').localeCompare(b.time || '99:99')
  })

  return (
    <div className="space-y-6">
      {/* yesterday's misses — demand a reason (full-width banner at top) */}
      {yMissed.length > 0 && !missesHidden && (
        <section className="rounded-3xl border-2 border-neutral-900 p-6 dark:border-white dark:bg-[#111]">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-extrabold tracking-tight text-neutral-900 dark:text-white">
              You missed {yMissed.length} habit{yMissed.length > 1 ? 's' : ''} yesterday. Why?
            </h3>
            <span className="rounded-full bg-neutral-900 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-white dark:bg-white dark:text-neutral-900">
              Strict mode
            </span>
          </div>
          <p className="mt-1 mb-4 text-sm font-medium text-neutral-400 dark:text-neutral-500">
            {locked
              ? "Today's checklist is locked until you write a reason for every miss (or mark it as done). Be honest — the reason is the obstacle you have to remove today."
              : 'All misses explained — checklist unlocked. You can hide this now.'}
          </p>
          <div className="space-y-3">
            {yMissed.map((h) => (
              <div key={h.id} className="flex flex-col gap-2 border-b border-neutral-100 pb-3.5 last:border-b-0 last:pb-0 dark:border-neutral-800/40">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <span className="flex w-52 shrink-0 items-center gap-2 text-sm font-bold text-neutral-900 dark:text-white">
                    <span className="text-lg">{h.emoji}</span>
                    <span className="truncate">{h.name}</span>
                  </span>
                  <input
                    value={missNotes[h.id]?.[yKey] || ''}
                    onChange={(e) => onMissNote(h.id, yKey, e.target.value)}
                    placeholder="Why did you skip it?"
                    className="flex-1 rounded-xl border border-neutral-200 bg-transparent px-3.5 py-2 text-sm font-medium text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 dark:border-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-600 dark:focus:border-white"
                  />
                  {/* "Did it yesterday" button */}
                  <button
                    onClick={() => onToggleOn(h.id, yKey)}
                    title="Mark as done yesterday"
                    className="flex shrink-0 items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-xs font-bold text-neutral-600 transition hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-emerald-500 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none">
                      <path d="M5 10.5l3.5 3.5L15 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Did it
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 sm:pl-52">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Quick preset:</span>
                  {['Lack of time', 'Too tired', 'Forgot', 'Travelling', 'Sick'].map((reason) => (
                    <button
                      key={reason}
                      onClick={() => onMissNote(h.id, yKey, reason)}
                      className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[10px] font-semibold text-neutral-600 transition hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {/* Dismiss / hide once all explained */}
          {!locked && (
            <button
              onClick={() => hideMisses()}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 py-2.5 text-sm font-bold text-neutral-600 transition hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500"
            >
              Unlock &amp; Hide
            </button>
          )}
        </section>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Habits checklist, Daily tasks, Daily Journal (span 8) */}
        <div className="space-y-6 lg:col-span-8">
          {/* Habit checklist */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">
              Habit checklist
            </h3>
            {due.length > 0 ? (
              <div className="relative">
                <div
                  className={`grid gap-2.5 sm:grid-cols-2 ${locked ? 'pointer-events-none select-none blur-sm' : ''}`}
                  aria-hidden={locked}
                >
                  {sorted.map((h) => (
                    <HabitCard
                      key={h.id}
                      habit={h}
                      completions={completions}
                      done={isDone(h, completions, key)}
                      overdue={!!h.time && h.time < nowHM}
                      onToggle={() => onToggle(h.id)}
                    />
                  ))}
                </div>
                {locked && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl text-center">
                    <svg className="h-7 w-7 text-neutral-900 dark:text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="4" y="11" width="16" height="10" rx="2" />
                      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                    </svg>
                    <p className="font-bold text-neutral-900 dark:text-white">Locked by strict mode</p>
                    <p className="max-w-xs text-sm font-medium text-neutral-500 dark:text-neutral-400">
                      Explain or mark done {unexplained.length === 1 ? "yesterday's miss" : `all ${unexplained.length} of yesterday's misses`} above to unlock today.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-neutral-300 p-10 text-center font-medium text-neutral-400 dark:border-neutral-700 dark:text-neutral-500">
                {habits.length === 0
                  ? 'No habits yet — hit "+ New habit" to plan your first one.'
                  : 'No habits scheduled for today. Rest day.'}
              </div>
            )}
          </section>

          {/* Daily tasks */}
          <TodayTasks
            dayKey={key}
            tasks={tasks}
            goals={goals}
            habits={habits}
            onAddTask={onAddTask}
            onToggleTask={onToggleTask}
            onUpdateTask={onUpdateTask}
            onDeleteTask={onDeleteTask}
          />

          {/* Daily journal + mood */}
          <section className="rounded-3xl border border-neutral-200 p-6 dark:border-neutral-800 dark:bg-[#111]">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">
              Today's journal
            </h3>
            <MoodPicker value={moods[key]} onChange={(v) => onSetMood(key, v)} />
            <textarea
              value={notes[key] || ''}
              onChange={(e) => onNoteChange(key, e.target.value)}
              placeholder="How did it go? What got in the way? What will you do differently tomorrow?"
              rows={3}
              className="mt-4 w-full resize-y rounded-xl border border-neutral-200 bg-transparent px-4 py-3 text-sm font-medium text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 dark:border-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-600 dark:focus:border-white"
            />
          </section>
        </div>

        {/* Right Column: Progress ring, Focus Timer, AI Coach, Quote widget (span 4) */}
        <div className="space-y-6 lg:col-span-4">
          {/* Today's progress */}
          <section className="flex flex-col items-center gap-5 rounded-3xl border border-neutral-200 p-6 text-center dark:border-neutral-800 dark:bg-[#111]">
            <div className="flex flex-wrap items-center gap-6 justify-center">
              <div className="flex flex-col items-center gap-2">
                <ProgressRing done={doneCount} total={due.length} size={100} />
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">Habits</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <ProgressRing done={doneTasksCount} total={totalTasksCount} size={100} />
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">Tasks</span>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">
                {formatNice(key)}
              </p>
              <h2 className="mt-1 text-xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
                {(pending === 0 && due.length > 0) && (totalTasksCount === 0 || doneTasksCount === totalTasksCount) ? 'Plan complete.' : "Today's plan"}
              </h2>
              <p className="mt-2 text-xs leading-relaxed font-semibold text-neutral-400 dark:text-neutral-500">
                {accountabilityMessage(pending, doneCount, due.length, pendingTasksCount, doneTasksCount, totalTasksCount, now.getHours())}
              </p>
            </div>
          </section>

          {/* Pomodoro timer */}
          <FocusTimer
            focus={focus}
            goals={goals}
            totalToday={focusMinutesToday}
            onStart={onStartFocus}
            onPause={onPauseFocus}
            onResume={onResumeFocus}
            onStop={onStopFocus}
          />

          {/* AI Coach */}
          <AICoach
            enabled={aiEnabled}
            model={aiModel}
            motivation={motivation}
            habits={habits}
            completions={completions}
            tasks={tasks}
            goals={goals}
            onSave={onSaveMotivation}
            onOpenCoach={onOpenCoach}
          />

          {/* Quote of the day */}
          <section className="rounded-3xl border border-neutral-100 bg-neutral-50/50 p-6 text-center dark:border-neutral-800/40 dark:bg-neutral-900/10">
            <p className="font-serif text-lg italic leading-normal text-neutral-800 dark:text-neutral-100">
              "{quote.text}"
            </p>
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">
              — {quote.author}
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}

export const MOODS = [
  { v: 1, e: '😣', l: 'Rough' },
  { v: 2, e: '😕', l: 'Low' },
  { v: 3, e: '😐', l: 'Okay' },
  { v: 4, e: '🙂', l: 'Good' },
  { v: 5, e: '😄', l: 'Great' },
]

function MoodPicker({ value, onChange }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-neutral-400 dark:text-neutral-500">How are you feeling today?</p>
      <div className="flex gap-2">
        {MOODS.map((m) => (
          <button
            key={m.v}
            onClick={() => onChange(value === m.v ? 0 : m.v)}
            title={m.l}
            className={`flex flex-1 flex-col items-center gap-1 rounded-xl border py-2.5 transition ${
              value === m.v
                ? 'border-neutral-900 bg-neutral-50 dark:border-white dark:bg-neutral-800'
                : 'border-neutral-200 hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600'
            }`}
          >
            <span className={`text-2xl transition ${value && value !== m.v ? 'opacity-40 grayscale' : ''}`}>{m.e}</span>
            <span className="text-[10px] font-bold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">{m.l}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function TodayTasks({ dayKey, tasks, goals, habits, onAddTask, onToggleTask, onUpdateTask, onDeleteTask }) {
  const [text, setText] = useState('')
  const [priority, setPriority] = useState('medium')
  const [linkValue, setLinkValue] = useState('')
  const [taskTime, setTaskTime] = useState('')
  const [taskDuration, setTaskDuration] = useState(1)
  const [view, setView] = useState('list') // 'list' | 'schedule'
  const list = tasks[dayKey] || []
  const doneCount = list.filter((t) => t.done).length

  // Sort tasks:
  // 1. Done status (undone first)
  // 2. Scheduled time (chronological)
  // 3. Unscheduled tasks sorted by priority (high -> low)
  const sorted = [...list].sort((a, b) => {
    const doneDiff = (a.done ? 1 : 0) - (b.done ? 1 : 0)
    if (doneDiff !== 0) return doneDiff

    if (a.time && !b.time) return -1
    if (!a.time && b.time) return 1
    if (a.time && b.time) {
      return a.time.localeCompare(b.time)
    }

    const priorityOrder = { high: 0, medium: 1, low: 2 }
    const pa = priorityOrder[a.priority] ?? 1
    const pb = priorityOrder[b.priority] ?? 1
    return pa - pb
  })

  function add() {
    if (!text.trim()) return
    const { goalId, habitId } = decodeLink(linkValue)
    const extra = {}
    if (taskTime) {
      extra.time = `${pad(Number(taskTime))}:00`
      extra.duration = taskDuration
    }
    onAddTask(dayKey, text.trim(), goalId, priority, habitId, extra)
    setText('')
    setTaskTime('')
    setTaskDuration(1)
  }

  return (
    <section className="rounded-3xl border border-neutral-200 p-6 dark:border-neutral-800 dark:bg-[#111]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">
          Today's tasks {list.length > 0 && <span className="ml-1 text-neutral-300 dark:text-neutral-600">{doneCount}/{list.length}</span>}
        </h3>
        <div className="flex gap-1 rounded-full border border-neutral-200 p-1 dark:border-neutral-800">
          {[
            ['list', 'List'],
            ['schedule', 'Schedule'],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                view === id ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {view === 'schedule' ? (
        <DayTimeline
          tasks={tasks}
          goals={goals}
          habits={habits}
          onUpdateTask={onUpdateTask}
          onToggleTask={onToggleTask}
          onAddTask={onAddTask}
          onDeleteTask={onDeleteTask}
        />
      ) : (
        <>
      <div className="space-y-2">
        {sorted.map((t) => {
          const taskLink = encodeLink(t.goalId, t.habitId)
          return (
            <div key={t.id} className="flex flex-wrap sm:flex-nowrap items-center gap-2 border-b border-neutral-55/50 pb-2 last:border-b-0 last:pb-0 dark:border-neutral-900/50">
              <div className="flex flex-1 items-center gap-2 min-w-0">
                <PriorityDot priority={t.priority} onClick={() => onUpdateTask(dayKey, t.id, { priority: nextPriority(t.priority || 'medium') })} />
                <button
                  onClick={() => onToggleTask(dayKey, t.id)}
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition ${
                    t.done ? 'border-neutral-900 bg-neutral-900 dark:border-white dark:bg-white' : 'border-neutral-300 dark:border-neutral-600'
                  }`}
                >
                  {t.done && (
                    <svg className="h-3.5 w-3.5 text-white dark:text-neutral-900" viewBox="0 0 20 20" fill="none">
                      <path d="M5 10.5l3.5 3.5L15 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
                <span className={`min-w-0 flex-1 truncate text-sm font-medium ${t.done ? 'text-neutral-400 line-through dark:text-neutral-600' : 'text-neutral-800 dark:text-neutral-100'}`}>
                  {t.title}
                </span>
              </div>

              <div className="flex items-center gap-1.5 ml-7 sm:ml-0">
                {/* Time Select */}
                <Select
                  value={t.time ? String(parseInt(t.time, 10)) : ''}
                  onChange={(e) => onUpdateTask(dayKey, t.id, { time: e.target.value === '' ? null : `${pad(Number(e.target.value))}:00` })}
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

                {/* Duration Select */}
                {t.time && (
                  <Select
                    value={t.duration || 1}
                    onChange={(e) => onUpdateTask(dayKey, t.id, { duration: Number(e.target.value) })}
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

                {(goals.length > 0 || habits.length > 0) && (
                  <LinkSelect
                    goals={goals}
                    habits={habits}
                    value={taskLink}
                    onChange={(e) => {
                      const { goalId, habitId } = decodeLink(e.target.value)
                      onUpdateTask(dayKey, t.id, { goalId, habitId })
                    }}
                    compact
                    className="w-28 shrink-0"
                  />
                )}
                <button
                  onClick={() => onDeleteTask(dayKey, t.id)}
                  className="text-neutral-300 transition hover:text-neutral-600 dark:text-neutral-600 dark:hover:text-neutral-300 p-1"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-4 dark:border-neutral-900/50">
        <PrioritySelect value={priority} onChange={setPriority} />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Add a task for today…"
          className="min-w-[140px] flex-1 rounded-xl border border-neutral-200 bg-transparent px-3.5 py-2 text-sm font-medium text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 dark:border-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-600 dark:focus:border-white"
        />
        
        {/* Time select */}
        <Select
          value={taskTime}
          onChange={(e) => setTaskTime(e.target.value)}
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

        {/* Duration select */}
        {taskTime && (
          <Select
            value={taskDuration}
            onChange={(e) => setTaskDuration(Number(e.target.value))}
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

        {(goals.length > 0 || habits.length > 0) && (
          <LinkSelect
            goals={goals}
            habits={habits}
            value={linkValue}
            onChange={(e) => setLinkValue(e.target.value)}
            compact
            className="w-40"
          />
        )}
        <button onClick={add} className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-bold text-white dark:bg-white dark:text-neutral-900">
          Add
        </button>
      </div>
      <p className="mt-2.5 text-xs font-medium text-neutral-400 dark:text-neutral-500">
        Tip: Switch to <span className="font-bold">Schedule</span> to view or drag tasks directly onto a daily timeline grid.
      </p>
        </>
      )}
    </section>
  )
}
