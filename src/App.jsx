import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { toStoredEmoji } from './icons'
import exportExcel from './exportExcel'
import { playAlarm } from './sounds'
import AuthScreen from './components/AuthScreen'
import CoachWidget from './components/CoachWidget'
import { fmtClock } from './components/FocusTimer'
import ArcWizard from './components/ArcWizard'
import { ChartColumn, House, MessageCircle, Repeat, Target } from 'lucide-react'
import AppHeader from './components/AppHeader'
import ArcCheckin from './components/ArcCheckin'
import ArcReview from './components/ArcReview'
import DayCheckin from './components/DayCheckin'
import ArcsPanel from './components/ArcsPanel'
import GoalWizard from './components/GoalWizard'
import HabitDetail from './components/HabitDetail'
import HabitModal from './components/HabitModal'
import ManageView from './components/ManageView'
import OnboardingFlow from './components/OnboardingFlow'
import PWABanner from './components/PWABanner'
import SettingsPanel from './components/SettingsPanel'
import TodayView from './components/TodayView'
import { buildArcPatch, buildWeekPatch, pendingWeek } from './arcs'
import { GOAL_COLORS } from './palette'
import { currentPeriods, nextPeriodStartKey, periodKeys } from './planUtils'
import { buildTemplate } from './templates'
import PublicProfile from './components/PublicProfile'
import useNotifications from './useNotifications'
import useReminders from './useReminders'
import useStore from './useStore'
import useSync from './useSync'
import { pushPublicSnapshot } from './sync'
import { maybeDailySnapshot } from './snapshots'
import { startBlocking, stopBlocking, blockerInstalled } from './focusBlocker'
import { supabase } from './utils/supabase'
import { addDays, dateKey, todayKey, uid } from './utils'

// Heavy views load on demand to keep the first bundle small (recharts lives in Insights).
const LandingPage = lazy(() => import('./components/LandingPage'))
const CalendarView = lazy(() => import('./components/CalendarView'))
const CoachChat = lazy(() => import('./components/CoachChat'))
const InsightsView = lazy(() => import('./components/InsightsView'))
const PlanView = lazy(() => import('./components/PlanView'))
const viewFallback = <div className="py-24 text-center text-sm font-medium text-neutral-400">Loading…</div>

const LEVEL_ORDER = ['year', 'quarter', 'month', 'week']

const TABS = [
  { id: 'today', label: 'Today' },
  { id: 'plan', label: 'Plan' },
  { id: 'habits', label: 'Habits' },
  { id: 'insights', label: 'Insights' },
  { id: 'coach', label: 'Coach' },
]

// Friendly first name: profile name if set, else the email prefix without digits.
function displayName(user) {
  const raw = user?.user_metadata?.full_name || user?.user_metadata?.name || (user?.email || '').split('@')[0]
  const first = String(raw).replace(/[0-9_.]+/g, ' ').trim().split(' ')[0]
  return first ? first[0].toUpperCase() + first.slice(1) : ''
}

