import { GOAL_COLORS } from './palette'
import { currentPeriods } from './planUtils'
import { todayKey, uid } from './utils'

// Ready-made cascades so a new user can see a fully connected Year→Week thread
// in one click instead of building four levels by hand.
export const TEMPLATES = [
  {
    key: 'fit',
    emoji: '🏃',
    name: 'Get fit',
    blurb: 'Run a 10K by the end of the quarter.',
    levels: {
      year: { title: 'Get fit & run a 10K', type: 'checklist' },
      quarter: { title: 'Run a 10K race', type: 'checklist' },
      month: { title: 'Run 50 km this month', type: 'numeric', target: 50, unit: 'km' },
      week: { title: 'Run 12 km this week', type: 'numeric', target: 12, unit: 'km' },
    },
  },
  {
    key: 'learn',
    emoji: '📚',
    name: 'Learn a skill',
    blurb: 'Study consistently toward fluency.',
    levels: {
      year: { title: 'Become conversational in Spanish', type: 'checklist' },
      quarter: { title: 'Hold a 5-minute conversation', type: 'checklist' },
      month: { title: 'Study 20 hours this month', type: 'numeric', target: 20, unit: 'hrs' },
      week: { title: 'Study 5 hours this week', type: 'numeric', target: 5, unit: 'hrs' },
    },
  },
  {
    key: 'save',
    emoji: '💰',
    name: 'Save money',
    blurb: 'Build a $6,000 cushion this year.',
    levels: {
      year: { title: 'Save $6,000', type: 'numeric', target: 6000, unit: '$' },
      quarter: { title: 'Save $1,500', type: 'numeric', target: 1500, unit: '$' },
      month: { title: 'Save $500', type: 'numeric', target: 500, unit: '$' },
      week: { title: 'Save $125', type: 'numeric', target: 125, unit: '$' },
    },
  },
  {
    key: 'write',
    emoji: '✍️',
    name: 'Write a book',
    blurb: 'First draft done by end of year — 500 words a day.',
    levels: {
      year: { title: 'Complete first draft of my book', type: 'checklist' },
      quarter: { title: 'Finish act one (25,000 words)', type: 'numeric', target: 25000, unit: 'words' },
      month: { title: 'Write 8,000 words', type: 'numeric', target: 8000, unit: 'words' },
      week: { title: 'Write 2,000 words', type: 'numeric', target: 2000, unit: 'words' },
    },
  },
  {
    key: 'code',
    emoji: '💻',
    name: '100 Days of Code',
    blurb: 'Code every day and ship a real project.',
    levels: {
      year: { title: 'Ship a full-stack side project', type: 'checklist' },
      quarter: { title: 'Complete 100 days of coding', type: 'numeric', target: 100, unit: 'days' },
      month: { title: 'Code 30 hours', type: 'numeric', target: 30, unit: 'hrs' },
      week: { title: 'Code 7 hours', type: 'numeric', target: 7, unit: 'hrs' },
    },
  },
  {
    key: 'sleep',
    emoji: '😴',
    name: 'Sleep better',
    blurb: 'Hit 8 hours consistently and wake up rested.',
    levels: {
      year: { title: 'Average 8h sleep every night', type: 'checklist' },
      quarter: { title: '80% of nights with 8+ hours sleep', type: 'numeric', target: 72, unit: 'nights' },
      month: { title: '24 nights with 8h+ sleep', type: 'numeric', target: 24, unit: 'nights' },
      week: { title: '6 nights with 8h+ sleep', type: 'numeric', target: 6, unit: 'nights' },
    },
  },
  {
    key: 'meditate',
    emoji: '🧘',
    name: 'Daily meditation',
    blurb: 'Build a consistent mindfulness practice.',
    levels: {
      year: { title: 'Meditate 300+ days this year', type: 'numeric', target: 300, unit: 'days' },
      quarter: { title: 'Meditate 75 days', type: 'numeric', target: 75, unit: 'days' },
      month: { title: 'Meditate 25 days', type: 'numeric', target: 25, unit: 'days' },
      week: { title: 'Meditate 6 days', type: 'numeric', target: 6, unit: 'days' },
    },
  },
]

const ORDER = ['year', 'quarter', 'month', 'week']

export function buildTemplate(tpl, colorIndex) {
  const p = currentPeriods()
  const color = GOAL_COLORS[colorIndex % GOAL_COLORS.length]
  const created = todayKey()
  const goals = []
  let parentId = null
  for (const lvl of ORDER) {
    const spec = tpl.levels[lvl]
    if (!spec) continue
    const g = {
      id: uid(),
      level: lvl,
      period: p[lvl],
      parentId,
      title: spec.title,
      color,
      type: spec.type,
      target: spec.target || 0,
      current: 0,
      unit: spec.unit || '',
      habitId: null,
      habitTarget: 0,
      manualPct: null,
      done: false,
      createdAt: created,
    }
    goals.push(g)
    parentId = g.id
  }
  return goals
}
