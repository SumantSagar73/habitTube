import { goalPercent } from './planUtils'
import { bestStreak, dayRate } from './utils'

const LEVEL_SIZE = 250 // xp per level

// Roll up everything into headline numbers used by badges + the level bar.
export function computeStats(data) {
  const { habits = [], completions = {}, goals = [], tasks = {}, moods = {}, reviews = {}, focusLog = [] } = data

  let totalCheckins = 0
  const activeDays = new Set()
  for (const [key, ids] of Object.entries(completions)) {
    totalCheckins += ids.length
    if (ids.length) activeDays.add(key)
  }
  for (const key in tasks) if ((tasks[key] || []).some((t) => t.done)) activeDays.add(key)

  let perfectDays = 0
  for (const key of Object.keys(completions)) {
    const [y, m, d] = key.split('-').map(Number)
    const rate = dayRate(habits, completions, new Date(y, m - 1, d))
    if (rate === 1) perfectDays++
  }

  const bestStreakAll = habits.reduce((mx, h) => Math.max(mx, bestStreak(h, completions)), 0)
  const ctx = { goals, tasks, habits, completions }
  const goalsCompleted = goals.filter((g) => goalPercent(g, ctx) >= 100).length
  const moodsLogged = Object.values(moods).filter(Boolean).length
  const reviewsDone = Object.values(reviews).filter((r) => r?.done).length
  const focusSessions = focusLog.length
  const focusMinutes = focusLog.reduce((s, f) => s + (f.minutes || 0), 0)

  const xp =
    totalCheckins * 10 +
    goalsCompleted * 150 +
    perfectDays * 20 +
    reviewsDone * 40 +
    focusSessions * 15 +
    moodsLogged * 5
  const level = Math.floor(xp / LEVEL_SIZE) + 1
  const xpIntoLevel = xp % LEVEL_SIZE

  return {
    totalCheckins,
    activeDays: activeDays.size,
    perfectDays,
    bestStreakAll,
    goalsCompleted,
    moodsLogged,
    reviewsDone,
    focusSessions,
    focusMinutes,
    habitCount: habits.length,
    goalCount: goals.length,
    xp,
    level,
    xpIntoLevel,
    xpToNext: LEVEL_SIZE - xpIntoLevel,
    levelProgress: Math.round((xpIntoLevel / LEVEL_SIZE) * 100),
  }
}

// Each badge: earned flag + progress toward it when locked.
export function computeBadges(stats) {
  const def = (id, icon, name, desc, cur, target) => ({
    id,
    icon,
    name,
    desc,
    earned: cur >= target,
    cur: Math.min(cur, target),
    target,
  })
  return [
    def('first-habit', 'sprout', 'First step', 'Create your first habit', stats.habitCount, 1),
    def('first-goal', 'target', 'Visionary', 'Set your first goal', stats.goalCount, 1),
    def('checkin-10', 'check', 'Getting going', 'Check off 10 habits', stats.totalCheckins, 10),
    def('checkin-100', 'award', 'Centurion', 'Check off 100 habits', stats.totalCheckins, 100),
    def('checkin-500', 'rocket', 'Unstoppable', 'Check off 500 habits', stats.totalCheckins, 500),
    def('streak-7', 'flame', 'On fire', 'Reach a 7-day streak', stats.bestStreakAll, 7),
    def('streak-30', 'medal', 'Locked in', 'Reach a 30-day streak', stats.bestStreakAll, 30),
    def('streak-100', 'crown', 'Centenarian', 'Reach a 100-day streak', stats.bestStreakAll, 100),
    def('perfect-day', 'star', 'Perfect day', 'Finish a 100% day', stats.perfectDays, 1),
    def('perfect-10', 'sparkles', 'Ten out of ten', 'Finish ten 100% days', stats.perfectDays, 10),
    def('goal-done', 'trophy', 'Goal crusher', 'Complete a goal', stats.goalsCompleted, 1),
    def('active-30', 'calendar', 'Consistent', 'Be active 30 days', stats.activeDays, 30),
    def('mood-7', 'meditate', 'Mindful', 'Log your mood 7 times', stats.moodsLogged, 7),
    def('review-1', 'pen', 'Reflective', 'Complete a review', stats.reviewsDone, 1),
    def('focus-5', 'timer', 'Deep worker', 'Finish 5 focus sessions', stats.focusSessions, 5),
  ]
}
