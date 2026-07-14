import { useEffect, useRef, useState } from 'react'
import { pullState, pushState } from './sync'

const UPDATED_KEY = 'habittube-updated-at'
// Pre-auth versions synced under a random ID stored here; read only to
// migrate that data into the logged-in account on first login.
const LEGACY_USER_KEY = 'habittube-user-id'

export default function useSync(data, setData, userId) {
  const [status, setStatus] = useState('offline')
  const resolvedId = userId ?? null
  const userIdRef = useRef(resolvedId)
  const dataRef = useRef(data)
  const lastJson = useRef(null)
  const pulled = useRef(false)

  useEffect(() => { dataRef.current = data }, [data])

  // pull once on mount and whenever userId changes (e.g. after login)
  useEffect(() => {
    userIdRef.current = resolvedId
    pulled.current = false
    lastJson.current = null
    if (!resolvedId) { setStatus('offline'); pulled.current = true; return }
    let cancelled = false
    ;(async () => {
      setStatus('syncing')
      try {
        let remote = await pullState(resolvedId)
        // First login on this account: fall back to data synced under the old
        // anonymous browser ID so nothing looks "reset".
        if (!remote?.state) {
          const legacyId = localStorage.getItem(LEGACY_USER_KEY)
          if (legacyId && legacyId !== resolvedId) {
            remote = await pullState(legacyId).catch(() => null)
          }
        }
        let next = dataRef.current
        if (!cancelled && remote && remote.state) {
          const localUpdated = Number(localStorage.getItem(UPDATED_KEY) || 0)
          if ((remote.updatedAt || 0) > localUpdated) {
            next = { ...dataRef.current, ...remote.state }
            lastJson.current = JSON.stringify(remote.state)
            setData((d) => ({ ...d, ...remote.state }))
            localStorage.setItem(UPDATED_KEY, String(remote.updatedAt))
          }
        }
        if (!cancelled) {
          // Claim the account row so other devices logging in see this data
          const updatedAt = Date.now()
          await pushState(resolvedId, next, updatedAt)
          localStorage.setItem(UPDATED_KEY, String(updatedAt))
          setStatus('synced')
        }
      } catch {
        if (!cancelled) setStatus('offline')
      } finally {
        pulled.current = true
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedId])

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

  return status
}
