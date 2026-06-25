import { addDays, dateKey, isScheduled } from './utils'

const pad = (n) => String(n).padStart(2, '0')
const clamp = (x) => Math.max(0, Math.min(100, x))

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
export const LEVELS = ['year', 'quarter', 'month', 'week']
export const LEVEL_LABEL = { year: 'Year', quarter: 'Quarter', month: 'Month', week: 'Week' }

// ---- ISO week ----
export function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - dayNum + 3) // nearest Thursday
  const firstThu = new Date(Date.UTC(d.getUTCFullYear(), 0, 4))
  const week = 1 + Math.round(((d - firstThu) / 86400000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7)
  return { year: d.getUTCFullYear(), week }
}

// ---- period keys for a date ----
export function periodKeys(date) {
  const y = date.getFullYear()
  const q = Math.floor(date.getMonth() / 3) + 1
  const iw = isoWeek(date)
  return {
    year: `${y}`,
    quarter: `${y}-Q${q}`,
    month: `${y}-${pad(date.getMonth() + 1)}`,
    week: `${iw.year}-W${pad(iw.week)}`,
  }
}

export function currentPeriods() {
  return periodKeys(new Date())
}

// Monday (as a local date) of an ISO week key like "2026-W24".
export function isoWeekStart(key) {
  const [y, w] = key.split('-W').map(Number)
  const jan4 = new Date(Date.UTC(y, 0, 4))
  const jan4Dow = (jan4.getUTCDay() + 6) % 7
  const week1Mon = new Date(jan4)
  week1Mon.setUTCDate(jan4.getUTCDate() - jan4Dow)
  const mon = new Date(week1Mon)
  mon.setUTCDate(week1Mon.getUTCDate() + (w - 1) * 7)
  return new Date(mon.getUTCFullYear(), mon.getUTCMonth(), mon.getUTCDate())
}

// ---- children of a period ----
export function quartersOfYear(yearKey) {
  return [1, 2, 3, 4].map((q) => `${yearKey}-Q${q}`)
}
export function monthsOfQuarter(qKey) {
  const [y, q] = qKey.split('-Q').map(Number)
  const start = (q - 1) * 3
  return [0, 1, 2].map((i) => `${y}-${pad(start + i + 1)}`)
}
// Weeks belong to the month that holds their Thursday.
export function weeksOfMonth(mKey) {
  const [y, m] = mKey.split('-').map(Number)
  const out = []
  const seen = new Set()
  const last = new Date(y, m, 0).getDate()
  for (let day = 1; day <= last; day++) {
    const d = new Date(y, m - 1, day)
    if (d.getDay() === 4) {
      const iw = isoWeek(d)
      const key = `${iw.year}-W${pad(iw.week)}`
      if (!seen.has(key)) {
        seen.add(key)
        out.push(key)
      }
    }
  }
  return out
}
export function daysOfWeek(weekKey) {
  const mon = isoWeekStart(weekKey)
  return Array.from({ length: 7 }, (_, i) => addDays(mon, i))
}

// ---- labels ----
export function periodLabel(level, key) {
  if (!key) return ''
  if (level === 'year') return key
  if (level === 'quarter') {
    const parts = key.split('-Q')
    if (parts.length !== 2 || !parts[0] || !parts[1]) return key
    return `Q${parts[1]} ${parts[0]}`
  }
  if (level === 'month') {
    const parts = key.split('-')
    if (parts.length < 2) return key
    const monthIdx = +parts[1] - 1
    if (monthIdx < 0 || monthIdx > 11 || !MONTH_NAMES[monthIdx]) return key
    return `${MONTH_NAMES[monthIdx]} ${parts[0]}`
  }
  if (level === 'week') {
    const wParts = key.split('-W')
    if (wParts.length !== 2 || isNaN(+wParts[0]) || isNaN(+wParts[1])) return key
    const days = daysOfWeek(key)
    const a = days[0]
    const b = days[6]
    if (isNaN(a.getTime()) || isNaN(b.getTime())) return key
    const sameMonth = a.getMonth() === b.getMonth()
    const fmt = (d, withMonth) =>
      withMonth ? `${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getDate()}` : `${d.getDate()}`
    return `${fmt(a, true)}–${fmt(b, !sameMonth)}`
  }
  return key
}

export function periodShort(level, key) {
  if (!key) return ''
  if (level === 'quarter') {
    const q = key.split('-Q')[1]
    return q ? `Q${q}` : key
  }
  if (level === 'month') {
    const monthIdx = +key.split('-')[1] - 1
    return (monthIdx >= 0 && monthIdx <= 11 && MONTH_NAMES[monthIdx])
      ? MONTH_NAMES[monthIdx].slice(0, 3)
      : key
  }
  if (level === 'week') return periodLabel('week', key)
  return key
}

// ---- date range of a period ----
export function periodRange(level, key) {
  if (level === 'year') {
    const y = +key
    return { start: new Date(y, 0, 1), end: new Date(y, 11, 31) }
  }
  if (level === 'quarter') {
    const [y, q] = key.split('-Q').map(Number)
    const s = (q - 1) * 3
    return { start: new Date(y, s, 1), end: new Date(y, s + 3, 0) }
  }
  if (level === 'month') {
    const [y, m] = key.split('-').map(Number)
    return { start: new Date(y, m - 1, 1), end: new Date(y, m, 0) }
  }
  const days = daysOfWeek(key)
  return { start: days[0], end: days[6] }
}

// ---- task helpers ----
export function tasksForDate(tasks, key) {
  return tasks[key] || []
}
export function tasksInWeek(tasks, weekKey) {
  const out = []
  for (const d of daysOfWeek(weekKey)) {
    const key = dateKey(d)
    for (const t of tasks[key] || []) out.push({ ...t, date: key })
  }
  return out
}

