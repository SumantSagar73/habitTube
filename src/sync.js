// Client side of the offline-first sync. All calls are best-effort: if the
// server is down or we're offline, they throw and the caller just keeps using
// local data.
const API = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const USER_KEY = 'habittube-user-id'

export function getUserId() {
  let id = localStorage.getItem(USER_KEY)
  if (!id) {
    id = 'u_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem(USER_KEY, id)
  }
  return id
}

export async function pullState(userId) {
  const res = await fetch(`${API}/api/state/${userId}`, { signal: AbortSignal.timeout(5000) })
  if (!res.ok) throw new Error(`pull failed ${res.status}`)
  return res.json() // { state, updatedAt } | null
}

export async function pushState(userId, state, updatedAt) {
  const res = await fetch(`${API}/api/state/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state, updatedAt }),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`push failed ${res.status}`)
  return res.json()
}
