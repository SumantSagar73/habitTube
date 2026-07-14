import { goalPercent, LEVEL_LABEL, numericCurrent, periodLabel } from './planUtils'
import {
  addDays,
  bestStreak,
  currentStreak,
  dateKey,
  habitRate,
  isDone,
  isScheduled,
  parseKey,
  todayKey,
  WEEKDAYS,
} from './utils'

function autoWidth(ws, rows) {
  if (rows.length === 0) return
  const headers = Object.keys(rows[0])
  ws['!cols'] = headers.map((h) => ({
    wch: Math.min(60, Math.max(h.length, ...rows.map((r) => String(r[h] ?? '').length)) + 2),
  }))
}

function addSheet(XLSX, wb, name, rows, emptyMessage) {
  const data = rows.length > 0 ? rows : [{ Info: emptyMessage }]
  const ws = XLSX.utils.json_to_sheet(data)
  autoWidth(ws, data)
  XLSX.utils.book_append_sheet(wb, ws, name)
}

const MOOD_LABEL = { 1: 'Rough', 2: 'Low', 3: 'Okay', 4: 'Good', 5: 'Great' }

export default async function exportExcel({ habits, completions, notes, missNotes, goals = [], tasks = {}, visions = {}, reviews = {}, moods = {}, focusLog = [] }) {
  // Loaded on demand so the heavy spreadsheet library stays out of the main bundle.
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  const today = todayKey()
  const ctx = { goals, tasks, habits, completions }
  const LEVEL_ORDER = { year: 0, quarter: 1, month: 2, week: 3 }

  // 0. Summary dashboard — the at-a-glance sheet, first in the workbook
  const allTasks = Object.values(tasks).flat()
  const doneTasks = allTasks.filter((t) => t.done).length
  const focusMinutes = focusLog.reduce((a, f) => a + (f.minutes || 0), 0)
  const moodVals = Object.values(moods).filter(Boolean)
  const avgMood = moodVals.length ? (moodVals.reduce((a, v) => a + v, 0) / moodVals.length) : 0
  const rates = habits.map((h) => habitRate(h, completions, 30)).filter((r) => r != null)
  const avgRate = rates.length ? Math.round(rates.reduce((a, r) => a + r, 0) / rates.length) : 0
  const longestCurrent = habits.reduce((mx, h) => Math.max(mx, currentStreak(h, completions)), 0)
  const longestEver = habits.reduce((mx, h) => Math.max(mx, bestStreak(h, completions)), 0)
  const summaryRows = [
    { Metric: 'Exported on', Value: today },
    { Metric: 'Habits tracked', Value: habits.length },
    { Metric: 'Avg completion (last 30 days)', Value: `${avgRate}%` },
    { Metric: 'Longest current streak', Value: `${longestCurrent} days` },
    { Metric: 'Longest streak ever', Value: `${longestEver} days` },
    { Metric: 'Goals set', Value: goals.length },
    { Metric: 'Tasks completed', Value: `${doneTasks} / ${allTasks.length}` },
    { Metric: 'Focus sessions', Value: `${focusLog.length} (${focusMinutes} min)` },
    { Metric: 'Journal entries', Value: Object.values(notes).filter((n) => (n || '').trim()).length },
    { Metric: 'Average mood', Value: avgMood ? `${avgMood.toFixed(1)} / 5` : '—' },
  ]
  addSheet(XLSX, wb, 'Summary', summaryRows, 'No data yet')

  // 1. Habits overview
  addSheet(
    XLSX,
    wb,
    'Habits',
    habits.map((h) => ({
      Habit: `${h.emoji} ${h.name}`,
      Schedule: h.days.length === 7 ? 'Every day' : h.days.map((d) => WEEKDAYS[d]).join(', '),
      'Reminder time': h.time || '',
      'Created on': h.createdAt,
      'Current streak': currentStreak(h, completions),
      'Best streak': bestStreak(h, completions),
      'Completion % (last 30 days)': habitRate(h, completions, 30),
    })),
    'No habits yet'
  )

  // 2. Daily log: one row per day, one column per habit (✓ done, ✗ missed, blank = not scheduled)
  const dailyRows = []
  if (habits.length > 0) {
    const start = parseKey(habits.map((h) => h.createdAt).sort()[0])
    const end = new Date()
    for (let d = new Date(start); dateKey(d) <= today && d <= end; d = addDays(d, 1)) {
      const key = dateKey(d)
      const row = { Date: key, Weekday: WEEKDAYS[d.getDay()] }
      let done = 0
      let scheduled = 0
      for (const h of habits) {
        if (key < h.createdAt || !isScheduled(h, d)) {
          row[h.name] = ''
        } else {
          scheduled++
          const ok = isDone(h, completions, key)
          if (ok) done++
          row[h.name] = ok ? '✓' : '✗'
        }
      }
      row['Done'] = done
      row['Scheduled'] = scheduled
      dailyRows.push(row)
    }
  }
  addSheet(XLSX, wb, 'Daily log', dailyRows, 'No activity yet')

  // 3. Miss reasons
  const missRows = []
  for (const h of habits) {
    for (const [key, reason] of Object.entries(missNotes[h.id] || {})) {
      if (reason.trim()) missRows.push({ Date: key, Habit: `${h.emoji} ${h.name}`, Reason: reason })
    }
  }
  missRows.sort((a, b) => b.Date.localeCompare(a.Date))
  addSheet(XLSX, wb, 'Miss reasons', missRows, 'No miss reasons recorded')

  // 4. Daily notes + mood
  const noteDates = new Set([...Object.keys(notes), ...Object.keys(moods)])
  const noteRows = [...noteDates]
    .filter((key) => (notes[key] || '').trim() || moods[key])
    .sort((a, b) => b.localeCompare(a))
    .map((key) => ({ Date: key, Mood: moods[key] ? MOOD_LABEL[moods[key]] : '', Note: notes[key] || '' }))
  addSheet(XLSX, wb, 'Journal', noteRows, 'No journal entries yet')

  // 5. Goal cascade
  const byId = Object.fromEntries(goals.map((g) => [g.id, g]))
  const goalRows = [...goals]
    .sort((a, b) =>
      LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] || a.period.localeCompare(b.period)
    )
    .map((g) => ({
      Level: LEVEL_LABEL[g.level],
      Period: periodLabel(g.level, g.period),
      Goal: g.title,
      Type: g.type,
      Progress: `${goalPercent(g, ctx)}%`,
      Detail:
        g.type === 'numeric'
          ? `${g.current || 0} / ${g.target} ${g.unit || ''}`.trim()
          : g.type === 'habit'
            ? `${numericCurrent(g, ctx)} / ${g.habitTarget} completions`
            : g.done
              ? 'done'
              : '',
      'Ladders up to': g.parentId ? byId[g.parentId]?.title || '' : '',
      Override: g.manualPct != null ? `${g.manualPct}%` : '',
    }))
  addSheet(XLSX, wb, 'Goals', goalRows, 'No goals yet')

  // 6. Tasks
  const taskRows = []
  for (const [key, arr] of Object.entries(tasks)) {
    for (const t of arr) {
      taskRows.push({
        Date: key,
        Task: t.title,
        Priority: t.priority || 'medium',
        Done: t.done ? '✓' : '',
        Time: t.time || '',
        Duration: t.duration ? `${t.duration} hr${t.duration > 1 ? 's' : ''}` : '',
        Goal: t.goalId ? byId[t.goalId]?.title || '' : '',
      })
    }
  }
  taskRows.sort((a, b) => b.Date.localeCompare(a.Date))
  addSheet(XLSX, wb, 'Tasks', taskRows, 'No tasks yet')

  // 7. Vision
  const visionRows = Object.entries(visions)
    .filter(([, v]) => v.trim())
    .map(([year, v]) => ({ Year: year, Vision: v }))
  addSheet(XLSX, wb, 'Vision', visionRows, 'No vision set')

  // 8. Reviews
  const reviewRows = Object.entries(reviews)
    .filter(([, r]) => r && (r.done || r.note))
    .map(([key, r]) => ({
      Period: key,
      Completed: r.done ? '✓' : '',
      Reflection: r.note || '',
      'Miss reasons': Object.values(r.goalNotes || {}).filter(Boolean).join(' | '),
    }))
  addSheet(XLSX, wb, 'Reviews', reviewRows, 'No reviews yet')

  // 9. Focus sessions
  const focusRows = focusLog.map((f) => ({
    Date: f.date,
    Label: f.label || '',
    Minutes: f.minutes || 0,
    Goal: f.goalId ? byId[f.goalId]?.title || '' : '',
  }))
  addSheet(XLSX, wb, 'Focus sessions', focusRows, 'No focus sessions recorded')

  XLSX.writeFile(wb, `habittube-export-${today}.xlsx`)
}
