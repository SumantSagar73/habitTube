import { useRef, useState } from 'react'
import { AI_MODELS, aiTest } from '../ai'
import { todayKey } from '../utils'
import Select from './Select'

export default function SettingsModal({
  aiEnabled,
  aiModel,
  remindersEnabled,
  data,
  onToggleAi,
  onSetModel,
  onToggleReminders,
  onRestore,
  onClose,
}) {
  const [testState, setTestState] = useState('') // '', 'testing', 'ok', 'fail'
  const [testMsg, setTestMsg] = useState('')
  const [restoreMsg, setRestoreMsg] = useState('')
  const fileRef = useRef(null)
  const notifBlocked = typeof Notification !== 'undefined' && Notification.permission === 'denied'

  function downloadBackup() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `habittube-backup-${todayKey()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function onPickFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result)
        if (!parsed || !Array.isArray(parsed.habits)) throw new Error('Not a HabitTube backup.')
        if (!window.confirm('Restore this backup? It replaces your current data.')) return
        onRestore(parsed)
        setRestoreMsg('✓ Restored.')
      } catch (err) {
        setRestoreMsg(`Could not restore: ${err.message}`)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  async function test() {
    setTestState('testing')
    setTestMsg('')
    try {
      const ok = await aiTest(aiModel)
      setTestState(ok ? 'ok' : 'fail')
      if (!ok) setTestMsg('Got a response, but not the expected one.')
    } catch (e) {
      setTestState('fail')
      setTestMsg(e.message)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm dark:bg-black/60"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="animate-fade-up w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-7 shadow-2xl dark:border-neutral-800 dark:bg-[#111]">
        <div className="mb-6 flex items-start justify-between">
          <h2 className="text-xl font-extrabold tracking-tight text-neutral-900 dark:text-white">Settings</h2>
          <button
            onClick={onClose}
            className="rounded-full border border-neutral-200 p-2 text-neutral-500 transition hover:border-neutral-400 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-600"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* AI toggle */}
        <div className="flex items-center justify-between rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
          <div>
            <p className="font-bold text-neutral-900 dark:text-white">AI coach</p>
            <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500">Daily motivation, insights & reviews</p>
          </div>
          <button
            onClick={onToggleAi}
            className={`relative h-7 w-12 rounded-full transition ${aiEnabled ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-200 dark:bg-neutral-700'}`}
          >
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition dark:bg-neutral-900 ${aiEnabled ? 'left-6' : 'left-1'}`} />
          </button>
        </div>

        {aiEnabled && (
          <>
            <label className="mt-5 mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">
              Model
            </label>
            <Select value={aiModel} onChange={(e) => onSetModel(e.target.value)}>
              {AI_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </Select>

            <button
              onClick={test}
              disabled={testState === 'testing'}
              className="mt-4 w-full rounded-full border border-neutral-200 py-2.5 font-semibold text-neutral-700 transition hover:border-neutral-400 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:border-neutral-500"
            >
              {testState === 'testing'
                ? 'Testing connection…'
                : testState === 'ok'
                  ? '✓ Connected to Groq'
                  : testState === 'fail'
                    ? '✗ Test failed — retry'
                    : 'Test AI connection'}
            </button>
            {testState === 'fail' && testMsg && (
              <p className="mt-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">{testMsg}</p>
            )}
          </>
        )}

        {/* reminders toggle */}
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
          <div>
            <p className="font-bold text-neutral-900 dark:text-white">Daily reminders</p>
            <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500">
              Habit times + plan (9am), check-ins (1pm, 5pm) &amp; night review (9pm)
            </p>
          </div>
          <button
            onClick={onToggleReminders}
            className={`relative h-7 w-12 rounded-full transition ${remindersEnabled ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-200 dark:bg-neutral-700'}`}
          >
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition dark:bg-neutral-900 ${remindersEnabled ? 'left-6' : 'left-1'}`} />
          </button>
        </div>
        {remindersEnabled && notifBlocked && (
          <p className="mt-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
            Notifications are blocked in your browser — allow them for this site to get reminders.
          </p>
        )}
        {remindersEnabled && !notifBlocked && (
          <p className="mt-2 text-xs font-medium text-neutral-400 dark:text-neutral-500">
            Reminders fire while HabitTube is open in a tab.
          </p>
        )}

        {/* data backup */}
        <label className="mt-6 mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">
          Your data
        </label>
        <div className="flex gap-2">
          <button
            onClick={downloadBackup}
            className="flex-1 rounded-full border border-neutral-200 py-2.5 text-sm font-semibold text-neutral-700 transition hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-200 dark:hover:border-neutral-500"
          >
            Download backup
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex-1 rounded-full border border-neutral-200 py-2.5 text-sm font-semibold text-neutral-700 transition hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-200 dark:hover:border-neutral-500"
          >
            Restore backup
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" onChange={onPickFile} className="hidden" />
        </div>
        {restoreMsg && <p className="mt-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">{restoreMsg}</p>}

        <p className="mt-6 text-xs leading-relaxed font-medium text-neutral-400 dark:text-neutral-500">
          AI runs through Groq via the local dev server, so your API key stays on your machine and never enters the
          browser. It works while the app runs with <span className="font-bold">npm run dev</span>. To change the key,
          edit <span className="font-bold">.env.local</span> and restart. Install HabitTube to your device from your
          browser’s “Install app” option.
        </p>
      </div>
    </div>
  )
}
