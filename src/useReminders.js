import { useEffect, useRef } from 'react'
import { habitsForDate, isDone, todayKey } from './utils'

const pad = (n) => String(n).padStart(2, '0')
const FIRED_KEY = 'habittube-reminders-fired'

// Persist which reminders already fired today so a reload doesn't re-notify.
function loadFired() {
  try {
    const raw = JSON.parse(localStorage.getItem(FIRED_KEY) || '{}')
    return raw.date === todayKey() ? raw.keys || {} : {}
  } catch {
    return {}
  }
}
function saveFired(keys) {
  localStorage.setItem(FIRED_KEY, JSON.stringify({ date: todayKey(), keys }))
}

// Daily check-in nudges (fire once each, when their time has passed and the app
// is open). Plan in the morning, "have you done it?" through the day, review at
// night. The midday/afternoon ones only fire if something is still pending.
function checkInSlots(now, habits, completions, tasks) {
  const key = todayKey()
  const due = habitsForDate(habits, now)
  const habitsLeft = due.filter((h) => !isDone(h, completions, key)).length
  const todays = tasks[key] || []
  const tasksLeft = todays.filter((t) => !t.done).length
  const pending = habitsLeft + tasksLeft
  const noun = pending === 1 ? 'thing' : 'things'

  return [
    { id: 'morning', time: '09:00', title: '🌅 Plan your day', body: 'Add today’s tasks and pick what matters most.' },
    pending > 0 && { id: 'midday', time: '13:00', title: '👋 Midday check-in', body: `${pending} ${noun} still to do — have you done any yet?` },
    pending > 0 && { id: 'afternoon', time: '17:00', title: '⏳ Still on your list', body: `${pending} ${noun} left today. Knock one out?` },
    { id: 'night', time: '21:00', title: '🌙 How did today go?', body: 'Tick off what you did and write a quick note.' },
  ].filter(Boolean)
}

export default function useReminders(data) {
  const fired = useRef(loadFired())

  useEffect(() => {
    if (!data.remindersEnabled || typeof Notification === 'undefined') return

    function notify(title, body, tag) {
      try {
        const n = new Notification(title, { body, tag })
        n.onclick = () => {
          try {
            window.focus()
          } catch {
            // ignore
          }
        }
      } catch {
        // some browsers require a service worker for the Notification constructor
      }
    }

    const check = () => {
      if (Notification.permission !== 'granted') return
      const now = new Date()
      const hm = `${pad(now.getHours())}:${pad(now.getMinutes())}`
      const key = todayKey()

      // per-habit reminders at their own time
      for (const h of habitsForDate(data.habits, now)) {
        if (!h.time || h.time > hm) continue
        if (isDone(h, data.completions, key)) continue
        const fk = `${key}-${h.id}-${h.time}`
        if (fired.current[fk]) continue
        fired.current[fk] = true
        saveFired(fired.current)
        notify(`${h.emoji} ${h.name}`, 'Time for your habit — keep the streak alive.', fk)
      }

      // daily plan / check-in / night nudges
      for (const slot of checkInSlots(now, data.habits, data.completions, data.tasks)) {
        if (slot.time > hm) continue
        const fk = `${key}-slot-${slot.id}`
        if (fired.current[fk]) continue
        fired.current[fk] = true
        saveFired(fired.current)
        notify(slot.title, slot.body, fk)
      }
    }

    check()
    const id = setInterval(check, 30000)
    return () => clearInterval(id)
  }, [data.remindersEnabled, data.habits, data.completions, data.tasks])
}
