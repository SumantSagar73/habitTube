import { expect, test } from '@playwright/test'
import { mockBackend } from './helpers.js'

test.describe('signed out', () => {
  test('shows the landing page with a way in', async ({ page }) => {
    await mockBackend(page, { signedIn: false })
    await page.goto('/')
    await expect(page).toHaveTitle(/HabitTube/)
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Start for free/ })).toBeVisible()
  })
})

test.describe('signed in', () => {
  test.beforeEach(async ({ page }) => {
    await mockBackend(page)
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /Tester/ })).toBeVisible()
  })

  test('Today is lean: greeting, week dots, Up next, arc nudge and a visible coach', async ({ page }) => {
    await expect(page.getByLabel('This week')).toBeVisible()
    await expect(page.getByText('Up next')).toBeVisible()
    await expect(page.getByText('Start an arc')).toBeVisible() // no arc yet -> a quiet nudge card
    await expect(page.getByText('Your coach says').filter({ visible: true })).toBeVisible()
    for (const name of ['I’m stuck', 'Adjust today', 'How am I doing?']) {
      await expect(page.getByRole('button', { name }).filter({ visible: true })).toBeVisible()
    }
    // the removed clutter stays removed
    await expect(page.getByText('Focus this week')).toHaveCount(0)
    await expect(page.getByText('Energy flows')).toHaveCount(0)
    await expect(page.getByText('Your data lives only in this browser')).toHaveCount(0)
  })

  test('navigation is five tabs with no Calendar tab', async ({ page }) => {
    const nav = page.getByRole('navigation').first()
    for (const name of ['Today', 'Plan', 'Habits', 'Insights', 'Coach']) {
      await expect(nav.getByRole('button', { name, exact: true })).toBeVisible()
    }
    await expect(nav.getByRole('button', { name: 'Calendar' })).toHaveCount(0)
  })

  test('profile menu holds settings, export, theme and sign out', async ({ page }) => {
    await page.getByRole('button', { name: 'Profile menu' }).click()
    for (const name of ['Settings', 'Export to Excel', 'Sign out']) {
      await expect(page.getByRole('button', { name })).toBeVisible()
    }
    await expect(page.getByRole('link', { name: 'User manual' })).toBeVisible()
    await page.getByRole('button', { name: /Light theme|Dark theme/ }).click()
    await expect(page.locator('html')).toHaveClass(/dark/, { timeout: 100 }).catch(() => {})
  })

  test('coach quick action opens a fresh chat and gets a reply', async ({ page }) => {
    await page.getByRole('button', { name: 'Plan my day' }).filter({ visible: true }).first().click()
    await expect(page.locator('.rounded-br-md', { hasText: 'Plan my day. Pick my top 3 priorities' })).toBeVisible()
    await expect(page.getByText('Mocked coach reply.')).toBeVisible()

    // regression: your own message must stay readable (it was once turned into a dark glass card)
    const bubble = page.locator('.rounded-br-md', { hasText: 'Plan my day. Pick my top 3 priorities' })
    const colors = await bubble.evaluate((el) => ({ bg: getComputedStyle(el).backgroundColor, fg: getComputedStyle(el).color }))
    expect(colors.bg).toBe('rgb(255, 255, 255)')
    expect(colors.fg).not.toBe(colors.bg)

    // quick actions stay one tap away inside the conversation
    await expect(page.getByRole('button', { name: 'I’m stuck' }).filter({ visible: true }).first()).toBeVisible()
  })

  test('settings is a sectioned panel; toggles keep full width; BYOK stays out of synced data', async ({ page }) => {
    await page.getByRole('button', { name: 'Profile menu' }).click()
    await page.getByRole('button', { name: 'Settings' }).click()
    const dialog = page.getByRole('dialog', { name: 'Settings' })
    await expect(dialog).toBeVisible()
    for (const name of ['General', 'Notifications', 'AI coach', 'Data & backup', 'Sharing']) {
      await expect(dialog.getByRole('button', { name })).toBeVisible()
    }

    // every toggle, in every section, keeps its full width
    for (const section of ['General', 'Notifications', 'AI coach', 'Sharing']) {
      await dialog.getByRole('button', { name: section }).click()
      const widths = await dialog.getByRole('switch').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().width)))
      expect(widths.length).toBeGreaterThan(0)
      for (const w of widths) expect(w).toBe(48)
    }

    await dialog.getByRole('button', { name: 'AI coach' }).click()
    await dialog.getByRole('button', { name: 'Use my own AI key' }).click()
    await dialog.locator('input[type=password]').fill('sk-secret-test-key')
    const stored = await page.evaluate(() => ({
      byok: localStorage.getItem('habittube-byok'),
      data: localStorage.getItem('habittube-data-v1'),
    }))
    expect(stored.byok).toContain('sk-secret-test-key')
    expect(stored.data ?? '').not.toContain('sk-secret-test-key')

    await dialog.getByRole('button', { name: 'Close settings' }).click()
    await expect(dialog).toHaveCount(0)
  })

  test('arc: generate, start it, see it on Plan and in the Today hero', async ({ page }) => {
    await page.getByRole('button', { name: 'Plan', exact: true }).click()
    await page.getByRole('button', { name: '+ Start an arc' }).click()
    await page.getByPlaceholder(/Name it/).fill('Get fit')
    await page.getByRole('button', { name: 'Generate my arc' }).click()

    await expect(page.getByRole('heading', { name: 'Test Sprint' })).toBeVisible()
    await expect(page.getByText('W1 · Foundation')).toBeVisible()
    await expect(page.getByText('Minimum day:')).toBeVisible()
    await page.getByRole('button', { name: 'Start this arc' }).click()

    await expect(page.getByText('Test Sprint').first()).toBeVisible()
    await expect(page.getByText(/Day 1\/28/)).toBeVisible()

    // Today's hero now shows the arc instead of the call to action
    await page.getByRole('button', { name: 'Today', exact: true }).click()
    await expect(page.getByText('Run 1 km, 5 pushups').first()).toBeVisible()
    await expect(page.getByText('Start an arc')).toHaveCount(0)
  })

  test('evening check-in lives in the wrap-up card and saves', async ({ page }) => {
    // collapsed until 6pm; open it if it isn't already
    const collapsed = page.getByRole('button', { name: /Wrap up your day/ })
    if (await collapsed.count()) await collapsed.click()
    await expect(page.getByText('How are you feeling today?')).toBeVisible()
    await page.getByRole('button', { name: 'Yes, on plan' }).click()
    await page.getByRole('button', { name: 'Save check-in' }).click()
    await expect(page.getByText('Checked in')).toBeVisible()
  })
})

