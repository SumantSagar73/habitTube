export const config = {
  runtime: 'edge',
}

// Hosted providers. Both speak the OpenAI chat-completions format. The provider
// is picked from the requested model, and only allowlisted models are accepted,
// so a stolen/abused session can't run arbitrary or expensive completions on our keys.
// Keep MODELS in sync with AI_MODELS in src/ai.js.
const PROVIDERS = {
  groq: { url: 'https://api.groq.com/openai/v1/chat/completions', keyEnv: 'GROQ_API_KEY' },
  gemini: { url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', keyEnv: 'GEMINI_API_KEY' },
}
const MODELS = {
  'openai/gpt-oss-120b': 'groq',
  'openai/gpt-oss-20b': 'groq',
  'gemini-2.5-flash': 'gemini',
  'gemini-2.5-flash-lite': 'gemini',
}
const MAX_TOKENS_CAP = 4096
const MAX_BODY_BYTES = 64 * 1024
const RATE_LIMIT = 30 // requests per user per minute (best-effort, per edge instance)
const hits = new Map()

function json(status, message) {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function rateLimited(userId) {
  const now = Date.now()
  const recent = (hits.get(userId) || []).filter((t) => now - t < 60_000)
  recent.push(now)
  hits.set(userId, recent)
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < 60_000)) hits.delete(k)
  return recent.length > RATE_LIMIT
}

// Validate the caller's Supabase session and return the user id (or null).
async function verifyUser(req) {
  const auth = req.headers.get('authorization') || ''
  if (!auth.startsWith('Bearer ')) return null
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anon = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY
  if (!url || !anon) return null
  try {
    const r = await fetch(`${url}/auth/v1/user`, { headers: { Authorization: auth, apikey: anon } })
    if (!r.ok) return null
    const u = await r.json()
    return u?.id || null
  } catch {
    return null
  }
}

export default async function handler(req) {
  if (req.method !== 'POST') return json(405, 'Method not allowed')

  const userId = await verifyUser(req)
  if (!userId) return json(401, 'Sign in to use the AI coach.')
  if (rateLimited(userId)) return json(429, 'Too many AI requests. Wait a minute and try again.')

  // Only the chat endpoint is proxied.
  const { searchParams } = new URL(req.url)
  const path = searchParams.get('path') || 'chat/completions'
  if (path !== 'chat/completions') return json(404, 'Unsupported path')

  try {
    const bodyText = await req.text()
    if (bodyText.length > MAX_BODY_BYTES) return json(413, 'Request too large')

    let body
    try {
      body = JSON.parse(bodyText)
    } catch {
      return json(400, 'Invalid JSON')
    }
    const provider = PROVIDERS[MODELS[body.model]]
    if (!provider) return json(400, 'Model not allowed')
    const key = process.env[provider.keyEnv]
    if (!key) return json(500, `${provider.keyEnv} is not configured on Vercel`)
    body.max_tokens = Math.min(Number(body.max_tokens) || 450, MAX_TOKENS_CAP)
    // Gemini 2.5 Flash "thinks" by default, and thinking tokens eat the output budget.
    if (body.model === 'gemini-2.5-flash' && body.reasoning_effort == null) body.reasoning_effort = 'none'
    // GPT-OSS on Groq is a reasoning model: keep it brief and hide the reasoning text.
    if (body.model.startsWith('openai/gpt-oss')) { body.reasoning_effort ??= 'low'; body.reasoning_format ??= 'hidden' }

    const upstreamRes = await fetch(provider.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
    })

    // Forward the status code and headers (especially for streaming content-type)
    const resHeaders = new Headers(upstreamRes.headers)
    resHeaders.set('Cache-Control', 'no-cache')
    resHeaders.set('Connection', 'keep-alive')

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: resHeaders,
    })
  } catch (error) {
    return json(502, `Vercel proxy failed: ${error.message}`)
  }
}
