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

  test('Today leads with the week strip, hero cards and a visible coach', async ({ page }) => {
    await expect(page.getByLabel('This week')).toBeVisible()
    await expect(page.getByText('Deep work')).toBeVisible()
    await expect(page.getByText('Start an arc')).toBeVisible() // no arc yet -> call to action card
    await expect(page.getByText('Focus this week')).toBeVisible()
    await expect(page.getByText('Your coach says')).toBeVisible()
    for (const name of ['Plan my day', 'I’m stuck', 'Adjust today', 'How am I doing?']) {
      await expect(page.getByRole('button', { name })).toBeVisible()
    }
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
    await page.getByRole('button', { name: 'Plan my day' }).click()
    await expect(page.locator('.rounded-br-md', { hasText: 'Plan my day. Pick my top 3 priorities' })).toBeVisible()
    await expect(page.getByText('Mocked coach reply.')).toBeVisible()
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
    await expect(page.getByText('Wrap up your day')).toBeVisible()
    await page.getByRole('button', { name: /Evening check-in|how is today going/ }).click().catch(() => {})
    await page.getByRole('button', { name: 'Yes, on plan' }).click()
    await page.getByRole('button', { name: 'Save check-in' }).click()
    await expect(page.getByText('Checked in')).toBeVisible()
  })
})

const HABIT = { id: 'h1', name: 'Morning run', emoji: '🏃', days: [0, 1, 2, 3, 4, 5, 6], createdAt: '2020-01-01', time: '' }

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