// ---- rollup ----
function habitCompletionsInPeriod(habit, completions, level, key) {
  const { start, end } = periodRange(level, key)
  let n = 0
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    const k = dateKey(d)
    if (k < habit.createdAt) continue
    if (isScheduled(habit, d) && (completions[k] || []).includes(habit.id)) n++
  }
  return n
}

// A goal's completion percent. Hybrid: a manual override wins; otherwise it's
// derived from the goal's type and any linked children / tasks / habit.
export function goalPercent(goal, ctx, memo = new Map()) {
  if (memo.has(goal.id)) return memo.get(goal.id)
  memo.set(goal.id, 0) // guard against accidental cycles
  let pct = 0
  if (goal.manualPct != null) {
    pct = goal.manualPct
  } else if (goal.type === 'numeric') {
    pct = goal.target > 0 ? clamp(((goal.current || 0) / goal.target) * 100) : 0
  } else if (goal.type === 'habit') {
    const habit = ctx.habits.find((h) => h.id === goal.habitId)
    pct = habit && goal.habitTarget > 0
      ? clamp((habitCompletionsInPeriod(habit, ctx.completions, goal.level, goal.period) / goal.habitTarget) * 100)
      : 0
  } else {
    const children = ctx.goals.filter((g) => g.parentId === goal.id)
    const linkedTasks = []
    for (const k in ctx.tasks) for (const t of ctx.tasks[k]) if (t.goalId === goal.id) linkedTasks.push(t)
    const parts = [
      ...children.map((c) => goalPercent(c, ctx, memo)),
      ...linkedTasks.map((t) => (t.done ? 100 : 0)),
    ]
    pct = parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : goal.done ? 100 : 0
  }
  pct = Math.round(clamp(pct))
  memo.set(goal.id, pct)
  return pct
}

export function numericCurrent(goal, ctx) {
  // For display: a linked-habit goal reports its derived count.
  if (goal.type === 'habit') {
    const habit = ctx.habits.find((h) => h.id === goal.habitId)
    return habit ? habitCompletionsInPeriod(habit, ctx.completions, goal.level, goal.period) : 0
  }
  return goal.current || 0
}

// Aggregate percent for a time period card. Uses goals defined at that exact
// level; falls back to the average of the periods (or tasks) beneath it.
export function periodPercent(level, key, ctx, memo = new Map()) {
  const here = ctx.goals.filter((g) => g.level === level && g.period === key)
  if (here.length) {
    return Math.round(here.reduce((a, g) => a + goalPercent(g, ctx, memo), 0) / here.length)
  }
  if (level === 'week') {
    const wt = tasksInWeek(ctx.tasks, key)
    if (wt.length) return Math.round((wt.filter((t) => t.done).length / wt.length) * 100)
    return null
  }
  const kids =
    level === 'year'
      ? quartersOfYear(key).map((k) => ['quarter', k])
      : level === 'quarter'
        ? monthsOfQuarter(key).map((k) => ['month', k])
        : weeksOfMonth(key).map((k) => ['week', k])
  const vals = kids.map(([l, k]) => periodPercent(l, k, ctx, memo)).filter((v) => v != null)
  if (!vals.length) return null
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
}

export function goalsAt(goals, level, key) {
  return goals.filter((g) => g.level === level && g.period === key)
}

// All tasks (with their date) falling inside a period.
export function tasksInPeriod(tasks, level, key) {
  if (level === 'week') return tasksInWeek(tasks, key)
  const { start, end } = periodRange(level, key)
  const out = []
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    const k = dateKey(d)
    for (const t of tasks[k] || []) out.push({ ...t, date: k })
  }
  return out
}

// The first day (date key) of the period that follows this one — where a
// carried-forward task lands.
export function nextPeriodStartKey(level, key) {
  if (level === 'week') return dateKey(addDays(daysOfWeek(key)[0], 7))
  if (level === 'month') {
    const [y, m] = key.split('-').map(Number)
    return dateKey(new Date(y, m, 1)) // month index m == next month (0-based +1)
  }
  if (level === 'quarter') {
    const [y, q] = key.split('-Q').map(Number)
    return q === 4 ? dateKey(new Date(y + 1, 0, 1)) : dateKey(new Date(y, q * 3, 1))
  }
  return dateKey(new Date(Number(key) + 1, 0, 1))
}

export function nextPeriodLabel(level, key) {
  const startKey = nextPeriodStartKey(level, key)
  const [y, m, d] = startKey.split('-').map(Number)
  const next = periodKeys(new Date(y, m - 1, d))
  return periodLabel(level, next[level])
}

export function nextPeriodKey(level, key) {
  const startKey = nextPeriodStartKey(level, key)
  const [y, m, d] = startKey.split('-').map(Number)
  const next = periodKeys(new Date(y, m - 1, d))
  return next[level]
}

export function prevPeriodKey(level, key) {
  if (level === 'year') {
    return String(Number(key) - 1)
  }
  if (level === 'quarter') {
    const [y, q] = key.split('-Q').map(Number)
    if (q === 1) return `${y - 1}-Q4`
    return `${y}-Q${q - 1}`
  }
  if (level === 'month') {
    const [y, m] = key.split('-').map(Number)
    if (m === 1) return `${y - 1}-12`
    return `${y}-${String(m - 1).padStart(2, '0')}`
  }
  if (level === 'week') {
    const mon = isoWeekStart(key)
    const prevMon = addDays(mon, -7)
    const iw = isoWeek(prevMon)
    return `${iw.year}-W${String(iw.week).padStart(2, '0')}`
  }
  return key
}
