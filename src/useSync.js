import { useEffect, useRef, useState } from 'react'
import { getUserId, pullState, pushState } from './sync'

const UPDATED_KEY = 'habittube-updated-at'

// Offline-first sync: on mount, pull the cloud copy and adopt it if it's newer
// than the local one. On every change, save locally (done in useStore) and
// debounce-push to the server. Document-level last-write-wins by timestamp.
// status: 'offline' | 'syncing' | 'synced'
export default function useSync(data, setData) {
  const [status, setStatus] = useState('offline')
  const userId = useRef(getUserId()).current
  const lastJson = useRef(null)
  const pulled = useRef(false)

  // pull once on mount
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setStatus('syncing')
      try {
        const remote = await pullState(userId)
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
  }, [])

  // push on change (debounced), best-effort
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
        await pushState(userId, data, updatedAt)
        setStatus('synced')
      } catch {
        setStatus('offline')
      }
    }, 1200)
    return () => clearTimeout(t)
  }, [data, userId])

  return status
}