export default function App() {
  const [data, setData, setDataRaw] = useStore()
  const [tab, setTab] = useState('today')
  const [planMode, setPlanMode] = useState('cascade') // 'cascade' | 'outline'
  const [modal, setModal] = useState(null) // null | 'new' | habit object
  const [detailId, setDetailId] = useState(null)
  const [wizard, setWizard] = useState(false)
  const [arcWizard, setArcWizard] = useState(false)
  const [checkinArcId, setCheckinArcId] = useState(null)
  const [reviewArcId, setReviewArcId] = useState(null)
  const [arcSeed, setArcSeed] = useState('')
  const [coachSeed, setCoachSeed] = useState('')
  const [settings, setSettings] = useState(false)
  const [focus, setFocus] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('habittube-focus') || 'null')
      if (saved && saved.endsAt) {
        const remaining = Math.max(0, Math.round((saved.endsAt - Date.now()) / 1000))
        if (remaining > 0) return { ...saved, running: false, remaining } // restore paused
      }
    } catch { /* ignore */ }
    return { running: false, endsAt: null, remaining: 25 * 60, durationMin: 25, goalId: null, label: '', isBreak: false, autoBreak: false }
  })
  const [timerFs, setTimerFs] = useState(false)
  const [showAuth, setShowAuth] = useState(false)

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
  useNotifications(data, setData)
  const syncStatus = useSync(data, setDataRaw, user?.id)

  // Daily backup snapshot — once per calendar day, after the first sync settles
  // so we snapshot the reconciled state (not the pre-pull local state).
  const snappedRef = useRef(false)
  useEffect(() => {
    if (snappedRef.current || !user?.id || syncStatus !== 'synced') return
    snappedRef.current = true
    maybeDailySnapshot(user.id, data)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, syncStatus])

  // Detect the Focus blocker browser extension
  const [extInstalled, setExtInstalled] = useState(false)
  useEffect(() => { blockerInstalled().then(setExtInstalled) }, [])

  // Push public profile snapshot whenever sharing is enabled
  useEffect(() => {
    if (!user?.id || !data.shareProfile) return
    const snapshot = {
      displayName: user.email?.split('@')[0] || 'Anonymous',
      habits: data.habits,
      completions: data.completions,
      goals: data.goals,
      focusLog: data.focusLog || [],
    }
    pushPublicSnapshot(user.id, snapshot).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.shareProfile, user?.id])

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
      else if (k === 'n') setModal('new')
      else if (k === 'f') setTimerFs((v) => !v)
      else if (k === 'escape') setSettings(false)
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
    const existingIds = new Set((data.tasks[key] || []).filter((t) => t.fromRecurring).map((t) => t.fromRecurring))
    const toAdd = data.recurringTasks.filter((rt) => {
      if (existingIds.has(rt.id)) return false
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

  // Persist focus state so a refresh mid-session restores the timer
  useEffect(() => {
    if (focus.running || (focus.remaining < focus.durationMin * 60 && focus.remaining > 0)) {
      localStorage.setItem('habittube-focus', JSON.stringify(focus))
    } else {
      localStorage.removeItem('habittube-focus')
    }
  }, [focus])

  const focusRef = useRef(focus)
  useEffect(() => { focusRef.current = focus })

  function finishFocus() {
    const f = focusRef.current
    const noteId = `focus-done-${todayKey()}-${f.goalId || 'free'}-${Date.now()}`
    setData((d) => ({
      ...d,
      focusLog: [...(d.focusLog || []), { date: todayKey(), minutes: f.durationMin, goalId: f.goalId, label: f.label, at: Date.now() - f.durationMin * 60000 }],
      notifications: [
        { id: noteId, type: 'focus', title: `Focus session done — ${f.durationMin} min`, body: f.label || 'Great work! Take a short break.', createdAt: Date.now(), read: false },
        ...(d.notifications || []),
      ].slice(0, 50),
    }))
    // Auto-break: chain a break session instead of going idle
    const breakMin = f.durationMin <= 25 ? 5 : f.durationMin <= 50 ? 10 : 15
    if (f.autoBreak && !f.isBreak) {
      setFocus((prev) => ({ ...prev, running: true, isBreak: true, endsAt: Date.now() + breakMin * 60 * 1000, remaining: breakMin * 60, durationMin: breakMin }))
    } else if (f.isBreak) {
      // break finished — reset to idle, keep original work duration
      setFocus((prev) => ({ ...prev, running: false, isBreak: false, endsAt: null, remaining: f.autoBreak ? 25 * 60 : prev.durationMin * 60, durationMin: f.autoBreak ? 25 : prev.durationMin }))
    } else {
      setFocus((prev) => ({ ...prev, running: false, endsAt: null, remaining: prev.durationMin * 60 }))
    }
    // Work session ended → lift site blocking (breaks are free time)
    if (!f.isBreak) stopBlocking()
    if (data.soundEnabled) {
      playAlarm()
    }
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      const title = 'Focus session done'
      const body = f.label ? `Nice work on “${f.label}”.` : 'Nice deep-work session.'
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'NOTIFY', title, body, tag: 'focus-done' })
      } else {
        try { new Notification(title, { body }) } catch { /* ignore */ }
      }
    }
  }

  // Web Worker tick — not throttled when tab/window is hidden (fixes Discord screen-share freeze)
  useEffect(() => {
    if (!focus.running) return
    const worker = new Worker(new URL('./timer.worker.js', import.meta.url))
    worker.onmessage = () => {
      const f = focusRef.current
      const rem = Math.max(0, Math.round((f.endsAt - Date.now()) / 1000))
      if (rem <= 0) finishFocus()
      else setFocus((prev) => ({ ...prev, remaining: rem }))
    }
    worker.postMessage('start')
    // Snap display immediately when tab becomes visible again
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        const f = focusRef.current
        if (f.running) setFocus((prev) => ({ ...prev, remaining: Math.max(0, Math.round((f.endsAt - Date.now()) / 1000)) }))
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      worker.postMessage('stop')
      worker.terminate()
      document.removeEventListener('visibilitychange', onVisible)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus.running])

  function startFocus(durationMin, goalId, label, autoBreak = false) {
    const endsAt = Date.now() + durationMin * 60 * 1000
    setFocus({ running: true, endsAt, remaining: durationMin * 60, durationMin, goalId, label, isBreak: false, autoBreak })
    const lbl = label || (goalId ? data.goals.find((g) => g.id === goalId)?.title : '') || ''
    startBlocking(endsAt, data.focusAllowlist || [], data.focusBlocklist || [], lbl)
  }
  function pauseFocus() {
    stopBlocking()
    setFocus((f) => ({ ...f, running: false, endsAt: null, remaining: Math.max(0, Math.round((f.endsAt - Date.now()) / 1000)) }))
  }
  function resumeFocus() {
    const f = focusRef.current
    const endsAt = Date.now() + f.remaining * 1000
    if (!f.isBreak) startBlocking(endsAt, data.focusAllowlist || [], data.focusBlocklist || [], f.label)
    setFocus((prev) => ({ ...prev, running: true, endsAt }))
  }
  function stopFocus() {
    stopBlocking()
    setFocus((f) => ({ ...f, running: false, endsAt: null, remaining: f.durationMin * 60 }))
  }

  // Focus site lists. A domain is either allowed OR off-limits, never both.
  const cleanDomain = (domain) => String(domain || '').trim().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '').toLowerCase()
  function addAllowDomain(domain) {
    const d = cleanDomain(domain)
    if (!d) return
    setData((prev) => ({
      ...prev,
      focusAllowlist: prev.focusAllowlist?.includes(d) ? prev.focusAllowlist : [...(prev.focusAllowlist || []), d],
      focusBlocklist: (prev.focusBlocklist || []).filter((x) => x !== d),
    }))
  }
  function removeAllowDomain(domain) {
    setData((prev) => ({ ...prev, focusAllowlist: (prev.focusAllowlist || []).filter((x) => x !== domain) }))
  }
  function addBlockDomain(domain) {
    const d = cleanDomain(domain)
    if (!d) return
    setData((prev) => ({
      ...prev,
      focusBlocklist: prev.focusBlocklist?.includes(d) ? prev.focusBlocklist : [...(prev.focusBlocklist || []), d],
      focusAllowlist: (prev.focusAllowlist || []).filter((x) => x !== d),
    }))
  }
  function removeBlockDomain(domain) {
    setData((prev) => ({ ...prev, focusBlocklist: (prev.focusBlocklist || []).filter((x) => x !== domain) }))
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

  // Overdue habit → consciously skip it for today, logging an optional reason.
  // Records the reason as today's miss note so it's captured now, not tomorrow.
  function skipHabit(habitId, reason) {
    const key = todayKey()
    setData((d) => {
      const existing = d.skips?.[habitId] || []
      const skips = existing.includes(key) ? d.skips : { ...d.skips, [habitId]: [...existing, key] }
      const missNotes = reason
        ? { ...d.missNotes, [habitId]: { ...(d.missNotes[habitId] || {}), [key]: reason } }
        : d.missNotes
      return { ...d, skips, missNotes }
    })
  }

  function unskipHabit(habitId) {
    const key = todayKey()
    setData((d) => ({
      ...d,
      skips: { ...d.skips, [habitId]: (d.skips?.[habitId] || []).filter((k) => k !== key) },
    }))
  }

  function reorderHabits(orderedHabits) {
    setData((d) => ({ ...d, habits: orderedHabits }))
  }

  function installHabitPack(habits) {
    setData((d) => ({ ...d, habits: [...d.habits, ...habits.map((h) => ({ ...h, emoji: toStoredEmoji(h.emoji) }))] }))
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

  function markNotificationRead(id) {
    setData((d) => ({ ...d, notifications: d.notifications.map((n) => n.id === id ? { ...n, read: true } : n) }))
  }
  function markAllNotificationsRead() {
    setData((d) => ({ ...d, notifications: d.notifications.map((n) => ({ ...n, read: true })) }))
  }
  function clearNotifications() {
    setData((d) => ({ ...d, notifications: [] }))
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
    const newHabits = items
      .filter((x) => x.kind === 'habit' && x.name?.trim())
      .map((it) => ({
        id: uid(),
        createdAt: todayKey(),
        name: it.name.trim(),
        emoji: toStoredEmoji(it.emoji),
        days: Array.isArray(it.days) && it.days.length ? it.days.map(Number) : [0, 1, 2, 3, 4, 5, 6],
        time: it.time || '',
        color: '#171717',
      }))

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
      return { ...d, goals: [...goals, ...newGoals], habits: [...d.habits, ...newHabits], tasks }
    })
  }

  // Create an arc: a month goal + week goal + habits + week-1 tasks, all tagged with the arc id.
  function applyArc(plan) {
    setData((d) => {
      const { arc, goals, habits, tasksByDay } = buildArcPatch(d, plan)
      const tasks = { ...d.tasks }
      for (const [k, arr] of Object.entries(tasksByDay)) tasks[k] = [...(tasks[k] || []), ...arr]
      return { ...d, arcs: [...(d.arcs || []), arc], goals: [...d.goals, ...goals], habits: [...d.habits, ...habits], tasks }
    })
  }

  // Apply a weekly check-in: new week goal + tasks, and remember the feedback on the arc.
  function applyCheckin(arcId, weekIdx, weekPlan, feedback) {
    setData((d) => {
      const arc = (d.arcs || []).find((x) => x.id === arcId)
      if (!arc) return d
      const { goal, tasksByDay } = buildWeekPatch(d, arc, weekIdx, weekPlan)
      const tasks = { ...d.tasks }
      for (const [k, arr] of Object.entries(tasksByDay)) tasks[k] = [...(tasks[k] || []), ...arr]
      const weeks = arc.weeks.map((w, i) => (i === weekIdx && weekPlan.milestone ? { ...w, milestone: weekPlan.milestone } : w))
      const checkin = { week: weekIdx, at: todayKey(), rating: feedback.rating, blockers: feedback.blockers, note: weekPlan.note }
      const arcs = d.arcs.map((x) => (x.id === arcId ? { ...x, weeks, generatedWeek: weekIdx, resumedAt: todayKey(), checkins: [...(x.checkins || []), checkin] } : x))
      return { ...d, arcs, goals: [...d.goals, goal], tasks }
    })
  }

  // Close a finished arc, keeping its review, and optionally start the next one.
  function finishArc(id, review, nextTheme) {
    setData((d) => ({
      ...d,
      arcs: (d.arcs || []).map((a) => (a.id === id ? { ...a, status: 'closed', closedAt: todayKey(), ...(review ? { review } : {}) } : a)),
    }))
    setReviewArcId(null)
    if (nextTheme != null) {
      setArcSeed(nextTheme)
      setArcWizard(true)
    }
  }

  // Resume / pause / close an arc. Resuming counts as activity (resets the quiet timer).
  function resolveArc(id, action) {
    const status = { resume: 'active', pause: 'paused', close: 'closed' }[action]
    if (!status) return
    setData((d) => ({
      ...d,
      arcs: (d.arcs || []).map((a) =>
        a.id !== id ? a : {
          ...a,
          status,
          ...(action === 'resume' ? { resumedAt: todayKey() } : {}),
          ...(action === 'close' ? { closedAt: todayKey() } : {}),
        }
      ),
    }))
  }

  function updateGoal(id, patch) {
    setData((d) => ({ ...d, goals: d.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) }))
  }

  function deleteGoal(goal) {
    if (!window.confirm(`Delete “${goal.title}”? Sub-goals become standalone and linked tasks are unlinked.`)) return
    setData((d) => {
      // Collect all descendant IDs so we can clear every stale goalId reference
      const descendants = new Set([goal.id])
      let changed = true
      while (changed) {
        changed = false
        for (const g of d.goals) {
          if (!descendants.has(g.id) && descendants.has(g.parentId)) { descendants.add(g.id); changed = true }
        }
      }
      return {
        ...d,
        goals: d.goals
          .filter((g) => g.id !== goal.id)
          .map((g) => (g.parentId === goal.id ? { ...g, parentId: null } : g)),
        tasks: Object.fromEntries(
          Object.entries(d.tasks).map(([k, arr]) => [k, arr.map((t) => (descendants.has(t.goalId) ? { ...t, goalId: null } : t))])
        ),
      }
    })
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

  // Reorder a task within its own day, inserting it before `targetId`. Only
  // allowed within the same priority group — a "necessary" task can't be
  // dragged up into the "important" group (enforced here as a safety net).
  function reorderTask(dayKey, draggedId, targetId) {
    setData((d) => {
      const list = d.tasks[dayKey] || []
      const dragged = list.find((t) => t.id === draggedId)
      const target = list.find((t) => t.id === targetId)
      if (!dragged || !target || draggedId === targetId) return d
      if ((dragged.priority || 'medium') !== (target.priority || 'medium')) return d
      const without = list.filter((t) => t.id !== draggedId)
      const idx = without.findIndex((t) => t.id === targetId)
      without.splice(idx, 0, dragged)
      return { ...d, tasks: { ...d.tasks, [dayKey]: without } }
    })
  }

  // Public profile route: ?p=<userId>
  const publicProfileId = new URLSearchParams(window.location.search).get('p')
  if (publicProfileId) {
    return <PublicProfile userId={publicProfileId} onBack={() => window.location.href = window.location.pathname} />
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-[#0a0a0a]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900 dark:border-neutral-700 dark:border-t-white" />
      </div>
    )
  }

  if (!user) {
    return showAuth
      ? <AuthScreen onAuth={(u) => { setUser(u); setShowAuth(false) }} onBack={() => setShowAuth(false)} />
      : <Suspense fallback={null}><LandingPage onOpenAuth={() => setShowAuth(true)} /></Suspense>
  }

  return (
    <div className="app-bg min-h-screen overflow-x-hidden bg-white text-neutral-900 transition-colors duration-300 dark:bg-[#0a0a0a] dark:text-white">
      <div className="mx-auto w-full max-w-[1440px] px-4 pb-28 sm:px-8 md:pb-20" style={{ paddingBottom: 'max(7rem, calc(7rem + env(safe-area-inset-bottom)))' }}>
        <AppHeader
          tabs={TABS}
          tab={tab}
          onTab={setTab}
          hidden={timerFs}
          syncStatus={syncStatus}
          focusClock={focusActive ? fmtClock(focus.remaining) : ''}
          onFocusClick={() => setTab('today')}
          onNewHabit={() => setModal('new')}
          onNewGoal={() => setWizard(true)}
          onNewArc={() => { setArcSeed(''); setArcWizard(true) }}
          notifications={data.notifications || []}
          onMarkRead={markNotificationRead}
          onMarkAllRead={markAllNotificationsRead}
          onClear={clearNotifications}
          name={displayName(user)}
          email={user?.email}
          dark={dark}
          onSettings={() => setSettings(true)}
          onExport={() => exportExcel(data)}
          onToggleTheme={() => setData((d) => ({ ...d, theme: dark ? 'light' : 'dark' }))}
          onSignOut={() => supabase.auth.signOut()}
        />

        <div className="h-6" />

        <main className="animate-fade-up" key={tab}>
          <Suspense fallback={viewFallback}>
          {tab === 'plan' && !timerFs && (
            <ArcsPanel data={data} onNew={() => { setArcSeed(''); setArcWizard(true) }} onResolveArc={resolveArc} onCheckin={setCheckinArcId} onReview={setReviewArcId} />
          )}
          {tab === 'today' && (
            <TodayView
              habits={data.habits}
              completions={data.completions}
              skips={data.skips || {}}
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
              onSkipHabit={skipHabit}
              onUnskipHabit={unskipHabit}
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
              name={displayName(user)}
              arcs={data.arcs}
              onNewArc={() => { setArcSeed(''); setArcWizard(true) }}
              wrapUp={
                !timerFs && (
                  <DayCheckin data={data} onSave={(k, entry) => setData((d) => ({ ...d, dayCheckins: { ...(d.dayCheckins || {}), [k]: entry } }))} />
                )
              }
              afterCoach={
                !timerFs && (
                  <ArcsPanel data={data} compact alertsOnly onNew={() => { setArcSeed(''); setArcWizard(true) }} onResolveArc={resolveArc} onCheckin={setCheckinArcId} onReview={setReviewArcId} />
                )
              }
              onOpenCoach={(prompt) => { setCoachSeed(typeof prompt === 'string' ? prompt : ''); setTab('coach') }}
              onAddRecurring={addRecurringTask}
              onDeleteRecurring={deleteRecurringTask}
              focus={focus}
              focusMinutesToday={focusMinutesToday}
              onStartFocus={startFocus}
              onPauseFocus={pauseFocus}
              onResumeFocus={resumeFocus}
              onStopFocus={stopFocus}
              onFsChange={setTimerFs}
              blockerInstalled={extInstalled}
              onManageBlocker={() => setSettings('focus')}
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
              onReorderTask={reorderTask}
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
              historySlot={
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
              }
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
              seed={coachSeed}
              onSeedUsed={() => setCoachSeed('')}
            />
          )}
        </Suspense>
        </main>
      </div>

      {/* Mobile bottom nav */}
      {!timerFs && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden glass-bar border-t" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {[
            { id: 'today', label: 'Today', Icon: House },
            { id: 'plan', label: 'Plan', Icon: Target },
            { id: 'habits', label: 'Habits', Icon: Repeat },
            { id: 'insights', label: 'Insights', Icon: ChartColumn },
            { id: 'coach', label: 'Coach', Icon: MessageCircle },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-semibold transition ${
                tab === id
                  ? 'text-neutral-900 dark:text-white'
                  : 'text-neutral-400 dark:text-neutral-600'
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={1.8} />
              {label}
            </button>
          ))}
        </nav>
      )}

      {modal && (
        <HabitModal
          initial={modal === 'new' ? null : modal}
          habits={data.habits}
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
      {checkinArcId && (() => {
        const arc = (data.arcs || []).find((x) => x.id === checkinArcId)
        const weekIdx = arc ? pendingWeek(arc) : null
        if (!arc || weekIdx == null) return null
        return (
          <ArcCheckin
            arc={arc}
            weekIdx={weekIdx}
            data={data}
            onApply={(plan, feedback) => {
              applyCheckin(arc.id, weekIdx, plan, feedback)
              setCheckinArcId(null)
            }}
            onClose={() => setCheckinArcId(null)}
          />
        )
      })()}
      {reviewArcId && (() => {
        const arc = (data.arcs || []).find((x) => x.id === reviewArcId)
        if (!arc) return null
        return (
          <ArcReview
            arc={arc}
            data={data}
            aiEnabled={data.aiEnabled}
            onFinish={(review, nextTheme) => finishArc(arc.id, review, nextTheme)}
            onClose={() => setReviewArcId(null)}
          />
        )
      })()}
      {arcWizard && (
        <ArcWizard
          data={data}
          seed={arcSeed}
          aiEnabled={data.aiEnabled}
          onApply={(plan) => {
            applyArc(plan)
            setArcWizard(false)
            setTab('plan')
          }}
          onResolveArc={resolveArc}
          onClose={() => setArcWizard(false)}
        />
      )}
      {settings && (
        <SettingsPanel
          initialSection={typeof settings === 'string' ? settings : 'general'}
          blocker={{
            allowlist: data.focusAllowlist || [],
            blocklist: data.focusBlocklist || [],
            installed: extInstalled,
            onAddAllow: addAllowDomain,
            onRemoveAllow: removeAllowDomain,
            onAddBlock: addBlockDomain,
            onRemoveBlock: removeBlockDomain,
          }}
          arcNotify={data.arcNotify !== false}
          onToggleArcNotify={() => setData((d) => ({ ...d, arcNotify: d.arcNotify === false }))}
          aiEnabled={data.aiEnabled}
          aiModel={data.aiModel}
          remindersEnabled={data.remindersEnabled}
          soundEnabled={data.soundEnabled}
          theme={data.theme}
          data={data}
          userId={user?.id}
          shareProfile={data.shareProfile || false}
          onToggleShare={() => setData((d) => ({ ...d, shareProfile: !d.shareProfile }))}
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

function WeeklyReviewBanner({ onOpen, onDismiss }) {
  return (
    <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 px-4 md:bottom-6">
      <div className="glass-strong flex items-center gap-3 rounded-2xl border px-5 py-3.5 shadow-xl">
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
