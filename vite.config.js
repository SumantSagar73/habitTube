import { Readable } from 'node:stream'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Dev-only middleware that forwards /groq/* to the Groq API with the key
// attached server-side, so the key never reaches the browser bundle and we
// avoid CORS. Replaces server.proxy (whose header hook is unreliable here).
function groqProxy(key) {
  return {
    name: 'groq-proxy',
    configureServer(server) {
      server.middlewares.use('/groq', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          return res.end('Method not allowed')
        }
        if (!key) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          return res.end(JSON.stringify({ error: { message: 'GROQ_API_KEY missing in .env.local' } }))
        }
        let body = ''
        req.on('data', (chunk) => (body += chunk))
        req.on('end', async () => {
          try {
            const upstream = await fetch('https://api.groq.com/openai/v1' + req.url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
              body,
            })
            res.statusCode = upstream.status
            res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json')
            res.setHeader('Cache-Control', 'no-cache')
            // Pipe the upstream body straight through so SSE streaming (stream:true)
            // reaches the browser chunk-by-chunk; also fine for plain JSON.
            if (upstream.body) Readable.fromWeb(upstream.body).pipe(res)
            else res.end()
          } catch (e) {
            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: { message: `Proxy could not reach Groq: ${e}` } }))
          }
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const groqKey = (env.GROQ_API_KEY || process.env.GROQ_API_KEY || '').trim()
  console.log(`[habittube] Groq key loaded: ${groqKey ? `yes (len ${groqKey.length})` : 'NO'}`)

  return {
    plugins: [react(), tailwindcss(), groqProxy(groqKey)],
  }
})
