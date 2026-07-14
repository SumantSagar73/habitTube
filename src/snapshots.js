// Backup history — dated copies of the whole state blob so any prior version
// can be restored. All calls are best-effort: if the `state_snapshots` table
// doesn't exist yet (run supabase/state_snapshots.sql) or we're offline, they
// fail quietly and the app is unaffected.
import { supabase } from './utils/supabase'

const LAST_DAILY_KEY = 'habittube-last-snapshot-day'
const MAX_PER_USER = 30

export async function saveSnapshot(userId, state, reason = 'manual') {
  if (!userId || !state) return
  try {
    const { error } = await supabase
      .from('state_snapshots')
      .insert({ userId, state, reason, createdAt: Date.now() })
    if (error) throw error
    pruneOldSnapshots(userId) // fire-and-forget
  } catch (e) {
    console.warn('[snapshots] save skipped:', e.message)
  }
}

// Take at most one 'daily' snapshot per calendar day, on first load.
export async function maybeDailySnapshot(userId, state) {
  if (!userId) return
  const today = new Date().toISOString().slice(0, 10)
  if (localStorage.getItem(LAST_DAILY_KEY) === today) return
  localStorage.setItem(LAST_DAILY_KEY, today)
  await saveSnapshot(userId, state, 'daily')
}

export async function listSnapshots(userId) {
  if (!userId) return []
  try {
    const { data, error } = await supabase
      .from('state_snapshots')
      .select('id, reason, createdAt, state')
      .eq('userId', userId)
      .order('createdAt', { ascending: false })
      .limit(MAX_PER_USER)
    if (error) throw error
    return data || []
  } catch (e) {
    console.warn('[snapshots] list failed:', e.message)
    return []
  }
}

async function pruneOldSnapshots(userId) {
  try {
    const { data } = await supabase
      .from('state_snapshots')
      .select('id')
      .eq('userId', userId)
      .order('createdAt', { ascending: false })
    if (!data || data.length <= MAX_PER_USER) return
    const toDelete = data.slice(MAX_PER_USER).map((r) => r.id)
    await supabase.from('state_snapshots').delete().in('id', toDelete)
  } catch { /* best-effort */ }
}
