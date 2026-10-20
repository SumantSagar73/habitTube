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

// Weekly check-in and arc review replies (matched by their system prompt below).
const WEEK_PLAN = {
  note: 'Good base — nudging the volume up a little.',
  milestone: 'Run 2 km, 8 pushups',
  tasks: [
    [0, 'Run 1.5 km steady', 'h'],
    [1, 'Pushups 4x6', 'm'],
    [3, 'Run 2 km easy', 'm'],
  ],
}
const REVIEW = {
  summary: 'You showed up most weeks and the numbers moved.',
  wins: ['Kept the morning run going'],
  lessons: ['Late evenings were the weak spot'],
  next: { theme: 'Strength base', why: 'Build on the running habit' },
}

// What "Organize with AI" returns for a messy paste of a resource outline.
const ORGANIZED = {
  parts: [
    ['Basics', 'Intro to the topic', 3],
    ['Basics', 'Setting things up', 5],
    ['Going further', 'A first real project', 20],
  ],
}

const sse = (text) => `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\ndata: [DONE]\n\n`

// seed: extra fields merged into the initial saved state (e.g. habits).
// remote: { state, updatedAt } the fake cloud already holds for this user. The returned object
// also records every state the app pushes (`pushes`) so tests can see what reached the cloud.
export async function mockBackend(page, { signedIn = true, seed = {}, remote = null } = {}) {
  const ai = { calls: [], pushes: [] }

  await page.addInitScript(({ signedIn, ref, seed }) => {
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
    localStorage.setItem('habittube-data-v1', JSON.stringify({ onboardingDone: true, ...seed }))
  }, { signedIn, seed, ref: new URL(E2E_SUPABASE_URL).hostname.split('.')[0] })

  // Supabase: no remote state; every write succeeds.
  await page.route(/\.supabase\.co\//, (route) => {
    const req = route.request()
    const isStates = req.url().includes('/rest/v1/states')
    if (req.method() === 'GET') {
      const body = isStates && remote ? JSON.stringify(remote) : 'null'
      return route.fulfill({ status: 200, contentType: 'application/json', body })
    }
    if (isStates) {
      try { ai.pushes.push(req.postDataJSON()) } catch { /* not JSON */ }
    }
    return route.fulfill({ status: 201, contentType: 'application/json', body: '{}' })
  })

  // AI: JSON-mode requests get an arc plan / week plan / review (by system prompt), streaming gets SSE, the rest plain text.
  await page.route('**/ai/chat/completions', (route) => {
    const body = JSON.parse(route.request().postData() || '{}')
    ai.calls.push(body)
    if (body.stream) {
      return route.fulfill({ status: 200, contentType: 'text/event-stream', body: sse('Mocked coach reply.') })
    }
    const system = String(body.messages?.[0]?.content || '')
    let content = 'Mocked motivation.'
    if (body.response_format) {
      const reply = system.includes('NEXT week')
        ? WEEK_PLAN
        : system.includes('reviewing a finished arc')
          ? REVIEW
          : system.includes('study outline')
            ? ORGANIZED
            : ARC_PLAN
      content = JSON.stringify(reply)
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ choices: [{ message: { content } }] }) })
  })

  return ai
}
