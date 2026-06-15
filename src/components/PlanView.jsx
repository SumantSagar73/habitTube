import { useMemo, useState } from 'react'
import { GOAL_COLORS } from '../palette'
import { addDays, dateKey, formatNice, nextPriority, sortByPriority, todayKey, uid } from '../utils'
import {
  currentPeriods,
  daysOfWeek,
  goalPercent,
  goalsAt,
  isoWeekStart,
  LEVEL_LABEL,
  monthsOfQuarter,
  nextPeriodKey,
  periodKeys,
  periodLabel,
  periodPercent,
  periodShort,
  prevPeriodKey,
  quartersOfYear,
  tasksInWeek,
  weeksOfMonth,
} from '../planUtils'
import GoalCard from './GoalCard'
import GoalEditor from './GoalEditor'
import GoalOptions from './GoalOptions'
import PlanIntro from './PlanIntro'
import PlanTree from './PlanTree'
import { PriorityDot, PrioritySelect } from './Priority'
import ReviewModal from './ReviewModal'
import Select from './Select'
import { decodeLink, encodeLink } from './TodayView'

const CHILD_LEVEL = { year: 'quarter', quarter: 'month', month: 'week' }

function PeriodCard({ label, sub, pct, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${
        active ? 'border-neutral-900 dark:border-white' : 'border-neutral-200 hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600'
      } bg-white dark:bg-[#111]`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-bold text-neutral-900 dark:text-white">{label}</span>
        <span className="text-sm font-extrabold tabular-nums text-neutral-900 dark:text-white">{pct == null ? '—' : `${pct}%`}</span>
      </div>
      {sub && <p className="mt-0.5 text-xs font-medium text-neutral-400 dark:text-neutral-500">{sub}</p>}
      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
        <div className="h-full rounded-full bg-neutral-900 transition-all duration-500 dark:bg-white" style={{ width: `${pct || 0}%` }} />
      </div>
    </button>
  )
}

export default function PlanView({
  goals,
  tasks,
  visions,
  habits,
  completions,
  reviews,
  onSaveGoal,
  onUpdateGoal,
  onDeleteGoal,
  onSetVision,
  onAddTask,
  onToggleTask,
  onUpdateTask,
  onDeleteTask,
  onMoveTask,
  onUseTemplate,
  onOpenWizard,
  onSaveReview,
  onCarryTask,
  aiEnabled,
  aiModel,
  planMode,
  setPlanMode,
}) {
  const now = currentPeriods()
  const [year, setYear] = useState(Number(now.year))
  const [quarter, setQuarter] = useState(null)
  const [month, setMonth] = useState(null)
  const [week, setWeek] = useState(null)
  const [editor, setEditor] = useState(null) // { initial, level, period, parentId, defaultColor }
  const [review, setReview] = useState(null) // { level, period }

  const ctx = useMemo(() => ({ goals, tasks, habits, completions }), [goals, tasks, habits, completions])
  const yearKey = String(year)
  const level = week ? 'week' : month ? 'month' : quarter ? 'quarter' : 'year'
  const key = week || month || quarter || yearKey

  function jump(toLevel) {
    if (toLevel === 'year') {
      setQuarter(null)
      setMonth(null)
      setWeek(null)
    } else if (toLevel === 'quarter') {
      setMonth(null)
      setWeek(null)
    } else if (toLevel === 'month') {
      setWeek(null)
    }
  }
  function navigatePeriod(direction) {
    if (level === 'year') {
      const nextYear = year + direction
      setYear(nextYear)
    } else if (level === 'quarter') {
      const nextKey = direction === 1 ? nextPeriodKey('quarter', quarter) : prevPeriodKey('quarter', quarter)
      setQuarter(nextKey)
      const y = Number(nextKey.split('-Q')[0])
      if (y !== year) setYear(y)
    } else if (level === 'month') {
      const nextKey = direction === 1 ? nextPeriodKey('month', month) : prevPeriodKey('month', month)
      setMonth(nextKey)
      const y = Number(nextKey.split('-')[0])
      if (y !== year) setYear(y)
      const m = Number(nextKey.split('-')[1])
      const q = Math.floor((m - 1) / 3) + 1
      setQuarter(`${y}-Q${q}`)
    } else if (level === 'week') {
      const nextKey = direction === 1 ? nextPeriodKey('week', week) : prevPeriodKey('week', week)
      setWeek(nextKey)
      const mon = isoWeekStart(nextKey)
      const thu = addDays(mon, 3)
      const pk = periodKeys(thu)
      setYear(Number(pk.year))
      setQuarter(pk.quarter)
      setMonth(pk.month)
    }
  }

  // parent-goal options for the editor, resolved within the goal's own branch
  function getParents(lvl, period) {
    if (lvl === 'quarter') return goalsAt(goals, 'year', period.split('-Q')[0])
    if (lvl === 'month') {
      const [y, m] = period.split('-').map(Number)
      return goalsAt(goals, 'quarter', `${y}-Q${Math.floor((m - 1) / 3) + 1}`)
    }
    if (lvl === 'week') return goalsAt(goals, 'month', periodKeys(daysOfWeek(period)[3]).month)
    return []
  }

  function addSub(parent) {
    const lvl = CHILD_LEVEL[parent.level]
    if (!lvl) return
    setEditor({ initial: null, level: lvl, period: now[lvl], parentId: parent.id, defaultColor: parent.color })
  }

  function handleSaveGoal(fields) {
    if (editor.initial) {
      onUpdateGoal(editor.initial.id, fields)
    } else {
      onSaveGoal({
        id: uid(),
        level: editor.level,
        period: editor.period,
        manualPct: null,
        done: false,
        current: 0,
        createdAt: todayKey(),
        ...fields,
      })
    }
    setEditor(null)
  }

  const here = goalsAt(goals, level, key)
  const overall = periodPercent(level, key, ctx)
  const parentTitle = (g) => goals.find((x) => x.id === g.parentId)?.title

  const prevKey = prevPeriodKey(level, key)
  const prevGoals = goalsAt(goals, level, prevKey).filter((g) => goalPercent(g, ctx) < 100)
  const pendingPrevGoals = prevGoals.filter(
    (g) => !here.some((hg) => hg.title.trim().toLowerCase() === g.title.trim().toLowerCase())
  )

  function bringGoal(g) {
    onSaveGoal({
      id: uid(),
      level,
      period: key,
      parentId: null,
      title: g.title,
      color: g.color,
      type: g.type,
      target: g.target,
      unit: g.unit,
      habitId: g.habitId,
      habitTarget: g.habitTarget,
      manualPct: null,
      done: false,
      current: 0,
      createdAt: todayKey(),
    })
  }

  const crumbs = [{ lvl: 'year', label: yearKey }]
  if (quarter) crumbs.push({ lvl: 'quarter', label: periodShort('quarter', quarter) })
  if (month) crumbs.push({ lvl: 'month', label: periodShort('month', month) })
  if (week) crumbs.push({ lvl: 'week', label: periodLabel('week', week) })

  let childCards = null
  if (level === 'year') {
    childCards = quartersOfYear(yearKey).map((k) => ({
      k,
      label: periodShort('quarter', k),
      sub: monthsOfQuarter(k).map((m) => periodShort('month', m)).join(' · '),
      pct: periodPercent('quarter', k, ctx),
      onClick: () => setQuarter(k),
    }))
  } else if (level === 'quarter') {
    childCards = monthsOfQuarter(quarter).map((k) => ({
      k,
      label: periodLabel('month', k),
      sub: `${weeksOfMonth(k).length} weeks`,
      pct: periodPercent('month', k, ctx),
      onClick: () => setMonth(k),
    }))
  } else if (level === 'month') {
    childCards = weeksOfMonth(month).map((k) => ({
      k,
      label: periodLabel('week', k),
      sub: 'week',
      pct: periodPercent('week', k, ctx),
      onClick: () => setWeek(k),
    }))
  }

  const prevWeek = periodKeys(addDays(new Date(), -7)).week
  const prevWeekActive = goalsAt(goals, 'week', prevWeek).length > 0 || tasksInWeek(tasks, prevWeek).length > 0
  const showNudge = prevWeekActive && !reviews[prevWeek]?.done

  if (goals.length === 0 && Object.keys(tasks).length === 0) {
    return (
      <>
        <PlanIntro onUseTemplate={onUseTemplate} onAddGoal={onOpenWizard} />
        {editorModal()}
        {reviewModal()}
      </>
    )
  }

  function editorModal() {
    if (!editor) return null
    const lvl = editor.initial ? editor.initial.level : editor.level
    const period = editor.initial ? editor.initial.period : editor.period
    return (
      <GoalEditor
        initial={editor.initial}
        level={lvl}
        period={period}
        parents={getParents(lvl, period)}
        habits={habits}
        defaultColor={editor.defaultColor || (editor.initial && editor.initial.color) || GOAL_COLORS[goals.length % GOAL_COLORS.length]}
        defaultParentId={editor.parentId || ''}
        onSave={handleSaveGoal}
        onClose={() => setEditor(null)}
      />
    )
  }
  function reviewModal() {
    if (!review) return null
    return (
      <ReviewModal
        level={review.level}
        periodKey={review.period}
        ctx={ctx}
        review={reviews[review.period]}
        aiEnabled={aiEnabled}
        aiModel={aiModel}
        onSaveReview={onSaveReview}
        onCarryTask={onCarryTask}
        onSaveGoal={onSaveGoal}
        onClose={() => setReview(null)}
      />
    )
  }

  return (
    <div className="space-y-7">
      {showNudge && (
        <button
          onClick={() => setReview({ level: 'week', period: prevWeek })}
          className="flex w-full items-center justify-between gap-3 rounded-2xl border-2 border-neutral-900 p-4 text-left transition hover:bg-neutral-50 dark:border-white dark:bg-[#111] dark:hover:bg-neutral-900"
        >
          <span>
            <span className="block font-bold text-neutral-900 dark:text-white">Your weekly review is ready</span>
            <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              Look back at {periodLabel('week', prevWeek)} — rate your goals, carry what’s unfinished.
            </span>
          </span>
          <span className="shrink-0 rounded-full bg-neutral-900 px-4 py-2 text-sm font-bold text-white dark:bg-white dark:text-neutral-900">Review →</span>
        </button>
      )}
      {planMode === 'outline' ? (
        <PlanTree
          goals={goals}
          ctx={ctx}
          onUpdate={onUpdateGoal}
          onEdit={(g) => setEditor({ initial: g })}
          onDelete={onDeleteGoal}
          onAddSub={addSub}
        />
      ) : (
        <>
          {/* breadcrumb + period switch */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="mr-1 flex items-center gap-1">
              <button onClick={() => navigatePeriod(-1)} title={`Previous ${LEVEL_LABEL[level].toLowerCase()}`} className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition hover:border-neutral-400 dark:border-neutral-800 dark:text-neutral-400">‹</button>
              <button onClick={() => navigatePeriod(1)} title={`Next ${LEVEL_LABEL[level].toLowerCase()}`} className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition hover:border-neutral-400 dark:border-neutral-800 dark:text-neutral-400">›</button>
            </div>
            {crumbs.map((c, i) => (
              <div key={c.lvl} className="flex items-center gap-2">
                {i > 0 && <span className="text-neutral-300 dark:text-neutral-700">▸</span>}
                <button
                  onClick={() => jump(c.lvl)}
                  className={`rounded-full px-3 py-1.5 text-sm font-bold transition ${
                    i === crumbs.length - 1 ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                  }`}
                >
                  {c.label}
                </button>
              </div>
            ))}
          </div>

          {/* Two-column layout: left = sidebar (progress + quarters), right = goals + tasks */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">

            {/* RIGHT column visually (goals + weekly task board) — rendered first for mobile */}
            <div className="space-y-6 lg:col-span-8 lg:order-2">
              {/* goals at this level */}
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-lg font-extrabold tracking-tight text-neutral-900 dark:text-white">{LEVEL_LABEL[level]} goals</h3>
                  <button
                    onClick={() => setEditor({ initial: null, level, period: key, parentId: null })}
                    className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-600 transition hover:border-neutral-400 hover:text-neutral-900 dark:border-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-600 dark:hover:text-white"
                  >
                    + Advanced Goal
                  </button>
                </div>

                {/* Quick Add Goal Input Box */}
                <div className="mb-4 flex gap-2">
                  <input
                    type="text"
                    placeholder={`Quick add a ${LEVEL_LABEL[level].toLowerCase()} goal…`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.target.value.trim()) {
                        onSaveGoal({
                          id: uid(),
                          level,
                          period: key,
                          parentId: null,
                          title: e.target.value.trim(),
                          color: GOAL_COLORS[goals.length % GOAL_COLORS.length],
                          type: 'checklist',
                          manualPct: null,
                          done: false,
                          current: 0,
                          createdAt: todayKey(),
                        })
                        e.target.value = ''
                      }
                    }}
                    className="flex-1 rounded-xl border border-neutral-200 bg-transparent px-4 py-2.5 text-sm font-medium text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-neutral-950 dark:border-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-600 dark:focus:border-white"
                  />
                  <button
                    onClick={(e) => {
                      const inputEl = e.currentTarget.previousSibling
                      if (inputEl && inputEl.value.trim()) {
                        onSaveGoal({
                          id: uid(),
                          level,
                          period: key,
                          parentId: null,
                          title: inputEl.value.trim(),
                          color: GOAL_COLORS[goals.length % GOAL_COLORS.length],
                          type: 'checklist',
                          manualPct: null,
                          done: false,
                          current: 0,
                          createdAt: todayKey(),
                        })
                        inputEl.value = ''
                      }
                    }}
                    className="rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                  >
                    Add
                  </button>
                </div>

                {here.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-neutral-300 p-8 text-center text-sm font-medium text-neutral-400 dark:border-neutral-700 dark:text-neutral-500">
                    No {LEVEL_LABEL[level].toLowerCase()} goals yet. Break down what "{periodLabel(level, key)}" should achieve.
                  </div>
                ) : (
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {here.map((g) => (
                      <GoalCard
                        key={g.id}
                        goal={g}
                        ctx={ctx}
                        parentTitle={parentTitle(g)}
                        onUpdate={onUpdateGoal}
                        onEdit={(goal) => setEditor({ initial: goal })}
                        onDelete={onDeleteGoal}
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* week: daily task board */}
              {level === 'week' && (
                <WeekBoard
                  week={week}
                  tasks={tasks}
                  linkGoals={[
                    ...goalsAt(goals, 'year', yearKey),
                    ...(quarter ? goalsAt(goals, 'quarter', quarter) : []),
                    ...(month ? goalsAt(goals, 'month', month) : []),
                    ...here,
                  ]}
                  goals={goals}
                  habits={habits}
                  onAddTask={onAddTask}
                  onToggleTask={onToggleTask}
                  onUpdateTask={onUpdateTask}
                  onDeleteTask={onDeleteTask}
                  onMoveTask={onMoveTask}
                />
              )}
            </div>

            {/* LEFT sidebar (period progress, child period cards, carry-forward) — order-1 so it appears left on desktop */}
            <div className="space-y-5 lg:col-span-4 lg:order-1">
              {/* Period progress card */}
              <section className="rounded-3xl border border-neutral-200 p-5 dark:border-neutral-800 dark:bg-[#111]">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">{LEVEL_LABEL[level]}</p>
                <h2 className="mt-0.5 text-xl font-extrabold tracking-tight text-neutral-900 dark:text-white">{periodLabel(level, key)}</h2>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <p className="text-4xl font-extrabold tabular-nums tracking-tight text-neutral-900 dark:text-white">{overall == null ? '—' : `${overall}%`}</p>
                  {level !== 'year' && (
                    <button
                      onClick={() => setReview({ level, period: key })}
                      className={`mb-1 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                        reviews[key]?.done ? 'border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900' : 'border-neutral-200 text-neutral-600 hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500'
                      }`}
                    >
                      {reviews[key]?.done ? '✓ Reviewed' : 'Review'}
                    </button>
                  )}
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                  <div className="h-full rounded-full bg-neutral-900 transition-all duration-500 dark:bg-white" style={{ width: `${overall || 0}%` }} />
                </div>
                {level === 'year' && (
                  <div className="mt-4">
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">North-star vision for {yearKey}</label>
                    <textarea
                      value={visions[yearKey] || ''}
                      onChange={(e) => onSetVision(yearKey, e.target.value)}
                      rows={3}
                      placeholder="Who do you want to have become by the end of this year?"
                      className="w-full resize-y rounded-xl border border-neutral-200 bg-transparent px-3.5 py-2.5 font-serif text-sm italic text-neutral-800 outline-none transition placeholder:not-italic placeholder:text-neutral-400 focus:border-neutral-900 dark:border-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-600 dark:focus:border-white"
                    />
                  </div>
                )}
              </section>

              {/* Child period drill-down cards */}
              {childCards && (
                <section>
                  <h3 className="mb-2.5 text-xs font-bold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">
                    {level === 'year' ? 'Quarters' : level === 'quarter' ? 'Months' : 'Weeks'}
                  </h3>
                  <div className="grid gap-2">
                    {childCards.map((c) => (
                      <PeriodCard key={c.k} label={c.label} sub={c.sub} pct={c.pct} active={false} onClick={c.onClick} />
                    ))}
                  </div>
                </section>
              )}

              {/* Bring-forward incomplete goals */}
              {pendingPrevGoals.length > 0 && (
                <section className="rounded-2xl border border-neutral-200 bg-neutral-50/50 p-4 dark:border-neutral-800 dark:bg-neutral-900/10">
                  <p className="mb-2.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                    Carry from {periodLabel(level, prevKey)}
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {pendingPrevGoals.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => bringGoal(g)}
                        className="flex w-full items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-left text-xs font-bold text-neutral-700 transition hover:border-neutral-400 dark:border-neutral-800 dark:bg-[#161616] dark:text-neutral-200 dark:hover:border-neutral-600"
                      >
                        <span className="text-emerald-500">+</span>
                        <span className="flex-1 truncate">{g.title}</span>
                      </button>
                    ))}
                    <button
                      onClick={() => pendingPrevGoals.forEach(bringGoal)}
                      className="mt-1 rounded-xl bg-neutral-950 px-3 py-2 text-xs font-bold text-white transition hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
                    >
                      Bring all ({pendingPrevGoals.length})
                    </button>
                  </div>
                </section>
              )}
            </div>
          </div>
        </>
      )}

      {editorModal()}
      {reviewModal()}
    </div>
  )
}

function WeekBoard({ week, tasks, linkGoals, goals, habits = [], onAddTask, onToggleTask, onUpdateTask, onDeleteTask, onMoveTask }) {
  const days = daysOfWeek(week)
  const today = todayKey()
  return (
    <section>
      <h3 className="mb-3 text-lg font-extrabold tracking-tight text-neutral-900 dark:text-white">Daily tasks</h3>
      <div className="grid gap-2.5 lg:grid-cols-2">
        {days.map((d) => {
          const dk = dateKey(d)
          const list = tasks[dk] || []
          return (
            <div
              key={dk}
              className={`rounded-2xl border p-4 ${dk === today ? 'border-neutral-900 dark:border-white' : 'border-neutral-200 dark:border-neutral-800'} bg-white dark:bg-[#111]`}
            >
              <p className="mb-2 text-sm font-bold text-neutral-900 dark:text-white">
                {formatNice(dk)} {dk === today && <span className="text-neutral-400">· today</span>}
              </p>
              <div className="space-y-1.5">
                {sortByPriority(list).map((t) => (
                  <WeekTask
                    key={t.id}
                    task={t}
                    dk={dk}
                    linkGoals={linkGoals}
                    habits={habits}
                    onToggleTask={onToggleTask}
                    onUpdateTask={onUpdateTask}
                    onDeleteTask={onDeleteTask}
                    onMoveTask={onMoveTask}
                  />
                ))}
              </div>
              <TaskAdder dk={dk} linkGoals={linkGoals} habits={habits} onAddTask={onAddTask} />
            </div>
          )
        })}
      </div>
    </section>
  )
}

function WeekTask({ task, dk, linkGoals, habits = [], onToggleTask, onUpdateTask, onDeleteTask, onMoveTask }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(task.title)
  const linkValue = encodeLink(task.goalId, task.habitId)

  function saveTitle() {
    const v = draft.trim()
    if (v && v !== task.title) onUpdateTask(dk, task.id, { title: v })
    else setDraft(task.title)
    setEditing(false)
  }

  return (
    <div className="flex items-center gap-1.5">
      <PriorityDot priority={task.priority} onClick={() => onUpdateTask(dk, task.id, { priority: nextPriority(task.priority || 'medium') })} />
      <button
        onClick={() => onToggleTask(dk, task.id)}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition ${
          task.done ? 'border-neutral-900 bg-neutral-900 dark:border-white dark:bg-white' : 'border-neutral-300 dark:border-neutral-600'
        }`}
      >
        {task.done && (
          <svg className="h-3.5 w-3.5 text-white dark:text-neutral-900" viewBox="0 0 20 20" fill="none">
            <path d="M5 10.5l3.5 3.5L15 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveTitle()
            if (e.key === 'Escape') {
              setDraft(task.title)
              setEditing(false)
            }
          }}
          className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-transparent px-2 py-0.5 text-sm font-medium text-neutral-900 outline-none focus:border-neutral-900 dark:border-neutral-600 dark:text-white dark:focus:border-white"
        />
      ) : (
        <button
          onClick={() => {
            setDraft(task.title)
            setEditing(true)
          }}
          title="Click to rename"
          className={`min-w-0 flex-1 truncate text-left text-sm font-medium ${task.done ? 'text-neutral-400 line-through dark:text-neutral-600' : 'text-neutral-800 dark:text-neutral-100'}`}
        >
          {task.title}
        </button>
      )}
      {(linkGoals.length > 0 || habits.length > 0) && (
        <Select
          value={linkValue}
          onChange={(e) => {
            const { goalId, habitId } = decodeLink(e.target.value)
            onUpdateTask(dk, task.id, { goalId, habitId })
          }}
          compact
          className="w-28 shrink-0"
        >
          <option value="">no link</option>
          {linkGoals.length > 0 && (
            <GoalOptions goals={linkGoals} prefix="g_" />
          )}
          {habits.length > 0 && (
            <optgroup label="Habits">
              {habits.map((h) => (
                <option key={h.id} value={`h_${h.id}`}>{h.emoji} {h.name}</option>
              ))}
            </optgroup>
          )}
        </Select>
      )}
      <button
        onClick={() => {
          const [y, m, d] = dk.split('-').map(Number)
          const nextDay = addDays(new Date(y, m - 1, d), 1)
          onMoveTask(dk, dateKey(nextDay), task.id)
        }}
        title="Move to next day"
        className="shrink-0 text-neutral-300 transition hover:text-neutral-600 dark:text-neutral-600 dark:hover:text-neutral-300"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </button>
      <button onClick={() => onDeleteTask(dk, task.id)} className="shrink-0 text-neutral-300 transition hover:text-neutral-600 dark:text-neutral-600 dark:hover:text-neutral-300">
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  )
}

function TaskAdder({ dk, linkGoals, habits = [], onAddTask }) {
  const [text, setText] = useState('')
  const [linkValue, setLinkValue] = useState('')
  const [priority, setPriority] = useState('medium')
  function add() {
    if (!text.trim()) return
    const { goalId, habitId } = decodeLink(linkValue)
    onAddTask(dk, text.trim(), goalId, priority, habitId)
    setText('')
  }
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
      <PrioritySelect value={priority} onChange={setPriority} />
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && add()}
        placeholder="Add a task…"
        className="min-w-0 flex-1 rounded-lg border border-neutral-200 bg-transparent px-3 py-1.5 text-sm font-medium text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 dark:border-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-600 dark:focus:border-white"
      />
      {(linkGoals.length > 0 || habits.length > 0) && (
        <Select value={linkValue} onChange={(e) => setLinkValue(e.target.value)} compact className="w-40">
          <option value="">no link</option>
          {linkGoals.length > 0 && (
            <GoalOptions goals={linkGoals} prefix="g_" />
          )}
          {habits.length > 0 && (
            <optgroup label="Habits">
              {habits.map((h) => (
                <option key={h.id} value={`h_${h.id}`}>{h.emoji} {h.name}</option>
              ))}
            </optgroup>
          )}
        </Select>
      )}
      <button onClick={add} className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-bold text-white dark:bg-white dark:text-neutral-900">
        +
      </button>
    </div>
  )
}
