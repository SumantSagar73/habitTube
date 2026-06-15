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

function accountabilityMessage(pending, doneCount, total, hour) {
  if (total === 0) return 'Nothing scheduled today. Add a habit to get rolling.'
  if (pending === 0) return 'Perfect day — every single habit done. This is how change happens.'
  if (hour >= 20) return `The day is almost over and ${pending} habit${pending > 1 ? 's are' : ' is'} still waiting. Don’t break the chain now.`
  if (doneCount === 0 && hour >= 12) return `You haven’t started yet — pick the easiest one and just begin. ${pending} to go.`
  if (doneCount > 0) return `Nice momentum — ${doneCount} down, ${pending} to go. Finish strong.`
  return `${pending} habit${pending > 1 ? 's' : ''} on today’s plan. Future you is counting on present you.`
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
  const quote = quoteOfTheDay(key)
  const nowHM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  const yesterday = addDays(now, -1)
  const yKey = dateKey(yesterday)
  const yMissed = habitsForDate(habits, yesterday).filter((h) => !isDone(h, completions, yKey))
  // Strict mode: today's checklist stays locked until every miss from
  // yesterday has a written reason.
  const unexplained = yMissed.filter((h) => !(missNotes[h.id]?.[yKey] || '').trim())
  const locked = unexplained.length > 0

  const sorted = [...due].sort((a, b) => {
    const da = isDone(a, completions, key)
    const db = isDone(b, completions, key)
    if (da !== db) return da ? 1 : -1
    return (a.time || '99:99').localeCompare(b.time || '99:99')
  })

  return (
    <div className="space-y-8">
      {/* hero: progress + accountability */}
      <section className="flex flex-col items-center gap-7 rounded-3xl border border-neutral-200 p-7 sm:flex-row dark:border-neutral-800 dark:bg-[#111]">
        <ProgressRing done={doneCount} total={due.length} />
        <div className="flex-1 text-center sm:text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">
            {formatNice(key)}
          </p>
          <h2 className="mt-1.5 text-[26px] font-extrabold tracking-tight text-neutral-900 dark:text-white">
            {pending === 0 && due.length > 0 ? 'Plan complete.' : 'Today’s plan'}
          </h2>
          <p className="mt-2 leading-relaxed font-medium text-neutral-500 dark:text-neutral-400">
            {accountabilityMessage(pending, doneCount, due.length, now.getHours())}
          </p>
        </div>
      </section>

      {/* yesterday's misses — demand a reason */}
      {yMissed.length > 0 && (
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
              ? 'Today’s checklist is locked until you write a reason for every miss. Be honest — the reason is the obstacle you have to remove today.'
              : 'All misses explained — checklist unlocked. Now remove those obstacles.'}
          </p>
          <div className="space-y-2.5">
            {yMissed.map((h) => (
              <div key={h.id} className="flex flex-col gap-2 sm:flex-row sm:items-center">
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
              </div>
            ))}
          </div>
        </section>
      )}

      {/* AI coach */}
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

      {/* quote of the day */}
      <section className="px-2 text-center">
        <p className="mx-auto max-w-3xl font-serif text-2xl italic leading-snug text-neutral-800 sm:text-[28px] dark:text-neutral-100">
          “{quote.text}”
        </p>
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">
          {quote.author}
        </p>
      </section>

      {/* habit checklist (locked by strict mode until misses are explained) */}
      {due.length > 0 ? (
        <section className="relative">
          <div
            className={`grid gap-2.5 lg:grid-cols-2 ${locked ? 'pointer-events-none select-none blur-sm' : ''}`}
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
                Explain {unexplained.length === 1 ? 'yesterday’s miss' : `all ${unexplained.length} of yesterday’s misses`} above to unlock today.
              </p>
            </div>
          )}
        </section>
      ) : (
        <div className="rounded-3xl border border-dashed border-neutral-300 p-10 text-center font-medium text-neutral-400 dark:border-neutral-700 dark:text-neutral-500">
          {habits.length === 0
            ? 'No habits yet — hit “+ New habit” to plan your first one.'
            : 'No habits scheduled for today. Rest day.'}
        </div>
      )}

      {/* today's tasks (from the plan cascade) */}
      <TodayTasks
        dayKey={key}
        tasks={tasks}
        goals={goals}
        onAddTask={onAddTask}
        onToggleTask={onToggleTask}
        onUpdateTask={onUpdateTask}
        onDeleteTask={onDeleteTask}
      />

      {/* focus timer */}
      <FocusTimer
        focus={focus}
        goals={goals}
        totalToday={focusMinutesToday}
        onStart={onStartFocus}
        onPause={onPauseFocus}
        onResume={onResumeFocus}
        onStop={onStopFocus}
      />

      {/* daily journal + mood */}
      <section className="rounded-3xl border border-neutral-200 p-6 dark:border-neutral-800 dark:bg-[#111]">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">
          Today’s journal
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

function TodayTasks({ dayKey, tasks, goals, onAddTask, onToggleTask, onUpdateTask, onDeleteTask }) {
  const [text, setText] = useState('')
  const [priority, setPriority] = useState('medium')
  const [goalId, setGoalId] = useState('')
  const [view, setView] = useState('list') // 'list' | 'schedule'
  const list = tasks[dayKey] || []
  const doneCount = list.filter((t) => t.done).length
  const sorted = sortByPriority(list)
  function add() {
    if (!text.trim()) return
    onAddTask(dayKey, text.trim(), goalId || null, priority)
    setText('')
  }
  return (
    <section className="rounded-3xl border border-neutral-200 p-6 dark:border-neutral-800 dark:bg-[#111]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">
          Today’s tasks {list.length > 0 && <span className="ml-1 text-neutral-300 dark:text-neutral-600">{doneCount}/{list.length}</span>}
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
          onUpdateTask={onUpdateTask}
          onToggleTask={onToggleTask}
          onAddTask={onAddTask}
          onDeleteTask={onDeleteTask}
        />
      ) : (
        <>
      <div className="space-y-1.5">
        {sorted.map((t) => (
          <div key={t.id} className="flex items-center gap-2">
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
            {goals.length > 0 && (
              <Select
                value={t.goalId || ''}
                onChange={(e) => onUpdateTask(dayKey, t.id, { goalId: e.target.value || null })}
                compact
                className="w-32 shrink-0"
              >
                <option value="">no goal</option>
                <GoalOptions goals={goals} />
              </Select>
            )}
            <button
              onClick={() => onDeleteTask(dayKey, t.id)}
              className="text-neutral-300 transition hover:text-neutral-600 dark:text-neutral-600 dark:hover:text-neutral-300"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <PrioritySelect value={priority} onChange={setPriority} />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Add a task for today…"
          className="min-w-[140px] flex-1 rounded-xl border border-neutral-200 bg-transparent px-3.5 py-2 text-sm font-medium text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 dark:border-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-600 dark:focus:border-white"
        />
        {goals.length > 0 && (
          <Select value={goalId} onChange={(e) => setGoalId(e.target.value)} compact className="w-40">
            <option value="">no goal</option>
            <GoalOptions goals={goals} />
          </Select>
        )}
        <button onClick={add} className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-bold text-white dark:bg-white dark:text-neutral-900">
          Add
        </button>
      </div>
      <p className="mt-2 text-xs font-medium text-neutral-400 dark:text-neutral-500">
        Tip: switch to <span className="font-bold">Schedule</span> to drag tasks onto a time, like a day calendar.
      </p>
        </>
      )}
    </section>
  )
}
