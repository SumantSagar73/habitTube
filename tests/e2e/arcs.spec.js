import { expect, test } from '@playwright/test'
import { mockBackend } from './helpers.js'

// Arc lifecycle beyond creation: weekly check-in, end-of-arc review and the quiet-arc gate.
// Arcs are seeded with dates in the past, so no real data or dev tooling is needed.

const day = (n) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  const p = (x) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const HABIT = { id: 'h1', name: 'Morning run', emoji: 'run', days: [0, 1, 2, 3, 4, 5, 6], createdAt: day(60), time: '' }

// startAgo: days since the arc started; weeks: 4 week arc by default
function arc(overrides = {}) {
  const startAgo = overrides.startAgo ?? 8
  return {
    id: 'a1',
    title: 'Test Sprint',
    why: 'Build a strong base',
    status: 'active',
    startDate: day(startAgo),
    endDate: day(startAgo - 27),
    weeks: [
      { theme: 'Foundation', milestone: 'Run 1 km, 5 pushups' },
      { theme: 'Build', milestone: 'Run 2 km, 8 pushups' },
      { theme: 'Peak', milestone: 'Run 3 km, 12 pushups' },
      { theme: 'Test', milestone: 'Run 5 km, 20 pushups' },
    ],
    minDay: '10-minute walk',
    goalId: 'g1',
    habitIds: ['h1'],
    generatedWeek: 0,
    checkins: [],
    meta: { dailyTime: '1 hour', level: 'Some experience', outcome: 'Run 5 km' },
    ...overrides,
  }
}

const GOAL = { id: 'g1', level: 'month', period: '2026-10', parentId: null, title: 'Run 5 km', color: '#737373', type: 'checklist', target: 0, current: 0, unit: '', done: false, manualPct: null, createdAt: day(8) }

test('weekly check-in plans the next week from last week’s result', async ({ page }) => {
  await mockBackend(page, {
    seed: {
      habits: [HABIT],
      goals: [GOAL],
      completions: { [day(7)]: ['h1'], [day(6)]: ['h1'], [day(4)]: ['h1'] },
      arcs: [arc({ startAgo: 8 })], // day 9 -> week 2 is due
    },
  })
  await page.goto('/')

  // the prompt is on Today, in the alerts under Up next
  await expect(page.getByText('Week 2 is ready to plan')).toBeVisible()
  await page.getByRole('button', { name: 'Plan week 2' }).first().click()

  const modal = page.getByRole('dialog', { name: 'Week check-in' })
  await expect(modal.getByText('Week 2 check-in')).toBeVisible()
  await expect(modal.getByText(/Habits \d+%/)).toBeVisible() // last week's real stats are shown

  // can't plan without saying how it felt
  await expect(modal.getByRole('button', { name: 'Plan week 2' })).toBeDisabled()
  await modal.getByRole('button', { name: 'Just right' }).click()
  await modal.getByRole('button', { name: 'No time' }).click()
  await modal.getByRole('button', { name: 'Plan week 2' }).click()

  await expect(modal.getByText('Good base — nudging the volume up a little.')).toBeVisible()
  await expect(modal.getByText('Run 1.5 km steady')).toBeVisible()
  await modal.getByRole('button', { name: 'Start week 2' }).click()

  // prompt is gone and the arc remembers the check-in
  await expect(page.getByText('Week 2 is ready to plan')).toHaveCount(0)
  const saved = await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('habittube-data-v1'))
    const tasks = Object.values(d.tasks || {}).flat()
    return { generatedWeek: d.arcs[0].generatedWeek, checkins: d.arcs[0].checkins, tasks: tasks.map((t) => t.title) }
  })
  expect(saved.generatedWeek).toBe(1)
  expect(saved.checkins).toHaveLength(1)
  expect(saved.checkins[0]).toMatchObject({ week: 1, rating: 'just right', blockers: ['No time'] })
  expect(saved.tasks).toEqual(expect.arrayContaining(['Run 1.5 km steady', 'Pushups 4x6']))
})

test('a finished arc gets a review, closes, and rolls into the next one', async ({ page }) => {
  await mockBackend(page, {
    seed: { habits: [HABIT], goals: [GOAL], arcs: [arc({ startAgo: 30, generatedWeek: 3 })] }, // ended 2 days ago
  })
  await page.goto('/')

  await expect(page.getByText('This arc has finished')).toBeVisible()
  await page.getByRole('button', { name: 'Review arc' }).first().click()

  const modal = page.getByRole('dialog', { name: 'Arc review' })
  await expect(modal.getByText('Habits done')).toBeVisible()
  await modal.getByRole('button', { name: 'Write my review' }).click()
  await expect(modal.getByText('You showed up most weeks and the numbers moved.')).toBeVisible()
  await expect(modal.getByText('Kept the morning run going')).toBeVisible()
  await expect(modal.getByText(/Strength base/)).toBeVisible()

  await modal.getByRole('button', { name: /Close & plan next arc/ }).click()

  // arc is closed with its review saved, and the wizard opens with the suggested theme
  await expect(page.getByRole('heading', { name: 'Start an arc' })).toBeVisible()
  await expect(page.getByPlaceholder(/Name it/)).toHaveValue('Strength base')
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('habittube-data-v1')).arcs[0])
  expect(saved.status).toBe('closed')
  expect(saved.review.summary).toContain('showed up')
})

test('a quiet arc must be resolved before starting another', async ({ page }) => {
  await mockBackend(page, {
    // started 12 days ago, nothing done since -> quiet for 12 days
    seed: { habits: [HABIT], goals: [GOAL], arcs: [arc({ startAgo: 12, generatedWeek: 1 })] },
  })
  await page.goto('/')
  await expect(page.getByText(/Quiet for \d+ days/)).toBeVisible()

  // starting a new arc is gated
  await page.getByRole('button', { name: 'New' }).click()
  await page.getByRole('button', { name: /Arc/ }).click()
  await expect(page.getByText('Before starting a new arc, deal with the one that has gone quiet')).toBeVisible()
  await expect(page.getByPlaceholder(/Name it/)).toHaveCount(0)

  // pausing it clears the gate and shows the intake form
  const dialog = page.getByRole('dialog', { name: 'Start an arc' })
  await dialog.getByRole('button', { name: 'Pause' }).click()
  await expect(page.getByPlaceholder(/Name it/)).toBeVisible()
  const status = await page.evaluate(() => JSON.parse(localStorage.getItem('habittube-data-v1')).arcs[0].status)
  expect(status).toBe('paused')
})
