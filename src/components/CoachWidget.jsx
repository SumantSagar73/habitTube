import { useEffect, useRef, useState } from 'react'
import { aiChatStream, aiCoachReply, buildCoachContext, parseProposal } from '../ai'
import AIText from './AIText'

function streamDisplay(text) {
  return text.split('```')[0].split(/\{\s*"plan"/)[0].trimEnd()
}

const LEVEL_BADGE = { year: 'Year', quarter: 'Quarter', month: 'Month', week: 'Week' }

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

function ProposalCard({ items, applied, dismissed, onAdd, onDismiss }) {
  const goals = items.filter((i) => i.kind === 'goal')
  const tasks = items.filter((i) => i.kind === 'task')
  const updates = items.filter((i) => i.kind === 'update')
  return (
    <div className="mt-2 max-w-[90%] rounded-2xl border border-neutral-200 p-3.5 dark:border-neutral-800">
      <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">
        Proposed plan · {items.length} item{items.length > 1 ? 's' : ''}
      </p>
      <div className="space-y-2">
        {goals.map((g, i) => (
          <div key={`g${i}`} className="flex items-center gap-2">
            <span className="w-14 shrink-0 rounded-full border border-neutral-200 px-2 py-0.5 text-center text-[10px] font-bold uppercase tracking-[0.06em] text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
              {LEVEL_BADGE[g.level] || 'Goal'}
            </span>
            <span className="flex-1 text-sm font-semibold text-neutral-800 dark:text-neutral-100">{g.title}</span>
            {g.type === 'numeric' && (
              <span className="shrink-0 text-xs font-medium text-neutral-400 dark:text-neutral-500">
                → {g.target} {g.unit}
              </span>
            )}
          </div>
        ))}
        {tasks.map((t, i) => (
          <div key={`t${i}`} className="flex items-center gap-2">
            <span className="w-14 shrink-0 rounded-full border border-neutral-200 px-2 py-0.5 text-center text-[10px] font-bold uppercase tracking-[0.06em] text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
              Task
            </span>
            <span className="flex-1 text-sm font-semibold text-neutral-800 dark:text-neutral-100">{t.title}</span>
            <span className="shrink-0 text-xs font-medium text-neutral-400 dark:text-neutral-500">
              {!t.dayOffset ? 'today' : `in ${t.dayOffset}d`}
            </span>
          </div>
        ))}
        {updates.map((u, i) => (
          <div key={`u${i}`} className="flex items-center gap-2">
            <span className="w-14 shrink-0 rounded-full bg-neutral-900 px-2 py-0.5 text-center text-[10px] font-bold uppercase tracking-[0.06em] text-white dark:bg-white dark:text-neutral-900">
              Edit
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
        <div className="mt-3 flex gap-2">
          <button
            onClick={onAdd}
            className="rounded-full bg-neutral-900 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Add to my plan
          </button>
          <button
            onClick={onDismiss}
            className="rounded-full border border-neutral-200 px-3.5 py-1.5 text-xs font-semibold text-neutral-500 transition hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-500"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  )
}

const STARTERS = [
  "What's my #1 focus today?",
  'Where am I slipping this week?',
  'What 1% improvement should I make now?',
  'Am I on track with my goals?',
]

export default function CoachWidget({ enabled, model, data, messages, onSetMessages, onApplyPlan }) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [pulse, setPulse] = useState(false)
  const endRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, streaming])

  useEffect(() => {
    if (open) setTimeout(() => textareaRef.current?.focus(), 80)
  }, [open])

  const prevLen = useRef(messages.length)
  useEffect(() => {
    if (!open && messages.length > prevLen.current) {
      setPulse(true)
      const t = setTimeout(() => setPulse(false), 2500)
      return () => clearTimeout(t)
    }
    prevLen.current = messages.length
  }, [messages.length, open])

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  async function send(text) {
    const content = text.trim()
    if (!content || busy) return
    setInput('')
    setError('')
    const next = [...messages, { role: 'user', content }]
    onSetMessages(next)
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
      } catch (streamErr) {
        console.warn('Chat streaming failed, falling back:', streamErr)
      }
      if (!acc.trim()) {
        setStreaming('')
        acc = await aiCoachReply(next, context, model)
      }
      const { clean, proposal } = parseProposal(acc)
      onSetMessages([...next, { role: 'assistant', content: clean || acc || '…', proposal }])
    } catch (e) {
      setError(e.message || 'Something went wrong reaching the AI.')
      onSetMessages(next)
    } finally {
      setStreaming(null)
      setBusy(false)
    }
  }

  function applyProposal(i) {
    onApplyPlan(messages[i].proposal)
    onSetMessages(messages.map((m, idx) => (idx === i ? { ...m, applied: true } : m)))
  }

  function dismissProposal(i) {
    onSetMessages(messages.map((m, idx) => (idx === i ? { ...m, dismissed: true } : m)))
  }

  const empty = messages.length === 0 && !streaming
  const assistantCount = messages.filter((m) => m.role === 'assistant').length

  return (
    <>
      {/* ── floating panel ── */}
      {open && (
        <div
          className="fixed bottom-[88px] right-6 z-[998] flex h-[520px] max-h-[calc(100vh-112px)] w-[370px] max-w-[calc(100vw-32px)] animate-pop flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-[#111]"
          role="dialog"
          aria-label="1% Coach"
        >
          {/* header */}
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3.5 dark:border-neutral-800">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white dark:bg-white dark:text-neutral-900">
                1%
              </span>
              <div>
                <p className="font-bold text-neutral-900 dark:text-white">1% Coach</p>
                <p className="text-xs font-medium text-neutral-400 dark:text-neutral-500">
                  {busy ? (
                    <span className="flex items-center gap-1">
                      <span className="inline-flex gap-0.5">
                        {[0, 150, 300].map((d) => (
                          <span
                            key={d}
                            style={{ animationDelay: `${d}ms` }}
                            className="h-1 w-1 animate-bounce rounded-full bg-neutral-400 dark:bg-neutral-500"
                          />
                        ))}
                      </span>
                      thinking
                    </span>
                  ) : (
                    'Habits · goals · 1% daily improvement'
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {messages.length > 0 && (
                <button
                  onClick={() => onSetMessages([])}
                  title="Clear chat"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 text-neutral-400 transition hover:border-neutral-400 hover:text-neutral-700 dark:border-neutral-800 dark:text-neutral-500 dark:hover:border-neutral-600 dark:hover:text-neutral-300"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14H6L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                  </svg>
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                title="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 text-neutral-400 transition hover:border-neutral-400 hover:text-neutral-700 dark:border-neutral-800 dark:text-neutral-500 dark:hover:border-neutral-600 dark:hover:text-neutral-300"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="h-3.5 w-3.5">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>

          {/* messages */}
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
            {!enabled ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <p className="mb-1 font-bold text-neutral-900 dark:text-white">AI coach is off</p>
                <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500">
                  Open Settings (gear icon) and enable AI to chat.
                </p>
              </div>
            ) : empty ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <p className="max-w-[220px] font-serif text-lg italic leading-snug text-neutral-700 dark:text-neutral-200">
                  Ask me what 1% improvement you can make right now.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {STARTERS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:border-neutral-400 hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-500 dark:hover:text-white"
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
                      <div className="max-w-[80%] rounded-2xl rounded-br-md bg-neutral-900 px-3.5 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-neutral-900">
                        {m.content}
                      </div>
                    </div>
                  ) : (
                    <div key={i} className="flex flex-col items-start">
                      <div className="max-w-[88%] rounded-2xl rounded-bl-md border border-neutral-200 px-3.5 py-2.5 dark:border-neutral-800">
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
                    <div className="max-w-[88%] rounded-2xl rounded-bl-md border border-neutral-200 px-3.5 py-2.5 dark:border-neutral-800">
                      {streaming && streamDisplay(streaming) ? (
                        <AIText text={streamDisplay(streaming)} />
                      ) : (
                        <span className="text-sm font-medium text-neutral-400">
                          {streaming ? 'Building your plan…' : 'Thinking…'}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
            {error && <p className="text-center text-sm font-medium text-red-500">{error}</p>}
            <div ref={endRef} />
          </div>

          {/* composer */}
          {enabled && (
            <div className="shrink-0 border-t border-neutral-200 p-3 dark:border-neutral-800">
              <div className="flex items-end gap-2">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      send(input)
                    }
                  }}
                  rows={1}
                  placeholder="Ask your coach…  (Enter ↵)"
                  disabled={busy}
                  className="max-h-28 min-h-[40px] flex-1 resize-none rounded-2xl border border-neutral-200 bg-transparent px-3.5 py-2.5 text-sm font-medium text-neutral-900 outline-none transition focus:border-neutral-900 placeholder:text-neutral-400 dark:border-neutral-800 dark:text-white dark:placeholder:text-neutral-600 dark:focus:border-white"
                />
                <button
                  onClick={() => send(input)}
                  disabled={busy || !input.trim()}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-neutral-900 text-white transition hover:bg-neutral-700 disabled:opacity-40 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                  title="Send"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── FAB ── */}
      <button
        id="coach-fab"
        onClick={() => { setOpen((o) => !o); setPulse(false) }}
        title="1% Coach"
        aria-label="Open coach chat"
        className={`fixed bottom-7 right-7 z-[999] flex h-14 w-14 items-center justify-center rounded-full border transition-transform duration-200 hover:scale-110 ${
          open
            ? 'border-neutral-300 bg-white text-neutral-700 shadow-lg dark:border-neutral-700 dark:bg-neutral-900 dark:text-white'
            : 'border-transparent bg-neutral-900 text-white shadow-[0_8px_24px_rgb(0,0,0,0.25)] hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100'
        } ${pulse ? 'animate-pop' : ''}`}
      >
        {open ? (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        ) : (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        )}
        {!open && assistantCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 text-[10px] font-bold text-white ring-2 ring-white dark:bg-white dark:text-neutral-900 dark:ring-neutral-900">
            {assistantCount}
          </span>
        )}
      </button>
    </>
  )
}
