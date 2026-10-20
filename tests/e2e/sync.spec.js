import { expect, test } from '@playwright/test'
import { mockBackend } from './helpers.js'

const today = () => {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const HABITS = [
  { id: 'h1', name: 'Run', emoji: 'run', days: [0, 1, 2, 3, 4, 5, 6], createdAt: '2020-01-01', time: '' },
  { id: 'h2', name: 'Read', emoji: 'book', days: [0, 1, 2, 3, 4, 5, 6], createdAt: '2020-01-01', time: '' },
]

test('sync merges the cloud copy into local edits instead of overwriting them', async ({ page }) => {
  // this device ticked "Run"; the cloud copy (from another device) has "Read" ticked, same day
  const cloud = await mockBackend(page, {
    seed: { habits: HABITS, completions: { [today()]: ['h1'] } },
    remote: {
      updatedAt: Date.now() + 5000,
      state: { onboardingDone: true, habits: HABITS, completions: { [today()]: ['h2'] }, tasks: { [today()]: [{ id: 'tc', title: 'From the other device', done: false, priority: 'medium' }] } },
    },
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Tester/ })).toBeVisible()

  // both ticks and the other device's task end up on this device...
  await expect.poll(async () => page.evaluate((day) => {
    const d = JSON.parse(localStorage.getItem('habittube-data-v1'))
    return JSON.stringify({ done: [...((d.completions || {})[day] || [])].sort(), tasks: ((d.tasks || {})[day] || []).map((t) => t.title) })
  }, today())).toBe(JSON.stringify({ done: ['h1', 'h2'], tasks: ['From the other device'] }))

  // ...and the merged result is what gets pushed back to the cloud
  await expect.poll(() => cloud.pushes.length).toBeGreaterThan(0)
  const pushed = cloud.pushes.at(-1).state
  expect([...pushed.completions[today()]].sort()).toEqual(['h1', 'h2'])
  expect(pushed.tasks[today()].map((t) => t.title)).toEqual(['From the other device'])
})

test('a tick made in the app is stamped so a later merge can tell it from older data', async ({ page }) => {
  await mockBackend(page, { seed: { habits: [{ ...HABITS[0], time: '00:00' }], completions: { [(() => { const d = new Date(); d.setDate(d.getDate() - 1); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` })()]: ['h1'] } } })
  await page.goto('/')
  const upNext = page.locator('section', { hasText: 'Up next' }).first()
  await upNext.getByRole('button', { name: 'Mark done' }).click()
  const stamp = await page.evaluate((day) => JSON.parse(localStorage.getItem('habittube-data-v1'))._ts?.[`c|${day}|h1`] ?? 0, today())
  expect(stamp).toBeGreaterThan(Date.now() - 60_000)
})
