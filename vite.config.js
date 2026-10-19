import { Readable } from 'node:stream'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Same provider routing as api/ai.js (the Vercel function), for local dev.
const PROVIDERS = {
  groq: { url: 'https://api.groq.com/openai/v1/chat/completions', keyEnv: 'GROQ_API_KEY' },
  gemini: { url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', keyEnv: 'GEMINI_API_KEY' },
}
const providerOf = (model) => (String(model).startsWith('gemini-') ? 'gemini' : 'groq')

// Dev-only middleware that forwards /ai/* (and legacy /groq/*) to the right
// provider with the key attached server-side, so keys never reach the browser
// bundle and we avoid CORS. Replaces server.proxy (whose header hook is unreliable here).
function aiProxy(keys) {
  const handle = (req, res) => {
    const fail = (status, message) => {
      res.statusCode = status
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: { message } }))
    }
    if (req.method !== 'POST') return fail(405, 'Method not allowed')
    let body = ''
    req.on('data', (chunk) => (body += chunk))
    req.on('end', async () => {
      let parsed
      try {
        parsed = JSON.parse(body)
      } catch {
        return fail(400, 'Invalid JSON')
      }
      const provider = PROVIDERS[providerOf(parsed.model)]
      const key = keys[provider.keyEnv]
      if (!key) return fail(500, `${provider.keyEnv} missing in .env.local`)
      if (parsed.model === 'gemini-2.5-flash' && parsed.reasoning_effort == null) parsed.reasoning_effort = 'none'
      if (String(parsed.model).startsWith('openai/gpt-oss')) { parsed.reasoning_effort ??= 'low'; parsed.reasoning_format ??= 'hidden' }
      try {
        const upstream = await fetch(provider.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
          body: JSON.stringify(parsed),
        })
        res.statusCode = upstream.status
        res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json')
        res.setHeader('Cache-Control', 'no-cache')
        // Pipe the upstream body straight through so SSE streaming (stream:true)
        // reaches the browser chunk-by-chunk; also fine for plain JSON.
        if (upstream.body) Readable.fromWeb(upstream.body).pipe(res)
        else res.end()
      } catch (e) {
        fail(502, `Proxy could not reach the AI provider: ${e}`)
      }
    })
  }
  return {
    name: 'ai-proxy',
    configureServer(server) {
      server.middlewares.use('/ai', handle)
      server.middlewares.use('/groq', handle)
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const keys = {}
  for (const name of ['GROQ_API_KEY', 'GEMINI_API_KEY']) {
    keys[name] = (env[name] || process.env[name] || '').trim()
    console.log(`[habittube] ${name}: ${keys[name] ? 'loaded' : 'NOT SET'}`)
  }

  return {
    plugins: [react(), tailwindcss(), aiProxy(keys)],
  }
})
