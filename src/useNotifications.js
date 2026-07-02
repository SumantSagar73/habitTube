import { useEffect } from 'react'
import { playNotification } from './sounds'
import { habitsForDate, isDone, todayKey, dateKey } from './utils'
import { goalPercent, currentPeriods } from './planUtils'

// Push a notification into data.notifications (dedup by id).
// Returns true if it was actually new (so caller can play sound).
function push(setData, note, soundEnabled) {
  let isNew = false
  setData((d) => {
    if (d.notifications.some((n) => n.id === note.id)) return d
    isNew = true
    const next = [note, ...d.notifications].slice(0, 50)
    return { ...d, notifications: next }
  })
  if (isNew && soundEnabled) {
    playNotification()
  }
}

export default function useNotifications(data, setData) {
  useEffect(() => {
    const now = new Date()
    const key = todayKey()
    const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const sound = data.soundEnabled

    // --- streak at-risk: habit with streak > 0 not done by 20:00 ---
    if (hm >= '20:00') {
      for (const h of habitsForDate(data.habits, now)) {
        if (isDone(h, data.completions, key)) continue
        const streak = (() => {
          let s = 0
          const d2 = new Date(now)
          d2.setDate(d2.getDate() - 1)
          while (s < 365) {
            const k = dateKey(d2)
            if (!isDone(h, data.completions, k)) break
            s++
            d2.setDate(d2.getDate() - 1)
          }
          return s
        })()
        if (streak < 1) continue
        push(setData, {
          id: `streak-risk-${key}-${h.id}`,
          type: 'streak',
          title: `${h.emoji || '🔥'} Streak at risk — ${h.name}`,
          body: `You have a ${streak}-day streak. Complete it before midnight!`,
          createdAt: Date.now(),
          read: false,
        }, sound)
      }
    }

    // --- goal deadline: ends within 7 days, < 50% done ---
    const periods = currentPeriods()
    const deadlines = {
      [periods.week]: (() => { const d2 = new Date(now); const day = d2.getDay(); d2.setDate(d2.getDate() + (7 - day)); return dateKey(d2) })(),
      [periods.month]: (() => { const d2 = new Date(now.getFullYear(), now.getMonth() + 1, 0); return dateKey(d2) })(),
    }
    for (const goal of (data.goals || [])) {
      const deadline = deadlines[goal.period]
      if (!deadline) continue
      const daysLeft = Math.ceil((new Date(deadline) - now) / 86400000)
      if (daysLeft > 7 || daysLeft < 0) continue
      const pct = goalPercent(goal, data)
      if (pct >= 50) continue
      push(setData, {
        id: `goal-deadline-${goal.period}-${goal.id}`,
        type: 'goal',
        title: `⚑ Goal deadline in ${daysLeft}d — ${goal.title}`,
        body: `Only ${Math.round(pct)}% complete. Push to finish this ${goal.period.includes('W') ? 'week' : 'month'}.`,
        createdAt: Date.now(),
        read: false,
      }, sound)
    }

    // --- pending tasks reminder at midday ---
    if (hm >= '12:00' && hm < '12:30') {
      const todays = data.tasks[key] || []
      const left = todays.filter((t) => !t.done).length
      if (left > 0) {
        push(setData, {
          id: `tasks-midday-${key}`,
          type: 'task',
          title: `📋 ${left} task${left > 1 ? 's' : ''} left today`,
          body: 'Midday check — keep the momentum going.',
          createdAt: Date.now(),
          read: false,
        }, sound)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.habits, data.completions, data.goals, data.tasks])
}
