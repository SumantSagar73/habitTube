import { useCallback, useEffect, useRef, useState } from 'react'
import { mergeStates, stableStringify } from './mergeState'
import { pullState, pushState } from './sync'

const UPDATED_KEY = 'habittube-updated-at'
// Pre-auth versions synced under a random ID stored here; read only to
// migrate that data into the logged-in account on first login.
const LEGACY_USER_KEY = 'habittube-user-id'
const REFRESH_MS = 90_000 // re-check the cloud copy this often while the tab is visible
const MIN_GAP_MS = 15_000 // ...and never more often than this when the tab regains focus

// Offline-first sync of one state blob. Local edits push (debounced); the cloud copy is
// pulled on login, when the tab regains focus, and every 90s, and MERGED into the local
// copy per item (see mergeState.js) so edits from two devices no longer overwrite each other.
export default function useSync(data, setDataRaw, userId) {
  const [status, setStatus] = useState('offline')
  const resolvedId = userId ?? null
  const userIdRef = useRef(resolvedId)
  const dataRef = useRef(data)
  const lastJson = useRef(null)
  const pulled = useRef(false)
  const busy = useRef(false)
  const lastPull = useRef(0)

  useEffect(() => { dataRef.current = data }, [data])

  // Pull the cloud copy, merge it into the local one, and push back anything the cloud lacks.
  const syncNow = useCallback(async (id, { first = false, isCancelled = () => false } = {}) => {
    if (busy.current) return
    busy.current = true
    lastPull.current = Date.now()
    try {
      let remote = await pullState(id)
      // First login on this account: fall back to data synced under the old
      // anonymous browser ID so nothing looks "reset".
      if (first && !remote?.state) {
        const legacyId = localStorage.getItem(LEGACY_USER_KEY)
        if (legacyId && legacyId !== id) remote = await pullState(legacyId).catch(() => null)
      }
      if (isCancelled()) return

      const local = dataRef.current
      const localUpdated = Number(localStorage.getItem(UPDATED_KEY) || 0)
      let next = local
      if (remote?.state) {
        next = mergeStates(local, remote.state, (remote.updatedAt || 0) > localUpdated)
        if (stableStringify(next) !== stableStringify(local)) setDataRaw(next)
      }
      // The merge result is now "already synced" as far as the push-on-change effect goes.
      lastJson.current = JSON.stringify(next)

      const cloudHasIt = remote?.state && stableStringify(next) === stableStringify(remote.state)
      if (first || !cloudHasIt) {
        const updatedAt = Date.now()
        await pushState(id, next, updatedAt)
        localStorage.setItem(UPDATED_KEY, String(updatedAt))
      } else if (remote?.updatedAt) {
        localStorage.setItem(UPDATED_KEY, String(Math.max(localUpdated, remote.updatedAt)))
      }
      setStatus('synced')
    } catch {
      setStatus('offline')
    } finally {
      busy.current = false
      pulled.current = true
    }
  }, [setDataRaw])

  // pull once on mount and whenever userId changes (e.g. after login)
  useEffect(() => {
    userIdRef.current = resolvedId
    pulled.current = false
    lastJson.current = null
    if (!resolvedId) { pulled.current = true; return }
    let cancelled = false
    setStatus('syncing') // eslint-disable-line react-hooks/set-state-in-effect
    syncNow(resolvedId, { first: true, isCancelled: () => cancelled })
    return () => {
      cancelled = true
    }
  }, [resolvedId, syncNow])

  // keep devices converging while the app stays open
  useEffect(() => {
    if (!resolvedId) return
    const refresh = () => {
      if (document.visibilityState !== 'visible' || !pulled.current) return
      if (Date.now() - lastPull.current < MIN_GAP_MS) return
      syncNow(resolvedId)
    }
    const timer = setInterval(refresh, REFRESH_MS)
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [resolvedId, syncNow])

  // push on change (debounced 1.2s), best-effort
  useEffect(() => {
    if (!pulled.current) return
    if (!userIdRef.current) return
    const json = JSON.stringify(data)
    if (json === lastJson.current) return
    lastJson.current = json
    // Stamp local change immediately so a concurrent pull never wins over it
    localStorage.setItem(UPDATED_KEY, String(Date.now()))
    const t = setTimeout(async () => {
      const updatedAt = Date.now()
      localStorage.setItem(UPDATED_KEY, String(updatedAt))
      setStatus('syncing')
      try {
        await pushState(userIdRef.current, data, updatedAt)
        setStatus('synced')
      } catch {
        setStatus('offline')
      }
    }, 1200)
    return () => clearTimeout(t)
  }, [data])

  return resolvedId ? status : 'offline'
}
