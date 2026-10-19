import { useEffect, useRef, useState } from 'react'
import { Bell, Database, Monitor, Moon, Share2, SlidersHorizontal, Sparkles, Sun, X } from 'lucide-react'
import { AI_MODELS, aiTest, providerOfModel, safeModel } from '../ai'
import { todayKey } from '../utils'
import { pullState } from '../sync'
import { listSnapshots, saveSnapshot } from '../snapshots'
import ByokSettings from './ByokSettings'
import Select from './Select'

const SECTIONS = [
  { id: 'general', label: 'General', Icon: SlidersHorizontal, desc: 'Look and feel.' },
  { id: 'notifications', label: 'Notifications', Icon: Bell, desc: 'When HabitTube should nudge you.' },
  { id: 'ai', label: 'AI coach', Icon: Sparkles, desc: 'The coach, its model, and your own key.' },
  { id: 'data', label: 'Data & backup', Icon: Database, desc: 'Sync, export, import and restore.' },
  { id: 'sharing', label: 'Sharing', Icon: Share2, desc: 'Control what others can see.' },
]

const labelCls = 'mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500'
const outlineBtn =
  'rounded-full border border-neutral-200 py-2.5 text-sm font-semibold text-neutral-700 transition hover:border-neutral-400 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:border-neutral-500'

