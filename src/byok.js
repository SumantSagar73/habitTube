// Bring-your-own-key: the user's own provider key, used instead of the hosted
// proxy. The key lives ONLY in this browser's localStorage under its own entry —
// never in the main data blob, so it is never synced to Supabase or snapshots.
// All four providers speak the OpenAI chat-completions format.
const KEY = 'habittube-byok'

export const BYOK_PROVIDERS = {
  gemini: {
    label: 'Google Gemini',
    base: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-2.5-flash',
    keyUrl: 'https://aistudio.google.com/apikey',
  },
  openai: {
    label: 'OpenAI',
    base: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    keyUrl: 'https://platform.openai.com/api-keys',
  },
  groq: {
    label: 'Groq',
    base: 'https://api.groq.com/openai/v1',
    defaultModel: 'openai/gpt-oss-120b',
    keyUrl: 'https://console.groq.com/keys',
  },
  openrouter: {
    label: 'OpenRouter',
    base: 'https://openrouter.ai/api/v1',
    defaultModel: 'google/gemini-2.5-flash',
    keyUrl: 'https://openrouter.ai/keys',
  },
}

const EMPTY = { enabled: false, provider: 'gemini', key: '', model: '' }

export function loadByok() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null')
    return v && BYOK_PROVIDERS[v.provider] ? { ...EMPTY, ...v } : { ...EMPTY }
  } catch {
    return { ...EMPTY }
  }
}

export function saveByok(v) {
  try {
    localStorage.setItem(KEY, JSON.stringify(v))
  } catch { /* storage blocked — the setting just won't persist */ }
}

// The active BYOK config, or null when off / incomplete.
export function getByok() {
  const v = loadByok()
  return v.enabled && v.key.trim() && v.model.trim() ? v : null
}

// Request target for the active BYOK config.
export function byokRequest(v) {
  return {
    url: `${BYOK_PROVIDERS[v.provider].base}/chat/completions`,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${v.key.trim()}`,
      ...(v.provider === 'openrouter' ? { 'HTTP-Referer': window.location.origin, 'X-Title': 'HabitTube' } : {}),
    },
  }
}

// Ask the provider which models this key can use, keeping only chat-capable ones.
export async function listByokModels(provider, key) {
  const p = BYOK_PROVIDERS[provider]
  const res = await fetch(`${p.base}/models`, { headers: { Authorization: `Bearer ${key.trim()}` } })
  if (res.status === 401 || res.status === 403) throw new Error('That key was rejected. Check it and try again.')
  if (!res.ok) throw new Error(`Could not list models (${res.status}).`)
  const json = await res.json()
  const ids = (json.data || json.models || []).map((m) => String(m.id || m.name || '').replace(/^models\//, '')).filter(Boolean)
  const skip = /embed|whisper|tts|speech|audio|realtime|image|dall|moderation|guard|orpheus|transcribe|vision-preview|imagen|veo|aqa/i
  const keep = {
    gemini: (id) => id.startsWith('gemini'),
    openai: (id) => /^(gpt|o\d|chatgpt)/.test(id),
    groq: () => true,
    openrouter: () => true,
  }[provider]
  return [...new Set(ids.filter((id) => keep(id) && !skip.test(id)))].sort()
}
