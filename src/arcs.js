// Arcs — a user-named, time-boxed push (1–3 months) that bundles a goal, habits
// and a first week of tasks into the existing goal cascade.
//
// arc: { id, title, why, startDate, endDate, status: 'active'|'paused'|'closed',
//        weeks: [{ theme, milestone }], minDay, goalId, habitIds, resumedAt?, closedAt?, createdAt }
import { GOAL_COLORS } from './palette'
import { currentPeriods } from './planUtils'
import { addDays, dateKey, parseKey, todayKey, uid } from './utils'

export const MAX_ACTIVE_ARCS = 2
export const STALE_DAYS = 5
export const MAX_WEEKS = 13 // ~3 months

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x))
const daysBetween = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 86400000)

export const activeArcs = (arcs = []) => arcs.filter((a) => a.status === 'active')

export function arcDay(arc, today = todayKey()) {
  const total = daysBetween(arc.startDate, arc.endDate) + 1
  const day = clamp(daysBetween(arc.startDate, today) + 1, 1, total)
  const weekIdx = clamp(Math.floor((day - 1) / 7), 0, Math.max(0, (arc.weeks?.length || 1) - 1))
  return { day, total, weekIdx, ended: today > arc.endDate, pct: Math.round((day / total) * 100) }
}

// Latest date the user actually did something for this arc: completed one of its
// habits, ticked one of its tasks, or resumed it. Computed — nothing extra stored.
export function lastActiveKey(arc, { completions = {}, tasks = {} }) {
  let last = arc.resumedAt || arc.startDate
  const habitIds = new Set(arc.habitIds || [])
  for (const [k, ids] of Object.entries(completions)) {
    if (k > last && ids.some((id) => habitIds.has(id))) last = k
  }
  for (const [k, list] of Object.entries(tasks)) {
    if (k > last && list.some((t) => t.arcId === arc.id && t.done)) last = k
  }
  return last
}

// Days of inactivity if the arc is active, running and quiet for STALE_DAYS+; else 0.
export function staleDays(arc, data, today = todayKey()) {
  if (arc.status !== 'active' || today > arc.endDate) return 0
  const d = daysBetween(lastActiveKey(arc, data), today)
  return d >= STALE_DAYS ? d : 0
}

// Validate/normalize the model's compact JSON. Returns null if unusable.
// Shape: {title, why, weeks:[[theme,milestone]], target:[title,n,unit]|null,
//         habits:[[emoji,name,[days],"HH:MM"]], tasks:[[dayOffset,title,"h|m|l"]], minDay}
export function normalizeArcPlan(raw, weeksCount) {
  if (!raw || typeof raw !== 'object' || !String(raw.title || '').trim()) return null
  const str = (v) => String(v ?? '').trim()
  const weeks = (Array.isArray(raw.weeks) ? raw.weeks : [])
    .map((w) => (Array.isArray(w) ? { theme: str(w[0]), milestone: str(w[1]) } : { theme: str(w?.theme), milestone: str(w?.milestone) }))
    .filter((w) => w.theme || w.milestone)
    .slice(0, weeksCount)
  while (weeks.length < weeksCount) weeks.push({ theme: `Week ${weeks.length + 1}`, milestone: '' })

  const habits = (Array.isArray(raw.habits) ? raw.habits : [])
    .map((h) => (Array.isArray(h) ? { emoji: str(h[0]), name: str(h[1]), days: h[2], time: str(h[3]) } : { emoji: str(h?.emoji), name: str(h?.name), days: h?.days, time: str(h?.time) }))
    .filter((h) => h.name)
    .slice(0, 5)
    .map((h) => ({
      emoji: h.emoji || '💪',
      name: h.name,
      days: Array.isArray(h.days) && h.days.length ? [...new Set(h.days.map(Number).filter((n) => n >= 0 && n <= 6))] : [0, 1, 2, 3, 4, 5, 6],
      time: /^\d{2}:\d{2}$/.test(h.time) ? h.time : '',
    }))

  const prio = { h: 'high', m: 'medium', l: 'low', high: 'high', medium: 'medium', low: 'low' }
  const tasks = (Array.isArray(raw.tasks) ? raw.tasks : [])
    .map((t) => (Array.isArray(t) ? { off: t[0], title: str(t[1]), p: t[2] } : { off: t?.dayOffset, title: str(t?.title), p: t?.priority }))
    .filter((t) => t.title)
    .slice(0, 14)
    .map((t) => ({ dayOffset: clamp(Number(t.off) || 0, 0, 6), title: t.title, priority: prio[t.p] || 'medium' }))

  const tg = Array.isArray(raw.target) ? { title: str(raw.target[0]), n: Number(raw.target[1]) || 0, unit: str(raw.target[2]) } : null
  return {
    title: str(raw.title),
    why: str(raw.why),
    weeks,
    target: tg && tg.title && tg.n > 0 ? tg : null,
    habits,
    tasks,
    minDay: str(raw.minDay),
    weeksCount,
  }
}

// Turn an accepted plan into store additions. Reuses the current quarter goal as
// the parent when one exists (no duplicate year/quarter goals).
export function buildArcPatch(data, plan) {
  const p = currentPeriods()
  const today = new Date()
  const startDate = dateKey(today)
  const endDate = dateKey(addDays(today, plan.weeksCount * 7 - 1))
  const arcId = uid()
  const quarter = data.goals.find((g) => g.level === 'quarter' && g.period === p.quarter && !g.done)
  const color = GOAL_COLORS[data.goals.length % GOAL_COLORS.length]
  const base = { color, current: 0, unit: '', habitId: null, habitTarget: 0, manualPct: null, done: false, createdAt: startDate, arcId }

  const monthGoal = {
    ...base,
    id: uid(),
    level: 'month',
    period: p.month,
    parentId: quarter?.id || null,
    title: plan.target?.title || plan.title,
    type: plan.target ? 'numeric' : 'checklist',
    target: plan.target?.n || 0,
    unit: plan.target?.unit || '',
  }
  const week0 = plan.weeks[0] || {}
  const weekGoal = {
    ...base,
    id: uid(),
    level: 'week',
    period: p.week,
    parentId: monthGoal.id,
    title: week0.milestone || week0.theme || 'Week 1',
    type: 'checklist',
    target: 0,
  }
  const habits = plan.habits.map((h) => ({
    id: uid(),
    createdAt: startDate,
    name: h.name,
    emoji: h.emoji,
    days: h.days,
    time: h.time,
    color: '#171717',
    arcId,
  }))
  const tasksByDay = {}
  for (const t of plan.tasks) {
    const dk = dateKey(addDays(today, t.dayOffset))
    ;(tasksByDay[dk] ||= []).push({ id: uid(), title: t.title, done: false, goalId: weekGoal.id, priority: t.priority, arcId })
  }
  const arc = {
    id: arcId,
    title: plan.title,
    why: plan.why,
    startDate,
    endDate,
    status: 'active',
    weeks: plan.weeks,
    minDay: plan.minDay,
    goalId: monthGoal.id,
    habitIds: habits.map((h) => h.id),
    createdAt: Date.now(),
  }
  return { arc, goals: [monthGoal, weekGoal], habits, tasksByDay }
}
