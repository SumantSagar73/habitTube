import { useEffect, useRef, useState } from 'react'
import exportExcel from './exportExcel'
import AuthScreen from './components/AuthScreen'
import CalendarView from './components/CalendarView'
import CoachChat from './components/CoachChat'
import CoachWidget from './components/CoachWidget'
import { fmtClock } from './components/FocusTimer'
import GoalWizard from './components/GoalWizard'
import HabitDetail from './components/HabitDetail'
import HabitModal from './components/HabitModal'
import InsightsView from './components/InsightsView'
import ManageView from './components/ManageView'
import OnboardingFlow from './components/OnboardingFlow'
import PlanView from './components/PlanView'
import PWABanner from './components/PWABanner'
import SettingsModal from './components/SettingsModal'
import TodayView from './components/TodayView'
import { GOAL_COLORS } from './palette'
import { currentPeriods, nextPeriodStartKey, periodKeys } from './planUtils'
import { buildTemplate } from './templates'
import useReminders from './useReminders'
import useStore from './useStore'
import useSync from './useSync'
import { supabase } from './utils/supabase'
import { addDays, dateKey, habitsForDate, todayKey, uid } from './utils'

const LEVEL_ORDER = ['year', 'quarter', 'month', 'week']

const TABS = [
  { id: 'today', label: 'Today' },
  { id: 'plan', label: 'Plan' },
  { id: 'habits', label: 'Habits' },
  { id: 'insights', label: 'Insights' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'coach', label: 'Coach' },
]

