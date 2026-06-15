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
