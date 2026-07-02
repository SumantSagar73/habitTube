import { useEffect, useState } from 'react'

const STORAGE_KEY = 'habittube-data-v1'

const DEFAULT_DATA = {
  habits: [],
  completions: {}, // { 'YYYY-MM-DD': [habitId, ...] }
  notes: {}, // { 'YYYY-MM-DD': 'text' }
  missNotes: {}, // { habitId: { 'YYYY-MM-DD': 'why I skipped' } }
  goals: [], // cascade nodes: { id, level, period, parentId, title, color, type, ... }
  tasks: {}, // { 'YYYY-MM-DD': [ { id, title, done, goalId } ] }
  recurringTasks: [], // [{ id, title, repeat: 'daily'|'weekly'|'weekdays', goalId, priority }]
  visions: {}, // { '2026': 'my north-star vision for the year' }
  reviews: {}, // { periodKey: { done, note, goalNotes: { goalId: 'why short' }, ratedAt } }
  aiEnabled: true,
  aiModel: 'llama-3.3-70b-versatile',
  ai: { motivation: null, insights: null }, // cached generations
  chat: { messages: [] }, // coach conversation history (legacy widget)
  chatSessions: [], // [{ id, title, createdAt, updatedAt, messages: [] }]
  activeChatId: null,
  moods: {}, // { 'YYYY-MM-DD': 1-5 }
  focusLog: [], // [{ date, minutes, goalId, label }]
  remindersEnabled: false,
  soundEnabled: true,
  theme: 'dark', // 'light' | 'dark' | 'auto'
  onboardingDone: false,
  notifications: [], // [{ id, type, title, body, createdAt, read }]
  streakFreezes: {}, // { habitId: ['YYYY-MM-DD', ...] }
  shareProfile: false, // when true, push public snapshot for sharing
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_DATA
    return { ...DEFAULT_DATA, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_DATA
  }
}

export default function useStore() {
  const [data, setData] = useState(load)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data])

  useEffect(() => {
    if (data.theme === 'auto') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const apply = () => document.documentElement.classList.toggle('dark', mq.matches)
      apply()
      mq.addEventListener('change', apply)
      return () => mq.removeEventListener('change', apply)
    } else {
      document.documentElement.classList.toggle('dark', data.theme === 'dark')
    }
  }, [data.theme])

  return [data, setData]
}