export default function App() {
  const [data, setData] = useStore()
  const [tab, setTab] = useState('today')
  const [planMode, setPlanMode] = useState('cascade') // 'cascade' | 'outline'
  const [modal, setModal] = useState(null) // null | 'new' | habit object
  const [detailId, setDetailId] = useState(null)
  const [newMenu, setNewMenu] = useState(false)
  const [wizard, setWizard] = useState(false)
  const [settings, setSettings] = useState(false)
  const [focus, setFocus] = useState({ running: false, endsAt: null, remaining: 25 * 60, durationMin: 25, goalId: null, label: '' })
  const [timerFs, setTimerFs] = useState(false)

  // Auth
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const dark = data.theme === 'dark' || (data.theme === 'auto' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  useReminders(data)
  const syncStatus = useSync(data, setData, user?.id)

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return
      const k = e.key.toLowerCase()
      if (k === 't') setTab('today')
      else if (k === 'p') setTab('plan')
      else if (k === 'h') setTab('habits')
      else if (k === 'i') setTab('insights')
      else if (k === 'c') setTab('coach')
      else if (k === 'n') setNewMenu((v) => !v)
      else if (k === 'f') setTimerFs((v) => !v)
      else if (k === 'escape') { setNewMenu(false); setSettings(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Weekly review prompt (Friday=5, Sunday=0)
  const [weeklyReview, setWeeklyReview] = useState(null)
  useEffect(() => {
    if (!user) return
    const today = new Date()
    const dow = today.getDay()
    if (dow !== 5 && dow !== 0) return
    const weekKey = periodKeys(today).week
    const alreadyShown = localStorage.getItem(`weekly-review-shown-${weekKey}`)
    if (alreadyShown) return
    if (data.goals.length === 0 && data.habits.length === 0) return
    const t = setTimeout(() => {
      setWeeklyReview(weekKey)
      localStorage.setItem(`weekly-review-shown-${weekKey}`, '1')
    }, 3000)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Auto-generate recurring tasks for today
  useEffect(() => {
    if (!data.recurringTasks?.length) return
    const key = todayKey()
    const today = new Date()
    const dow = today.getDay()
    const existingTitles = new Set((data.tasks[key] || []).map((t) => t.title.toLowerCase()))
    const toAdd = data.recurringTasks.filter((rt) => {
      if (existingTitles.has(rt.title.toLowerCase())) return false
      if (rt.repeat === 'daily') return true
      if (rt.repeat === 'weekdays') return dow >= 1 && dow <= 5
      if (rt.repeat === 'weekly') return rt.weekDay === dow
      return false
    })
    if (!toAdd.length) return
    setData((d) => ({
      ...d,
      tasks: {
        ...d.tasks,
        [key]: [...(d.tasks[key] || []), ...toAdd.map((rt) => ({ id: uid(), title: rt.title, done: false, goalId: rt.goalId || null, priority: rt.priority || 'medium', fromRecurring: rt.id }))],
      },
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const focusRef = useRef(focus)
  focusRef.current = focus

  function finishFocus() {
    const f = focusRef.current
    setData((d) => ({
      ...d,
      focusLog: [...(d.focusLog || []), { date: todayKey(), minutes: f.durationMin, goalId: f.goalId, label: f.label }],
    }))
    setFocus((prev) => ({ ...prev, running: false, endsAt: null, remaining: prev.durationMin * 60 }))
    if (data.soundEnabled) {
      try {
        const audio = new Audio('/alarm.mp3')
        audio.play().catch(() => {})
      } catch (err) {
        console.warn('Could not play alarm sound:', err)
      }
    }
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification('Focus session done ⏱️', { body: f.label ? `Nice work on “${f.label}”.` : 'Nice deep-work session.' })
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (!focus.running) return
    const id = setInterval(() => {
      const f = focusRef.current
      const rem = Math.max(0, Math.round((f.endsAt - Date.now()) / 1000))
      if (rem <= 0) finishFocus()
      else setFocus((prev) => ({ ...prev, remaining: rem }))
    }, 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus.running])

  function startFocus(durationMin, goalId, label) {
    setFocus({ running: true, endsAt: Date.now() + durationMin * 60 * 1000, remaining: durationMin * 60, durationMin, goalId, label })
  }
  function pauseFocus() {
    setFocus((f) => ({ ...f, running: false, endsAt: null, remaining: Math.max(0, Math.round((f.endsAt - Date.now()) / 1000)) }))
  }
  function resumeFocus() {
    setFocus((f) => ({ ...f, running: true, endsAt: Date.now() + f.remaining * 1000 }))
  }
  function stopFocus() {
    setFocus((f) => ({ ...f, running: false, endsAt: null, remaining: f.durationMin * 60 }))
  }

  const focusActive = focus.running || focus.remaining < focus.durationMin * 60
  const focusMinutesToday = (data.focusLog || []).filter((s) => s.date === todayKey()).reduce((a, s) => a + s.minutes, 0)
  const detail = data.habits.find((h) => h.id === detailId)

  function toggleHabitOn(habitId, key) {
    setData((d) => {
      const day = d.completions[key] || []
      const next = day.includes(habitId) ? day.filter((id) => id !== habitId) : [...day, habitId]
      return { ...d, completions: { ...d.completions, [key]: next } }
    })
  }

  function toggleHabit(habitId) {
    toggleHabitOn(habitId, todayKey())
  }

  function saveHabit(fields) {
    setData((d) => {
      if (modal === 'new') {
        const habit = { id: uid(), createdAt: todayKey(), ...fields }
        return { ...d, habits: [...d.habits, habit] }
      }
      return {
        ...d,
        habits: d.habits.map((h) => (h.id === modal.id ? { ...h, ...fields } : h)),
      }
    })
    setModal(null)
  }

  function deleteHabit(habit) {
    if (!window.confirm(`Delete “${habit.name}” and all its history?`)) return
    setData((d) => ({ ...d, habits: d.habits.filter((h) => h.id !== habit.id) }))
    setDetailId(null)
  }

  function reorderHabits(orderedHabits) {
    setData((d) => ({ ...d, habits: orderedHabits }))
  }

  function installHabitPack(habits) {
    setData((d) => ({ ...d, habits: [...d.habits, ...habits] }))
  }

  function addRecurringTask(task) {
    setData((d) => ({ ...d, recurringTasks: [...(d.recurringTasks || []), task] }))
  }

  function deleteRecurringTask(id) {
    setData((d) => ({ ...d, recurringTasks: (d.recurringTasks || []).filter((t) => t.id !== id) }))
  }

  function setNote(key, text) {
    setData((d) => ({ ...d, notes: { ...d.notes, [key]: text } }))
  }

  function setMissNote(habitId, key, text) {
    setData((d) => ({
      ...d,
      missNotes: {
        ...d.missNotes,
        [habitId]: { ...(d.missNotes[habitId] || {}), [key]: text },
      },
    }))
  }

  // ---- goal cascade ----
  function saveGoal(goal) {
    setData((d) => ({ ...d, goals: [...d.goals, goal] }))
  }

  function addGoals(arr) {
    setData((d) => ({ ...d, goals: [...d.goals, ...arr] }))
  }

  function useTemplate(tpl) {
    addGoals(buildTemplate(tpl, data.goals.length))
  }

  function createGoalFromWizard(fields) {
    saveGoal({
      id: uid(),
      parentId: null,
      manualPct: null,
      done: false,
      current: 0,
      createdAt: todayKey(),
      color: GOAL_COLORS[data.goals.length % GOAL_COLORS.length],
      ...fields,
    })
    setWizard(false)
  }

  function saveReview(periodKey, patch) {
    setData((d) => ({ ...d, reviews: { ...d.reviews, [periodKey]: patch } }))
  }

  function carryTask(task, level, periodKey) {
    const targetKey = nextPeriodStartKey(level, periodKey)
    setData((d) => {
      const src = (d.tasks[task.date] || []).filter((t) => t.id !== task.id)
      const dest = [
        ...(d.tasks[targetKey] || []),
        { id: uid(), title: task.title, done: false, goalId: task.goalId, priority: task.priority || 'medium' },
      ]
      return { ...d, tasks: { ...d.tasks, [task.date]: src, [targetKey]: dest } }
    })
  }

  // ---- AI ----
  function setMotivation(m) {
    setData((d) => ({ ...d, ai: { ...d.ai, motivation: m } }))
  }
  function setInsights(x) {
    setData((d) => ({ ...d, ai: { ...d.ai, insights: x } }))
  }
  function setChatMessages(messages) {
    setData((d) => ({ ...d, chat: { ...d.chat, messages } }))
  }

  // ---- chat sessions (Coach tab) ----
  function setChatSessions(updater) {
    if (typeof updater === 'function') {
      setData((d) => ({ ...d, chatSessions: updater(d.chatSessions || []) }))
    } else {
      setData((d) => ({ ...d, chatSessions: updater }))
    }
  }
  function setActiveChatId(id) {
    setData((d) => ({ ...d, activeChatId: id }))
  }

  function setMood(key, v) {
    setData((d) => ({ ...d, moods: { ...d.moods, [key]: v } }))
  }

  async function toggleReminders() {
    if (!data.remindersEnabled && typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      try {
        await Notification.requestPermission()
      } catch {
        // ignore
      }
    }
    setData((d) => ({ ...d, remindersEnabled: !d.remindersEnabled }))
  }

  function restoreData(parsed) {
    setData((d) => ({ ...d, ...parsed }))
  }

  // Turn a coach-proposed plan into real goals + tasks, linked into a cascade.
  function applyPlan(items) {
    const p = currentPeriods()
    const created = {}
    const newGoals = []
    for (const lvl of LEVEL_ORDER) {
      for (const it of items.filter((x) => x.kind === 'goal' && x.level === lvl)) {
        let parentId = null
        for (let k = LEVEL_ORDER.indexOf(lvl) - 1; k >= 0; k--) {
          if (created[LEVEL_ORDER[k]]) {
            parentId = created[LEVEL_ORDER[k]]
            break
          }
        }
        const g = {
          id: uid(),
          level: lvl,
          period: p[lvl],
          parentId,
          title: it.title.trim(),
          color: GOAL_COLORS[(data.goals.length + newGoals.length) % GOAL_COLORS.length],
          type: it.type === 'numeric' ? 'numeric' : 'checklist',
          target: Number(it.target) || 0,
          current: 0,
          unit: (it.unit || '').trim(),
          habitId: null,
          habitTarget: 0,
          manualPct: null,
          done: false,
          createdAt: todayKey(),
        }
        newGoals.push(g)
        created[lvl] = g.id
      }
    }
    const deepest = created.week || created.month || created.quarter || created.year || null
    const newTasks = {}
    for (const it of items.filter((x) => x.kind === 'task')) {
      const off = Math.max(0, Math.min(6, Number(it.dayOffset) || 0))
      const dk = dateKey(addDays(new Date(), off))
      if (!newTasks[dk]) newTasks[dk] = []
      const priority = ['high', 'medium', 'low'].includes(it.priority) ? it.priority : 'medium'
      newTasks[dk].push({ id: uid(), title: it.title.trim(), done: false, goalId: deepest, priority })
    }
    const updates = items.filter((x) => x.kind === 'update')
    const norm = (s) => (s || '').trim().toLowerCase()
    const matchTitle = (title, t) => norm(t) === norm(title) || norm(t).includes(norm(title)) || norm(title).includes(norm(t))

    setData((d) => {
      let goals = [...d.goals]
      const tasks = { ...d.tasks }

      for (const u of updates) {
        const set = u.set || {}
        if (u.target === 'task') {
          for (const k of Object.keys(tasks)) {
            tasks[k] = tasks[k].map((t) =>
              matchTitle(u.title, t.title)
                ? {
                    ...t,
                    ...(set.done != null ? { done: !!set.done } : {}),
                    ...(['high', 'medium', 'low'].includes(set.priority) ? { priority: set.priority } : {}),
                  }
                : t
            )
          }
        } else {
          goals = goals.map((g) =>
            matchTitle(u.title, g.title)
              ? {
                  ...g,
                  ...(set.done === true ? { done: true, manualPct: 100 } : {}),
                  ...(set.done === false ? { done: false, manualPct: null } : {}),
                  ...(set.target != null ? { target: Number(set.target) || g.target } : {}),
                  ...(set.manualPct != null ? { manualPct: Math.max(0, Math.min(100, Number(set.manualPct))) } : {}),
                }
              : g
          )
        }
      }

      for (const [k, arr] of Object.entries(newTasks)) tasks[k] = [...(tasks[k] || []), ...arr]
      return { ...d, goals: [...goals, ...newGoals], tasks }
    })
  }

  function updateGoal(id, patch) {
    setData((d) => ({ ...d, goals: d.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) }))
  }

  function deleteGoal(goal) {
    if (!window.confirm(`Delete “${goal.title}”? Sub-goals become standalone and linked tasks are unlinked.`)) return
    setData((d) => ({
      ...d,
      goals: d.goals
        .filter((g) => g.id !== goal.id)
        .map((g) => (g.parentId === goal.id ? { ...g, parentId: null } : g)),
      tasks: Object.fromEntries(
        Object.entries(d.tasks).map(([k, arr]) => [k, arr.map((t) => (t.goalId === goal.id ? { ...t, goalId: null } : t))])
      ),
    }))
  }

  function setVision(yearKey, text) {
    setData((d) => ({ ...d, visions: { ...d.visions, [yearKey]: text } }))
  }

  // ---- daily tasks ----
  function addTask(key, title, goalId, priority = 'medium', habitId = null, extra = {}) {
    setData((d) => ({
      ...d,
      tasks: { ...d.tasks, [key]: [...(d.tasks[key] || []), { id: uid(), title, done: false, goalId, habitId: habitId || null, priority, ...extra }] },
    }))
  }

  function toggleTask(key, id) {
    setData((d) => ({
      ...d,
      tasks: { ...d.tasks, [key]: (d.tasks[key] || []).map((t) => (t.id === id ? { ...t, done: !t.done } : t)) },
    }))
  }

  function updateTask(key, id, patch) {
    setData((d) => ({
      ...d,
      tasks: { ...d.tasks, [key]: (d.tasks[key] || []).map((t) => (t.id === id ? { ...t, ...patch } : t)) },
    }))
  }

  function deleteTask(key, id) {
    setData((d) => ({ ...d, tasks: { ...d.tasks, [key]: (d.tasks[key] || []).filter((t) => t.id !== id) } }))
  }

  function moveTask(srcKey, destKey, taskId) {
    setData((d) => {
      const list = d.tasks[srcKey] || []
      const task = list.find((t) => t.id === taskId)
      if (!task) return d
      const src = list.filter((t) => t.id !== taskId)
      const dest = [...(d.tasks[destKey] || []), { ...task }]
      return {
        ...d,
        tasks: {
          ...d.tasks,
          [srcKey]: src,
          [destKey]: dest,
        },
      }
    })
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-[#0a0a0a]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900 dark:border-neutral-700 dark:border-t-white" />
      </div>
    )
  }

  if (!user) {
    return <AuthScreen onAuth={setUser} />
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-neutral-900 transition-colors duration-300 dark:bg-[#0a0a0a] dark:text-white">
      <div className="mx-auto w-full max-w-[1440px] px-4 pb-28 sm:px-8 md:pb-20" style={{ paddingBottom: 'max(7rem, calc(7rem + env(safe-area-inset-bottom)))' }}>
        {/* header */}
        <header className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-neutral-200 py-6 dark:border-neutral-800 ${timerFs ? 'hidden' : ''}`}>
          <div className="flex items-center gap-6">
            <h1 className="text-[22px] font-extrabold tracking-tight shrink-0">
              HabitTube<span className="text-neutral-400 dark:text-neutral-600">.</span>
            </h1>

            {/* Desktop Tabs */}
            <nav className="hidden md:flex gap-1 rounded-full border border-neutral-200 p-1 dark:border-neutral-800">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`rounded-full px-4.5 py-1.5 text-sm font-semibold transition ${
                    tab === t.id
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                      : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2 ml-auto md:ml-0 md:gap-2.5">
            <span
              title={
                syncStatus === 'synced'
                  ? 'Synced to Supabase'
                  : syncStatus === 'syncing'
                    ? 'Syncing…'
                    : 'Offline — saved on this device'
              }
              className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400 dark:text-neutral-500"
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  syncStatus === 'synced' ? 'bg-emerald-500' : syncStatus === 'syncing' ? 'animate-pulse bg-amber-500' : 'bg-neutral-300 dark:bg-neutral-600'
                }`}
              />
              <span className="hidden sm:inline">{syncStatus === 'synced' ? 'Synced' : syncStatus === 'syncing' ? 'Syncing' : 'Offline'}</span>
            </span>
            {focusActive && (
              <button
                onClick={() => setTab('today')}
                title="Focus session — go to Today"
                className="flex items-center gap-1.5 rounded-full border border-neutral-900 px-3 py-2 text-sm font-bold tabular-nums text-neutral-900 transition hover:bg-neutral-50 dark:border-white dark:text-white dark:hover:bg-neutral-900"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>
                {fmtClock(focus.remaining)}
              </button>
            )}
            <button
              onClick={() => exportExcel(data)}
              title="Export to Excel"
              className="hidden md:flex items-center gap-2 rounded-full border border-neutral-200 px-4 py-2.5 text-sm font-semibold text-neutral-600 transition hover:border-neutral-400 hover:text-neutral-900 dark:border-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-600 dark:hover:text-white"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Export
            </button>
            <div className="relative">
              <button
                onClick={() => setNewMenu((v) => !v)}
                className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
              >
                + New
              </button>
              {newMenu && (
                <>
                  <button className="fixed inset-0 z-10 cursor-default" onClick={() => setNewMenu(false)} aria-hidden />
                  <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-2xl border border-neutral-200 bg-white p-1 shadow-xl dark:border-neutral-800 dark:bg-[#161616]">
                    <button
                      onClick={() => {
                        setNewMenu(false)
                        setModal('new')
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-800"
                    >
                      <svg className="h-4 w-4 shrink-0 text-neutral-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                      Habit <span className="text-xs font-normal text-neutral-400">recurring</span>
                    </button>
                    <button
                      onClick={() => {
                        setNewMenu(false)
                        setWizard(true)
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-800"
                    >
                      <svg className="h-4 w-4 shrink-0 text-neutral-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
                      Goal <span className="text-xs font-normal text-neutral-400">one-time</span>
                    </button>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => setSettings(true)}
              title="Settings"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 text-neutral-600 transition hover:border-neutral-400 dark:border-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-600"
            >
              <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
            <button
              onClick={() => supabase.auth.signOut()}
              title="Sign out"
              className="hidden md:flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 text-neutral-600 transition hover:border-neutral-400 dark:border-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-600"
            >
              <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
            </button>
            <button
              onClick={() => setData((d) => ({ ...d, theme: dark ? 'light' : 'dark' }))}
              title="Toggle theme"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 text-neutral-600 transition hover:border-neutral-400 dark:border-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-600"
            >
              {dark ? (
                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <circle cx="12" cy="12" r="4.5" />
                  <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.4 1.4M17.6 17.6L19 19M19 5l-1.4 1.4M6.4 17.6L5 19" />
                </svg>
              ) : (
                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
                </svg>
              )}
            </button>
          </div>
        </header>

        {/* sub tabs row / actions for specific tabs (like Plan's Focus/Outline) */}
        {tab === 'plan' && !timerFs && (
          <div className="mt-6 mb-7 flex justify-end animate-fade-up">
            <div className="flex gap-1 rounded-full border border-neutral-200 p-1 dark:border-neutral-800">
              {[
                ['cascade', 'Cascade'],
                ['outline', 'Outline'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setPlanMode(id)}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                    planMode === id
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                      : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {tab !== 'plan' && <div className="h-6" />}

        <main className="animate-fade-up" key={tab}>
          {tab === 'today' && (
            <TodayView
              habits={data.habits}
              completions={data.completions}
              notes={data.notes}
              missNotes={data.missNotes}
              tasks={data.tasks}
              recurringTasks={data.recurringTasks || []}
              focusLog={data.focusLog || []}
              goals={(() => {
                const now = currentPeriods()
                return data.goals.filter((g) => {
                  if (g.level === 'year') return g.period === now.year
                  if (g.level === 'quarter') return g.period === now.quarter
                  if (g.level === 'month') return g.period === now.month
                  if (g.level === 'week') return g.period === now.week
                  return true
                })
              })()}
              moods={data.moods}
              onToggle={toggleHabit}
              onToggleOn={toggleHabitOn}
              onNoteChange={setNote}
              onMissNote={setMissNote}
              onSetMood={setMood}
              onAddTask={addTask}
              onToggleTask={toggleTask}
              onUpdateTask={updateTask}
              onDeleteTask={deleteTask}
              aiEnabled={data.aiEnabled}
              aiModel={data.aiModel}
              motivation={data.ai.motivation}
              onSaveMotivation={setMotivation}
              onOpenCoach={() => setTab('coach')}
              onAddRecurring={addRecurringTask}
              onDeleteRecurring={deleteRecurringTask}
              focus={focus}
              focusMinutesToday={focusMinutesToday}
              onStartFocus={startFocus}
              onPauseFocus={pauseFocus}
              onResumeFocus={resumeFocus}
              onStopFocus={stopFocus}
              onFsChange={setTimerFs}
            />
          )}
          {tab === 'plan' && (
            <PlanView
              goals={data.goals}
              tasks={data.tasks}
              visions={data.visions}
              habits={data.habits}
              completions={data.completions}
              reviews={data.reviews}
              planMode={planMode}
              setPlanMode={setPlanMode}
              onSaveGoal={saveGoal}
              onUpdateGoal={updateGoal}
              onDeleteGoal={deleteGoal}
              onSetVision={setVision}
              onAddTask={addTask}
              onToggleTask={toggleTask}
              onUpdateTask={updateTask}
              onDeleteTask={deleteTask}
              onMoveTask={moveTask}
              onUseTemplate={useTemplate}
              onOpenWizard={() => setWizard(true)}
              onSaveReview={saveReview}
              onCarryTask={carryTask}
              aiEnabled={data.aiEnabled}
              aiModel={data.aiModel}
            />
          )}

          {tab === 'habits' && (
            <ManageView
              habits={data.habits}
              completions={data.completions}
              onOpen={(h) => setDetailId(h.id)}
              onEdit={(h) => setModal(h)}
              onDelete={deleteHabit}
              onAdd={() => setModal('new')}
              onToggleOn={toggleHabitOn}
              onReorder={reorderHabits}
              onInstallPack={installHabitPack}
            />
          )}
          {tab === 'insights' && (
            <InsightsView
              habits={data.habits}
              completions={data.completions}
              goals={data.goals}
              tasks={data.tasks}
              missNotes={data.missNotes}
              moods={data.moods}
              dark={dark}
              aiEnabled={data.aiEnabled}
              aiModel={data.aiModel}
              aiInsightsCache={data.ai.insights}
              onSaveInsights={setInsights}
              appData={data}
            />
          )}
          {tab === 'calendar' && (
            <CalendarView
              habits={data.habits}
              completions={data.completions}
              tasks={data.tasks}
              moods={data.moods}
              goals={data.goals}
              onUpdateTask={updateTask}
              onToggleTask={toggleTask}
              onAddTask={addTask}
              onDeleteTask={deleteTask}
            />
          )}
          {tab === 'coach' && (
            <CoachChat
              enabled={data.aiEnabled}
              model={data.aiModel}
              data={data}
              chatSessions={data.chatSessions || []}
              activeChatId={data.activeChatId}
              onSetChatSessions={setChatSessions}
              onSetActiveChatId={setActiveChatId}
              onApplyPlan={applyPlan}
            />
          )}
        </main>

        <footer className="mt-16 border-t border-neutral-200 pt-6 text-center text-xs font-medium text-neutral-400 dark:border-neutral-800 dark:text-neutral-600">
          Your data lives only in this browser — stay consistent.
        </footer>
      </div>

      {/* Mobile bottom nav */}
      {!timerFs && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden border-t border-neutral-200 bg-white dark:border-neutral-800 dark:bg-[#0a0a0a]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {[
            { id: 'today', label: 'Today', icon: <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /> },
            { id: 'plan', label: 'Plan', icon: <><circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" /></> },
            { id: 'habits', label: 'Habits', icon: <><path d="M17 1l-5 5-5-5" /><path d="M3 9l9 9 9-9" /><path d="M3 15l9 9 9-9" /></> },
            { id: 'insights', label: 'Insights', icon: <><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></> },
            { id: 'calendar', label: 'Cal', icon: <><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></> },
            { id: 'coach', label: 'Coach', icon: <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></> },
          ].map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-semibold transition ${
                tab === id
                  ? 'text-neutral-900 dark:text-white'
                  : 'text-neutral-400 dark:text-neutral-600'
              }`}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                {icon}
              </svg>
              {label}
            </button>
          ))}
        </nav>
      )}

      {modal && (
        <HabitModal
          initial={modal === 'new' ? null : modal}
          onSave={saveHabit}
          onClose={() => setModal(null)}
        />
      )}
      {detail && (
        <HabitDetail
          habit={detail}
          completions={data.completions}
          missNotes={data.missNotes}
          dark={dark}
          onMissNote={setMissNote}
          onClose={() => setDetailId(null)}
        />
      )}
      {wizard && (
        <GoalWizard
          habits={data.habits}
          onCreate={(fields) => {
            createGoalFromWizard(fields)
            setTab('plan')
          }}
          onClose={() => setWizard(false)}
        />
      )}
      {settings && (
        <SettingsModal
          aiEnabled={data.aiEnabled}
          aiModel={data.aiModel}
          remindersEnabled={data.remindersEnabled}
          soundEnabled={data.soundEnabled}
          theme={data.theme}
          data={data}
          onToggleAi={() => setData((d) => ({ ...d, aiEnabled: !d.aiEnabled }))}
          onSetModel={(m) => setData((d) => ({ ...d, aiModel: m }))}
          onToggleReminders={toggleReminders}
          onToggleSound={() => setData((d) => ({ ...d, soundEnabled: !d.soundEnabled }))}
          onSetTheme={(t) => setData((d) => ({ ...d, theme: t }))}
          onRestore={restoreData}
          onClose={() => setSettings(false)}
        />
      )}
      <CoachWidget
        enabled={data.aiEnabled}
        model={data.aiModel}
        data={data}
        messages={data.chat.messages}
        onSetMessages={setChatMessages}
        onApplyPlan={applyPlan}
      />

      <PWABanner />

      {!data.onboardingDone && data.habits.length === 0 && data.goals.length === 0 && user && (
        <OnboardingFlow
          onComplete={() => setData((d) => ({ ...d, onboardingDone: true }))}
          onOpenHabit={() => { setModal('new'); setData((d) => ({ ...d, onboardingDone: true })) }}
          onOpenGoal={() => { setWizard(true); setData((d) => ({ ...d, onboardingDone: true })) }}
        />
      )}

      {weeklyReview && (
        <WeeklyReviewBanner
          weekKey={weeklyReview}
          onOpen={() => { setTab('plan'); setWeeklyReview(null) }}
          onDismiss={() => setWeeklyReview(null)}
        />
      )}
    </div>
  )
}

function WeeklyReviewBanner({ weekKey, onOpen, onDismiss }) {
  return (
    <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 px-4 md:bottom-6">
      <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-5 py-3.5 shadow-xl dark:border-neutral-700 dark:bg-[#161616]">
        <svg className="h-5 w-5 shrink-0 text-neutral-500 dark:text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M8 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2h-2"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>
        <div>
          <p className="text-sm font-bold text-neutral-900 dark:text-white">Time for your weekly review</p>
          <p className="text-xs font-medium text-neutral-400 dark:text-neutral-500">How did this week go?</p>
        </div>
        <div className="flex gap-2 shrink-0 ml-2">
          <button
            onClick={onOpen}
            className="rounded-full bg-neutral-900 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Review
          </button>
          <button
            onClick={onDismiss}
            className="rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-bold text-neutral-600 transition hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-300"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  )
}
