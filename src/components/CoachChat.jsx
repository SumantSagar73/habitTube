import { useEffect, useRef, useState } from 'react'
import { aiChatStream, aiCoachReply, buildCoachContext, parseProposal } from '../ai'
import AIText from './AIText'

const LEVEL_BADGE = { year: 'Year', quarter: 'Quarter', month: 'Month', week: 'Week' }

// Hide a half-written json block while the reply is still streaming.
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

function ProposalCard({ items, applied, dismissed, onAdd, onDismiss }) {
  const goals = items.filter((i) => i.kind === 'goal')
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
              <span className="shrink-0 text-xs font-medium text-neutral-400 dark:text-neutral-500">
                → {g.target} {g.unit}
              </span>
            )}
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
          <button
            onClick={onAdd}
            className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Add to my plan
          </button>
          <button
            onClick={onDismiss}
            className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-500 transition hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-500"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  )
}

const STARTERS = [
  'How am I doing this week?',
  'Should I push harder or slow down?',
  'I keep skipping my habits — help me fix it.',
  'Help me plan a realistic week.',
]

export default function CoachChat({ enabled, model, data, messages, onSetMessages, onApplyPlan }) {
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(null) // in-progress assistant text
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef(null)
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, streaming])

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
        // streaming failed — fall through to a normal request below
        console.warn('Chat streaming failed, falling back:', streamErr)
      }
      // If streaming produced nothing (e.g. the browser buffered the SSE),
      // fetch the whole reply in one non-streaming call.
      if (!acc.trim()) {
        setStreaming('')
        acc = await aiCoachReply(next, context, model)
      }
      const { clean, proposal } = parseProposal(acc)
      onSetMessages([...next, { role: 'assistant', content: clean || acc || '…', proposal }])
    } catch (e) {
      setError(e.message || 'Something went wrong reaching the AI.')
      onSetMessages(next) // keep the user's message; let them retry
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
    <div className="flex h-[calc(100vh-220px)] min-h-[480px] flex-col rounded-3xl border border-neutral-200 dark:border-neutral-800 dark:bg-[#111]">
      {/* header */}
      <div className="flex items-center justify-between gap-3 border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white dark:bg-white dark:text-neutral-900">AI</span>
          <div>
            <p className="font-bold text-neutral-900 dark:text-white">Your coach</p>
            <p className="text-xs font-medium text-neutral-400 dark:text-neutral-500">Knows your habits, goals & pace</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => onSetMessages([])}
            className="rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-bold text-neutral-500 transition hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-500"
          >
            Clear
          </button>
        )}
      </div>

      {/* messages */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {empty ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="max-w-sm font-serif text-2xl italic leading-snug text-neutral-700 dark:text-neutral-200">
              Talk to me. Ask how you’re doing, where you’re slipping, or whether to push or rest.
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
  )
}
