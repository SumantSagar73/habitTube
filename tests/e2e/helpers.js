// Test helpers: fake a signed-in Supabase session and mock every network call the
// app makes (Supabase REST/auth, AI), so the suite is hermetic.

// The dev server is started with these (playwright.config.js), overriding .env.local,
// so the suite never talks to a real Supabase project.
export const E2E_SUPABASE_URL = 'https://e2e-test.supabase.co'
export const E2E_SUPABASE_KEY = 'e2e-test-key'

const ARC_PLAN = {
  title: 'Test Sprint',
  why: 'Build a strong base',
  weeks: [
    ['Foundation', 'Run 1 km, 5 pushups'],
    ['Build', 'Run 2 km, 8 pushups'],
    ['Peak', 'Run 3 km, 12 pushups'],
    ['Test', 'Run 5 km, 20 pushups'],
  ],
  target: ['Run 5 km', 5, 'km'],
  habits: [['🏃', 'Morning run', [1, 3, 5], '07:00']],
  tasks: [
    [0, 'Run 1 km easy', 'h'],
    [1, 'Pushups 3x5', 'm'],
  ],
  minDay: '10-minute walk',
}

const sse = (text) => `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\ndata: [DONE]\n\n`

export async function mockBackend(page, { signedIn = true } = {}) {
  const ai = { calls: [] }

  await page.addInitScript(({ signedIn, ref }) => {
    if (!signedIn) return
    // Supabase stores its session under sb-<project-ref>-auth-token.
    const session = {
      access_token: 'test-token',
      refresh_token: 'test-refresh',
      token_type: 'bearer',
      expires_in: 36000,
      expires_at: Math.floor(Date.now() / 1000) + 36000,
      user: { id: 'test-user', aud: 'authenticated', role: 'authenticated', email: 'tester@example.com', user_metadata: {} },
    }
    for (const key of Object.keys(localStorage)) if (key.endsWith('-auth-token')) localStorage.removeItem(key)
    localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(session))
    // Skip first-run onboarding so its overlay doesn't cover the app.
    localStorage.setItem('habittube-data-v1', JSON.stringify({ onboardingDone: true }))
  }, { signedIn, ref: new URL(E2E_SUPABASE_URL).hostname.split('.')[0] })

  // Supabase: no remote state; every write succeeds.
  await page.route(/\.supabase\.co\//, (route) => {
    const req = route.request()
    if (req.method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: 'null' })
    return route.fulfill({ status: 201, contentType: 'application/json', body: '{}' })
  })

  // AI: arc requests (JSON mode) get a plan, streaming gets SSE, the rest plain text.
  await page.route('**/ai/chat/completions', (route) => {
    const body = JSON.parse(route.request().postData() || '{}')
    ai.calls.push(body)
    if (body.stream) {
      return route.fulfill({ status: 200, contentType: 'text/event-stream', body: sse('Mocked coach reply.') })
    }
    const content = body.response_format ? JSON.stringify(ARC_PLAN) : 'Mocked motivation.'
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ choices: [{ message: { content } }] }) })
  })

  return ai
}
