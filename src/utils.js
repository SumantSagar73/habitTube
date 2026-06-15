// ---- date helpers ----

export function dateKey(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayKey() {
  return dateKey(new Date())
}

export function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(d, n) {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + n)
  return copy
}

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// ---- task priority ----
export const PRIORITIES = ['high', 'medium', 'low']
export const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }
export const PRIORITY_LABEL = { high: 'High', medium: 'Medium', low: 'Low' }

export function nextPriority(p) {
  const i = PRIORITIES.indexOf(p)
  return PRIORITIES[(i + 1) % PRIORITIES.length]
}

// Sort tasks: unfinished first, then by priority (high → low).
export function sortByPriority(tasks) {
  return [...tasks].sort(
    (a, b) =>
      (a.done ? 1 : 0) - (b.done ? 1 : 0) ||
      (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1)
  )
}

export function formatNice(key) {
  return parseKey(key).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

// ---- habit scheduling ----

export function isScheduled(habit, date) {
  return habit.days.includes(date.getDay())
}

export function isDone(habit, completions, key) {
  return (completions[key] || []).includes(habit.id)
}

export function habitsForDate(habits, date) {
  const key = dateKey(date)
  return habits.filter((h) => h.createdAt <= key && isScheduled(h, date))
}

// ---- streaks ----

// Current streak: consecutive scheduled days completed, counting back from
// today. A still-pending today doesn't break the streak.
export function currentStreak(habit, completions) {
  let streak = 0
  let d = new Date()
  for (let i = 0; i < 3700; i++) {
    const key = dateKey(d)
    if (key < habit.createdAt) break
    if (isScheduled(habit, d)) {
      if (isDone(habit, completions, key)) streak++
      else if (i > 0) break
    }
    d = addDays(d, -1)
  }
  return streak
}

export function bestStreak(habit, completions) {
  let best = 0
  let run = 0
  let d = parseKey(habit.createdAt)
  const today = new Date()
  while (d <= today) {
    if (isScheduled(habit, d)) {
      if (isDone(habit, completions, dateKey(d))) {
        run++
        best = Math.max(best, run)
      } else if (dateKey(d) !== todayKey()) {
        run = 0
      }
    }
    d = addDays(d, 1)
  }
  return best
}

// ---- completion rates ----

// Fraction of scheduled habits completed on a date; null if nothing scheduled.
export function dayRate(habits, completions, date) {
  const due = habitsForDate(habits, date)
  if (due.length === 0) return null
  const key = dateKey(date)
  const done = due.filter((h) => isDone(h, completions, key)).length
  return done / due.length
}

// Completion rate for one habit over the last `days` days.
export function habitRate(habit, completions, days = 30) {
  let scheduled = 0
  let done = 0
  for (let i = 0; i < days; i++) {
    const d = addDays(new Date(), -i)
    const key = dateKey(d)
    if (key < habit.createdAt) break
    if (isScheduled(habit, d)) {
      scheduled++
      if (isDone(habit, completions, key)) done++
    }
  }
  return scheduled === 0 ? 0 : Math.round((done / scheduled) * 100)
}

// Weekly completion-rate series for the last `weeks` weeks (Mon-Sun buckets).
export function weeklySeries(habits, completions, weeks = 12) {
  const out = []
  const today = new Date()
  // start of current week (Monday)
  const start = addDays(today, -((today.getDay() + 6) % 7))
  for (let w = weeks - 1; w >= 0; w--) {
    const weekStart = addDays(start, -7 * w)
    let scheduled = 0
    let done = 0
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i)
      if (d > today) break
      const due = habitsForDate(habits, d)
      scheduled += due.length
      const key = dateKey(d)
      done += due.filter((h) => isDone(h, completions, key)).length
    }
    out.push({
      week: weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      rate: scheduled === 0 ? 0 : Math.round((done / scheduled) * 100),
    })
  }
  return out
}

// Number of habits completed on a date.
export function countDone(habits, completions, date) {
  const due = habitsForDate(habits, date)
  const key = dateKey(date)
  return due.filter((h) => isDone(h, completions, key)).length
}

// Daily series of habits completed for the last `days` days.
export function dailyCountSeries(habits, completions, days) {
  const out = []
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(new Date(), -i)
    out.push({
      label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      count: countDone(habits, completions, d),
    })
  }
  return out
}

// Daily series of habits completed between two date keys (inclusive).
export function dailyCountSeriesBetween(habits, completions, fromKey, toKey) {
  const out = []
  const end = parseKey(toKey)
  for (let d = parseKey(fromKey); d <= end; d = addDays(d, 1)) {
    out.push({
      label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      count: countDone(habits, completions, d),
    })
  }
  return out
}

// Monthly series for the current year: average habits completed per day.
export function monthlyAvgSeries(habits, completions) {
  const out = []
  const today = new Date()
  const year = today.getFullYear()
  for (let m = 0; m < 12; m++) {
    const start = new Date(year, m, 1)
    if (start > today) {
      out.push({ label: start.toLocaleDateString(undefined, { month: 'short' }), count: 0 })
      continue
    }
    const end = new Date(year, m + 1, 0) < today ? new Date(year, m + 1, 0) : today
    let total = 0
    let n = 0
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
      total += countDone(habits, completions, d)
      n++
    }
    out.push({
      label: start.toLocaleDateString(undefined, { month: 'short' }),
      count: n === 0 ? 0 : Math.round((total / n) * 10) / 10,
    })
  }
  return out
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}