function Toggle({ on, onClick, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-200 dark:bg-neutral-700'}`}
    >
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition dark:bg-neutral-900 ${on ? 'left-6' : 'left-1'}`} />
    </button>
  )
}

function Row({ title, desc, children }) {
  return (
    <div className="glass flex items-center justify-between gap-4 rounded-2xl p-4">
      <div className="min-w-0">
        <p className="font-bold text-neutral-900 dark:text-white">{title}</p>
        {desc && <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500">{desc}</p>}
      </div>
      {children}
    </div>
  )
}

export default function SettingsPanel({
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
  arcNotify,
  onToggleArcNotify,
  onSetTheme,
  onRestore,
  onClose,
}) {
  const [section, setSection] = useState('general')
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
      aiModel: typeof parsed.aiModel === 'string' ? parsed.aiModel : 'openai/gpt-oss-120b',
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
        setRestoreMsg('Restored.')
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


  const current = SECTIONS.find((s) => s.id === section)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 backdrop-blur-sm sm:p-6 dark:bg-black/60"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-label="Settings"
        className="animate-fade-up glass-strong flex w-full max-w-5xl flex-col overflow-hidden rounded-3xl shadow-2xl md:flex-row"
        style={{ height: 'min(88dvh, 780px)' }}
      >
        {/* section list */}
        <aside className="flex shrink-0 flex-col border-b border-neutral-200/70 p-3 md:w-60 md:border-b-0 md:border-r md:p-5 dark:border-neutral-800">
          <div className="mb-3 hidden items-center justify-between md:flex">
            <h2 className="text-xl font-extrabold tracking-tight text-neutral-900 dark:text-white">Settings</h2>
          </div>
          <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
            {SECTIONS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setSection(id)}
                aria-current={section === id ? 'page' : undefined}
                className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                  section === id
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                    : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.9} />
                {label}
              </button>
            ))}
          </nav>
          <div className="mt-auto hidden pt-6 text-xs font-semibold text-neutral-400 md:block dark:text-neutral-500">
            HabitTube v1.0 ·{' '}
            <a href="https://sumantsagar73.github.io/habitTube/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-neutral-900 dark:hover:text-white">
              User manual
            </a>
          </div>
        </aside>

        {/* section content */}
        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-white">{current.label}</h3>
              <p className="mt-1 text-sm font-medium text-neutral-400 dark:text-neutral-500">{current.desc}</p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close settings"
              className="rounded-full border border-neutral-200 p-2 text-neutral-500 transition hover:border-neutral-400 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-w-2xl space-y-4">
            {section === 'general' && (
              <>
                <div>
                  <label className={labelCls}>Appearance</label>
                  <div className="flex gap-1 rounded-full border border-neutral-200 p-1 dark:border-neutral-800">
                    {[
                      ['light', Sun, 'Light'],
                      ['dark', Moon, 'Dark'],
                      ['auto', Monitor, 'Auto'],
                    ].map(([val, Icon, label]) => (
                      <button
                        key={val}
                        onClick={() => onSetTheme(val)}
                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-sm font-bold transition ${
                          theme === val
                            ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                            : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                        {label}
                      </button>
                    ))}
                  </div>
                  {theme === 'auto' && (
                    <p className="mt-1.5 text-xs font-medium text-neutral-400 dark:text-neutral-500">Follows your OS dark/light mode preference.</p>
                  )}
                </div>
                <Row title="Sound effects" desc="Chimes and audio alerts for the focus timer and reminders">
                  <Toggle on={soundEnabled} onClick={onToggleSound} label="Sound effects" />
                </Row>
              </>
            )}

            {section === 'notifications' && (
              <>
                <Row title="Daily reminders" desc="Habit times, plan (9am), check-ins (1pm, 5pm) and night review (9pm)">
                  <Toggle on={remindersEnabled} onClick={onToggleReminders} label="Daily reminders" />
                </Row>
                {remindersEnabled && notifBlocked && (
                  <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                    Notifications are blocked in your browser — allow them for this site to get reminders.
                  </p>
                )}
                {remindersEnabled && !notifBlocked && (
                  <p className="text-xs font-medium text-neutral-400 dark:text-neutral-500">Reminders fire while HabitTube is open in a tab.</p>
                )}
                <Row title="Arc nudges" desc="Notify me when an arc goes quiet, a new week is ready, or it is about to end">
                  <Toggle on={arcNotify} onClick={onToggleArcNotify} label="Arc nudges" />
                </Row>
              </>
            )}

            {section === 'ai' && (
              <>
                <Row title="AI coach" desc="Daily read, insights, reviews and arcs">
                  <Toggle on={aiEnabled} onClick={onToggleAi} label="AI coach" />
                </Row>
                {aiEnabled && (
                  <>
                    <div>
                      <label className={labelCls}>Model</label>
                      <Select value={safeModel(aiModel)} onChange={(e) => onSetModel(e.target.value)}>
                        {AI_MODELS.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.provider} · {m.label}
                          </option>
                        ))}
                      </Select>
                      <button onClick={test} disabled={testState === 'testing'} className={`mt-4 w-full ${outlineBtn}`}>
                        {testState === 'testing'
                          ? 'Testing connection…'
                          : testState === 'ok'
                            ? `Connected to ${providerOfModel(safeModel(aiModel))}`
                            : testState === 'fail'
                              ? 'Test failed — retry'
                              : 'Test AI connection'}
                      </button>
                      {testState === 'fail' && testMsg && (
                        <p className="mt-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">{testMsg}</p>
                      )}
                    </div>
                    <ByokSettings />
                  </>
                )}
              </>
            )}

            {section === 'data' && (
              <>
                <div className="glass rounded-2xl p-4">
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
                          className="flex-1 rounded-full border border-neutral-200 bg-transparent px-4 py-2 text-sm font-semibold text-neutral-800 transition hover:border-neutral-400 focus:border-neutral-400 focus:outline-none dark:border-neutral-700 dark:text-white dark:hover:border-neutral-500 dark:focus:border-neutral-500"
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

                <div>
                  <label className={labelCls}>Your data</label>
                  <div className="flex gap-2">
                    <button onClick={downloadBackup} className={`flex-1 ${outlineBtn}`}>Download backup</button>
                    <button onClick={() => fileRef.current?.click()} className={`flex-1 ${outlineBtn}`}>Restore backup</button>
                    <input ref={fileRef} type="file" accept="application/json,.json" onChange={onPickFile} className="hidden" />
                  </div>
                  {restoreMsg && <p className="mt-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">{restoreMsg}</p>}
                </div>

                {userId && (
                  <div>
                    <label className={labelCls}>Restore a previous version</label>
                    <div className="glass rounded-2xl p-4">
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
                        <div className="max-h-64 space-y-1.5 overflow-y-auto">
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
                  </div>
                )}
              </>
            )}

            {section === 'sharing' && (
              <div className="glass space-y-3 rounded-2xl p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-neutral-900 dark:text-white">Share my progress</p>
                    <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500">Anyone with the link can see your habits and goals</p>
                  </div>
                  <Toggle on={shareProfile} onClick={onToggleShare} label="Share my progress" />
                </div>
                {shareProfile && userId && (
                  <button
                    onClick={() => {
                      const link = window.location.origin + '?p=' + userId
                      navigator.clipboard.writeText(link).then(() => alert('Link copied!')).catch(() => alert(link))
                    }}
                    className={`w-full ${outlineBtn} py-2`}
                  >
                    Copy share link
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
