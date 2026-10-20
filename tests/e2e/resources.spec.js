import { expect, test } from '@playwright/test'
import { mockBackend } from './helpers.js'

const dayKey = (offset = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const OUTLINE = `Section 1: Basics
1. Welcome to the course
03:21
2. Setting up
05:10
Section 2: Going further
3. Hooks in depth
12:00`

const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('habittube-data-v1')))
const goPlan = (page) => page.getByRole('navigation').first().getByRole('button', { name: 'Plan', exact: true }).click()

const part = (title, extra = {}) => ({ id: `p-${title}`, title, section: '', minutes: null, done: false, doneAt: null, revise: false, reviseStage: 0, reviseDue: null, ...extra })
const resource = (extra = {}) => ({
  id: 'r1', type: 'udemy', title: 'React course', url: '', arcId: null, goalId: null, notes: '', started: false,
  createdAt: dayKey(-5), updatedAt: 1, parts: [part('Intro'), part('JSX'), part('Hooks')], ...extra,
})

test('paste an outline, see it parsed, add it, tick parts', async ({ page }) => {
  await mockBackend(page)
  await page.goto('/')
  await goPlan(page)
  await expect(page.getByText(/Study something\?/)).toBeVisible() // empty state

  await page.getByRole('button', { name: 'Add resource' }).click()
  const modal = page.getByRole('dialog', { name: 'Add resource' })
  await modal.getByRole('button', { name: 'Udemy' }).click()
  await modal.getByPlaceholder(/The Complete React Course/).fill('React course')
  await modal.locator('textarea').fill(OUTLINE)
  await expect(modal.getByText(/3 parts in 2 sections/)).toBeVisible()
  await expect(modal.getByText('Section 1: Basics › Welcome to the course')).toBeVisible()
  await modal.getByRole('button', { name: 'Add resource' }).click()

  const row = page.getByRole('button', { name: 'Show React course' })
  await expect(row).toBeVisible()
  await expect(page.getByText('0/3')).toBeVisible()
  await row.click()
  await expect(page.getByText('Section 1: Basics')).toBeVisible()
  await expect(page.getByText('Section 2: Going further')).toBeVisible()

  await page.getByRole('button', { name: 'Mark done: Welcome to the course' }).click()
  await expect(page.getByText('1/3')).toBeVisible()
  const data = await stored(page)
  expect(data.resources[0].parts.map((p) => p.done)).toEqual([true, false, false])
  expect(data.resources[0].parts[0].doneAt).toBe(dayKey())
  expect(data.resources[0].started).toBe(true)

  // a whole section at once
  await page.getByRole('button', { name: 'Mark all done' }).first().click()
  await expect(page.getByText('2/3')).toBeVisible()
})

test('notes are saved per resource', async ({ page }) => {
  await mockBackend(page, { seed: { resources: [resource()] } })
  await page.goto('/')
  await goPlan(page)
  await page.getByRole('button', { name: 'Show React course' }).click()
  await page.getByLabel('Notes').fill('Closures are the key idea in hooks.')
  await expect.poll(async () => (await stored(page)).resources[0].notes).toBe('Closures are the key idea in hooks.')
})

test('Today continues where you left off and ticks the part', async ({ page }) => {
  await mockBackend(page, { seed: { resources: [resource({ started: true, parts: [part('Intro', { done: true, doneAt: dayKey(-1) }), part('JSX'), part('Hooks')] })] } })
  await page.goto('/')
  const upNext = page.locator('section', { hasText: 'Up next' }).first()
  await expect(upNext).toContainText('JSX')
  await expect(upNext).toContainText('Continue: React course · 1/3')
  await upNext.getByRole('button', { name: 'Mark done' }).click()
  await expect(upNext).toContainText('Hooks')
  await expect(upNext).toContainText('2/3')
  expect((await stored(page)).resources[0].parts.map((p) => p.done)).toEqual([true, true, false])
})

test('a resource on a running arc is offered even before you start it; paused arcs are not', async ({ page }) => {
  const arc = (id, status) => ({ id, title: `Arc ${id}`, status, startDate: dayKey(-2), endDate: dayKey(25), weeks: [{ theme: 'W1', milestone: 'm' }], goalId: 'g', habitIds: [], generatedWeek: 0, checkins: [], meta: {} })
  await mockBackend(page, {
    seed: { arcs: [arc('a1', 'active'), arc('a2', 'paused')], resources: [resource({ arcId: 'a1' }), resource({ id: 'r2', title: 'Paused thing', arcId: 'a2' })] },
  })
  await page.goto('/')
  const upNext = page.locator('section', { hasText: 'Up next' }).first()
  await expect(upNext).toContainText('Continue: React course')
  await expect(upNext).not.toContainText('Paused thing')
})

