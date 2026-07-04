import { useState } from 'react'

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let c = ''
  for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random() * chars.length)]
  return c.slice(0, 3) + '-' + c.slice(3)
}

function generatePin() {
  return String(Math.floor(1000 + Math.random() * 9000))
}

export default function CreateRoomDialog({ onClose }) {
  const [isProtected, setIsProtected] = useState(false)
  const [pin] = useState(() => generatePin())
  const [copied, setCopied] = useState(false)

  const code = useState(() => generateCode())[0]
  const roomUrl = isProtected
    ? `${window.location.origin}${window.location.pathname}?room=${code}&pin=${pin}`
    : `${window.location.origin}${window.location.pathname}?room=${code}`

  function go() {
    window.location.href = roomUrl
  }

  function copyAndGo() {
    navigator.clipboard.writeText(roomUrl).then(() => {
      setCopied(true)
      setTimeout(go, 800)
    }).catch(go)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm rounded-3xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-[#111]">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-neutral-900 dark:text-white">
            Create focus room
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Room code preview */}
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900/50">
          <svg className="h-4 w-4 shrink-0 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <span className="font-mono text-sm font-bold tracking-widest text-neutral-700 dark:text-neutral-200">
            {code}
          </span>
        </div>

        {/* Access toggle */}
        <div className="mb-5 space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
            Access
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setIsProtected(false)}
              className={`rounded-xl border py-3 text-sm font-semibold transition ${
                !isProtected
                  ? 'border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900'
                  : 'border-neutral-200 text-neutral-500 hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-500'
              }`}
            >
              🔓 Open
            </button>
            <button
              onClick={() => setIsProtected(true)}
              className={`rounded-xl border py-3 text-sm font-semibold transition ${
                isProtected
                  ? 'border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900'
                  : 'border-neutral-200 text-neutral-500 hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-500'
              }`}
            >
              🔒 PIN lock
            </button>
          </div>
        </div>

        {/* PIN info */}
        {isProtected && (
          <div className="mb-5 rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/50">
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
              PIN — share with your study group
            </p>
            <p className="font-mono text-3xl font-extrabold tracking-[0.3em] text-neutral-900 dark:text-white">
              {pin}
            </p>
            <p className="mt-1 text-xs font-medium text-neutral-400 dark:text-neutral-500">
              Joiners must enter this PIN to get in.
            </p>
          </div>
        )}

        {/* CTA */}
        <div className="flex gap-2">
          <button
            onClick={copyAndGo}
            className="flex-1 rounded-full border border-neutral-200 py-3 text-sm font-semibold text-neutral-700 transition hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-200 dark:hover:border-neutral-500"
          >
            {copied ? '✓ Copied!' : 'Copy link & go'}
          </button>
          <button
            onClick={go}
            className="flex-1 rounded-full bg-neutral-900 py-3 text-sm font-semibold text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Go to room →
          </button>
        </div>
      </div>
    </div>
  )
}
