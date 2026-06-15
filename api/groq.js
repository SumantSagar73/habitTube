export const config = {
  runtime: 'edge',
}

export default async function handler(req) {
  // Only allow POST request
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: { message: 'Method not allowed' } }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const key = process.env.GROQ_API_KEY
  if (!key) {
    return new Response(JSON.stringify({ error: { message: 'GROQ_API_KEY is not configured on Vercel' } }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Retrieve the target API path from the query parameter
  const { searchParams } = new URL(req.url)
  const path = searchParams.get('path') || 'chat/completions'
  const upstreamUrl = `https://api.groq.com/openai/v1/${path}`

  try {
    const bodyText = await req.text()

    // Send authorization header and request body to Groq
    const upstreamRes = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: bodyText,
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
    return new Response(JSON.stringify({ error: { message: `Vercel proxy failed: ${error.message}` } }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
