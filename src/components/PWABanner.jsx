import { useEffect, useState } from 'react'

export default function PWABanner() {
  const [prompt, setPrompt] = useState(null)
  const [hidden, setHidden] = useState(
    () => localStorage.getItem('pwa-banner-dismissed') === '1'
  )

  useEffect(() => {
    function handler(e) {
      e.preventDefault()
      setPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!prompt || hidden) return null

  function install() {
    prompt.prompt()
    prompt.userChoice.then(() => setPrompt(null))
  }

  function dismiss() {
    localStorage.setItem('pwa-banner-dismissed', '1')
    setHidden(true)
  }

  return (
    <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 px-4 md:bottom-6">
      <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 shadow-xl dark:border-neutral-700 dark:bg-[#161616]">
        <svg className="h-5 w-5 shrink-0 text-neutral-500 dark:text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/><path d="M12 6v6l3 3"/></svg>
        <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
          Install HabitTube for offline access
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={install}
            className="rounded-full bg-neutral-900 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Install
          </button>
          <button
            onClick={dismiss}
            className="rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-bold text-neutral-600 transition hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}