test('revision comes back on schedule: Up next offers it, "Mark revised" moves it to +3 days', async ({ page }) => {
  await mockBackend(page, { seed: { resources: [resource({ started: true, parts: [part('Intro', { done: true, doneAt: dayKey(-3), revise: true, reviseStage: 0, reviseDue: dayKey(-1) }), part('JSX')] })] } })
  await page.goto('/')
  const upNext = page.locator('section', { hasText: 'Up next' }).first()
  await expect(upNext).toContainText('Intro')
  await expect(upNext).toContainText('Revise · React course')
  await upNext.getByRole('button', { name: 'Mark revised' }).click()
  const intro = (await stored(page)).resources[0].parts[0]
  expect(intro).toMatchObject({ revise: true, reviseStage: 1, reviseDue: dayKey(3) })
  await expect(upNext).not.toContainText('Revise ·')
})

test('flag a part for revision from the Plan tab, then it shows its date', async ({ page }) => {
  await mockBackend(page, { seed: { resources: [resource({ parts: [part('Intro', { done: true, doneAt: dayKey() })] })] } })
  await page.goto('/')
  await goPlan(page)
  await page.getByRole('button', { name: 'Show React course' }).click()
  await page.getByRole('button', { name: 'Mark to revise: Intro' }).click()
  await expect(page.getByText(/Revise /).first()).toBeVisible()
  expect((await stored(page)).resources[0].parts[0]).toMatchObject({ revise: true, reviseStage: 0, reviseDue: dayKey(1) })
})

test('a messy paste offers Organize with AI, and the AI result is used', async ({ page }) => {
  await mockBackend(page)
  await page.goto('/')
  await goPlan(page)
  await page.getByRole('button', { name: 'Add resource' }).click()
  const modal = page.getByRole('dialog', { name: 'Add resource' })
  await modal.getByPlaceholder(/The Complete React Course/).fill('Messy notes')
  const paragraph = 'This long paragraph describes the whole course in a lot of detail and keeps going well past what any lecture title would be. '.repeat(3)
  await modal.locator('textarea').fill(`${paragraph}\n${paragraph}\n${paragraph}\n${paragraph}`)
  await expect(modal.getByRole('button', { name: 'Organize with AI' })).toBeVisible()
  await modal.getByRole('button', { name: 'Organize with AI' }).click()
  await expect(modal.getByText(/3 parts in 2 sections/)).toBeVisible()
  await expect(modal.getByText('organized by AI')).toBeVisible()
  await modal.getByRole('button', { name: 'Add resource' }).click()
  expect((await stored(page)).resources[0].parts.map((p) => p.title)).toEqual(['Intro to the topic', 'Setting things up', 'A first real project'])
})

test('unlinked resources are Unsorted and can be linked later; edit appends parts; delete asks first', async ({ page }) => {
  const arc = { id: 'a1', title: 'Fit Sprint', status: 'active', startDate: dayKey(-2), endDate: dayKey(25), weeks: [{ theme: 'W1', milestone: 'm' }], goalId: 'g', habitIds: [], generatedWeek: 0, checkins: [], meta: {} }
  await mockBackend(page, { seed: { arcs: [arc], resources: [resource(), resource({ id: 'r2', title: 'Linked one', arcId: 'a1' })] } })
  await page.goto('/')
  await goPlan(page)

  await expect(page.getByText('Udemy · Unsorted')).toBeVisible()
  await expect(page.getByText('Udemy · Fit Sprint')).toBeVisible()
  await page.getByRole('button', { name: 'Unsorted 1' }).click()
  await expect(page.getByRole('button', { name: 'Show Linked one' })).toHaveCount(0)

  // link the unsorted one to the arc and append parts
  await page.getByRole('button', { name: 'Show React course' }).click()
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  const modal = page.getByRole('dialog', { name: 'Edit resource' })
  await modal.locator('select').selectOption('a:a1')
  await modal.locator('textarea').fill('Testing basics\nTesting hooks')
  await modal.getByRole('button', { name: 'Save changes' }).click()
  const saved = (await stored(page)).resources.find((r) => r.id === 'r1')
  expect(saved.arcId).toBe('a1')
  expect(saved.parts.map((p) => p.title)).toEqual(['Intro', 'JSX', 'Hooks', 'Testing basics', 'Testing hooks'])

  // delete asks for confirmation
  page.once('dialog', (d) => d.dismiss())
  await page.getByRole('button', { name: 'All 2' }).click()
  await page.getByRole('button', { name: 'Show React course' }).click() // the row was filtered out and re-mounted collapsed
  await page.getByRole('button', { name: 'Delete React course' }).click()
  expect((await stored(page)).resources).toHaveLength(2)
  page.once('dialog', (d) => d.accept())
  await page.getByRole('button', { name: 'Delete React course' }).click()
  await expect.poll(async () => (await stored(page)).resources.length).toBe(1)
})
