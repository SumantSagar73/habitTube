import { useCallback, useEffect, useState } from 'react'
import { isIconKey, KEY_TO_EMOJI } from './iconKeys'
import { stampChanges } from './mergeState'

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
  aiModel: 'openai/gpt-oss-120b',
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
  skips: {}, // { habitId: ['YYYY-MM-DD', ...] } — habits consciously skipped that day
  focusAllowlist: [], // domains allowed during a focus session (Focus blocker extension)
  focusBlocklist: ['youtube.com'], // off-limits domains — hard-blocked, no temp-allow escape
  resources: [], // study resources attached to goals/arcs, see resources.js
  _ts: {}, // per-entry edit times, used to merge devices (see mergeState.js)
  _del: {}, // per-entry delete times (tombstones)
  shareProfile: false, // when true, push public snapshot for sharing
  arcs: [], // time-boxed arcs, see arcs.js
  dayCheckins: {}, // { 'YYYY-MM-DD': { match, blockers, win, at } } evening check-ins
  arcNotify: true, // nudge when an arc goes quiet or is about to end
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_DATA
    const saved = JSON.parse(raw)
    // Habits saved while the web app stored icon keys ('run') get their emoji back, so the mobile app can show them.
    if (Array.isArray(saved.habits) && saved.habits.some((h) => isIconKey(h?.emoji))) {
      saved.habits = saved.habits.map((h) => (isIconKey(h?.emoji) ? { ...h, emoji: KEY_TO_EMOJI[h.emoji] } : h))
    }
    return { ...DEFAULT_DATA, ...saved }
  } catch {
    return DEFAULT_DATA
  }
}

export default function useStore() {
  const [data, setRaw] = useState(load)
  // Every user edit goes through here so changed entries get a timestamp. Merges from the
  // cloud use setRaw instead (they must keep the stamps they came with).
  const setData = useCallback((update) => setRaw((prev) => stampChanges(prev, typeof update === 'function' ? update(prev) : update)), [])

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

  return [data, setData, setRaw]
}
