import { useEffect, useRef, useState } from 'react'
import { aiChatStream, aiCoachReply, buildCoachContext, parseProposal } from '../ai'
import { uid } from '../utils'
import AIText from './AIText'

const LEVEL_BADGE = { year: 'Year', quarter: 'Quarter', month: 'Month', week: 'Week' }

function streamDisplay(text) {
  return text.split('```')[0].split(/\{\s*"plan"/)[0].trimEnd()
}

function updateSummary(u) {
  const s = u.set || {}
  if (u.target === 'task') {
    if (s.priority) return `priority → ${s.priority}`
    if (s.done != null) return s.done ? 'mark done' : 'reopen'
    return 'update'
  }
  if (s.done === true) return 'mark done'
  if (s.done === false) return 'reopen'
  if (s.target != null) return `target → ${s.target}`
  if (s.manualPct != null) return `${s.manualPct}%`
  return 'update'
}

function fmtDate(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return 'Today'
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const DAY_ABBR = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function ProposalCard({ items, applied, dismissed, onAdd, onDismiss }) {
  const goals = items.filter((i) => i.kind === 'goal')
  const habits = items.filter((i) => i.kind === 'habit')
  const tasks = items.filter((i) => i.kind === 'task')
  const updates = items.filter((i) => i.kind === 'update')
  return (
    <div className="mt-2 max-w-[85%] rounded-2xl border border-neutral-300 p-4 dark:border-neutral-700">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">
        Proposed plan · {items.length} item{items.length > 1 ? 's' : ''}
      </p>
      <div className="space-y-2">
        {goals.map((g, i) => (
          <div key={`g${i}`} className="flex items-center gap-2.5">
            <span className="w-16 shrink-0 rounded-full border border-neutral-200 px-2 py-0.5 text-center text-[10px] font-bold uppercase tracking-[0.06em] text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
              {LEVEL_BADGE[g.level] || 'Goal'}
            </span>
            <span className="flex-1 text-sm font-semibold text-neutral-800 dark:text-neutral-100">{g.title}</span>
            {g.type === 'numeric' && (
              <span className="shrink-0 text-xs font-medium text-neutral-400 dark:text-neutral-500">→ {g.target} {g.unit}</span>
            )}
          </div>
        ))}
        {habits.map((h, i) => (
          <div key={`h${i}`} className="flex items-center gap-2.5">
            <span className="w-16 shrink-0 rounded-full border border-neutral-200 px-2 py-0.5 text-center text-[10px] font-bold uppercase tracking-[0.06em] text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
              Habit
            </span>
            <span className="flex-1 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
              {h.emoji && <span className="mr-1">{h.emoji}</span>}{h.name}
            </span>
            <span className="shrink-0 text-xs font-medium text-neutral-400 dark:text-neutral-500">
              {Array.isArray(h.days) ? h.days.map((d) => DAY_ABBR[d]).join(' ') : 'daily'}{h.time ? ` · ${h.time}` : ''}
            </span>
          </div>
        ))}
        {tasks.map((t, i) => (
          <div key={`t${i}`} className="flex items-center gap-2.5">
            <span className="w-16 shrink-0 rounded-full border border-neutral-200 px-2 py-0.5 text-center text-[10px] font-bold uppercase tracking-[0.06em] text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
              Task
            </span>
            <span className="flex-1 text-sm font-semibold text-neutral-800 dark:text-neutral-100">{t.title}</span>
            <span className="shrink-0 text-xs font-medium text-neutral-400 dark:text-neutral-500">
              {!t.dayOffset ? 'today' : `in ${t.dayOffset}d`}
            </span>
          </div>
        ))}
        {updates.map((u, i) => (
          <div key={`u${i}`} className="flex items-center gap-2.5">
            <span className="w-16 shrink-0 rounded-full bg-neutral-900 px-2 py-0.5 text-center text-[10px] font-bold uppercase tracking-[0.06em] text-white dark:bg-white dark:text-neutral-900">
              Update
            </span>
            <span className="flex-1 truncate text-sm font-semibold text-neutral-800 dark:text-neutral-100">{u.title}</span>
            <span className="shrink-0 text-xs font-medium text-neutral-400 dark:text-neutral-500">{updateSummary(u)}</span>
          </div>
        ))}
      </div>
      {applied ? (
        <p className="mt-3 text-sm font-bold text-neutral-900 dark:text-white">✓ Added to your plan — see the Plan tab.</p>
      ) : dismissed ? (
        <p className="mt-3 text-sm font-medium text-neutral-400 dark:text-neutral-500">Dismissed.</p>
      ) : (
        <div className="mt-4 flex gap-2">
          <button onClick={onAdd} className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200">
            Add to my plan
          </button>
          <button onClick={onDismiss} className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-500 transition hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-400">
            Dismiss
          </button>
        </div>
      )}
    </div>
  )
}

const STARTERS = [
  'I want to build a workout habit',
  'Help me plan my week',
  'How am I doing this week?',
  'I keep skipping my habits — help me fix it.',
  'Build me a complete fitness plan',
  'Should I push harder or slow down?',
  'Help me plan a realistic week.',
]

export default function CoachChat({ enabled, model, data, chatSessions, activeChatId, onSetChatSessions, onSetActiveChatId, onApplyPlan }) {
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const endRef = useRef(null)

  const activeSession = chatSessions.find((s) => s.id === activeChatId) || null
  const messages = activeSession?.messages || []

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, streaming])

  // Reset input error on session switch
  useEffect(() => {
    setError('')
    setStreaming(null)
  }, [activeChatId])

  function upsertSession(sessionId, patch) {
    onSetChatSessions((prev) => {
      const exists = prev.find((s) => s.id === sessionId)
      if (exists) return prev.map((s) => (s.id === sessionId ? { ...s, ...patch, updatedAt: Date.now() } : s))
      return [{ id: sessionId, title: 'New chat', createdAt: Date.now(), updatedAt: Date.now(), messages: [], ...patch }, ...prev]
    })
  }

  function newChat() {
    const id = uid()
    onSetChatSessions((prev) => [{ id, title: 'New chat', createdAt: Date.now(), updatedAt: Date.now(), messages: [] }, ...prev])
    onSetActiveChatId(id)
    setSidebarOpen(false)
    setInput('')
    setError('')
  }

  function deleteSession(id, e) {
    e.stopPropagation()
    if (!window.confirm('Delete this conversation?')) return
    onSetChatSessions((prev) => {
      const remaining = prev.filter((s) => s.id !== id)
      if (activeChatId === id) onSetActiveChatId(remaining[0]?.id || null)
      return remaining
    })
  }

  async function send(text) {
    const content = text.trim()
    if (!content || busy) return
    setInput('')
    setError('')

    let sessionId = activeChatId
    const sessionExists = chatSessions.find((s) => s.id === sessionId)

    if (!sessionId || !sessionExists) {
      sessionId = uid()
      onSetActiveChatId(sessionId)
    }

    const prevMessages = sessionExists ? sessionExists.messages : []
    const next = [...prevMessages, { role: 'user', content }]

    // Title from first message
    const isFirst = prevMessages.length === 0
    upsertSession(sessionId, { messages: next, ...(isFirst ? { title: content.slice(0, 50) } : {}) })

    setBusy(true)
    setStreaming('')
    try {
      const context = buildCoachContext(data)
      let acc = ''
      try {
        for await (const delta of aiChatStream(next, context, model)) {
          acc += delta
          setStreaming(acc)
        }
      } catch {
        // streaming failed — fall back to non-streaming
      }
      if (!acc.trim()) {
        setStreaming('')
        acc = await aiCoachReply(next, context, model)
      }
      const { clean, proposal } = parseProposal(acc)
      const finalMessages = [...next, { role: 'assistant', content: clean || acc || '…', proposal }]
      upsertSession(sessionId, { messages: finalMessages })
    } catch (e) {
      setError(e.message || 'Something went wrong reaching the AI.')
      // keep user message in the session
    } finally {
      setStreaming(null)
      setBusy(false)
    }
  }

  function applyProposal(msgIdx) {
    if (!activeSession) return
    onApplyPlan(messages[msgIdx].proposal)
    upsertSession(activeChatId, { messages: messages.map((m, i) => (i === msgIdx ? { ...m, applied: true } : m)) })
  }

  function dismissProposal(msgIdx) {
    if (!activeSession) return
    upsertSession(activeChatId, { messages: messages.map((m, i) => (i === msgIdx ? { ...m, dismissed: true } : m)) })
  }

  if (!enabled) {
    return (
      <div className="rounded-3xl border border-dashed border-neutral-300 p-12 text-center dark:border-neutral-700">
        <p className="mb-1 font-bold text-neutral-900 dark:text-white">AI coach is turned off</p>
        <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500">
          Open Settings (the gear icon) and switch the AI coach on to chat.
        </p>
      </div>
    )
  }

  const empty = messages.length === 0 && !streaming

  return (
    <div className="flex h-[calc(100vh-200px)] min-h-[500px] overflow-hidden rounded-3xl border border-neutral-200 dark:border-neutral-800">
      {/* Sidebar */}
      <aside className={`flex flex-col border-r border-neutral-200 bg-neutral-50 transition-all dark:border-neutral-800 dark:bg-[#0d0d0d] ${sidebarOpen ? 'w-64' : 'hidden md:flex md:w-64'}`}>
        <div className="p-3">
          <button
            onClick={newChat}
            className="flex w-full items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2.5 text-sm font-semibold text-neutral-700 transition hover:border-neutral-400 hover:bg-white dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {chatSessions.length === 0 ? (
            <p className="px-2 py-4 text-xs font-medium text-neutral-400 dark:text-neutral-600">No conversations yet</p>
          ) : (
            <div className="space-y-0.5">
              {chatSessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { onSetActiveChatId(s.id); setSidebarOpen(false) }}
                  className={`group flex w-full items-start gap-2 rounded-xl px-3 py-2.5 text-left transition ${
                    s.id === activeChatId
                      ? 'bg-neutral-200 dark:bg-neutral-800'
                      : 'hover:bg-neutral-100 dark:hover:bg-neutral-800/60'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-neutral-800 dark:text-neutral-100">{s.title}</p>
                    <p className="text-[11px] font-medium text-neutral-400 dark:text-neutral-600">{fmtDate(s.updatedAt || s.createdAt)}</p>
                  </div>
                  <span
                    onClick={(e) => deleteSession(s.id, e)}
                    className="mt-0.5 shrink-0 rounded p-0.5 text-neutral-300 opacity-0 transition hover:text-neutral-600 group-hover:opacity-100 dark:text-neutral-600 dark:hover:text-neutral-300"
                    title="Delete"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Chat area */}
      <div className="flex flex-1 flex-col overflow-hidden dark:bg-[#111]">
        {/* header */}
        <div className="flex items-center gap-3 border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
          {/* Mobile: hamburger to toggle sidebar */}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition hover:text-neutral-900 dark:text-neutral-500 dark:hover:text-white md:hidden"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white dark:bg-white dark:text-neutral-900">AI</span>
            <div>
              <p className="font-bold text-neutral-900 dark:text-white">
                {activeSession?.title || 'Your coach'}
              </p>
              <p className="text-xs font-medium text-neutral-400 dark:text-neutral-500">Knows your habits, goals & pace</p>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={newChat}
              className="ml-auto rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-bold text-neutral-500 transition hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-500"
            >
              New chat
            </button>
          )}
        </div>

        {/* messages */}
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {empty ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="max-w-sm font-serif text-2xl italic leading-snug text-neutral-700 dark:text-neutral-200">
                Talk to me. Ask how you're doing, where you're slipping, or whether to push or rest.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-neutral-200 px-3.5 py-2 text-sm font-medium text-neutral-600 transition hover:border-neutral-400 hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500 dark:hover:text-white"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((m, i) =>
                m.role === 'user' ? (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-br-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-neutral-900">
                      {m.content}
                    </div>
                  </div>
                ) : (
                  <div key={i} className="flex flex-col items-start">
                    <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-neutral-200 px-4 py-3 dark:border-neutral-800">
                      <AIText text={m.content} />
                    </div>
                    {m.proposal && (
                      <ProposalCard
                        items={m.proposal}
                        applied={m.applied}
                        dismissed={m.dismissed}
                        onAdd={() => applyProposal(i)}
                        onDismiss={() => dismissProposal(i)}
                      />
                    )}
                  </div>
                )
              )}
              {streaming != null && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-neutral-200 px-4 py-3 dark:border-neutral-800">
                    {streaming && streamDisplay(streaming) ? (
                      <AIText text={streamDisplay(streaming)} />
                    ) : (
                      <span className="text-sm font-medium text-neutral-400">{streaming ? 'Putting together a plan…' : 'Thinking…'}</span>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
          {error && <p className="text-center text-sm font-medium text-neutral-500 dark:text-neutral-400">{error}</p>}
          <div ref={endRef} />
        </div>

        {/* composer */}
        <div className="border-t border-neutral-200 p-3 dark:border-neutral-800">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send(input)
                }
              }}
              rows={1}
              placeholder="Message your coach…  (Enter to send)"
              className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl border border-neutral-200 bg-transparent px-4 py-3 text-sm font-medium text-neutral-900 outline-none transition focus:border-neutral-900 placeholder:text-neutral-400 dark:border-neutral-800 dark:text-white dark:placeholder:text-neutral-600 dark:focus:border-white"
            />
            <button
              onClick={() => send(input)}
              disabled={busy || !input.trim()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-neutral-900 text-white transition hover:bg-neutral-700 disabled:opacity-40 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
              title="Send"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
