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

  test('Today leads with the hero stats and a visible coach', async ({ page }) => {
    await expect(page.getByText('Deep work')).toBeVisible()
    await expect(page.getByText('Today’s progress')).toBeVisible()
    await expect(page.getByText('Your coach says')).toBeVisible()
    for (const name of ['Plan my day', 'I’m stuck', 'Adjust today', 'How am I doing?']) {
      await expect(page.getByRole('button', { name })).toBeVisible()
    }
  })

  test('coach quick action opens a fresh chat and gets a reply', async ({ page }) => {
    await page.getByRole('button', { name: 'Plan my day' }).click()
    await expect(page.locator('.rounded-br-md', { hasText: 'Plan my day. Pick my top 3 priorities' })).toBeVisible()
    await expect(page.getByText('Mocked coach reply.')).toBeVisible()
  })

  test('settings toggles keep their full width and BYOK stays out of synced data', async ({ page }) => {
    await page.getByRole('button', { name: 'Settings' }).click()
    const toggles = page.locator('button[class*="h-7"][class*="w-12"]')
    await expect(toggles.first()).toBeVisible()
    const widths = await toggles.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().width)))
    expect(widths.length).toBeGreaterThanOrEqual(5)
    for (const w of widths) expect(w).toBe(48)

    await page.getByRole('button', { name: 'Use my own AI key' }).click()
    await page.locator('input[type=password]').fill('sk-secret-test-key')
    const stored = await page.evaluate(() => ({
      byok: localStorage.getItem('habittube-byok'),
      data: localStorage.getItem('habittube-data-v1'),
    }))
    expect(stored.byok).toContain('sk-secret-test-key')
    expect(stored.data ?? '').not.toContain('sk-secret-test-key')
  })

  test('arc: generate, start it, see it on Plan and Today', async ({ page }) => {
    await page.getByRole('button', { name: 'Plan', exact: true }).click()
    await page.getByRole('button', { name: '+ Start an arc' }).click()
    await page.getByPlaceholder(/Name it/).fill('Get fit')
    await page.getByRole('button', { name: 'Generate my arc' }).click()

    await expect(page.getByRole('heading', { name: 'Test Sprint' })).toBeVisible()
    await expect(page.getByText('W1 · Foundation')).toBeVisible()
    await expect(page.getByText('Minimum day:')).toBeVisible()
    await page.getByRole('button', { name: 'Start this arc' }).click()

    // card on Plan
    await expect(page.getByText('Test Sprint').first()).toBeVisible()
    await expect(page.getByText(/Day 1\/28/)).toBeVisible()

    // compact card on Today, under the coach
    await page.getByRole('button', { name: 'Today', exact: true }).click()
    await expect(page.getByText('Test Sprint').first()).toBeVisible()
  })

  test('evening check-in saves and collapses', async ({ page }) => {
    await page.getByRole('button', { name: /Evening check-in|how is today going/ }).click().catch(() => {})
    await page.getByRole('button', { name: 'Yes, on plan' }).click()
    await page.getByRole('button', { name: 'Save check-in' }).click()
    await expect(page.getByText('Checked in ✓')).toBeVisible()
  })
})