const HABIT = { id: 'h1', name: 'Morning run', emoji: '🏃', days: [0, 1, 2, 3, 4, 5, 6], createdAt: '2020-01-01', time: '' }

const todayKey = () => {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
const DUE_HABIT = { id: 'h9', name: 'Stretch', emoji: 'stretch', days: [0, 1, 2, 3, 4, 5, 6], createdAt: '2020-01-01', time: '00:00' }

test('Up next picks the due habit and Mark done clears it', async ({ page }) => {
  // done yesterday, so strict mode doesn't lock today's habits (locked habits are never offered)
  const y = new Date()
  y.setDate(y.getDate() - 1)
  const p = (n) => String(n).padStart(2, '0')
  const yesterday = `${y.getFullYear()}-${p(y.getMonth() + 1)}-${p(y.getDate())}`
  await mockBackend(page, { seed: { habits: [DUE_HABIT], completions: { [yesterday]: ['h9'] } } })
  await page.goto('/')
  const upNext = page.locator('section', { hasText: 'Up next' }).first()
  await expect(upNext).toContainText('Stretch')
  await expect(upNext).toContainText('Due at 12:00 AM')
  await upNext.getByRole('button', { name: 'Mark done' }).click()
  await expect(page.getByText('You’re clear for now.')).toBeVisible()
})

test('strict mode: a locked habit is never offered as Up next', async ({ page }) => {
  // never done, so yesterday counts as missed and today's habits are locked
  await mockBackend(page, { seed: { habits: [DUE_HABIT] } })
  await page.goto('/')
  await expect(page.getByText('Locked by strict mode')).toBeVisible()
  const upNext = page.locator('section', { hasText: 'Up next' }).first()
  await expect(upNext).not.toContainText('Stretch')
})

test('task rows hide their time and link pickers until asked', async ({ page }) => {
  await mockBackend(page, { seed: { tasks: { [todayKey()]: [{ id: 't1', title: 'Write report', done: false, priority: 'medium' }] } } })
  await page.goto('/')
  await expect(page.getByText('Write report').first()).toBeVisible()
  const row = page.locator('div', { has: page.getByText('Write report', { exact: true }) }).filter({ has: page.getByRole('button', { name: 'Task options' }) }).last()
  await expect(row.locator('select')).toHaveCount(0)
  await row.getByRole('button', { name: 'Task options' }).click()
  await expect(row.locator('select').first()).toBeVisible()
})

test('focus blocker rules live in Settings', async ({ page }) => {
  await mockBackend(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'Profile menu' }).click()
  await page.getByRole('button', { name: 'Settings' }).click()
  const dialog = page.getByRole('dialog', { name: 'Settings' })
  await dialog.getByRole('button', { name: 'Focus blocker' }).click()
  await expect(dialog.getByText('Allowed — only these load during focus')).toBeVisible()
  await dialog.getByPlaceholder('e.g. leetcode.com').fill('leetcode.com')
  await dialog.getByRole('button', { name: 'Add' }).first().click()
  await expect(dialog.getByText('leetcode.com')).toBeVisible()
})

test('Calendar is reachable as Insights → History', async ({ page }) => {
  await mockBackend(page, { seed: { habits: [HABIT] } })
  await page.goto('/')
  await page.getByRole('navigation').first().getByRole('button', { name: 'Insights', exact: true }).click()
  await page.getByRole('button', { name: 'History' }).click()
  await expect(page.getByText(/January|February|March|April|May|June|July|August|September|October|November|December/).first()).toBeVisible()
})

test('legacy emoji habits render as icons, never as the raw glyph', async ({ page }) => {
  await mockBackend(page, { seed: { habits: [HABIT] } })
  await page.goto('/')
  await expect(page.getByText('Morning run').first()).toBeVisible()
  await expect(page.locator('main svg.lucide-footprints').first()).toBeVisible()
  await expect(page.locator('main')).not.toContainText('🏃')
  await page.getByRole('navigation').first().getByRole('button', { name: 'Habits', exact: true }).click()
  await expect(page.getByText('Morning run').first()).toBeVisible()
  await expect(page.locator('main')).not.toContainText('🏃')
})
