import { useEffect, useRef, useState } from 'react'
import { AI_MODELS, aiTest } from '../ai'
import { todayKey } from '../utils'
import { pullState } from '../sync'
import { listSnapshots, saveSnapshot } from '../snapshots'
import Select from './Select'

export default function SettingsModal({
  aiEnabled,
  aiModel,
  remindersEnabled,
  soundEnabled,
  theme,
  data,
  userId,
  shareProfile,
  onToggleShare,
  onToggleAi,
  onSetModel,
  onToggleReminders,
  onToggleSound,
  onSetTheme,
  onRestore,
  onClose,
}) {
  const [testState, setTestState] = useState('') // '', 'testing', 'ok', 'fail'
  const [testMsg, setTestMsg] = useState('')
  const [restoreMsg, setRestoreMsg] = useState('')
  const fileRef = useRef(null)
  const notifBlocked = typeof Notification !== 'undefined' && Notification.permission === 'denied'
  const [importId, setImportId] = useState('')
  const [importState, setImportState] = useState('') // '', 'loading', 'ok', 'fail'
  const [importMsg, setImportMsg] = useState('')

  // Backup snapshots (point-in-time restore)
  const [snapshots, setSnapshots] = useState(null) // null = not loaded yet
  const [snapMsg, setSnapMsg] = useState('')
  useEffect(() => {
    if (!userId) return
    listSnapshots(userId).then(setSnapshots).catch(() => setSnapshots([]))
  }, [userId])

  function countLabel(state) {
    const habits = (state?.habits || []).length
    const tasks = Object.values(state?.tasks || {}).reduce((a, arr) => a + (arr?.length || 0), 0)
    const goals = (state?.goals || []).length
    return `${habits} habits · ${goals} goals · ${tasks} tasks`
  }

  async function restoreSnapshot(snap) {
    if (!window.confirm(`Restore your data to ${new Date(snap.createdAt).toLocaleString()}?\n\n${countLabel(snap.state)}\n\nYour current data is snapshotted first, so this is undoable.`)) return
    setSnapMsg('Restoring…')
    // Safety net: snapshot the current state before overwriting it
    await saveSnapshot(userId, data, 'pre-restore')
    onRestore(snap.state)
    setSnapMsg('Restored — syncing to your account now.')
    listSnapshots(userId).then(setSnapshots).catch(() => {})
  }

  // Merge two lists of {id, ...} objects, keeping current items on conflict
  function mergeById(current = [], imported = []) {
    const map = new Map()
    for (const x of imported) if (x && x.id) map.set(x.id, x)
    for (const x of current) if (x && x.id) map.set(x.id, x)
    return [...map.values()]
  }

  // Merge date-keyed maps of task arrays: union of dates, union of tasks per date
  function mergeTaskMap(current = {}, imported = {}) {
    const out = { ...imported, ...current }
    for (const k of Object.keys(imported)) {
      if (Array.isArray(current[k]) && Array.isArray(imported[k])) {
        const ids = new Set(current[k].map((t) => t.id))
        out[k] = [...current[k], ...imported[k].filter((t) => !ids.has(t.id))]
      }
    }
    return out
  }

  // Merge date-keyed maps of habit-id arrays (completions)
  function mergeCompletions(current = {}, imported = {}) {
    const out = { ...imported, ...current }
    for (const k of Object.keys(imported)) {
      if (Array.isArray(current[k]) && Array.isArray(imported[k])) {
        out[k] = [...new Set([...current[k], ...imported[k]])]
      }
    }
    return out
  }

  // Additive merge: nothing in the current data is ever removed
  function mergeStates(current, imported) {
    return {
      ...current,
      habits: mergeById(current.habits, imported.habits),
      goals: mergeById(current.goals, imported.goals),
      tasks: mergeTaskMap(current.tasks, imported.tasks),
      completions: mergeCompletions(current.completions, imported.completions),
      notes: { ...imported.notes, ...current.notes },
      missNotes: { ...imported.missNotes, ...current.missNotes },
      moods: { ...imported.moods, ...current.moods },
      visions: { ...imported.visions, ...current.visions },
      reviews: { ...imported.reviews, ...current.reviews },
      focusLog: (() => {
        const seen = new Set((current.focusLog || []).map((f) => JSON.stringify(f)))
        return [...(current.focusLog || []), ...(imported.focusLog || []).filter((f) => !seen.has(JSON.stringify(f)))]
      })(),
    }
  }

  // Pull data stored under an old/other sync ID and MERGE it into this account.
  // Never deletes anything; stashes a pre-import snapshot for undo.
  async function handleImportOldId() {
    const oldId = importId.trim()
    if (!oldId) return
    setImportState('loading')
    setImportMsg('')
    try {
      const remote = await pullState(oldId)
      if (!remote || !remote.state) {
        setImportState('fail')
        setImportMsg(`No data found for ID "${oldId}".`)
        return
      }
      const sanitized = validateAndSanitizeBackup(remote.state)
      if (!window.confirm(`Found ${sanitized.habits.length} habits and ${sanitized.goals.length} goals under "${oldId}". Merge them into this account? Your existing data is kept — nothing gets deleted.`)) {
        setImportState('')
        return
      }
      try {
        localStorage.setItem('habittube-pre-import-backup', JSON.stringify({ savedAt: Date.now(), data }))
      } catch { /* storage full — merge is additive anyway */ }
      await saveSnapshot(userId, data, 'pre-import') // durable safety net
      onRestore(mergeStates(data, sanitized))
      setImportState('ok')
      setImportMsg('Merged — it will sync to your account in a moment.')
      setImportId('')
    } catch (e) {
      setImportState('fail')
      setImportMsg(e.message || 'Import failed.')
    }
  }

  function downloadBackup() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `habittube-backup-${todayKey()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function validateAndSanitizeBackup(parsed) {
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Backup data must be a JSON object.')
    }
    if (!Array.isArray(parsed.habits)) {
      throw new Error('Invalid backup: "habits" must be an array.')
    }
    return {
      habits: parsed.habits.filter(h => h && typeof h === 'object' && typeof h.name === 'string'),
      completions: parsed.completions && typeof parsed.completions === 'object' && !Array.isArray(parsed.completions) ? parsed.completions : {},
      notes: parsed.notes && typeof parsed.notes === 'object' && !Array.isArray(parsed.notes) ? parsed.notes : {},
      missNotes: parsed.missNotes && typeof parsed.missNotes === 'object' && !Array.isArray(parsed.missNotes) ? parsed.missNotes : {},
      goals: Array.isArray(parsed.goals) ? parsed.goals.filter(g => g && typeof g === 'object') : [],
      tasks: parsed.tasks && typeof parsed.tasks === 'object' && !Array.isArray(parsed.tasks) ? parsed.tasks : {},
      visions: parsed.visions && typeof parsed.visions === 'object' && !Array.isArray(parsed.visions) ? parsed.visions : {},
      reviews: parsed.reviews && typeof parsed.reviews === 'object' && !Array.isArray(parsed.reviews) ? parsed.reviews : {},
      aiEnabled: typeof parsed.aiEnabled === 'boolean' ? parsed.aiEnabled : true,
      aiModel: typeof parsed.aiModel === 'string' ? parsed.aiModel : 'llama-3.3-70b-versatile',
      ai: parsed.ai && typeof parsed.ai === 'object' ? parsed.ai : { motivation: null, insights: null },
      chat: parsed.chat && typeof parsed.chat === 'object' && Array.isArray(parsed.chat.messages) ? parsed.chat : { messages: [] },
      moods: parsed.moods && typeof parsed.moods === 'object' && !Array.isArray(parsed.moods) ? parsed.moods : {},
      focusLog: Array.isArray(parsed.focusLog) ? parsed.focusLog.filter(f => f && typeof f === 'object') : [],
      remindersEnabled: typeof parsed.remindersEnabled === 'boolean' ? parsed.remindersEnabled : false,
      soundEnabled: typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : true,
      theme: ['light', 'dark', 'auto'].includes(parsed.theme) ? parsed.theme : 'dark',
    }
  }

  function onPickFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result)
        const sanitized = validateAndSanitizeBackup(parsed)
        if (!window.confirm('Restore this backup? It replaces your current data.')) return
        onRestore(sanitized)
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
      <div className="animate-fade-up w-full max-w-md overflow-y-auto rounded-3xl border border-neutral-200 bg-white p-7 shadow-2xl dark:border-neutral-800 dark:bg-[#111]" style={{ maxHeight: '90dvh' }}>
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

        {/* sound toggle */}
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
          <div>
            <p className="font-bold text-neutral-900 dark:text-white">Sound effects</p>
            <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500">
              Chimes and audio alerts for focus timer and reminders
            </p>
          </div>
          <button
            onClick={onToggleSound}
            className={`relative h-7 w-12 rounded-full transition ${soundEnabled ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-200 dark:bg-neutral-700'}`}
          >
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition dark:bg-neutral-900 ${soundEnabled ? 'left-6' : 'left-1'}`} />
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

        {/* theme */}
        <div className="mt-4">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">
            Appearance
          </label>
          <div className="flex gap-1 rounded-full border border-neutral-200 p-1 dark:border-neutral-800">
            {[
              ['light', <><svg className="inline h-3.5 w-3.5 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>Light</>],
              ['dark', <><svg className="inline h-3.5 w-3.5 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>Dark</>],
              ['auto', <><svg className="inline h-3.5 w-3.5 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>Auto</>],
            ].map(([val, label]) => (
              <button
                key={val}
                onClick={() => onSetTheme(val)}
                className={`flex flex-1 items-center justify-center gap-0.5 rounded-full py-2 text-xs font-bold transition ${
                  theme === val
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                    : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {theme === 'auto' && (
            <p className="mt-1.5 text-xs font-medium text-neutral-400 dark:text-neutral-500">
              Follows your OS dark/light mode preference.
            </p>
          )}
        </div>

        {/* public profile */}
        <label className="mt-6 mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">
          Public profile
        </label>
        <div className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-neutral-900 dark:text-white">Share my progress</p>
              <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500">Anyone with the link can see your habits & goals</p>
            </div>
            <button
              onClick={onToggleShare}
              className={`relative h-7 w-12 rounded-full transition ${shareProfile ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-200 dark:bg-neutral-700'}`}
            >
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition dark:bg-neutral-900 ${shareProfile ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
          {shareProfile && userId && (
            <button
              onClick={() => {
                const link = window.location.origin + '?p=' + userId
                navigator.clipboard.writeText(link).then(() => alert('Link copied!')).catch(() => alert(link))
              }}
              className="w-full rounded-full border border-neutral-200 py-2 text-sm font-semibold text-neutral-700 transition hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-200 dark:hover:border-neutral-500"
            >
              Copy share link
            </button>
          )}
        </div>

        {/* synchronization settings */}
        <label className="mt-6 mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">
          Synchronization
        </label>
        <div className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
          <p className="font-bold text-neutral-900 dark:text-white">Account sync</p>
          <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500">
            {userId
              ? 'Your data syncs to your account — sign in with the same email on any device (web or mobile app) to see the same data.'
              : 'You are not signed in. Data is stored only in this browser — sign in to sync it across devices.'}
          </p>
          {userId && (
            <p className="mt-2 break-all rounded-lg bg-neutral-100 px-3 py-1.5 font-mono text-[11px] text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400" title="Your account ID (read-only)">
              {userId}
            </p>
          )}
          {userId && (
            <div className="mt-4 border-t border-neutral-100 pt-4 dark:border-neutral-800">
              <p className="font-bold text-neutral-900 dark:text-white">Import from an old sync ID</p>
              <p className="mb-3 text-sm font-medium text-neutral-400 dark:text-neutral-500">
                Used the app before accounts existed? Enter your old sync ID to merge that data into this account — nothing here gets deleted.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={importId}
                  onChange={(e) => setImportId(e.target.value)}
                  placeholder="e.g. sumant_data"
                  className="flex-1 rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-800 transition hover:border-neutral-400 focus:border-neutral-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:border-neutral-500 dark:focus:border-neutral-500"
                />
                <button
                  onClick={handleImportOldId}
                  disabled={importState === 'loading'}
                  className="rounded-full bg-neutral-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                >
                  {importState === 'loading' ? '…' : 'Import'}
                </button>
              </div>
              {importMsg && (
                <p className={`mt-2 text-sm font-medium ${importState === 'ok' ? 'text-emerald-500' : 'text-red-500'}`}>{importMsg}</p>
              )}
            </div>
          )}
        </div>

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

        {/* Point-in-time restore from automatic cloud snapshots */}
        {userId && (
          <>
            <label className="mt-6 mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">
              Restore a previous version
            </label>
            <div className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
              <p className="mb-3 text-sm font-medium text-neutral-400 dark:text-neutral-500">
                Automatic daily backups of your account. Pick a date to roll back to — your current data is snapshotted first, so it's undoable.
              </p>
              {snapshots === null ? (
                <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500">Loading…</p>
              ) : snapshots.length === 0 ? (
                <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500">
                  No snapshots yet. They start once the <span className="font-mono">state_snapshots</span> table exists and you reopen the app on a new day.
                </p>
              ) : (
                <div className="max-h-56 space-y-1.5 overflow-y-auto">
                  {snapshots.map((s) => (
                    <div key={s.id} className="flex items-center gap-2 rounded-xl border border-neutral-100 px-3 py-2 dark:border-neutral-800/70">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-neutral-800 dark:text-neutral-100">
                          {new Date(s.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                          {s.reason && s.reason !== 'daily' && (
                            <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">{s.reason.replace('pre-', 'before ')}</span>
                          )}
                        </p>
                        <p className="truncate text-xs font-medium text-neutral-400 dark:text-neutral-500">{countLabel(s.state)}</p>
                      </div>
                      <button
                        onClick={() => restoreSnapshot(s)}
                        className="shrink-0 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-bold text-neutral-600 transition hover:border-neutral-400 hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500 dark:hover:text-white"
                      >
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {snapMsg && <p className="mt-2 text-sm font-medium text-emerald-500">{snapMsg}</p>}
            </div>
          </>
        )}

        <p className="mt-6 text-xs leading-relaxed font-medium text-neutral-400 dark:text-neutral-500">
          AI runs through a server-side proxy that injects the Groq API key, so the key never enters the browser bundle.
          It works both on the deployed site (via the <span className="font-bold">/api/groq</span> serverless function) and
          locally with <span className="font-bold">npm run dev</span>. Install HabitTube to your device from your
          browser's "Install app" option.
        </p>

        <div className="mt-6 flex items-center justify-between border-t border-neutral-100 pt-5 dark:border-neutral-800">
          <span className="text-xs font-semibold text-neutral-400 dark:text-neutral-500">HabitTube v1.0</span>
          <a
            href="https://sumantsagar73.github.io/habitTube/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-full border border-neutral-200 px-3.5 py-1.5 text-xs font-semibold text-neutral-600 transition hover:border-neutral-400 hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500 dark:hover:text-white"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
            User manual
          </a>
        </div>
      </div>
    </div>
  )
}
