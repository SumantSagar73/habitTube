import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './utils/supabase'
import { uid } from './utils'

// Stable anonymous identity for this browser tab session
export const MY_ID = (() => {
  try {
    let id = sessionStorage.getItem('ht-room-id')
    if (!id) { id = uid(); sessionStorage.setItem('ht-room-id', id) }
    return id
  } catch { return uid() }
})()

export default function useRoom(roomCode) {
  const [participants, setParticipants] = useState([])
  const [connected, setConnected] = useState(false)
  const channelRef = useRef(null)
  const pendingRef = useRef(null)

  // track() is stable — reads channelRef directly
  const track = useCallback(async (data) => {
    const payload = { ...data, id: MY_ID }
    if (channelRef.current) {
      try { await channelRef.current.track(payload) } catch {}
    } else {
      pendingRef.current = payload // queued until subscribed
    }
  }, [])

  useEffect(() => {
    if (!roomCode) return

    // React StrictMode double-invokes effects. The cleanup may run before the
    // subscribe callback fires (channelRef is still null), leaving an orphaned
    // channel with joinedOnce=true in Supabase's registry. Remove any such
    // orphan before creating the fresh channel.
    supabase
      .getChannels()
      .filter((ch) => ch.topic === `realtime:ht-room-${roomCode}`)
      .forEach((ch) => supabase.removeChannel(ch))

    const channel = supabase.channel(`ht-room-${roomCode}`, {
      config: { presence: { key: MY_ID } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const all = Object.values(state).flatMap((arr) => arr).filter(Boolean)
        setParticipants(all)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          channelRef.current = channel
          setConnected(true)
          if (pendingRef.current) {
            await channel.track(pendingRef.current).catch(() => {})
            pendingRef.current = null
          }
        }
      })

    return () => {
      // Use the closure reference, not channelRef — the ref may not be set yet
      // if cleanup runs before SUBSCRIBED fires (strict mode / fast unmount).
      channel.untrack().catch(() => {})
      supabase.removeChannel(channel)
      channelRef.current = null
      setConnected(false)
      setParticipants([])
    }
  }, [roomCode])

  return { participants, connected, track }
}
