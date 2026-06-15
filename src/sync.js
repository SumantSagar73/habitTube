// Client side of the offline-first sync. All calls are best-effort: if the
// server is down or we're offline, they throw and the caller just keeps using
// local data.
import { supabase } from './utils/supabase'

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
  const { data, error } = await supabase
    .from('states')
    .select('state, updatedAt')
    .eq('userId', userId)
    .maybeSingle()

  if (error) {
    console.error('[sync] pullState error:', error)
    throw new Error(`pull failed: ${error.message}`)
  }
  return data // { state, updatedAt } | null
}

export async function pushState(userId, state, updatedAt) {
  const { data, error } = await supabase
    .from('states')
    .upsert({ userId, state, updatedAt }, { onConflict: 'userId' })
    .select()
    .single()

  if (error) {
    console.error('[sync] pushState error:', error)
    throw new Error(`push failed: ${error.message}`)
  }
  return data
}
