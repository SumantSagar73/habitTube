import { useState, useRef, useEffect } from 'react'

function timeAgo(ms) {
  const s = Math.floor((Date.now() - ms) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const TYPE_ICON = {
  streak: '🔥',
  goal: '⚑',
  task: '📋',
  focus: '⏱',
  habit: '✅',
  info: 'ℹ',
}

export default function NotificationCenter({ notifications = [], onMarkRead, onMarkAllRead, onClear }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const unread = notifications.filter((n) => !n.read).length

  // close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="Notifications"
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 text-neutral-600 transition hover:border-neutral-400 dark:border-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-600"
      >
        <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-neutral-900 px-1 text-[10px] font-bold leading-none text-white dark:bg-white dark:text-neutral-900">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-[#161616]">
          {/* header */}
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
            <span className="text-sm font-bold text-neutral-900 dark:text-white">
              Notifications {unread > 0 && <span className="ml-1 text-neutral-400 dark:text-neutral-500">({unread} new)</span>}
            </span>
            <div className="flex gap-2">
              {unread > 0 && (
                <button onClick={onMarkAllRead} className="text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:hover:text-white">
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button onClick={onClear} className="text-xs font-semibold text-neutral-400 hover:text-neutral-900 dark:hover:text-white">
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* list */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-neutral-400 dark:text-neutral-600">
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => onMarkRead(n.id)}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-neutral-50 dark:hover:bg-neutral-800/60 border-b border-neutral-50 dark:border-neutral-800/60 last:border-0 ${
                    n.read ? 'opacity-60' : ''
                  }`}
                >
                  <span className="mt-0.5 text-base shrink-0">{TYPE_ICON[n.type] ?? 'ℹ'}</span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm leading-snug ${n.read ? 'font-normal text-neutral-600 dark:text-neutral-400' : 'font-semibold text-neutral-900 dark:text-white'}`}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-500 leading-snug">{n.body}</p>
                    )}
                    <p className="mt-1 text-[10px] text-neutral-400 dark:text-neutral-600">{timeAgo(n.createdAt)}</p>
                  </div>
                  {!n.read && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-neutral-900 dark:bg-white" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
