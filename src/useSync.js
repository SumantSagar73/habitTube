import { useEffect, useRef, useState } from 'react'
import { getUserId, pullState, pushState } from './sync'

const UPDATED_KEY = 'habittube-updated-at'

export default function useSync(data, setData, userId) {
  const [status, setStatus] = useState('offline')
  const resolvedId = userId || getUserId()
  const userIdRef = useRef(resolvedId)
  const lastJson = useRef(null)
  const pulled = useRef(false)

  // pull once on mount and whenever userId changes (e.g. after login)
  useEffect(() => {
    userIdRef.current = resolvedId
    pulled.current = false
    lastJson.current = null
    let cancelled = false
    ;(async () => {
      setStatus('syncing')
      try {
        const remote = await pullState(resolvedId)
        if (!cancelled && remote && remote.state) {
          const localUpdated = Number(localStorage.getItem(UPDATED_KEY) || 0)
          if ((remote.updatedAt || 0) > localUpdated) {
            lastJson.current = JSON.stringify(remote.state)
            setData((d) => ({ ...d, ...remote.state }))
            localStorage.setItem(UPDATED_KEY, String(remote.updatedAt))
          }
        }
        if (!cancelled) setStatus('synced')
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
    const json = JSON.stringify(data)
    if (json === lastJson.current) return
    lastJson.current = json
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
