import { defineConfig } from '@playwright/test'
import { E2E_SUPABASE_KEY, E2E_SUPABASE_URL } from './tests/e2e/helpers.js'

// E2E runs against the Vite dev server with Supabase and the AI fully mocked
// (see tests/e2e/helpers.js), so tests never touch real accounts or API keys.
// Uses the system Edge by default; set PW_CHANNEL=chrome (or unset + run
// `npx playwright install chromium`) on machines without it.
const channel = process.env.PW_CHANNEL ?? 'msedge'

export default defineConfig({
  testDir: 'tests',
  testMatch: ['e2e/**/*.spec.js', 'unit/**/*.spec.js'],
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5174',
    ...(channel ? { channel } : {}),
    viewport: { width: 1280, height: 900 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npx vite --port 5174 --strictPort',
    url: 'http://localhost:5174',
    // Fresh server so the dummy Supabase env below is what the app sees.
    reuseExistingServer: false,
    env: { VITE_SUPABASE_URL: E2E_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY: E2E_SUPABASE_KEY },
    timeout: 60_000,
  },
})
