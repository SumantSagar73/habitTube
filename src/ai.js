import { goalPercent, goalsAt, LEVEL_LABEL, periodLabel, tasksInPeriod } from './planUtils'
import { currentStreak, habitRate, habitsForDate, isDone, todayKey } from './utils'

export const DEFAULT_MODEL = 'llama-3.3-70b-versatile'
export const AI_MODELS = [
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B — smartest' },
  { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B — fastest' },
  { id: 'gemma2-9b-it', label: 'Gemma 2 9B' },
]

// Low-level call. The Groq key is attached by the Vite dev-server proxy, so the
// browser never sees it. Errors are surfaced with a friendly message.
async function chat(messages, { model = DEFAULT_MODEL, temperature = 0.8, max_tokens = 450 } = {}) {
  let res
  try {
    res = await fetch('/groq/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, temperature, max_tokens }),
    })
  } catch {
    throw new Error('Could not reach the AI. Make sure the app is running via “npm run dev”.')
  }
  const text = await res.text()
  if (!res.ok) {
    if (res.status === 401) throw new Error('Groq rejected the API key (401). Check the key in .env.local.')
    if (res.status === 429) throw new Error('Rate limit hit (429). Wait a moment and try again.')
    throw new Error(`AI error ${res.status}. ${text.slice(0, 160)}`)
  }
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('AI only works with the dev server running (npm run dev).')
  }
  return data.choices?.[0]?.message?.content?.trim() || ''
}

// ---- context builders ----
function todaySummary({ habits, completions, tasks, goals }) {
  const key = todayKey()
  const due = habitsForDate(habits, new Date())
  const done = due.filter((h) => isDone(h, completions, key))
  const pending = due.filter((h) => !isDone(h, completions, key))
  const streaks = habits
    .map((h) => ({ name: h.name, s: currentStreak(h, completions) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
  const todays = tasks[key] || []
  const activeGoals = goals.filter((g) => goalPercent(g, { goals, tasks, habits, completions }) < 100)

  const lines = [
    `Date: ${key}.`,
    due.length
      ? `Habits today: ${due.length} (done ${done.length}: ${done.map((h) => h.name).join(', ') || 'none'}; pending: ${pending.map((h) => h.name).join(', ') || 'none'}).`
      : 'No habits scheduled today.',
    streaks.length ? `Active streaks: ${streaks.slice(0, 4).map((x) => `${x.name} ${x.s}d`).join(', ')}.` : 'No active streaks.',
    todays.length ? `Today's tasks: ${todays.filter((t) => !t.done).length} left of ${todays.length}.` : 'No tasks added today.',
    activeGoals.length ? `Open goals: ${activeGoals.slice(0, 4).map((g) => g.title).join(', ')}.` : '',
  ]
  return lines.filter(Boolean).join('\n')
}

function statsSummary({ habits, completions, goals, missNotes }) {
  const ctx = { goals, tasks: {}, habits, completions }
  const rates = habits.map((h) => ({
    name: h.name,
    rate: habitRate(h, completions, 30),
    streak: currentStreak(h, completions),
  }))
  const reasons = []
  for (const h of habits) {
    for (const r of Object.values(missNotes[h.id] || {})) if (r && r.trim()) reasons.push(r.trim())
  }
  const lines = [
    habits.length
      ? `Habits (30-day completion %, streak): ${rates.map((r) => `${r.name} ${r.rate}% (${r.streak}d)`).join('; ')}.`
      : 'No habits yet.',
    goals.length
      ? `Goals: ${goals.map((g) => `${LEVEL_LABEL[g.level]} "${g.title}" ${goalPercent(g, ctx)}%`).join('; ')}.`
      : 'No goals yet.',
    reasons.length ? `Reasons given for skipped habits: ${reasons.slice(0, 12).join(' / ')}.` : 'No skip reasons recorded.',
  ]
  return lines.join('\n')
}

function reviewSummary({ level, period, goals, tasks, habits, completions, reviews }) {
  const ctx = { goals, tasks, habits, completions }
  const here = goalsAt(goals, level, period)
  const unfinished = tasksInPeriod(tasks, level, period).filter((t) => !t.done)
  const r = reviews[period] || {}
  const reasons = Object.values(r.goalNotes || {}).filter(Boolean)
  return [
    `Reviewing ${LEVEL_LABEL[level]}: ${periodLabel(level, period)}.`,
    here.length ? `Goals: ${here.map((g) => `"${g.title}" ${goalPercent(g, ctx)}%`).join('; ')}.` : 'No goals were set.',
    `Unfinished tasks: ${unfinished.length}${unfinished.length ? ` (${unfinished.slice(0, 6).map((t) => t.title).join(', ')})` : ''}.`,
    reasons.length ? `Obstacles the user noted: ${reasons.join(' / ')}.` : '',
    r.note ? `User's own reflection: ${r.note}` : '',
  ].filter(Boolean).join('\n')
}

// ---- public features ----
export function aiDailyMotivation(data, model) {
  return chat(
    [
      {
        role: 'system',
        content:
          'You are HabitTube\'s coach — warm but no-nonsense, like a great personal trainer who knows the user. Write 2-3 short sentences in second person, specific to the data given. No generic platitudes, no hashtags. End with one small, concrete nudge for today.',
      },
      { role: 'user', content: `Here is my day so far:\n${todaySummary(data)}\n\nGive me today's motivation.` },
    ],
    { model, temperature: 0.9, max_tokens: 180 }
  )
}

export function aiInsights(data, model) {
  return chat(
    [
      {
        role: 'system',
        content:
          'You are a sharp, data-savvy habit coach. Analyze the user\'s tracking data. Respond in GitHub markdown with exactly these sections: "**What\'s working**" (1-2 lines), "**What\'s slipping**" (1-2 lines), and "**Try this**" (2 concrete, personalized bullet suggestions). Reference real habit names and numbers. Under 150 words. Be honest and useful, not flattering.',
      },
      { role: 'user', content: `My data:\n${statsSummary(data)}` },
    ],
    { model, temperature: 0.7, max_tokens: 400 }
  )
}

export function aiReview(data, model) {
  return chat(
    [
      {
        role: 'system',
        content:
          'You are a reflective coach helping the user review a time period. Respond in GitHub markdown with: "**Wins**" (1-2 specifics), "**The pattern**" (name the recurring obstacle from their notes, honestly but kindly), and "**Next focus**" (one concrete priority for the upcoming period). Under 130 words. Reference their real goals and reasons.',
      },
      { role: 'user', content: reviewSummary(data) },
    ],
    { model, temperature: 0.7, max_tokens: 360 }
  )
}

// Tiny call used by Settings to confirm the key/proxy work.
export async function aiTest(model) {
  const out = await chat([{ role: 'user', content: 'Reply with exactly: ok' }], { model, max_tokens: 5, temperature: 0 })
  return out.toLowerCase().includes('ok')
}

// ---- conversational coach ----
const COACH_SYSTEM = `You are HabitTube's AI life coach — the user's personal guide for building a better life: habits, goals, focus, energy and consistency. You are warm, direct and practical, like a blend of a great coach and a sharp friend. You speak in second person, plainly, no corporate fluff, no hashtags.

You KNOW the user's real data (a snapshot is provided below). Use it — reference their actual streaks, goals, completion rates and the reasons they've logged for skipping.

Most important job: read their capacity and tell them how hard to push.
- If they're slipping, overloaded, or sound stressed/tired (low completion, many misses, "overwhelmed" language) → tell them to go SLOWER: cut scope, drop to the minimum viable habit, protect rest. Reassure them that shrinking the plan is winning, not failing.
- If they're cruising with room to spare (high completion, strong streaks, asking for more) → encourage them to go HARDER: add a stretch goal or raise a target.
- When unsure, ask one clarifying question.

Keep replies tight: a few short paragraphs or a small list. End with a concrete next step or a question. Never give medical, clinical or crisis advice — if the user sounds like they're in real distress, gently suggest talking to a person they trust or a professional.

You can ADD things to the user's HabitTube for them: yearly, quarterly, monthly and weekly goals, and daily tasks. When the user asks you to set something up, or says they don't know where to start, propose a concrete plan and end your message with exactly ONE fenced json block in this shape:
\`\`\`json
{"plan":[
 {"kind":"goal","level":"year","title":"Get healthy","type":"checklist"},
 {"kind":"goal","level":"quarter","title":"Run a 10K","type":"checklist"},
 {"kind":"goal","level":"month","title":"Run 50 km this month","type":"numeric","target":50,"unit":"km"},
 {"kind":"goal","level":"week","title":"Run 12 km this week","type":"numeric","target":12,"unit":"km"},
 {"kind":"task","title":"Easy 30-minute jog","dayOffset":0}
]}
\`\`\`
Rules: level is one of year|quarter|month|week; type is checklist or numeric (numeric needs target and unit); tasks take dayOffset 0-6 where 0 is today and may include "priority":"high"|"medium"|"low". Order goals year→quarter→month→week so they connect into one thread. Keep a plan focused (3-6 items). Always write a short, warm explanation BEFORE the json block. The user sees "Add to my plan" buttons and confirms — never claim it is already added. If you are NOT proposing items to add, include no json at all.

You can also UPDATE existing items the user already has (use the exact title from the snapshot). Put update objects in the same plan array: {"kind":"update","target":"goal","title":"Run 50 km this month","set":{"target":40}} changes a numeric target; {"kind":"update","target":"goal","title":"Read a book","set":{"done":true}} marks a goal done; {"kind":"update","target":"task","title":"Morning jog","set":{"priority":"low"}} or set {"done":true} updates a task. Use updates when the user asks to ease targets, mark something done, or change priority. The user still confirms with the same button.`

const MOOD_LABEL = { 1: 'Rough', 2: 'Low', 3: 'Okay', 4: 'Good', 5: 'Great' }

export function buildCoachContext({ habits = [], completions = {}, goals = [], tasks = {}, missNotes = {}, reviews = {}, moods = {}, visions = {}, notes = {} }) {
  const ctx = { goals, tasks, habits, completions }
  const key = todayKey()
  const byId = Object.fromEntries(goals.map((g) => [g.id, g]))
  const gt = (id) => byId[id]?.title || 'a goal'
  const due = habitsForDate(habits, new Date())
  const doneToday = due.filter((h) => isDone(h, completions, key))
  const streaks = habits.map((h) => ({ n: h.name, s: currentStreak(h, completions) })).sort((a, b) => b.s - a.s)
  const rates = habits.map((h) => `${h.name} ${habitRate(h, completions, 30)}%`)
  const reasons = []
  for (const h of habits) for (const r of Object.values(missNotes[h.id] || {})) if (r?.trim()) reasons.push(r.trim())

  const yearKey = key.slice(0, 4)
  const vision = visions[yearKey]
  const visionLine = vision && vision.trim() ? `North-Star Vision for ${yearKey}: "${vision.trim()}".` : ''

  const recentNotes = Object.entries(notes)
    .filter(([, text]) => text && text.trim())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 3)
  const notesLine = recentNotes.length
    ? `Recent daily journal reflections:\n${recentNotes.map(([d, t]) => `- ${d}: "${t.trim()}"`).join('\n')}`
    : ''

  // goals WITH how they connect (which goal each one ladders up into)
  const goalLines = goals.map((g) => {
    const parent = g.parentId && byId[g.parentId] ? ` → part of "${gt(g.parentId)}"` : ''
    const meta = g.type === 'numeric' ? `, ${g.current || 0}/${g.target} ${g.unit || ''}`.trimEnd() : ''
    return `${LEVEL_LABEL[g.level]} "${g.title}" ${goalPercent(g, ctx)}%${meta}${parent}`
  })

  // today's tasks, with their scheduled time, priority, and which goal they advance
  const todays = tasks[key] || []
  const taskLine = todays.length
    ? `Today's tasks: ${todays
        .map(
          (t) =>
            `${t.time ? `${t.time} ` : ''}"${t.title}"${t.goalId ? ` (advances "${gt(t.goalId)}")` : ''}${
              t.priority === 'high' ? ' [high priority]' : ''
            } ${t.done ? '✓done' : '◻todo'}`
        )
        .join('; ')}.`
    : 'No tasks added for today yet.'

  const lastReview = Object.entries(reviews)
    .filter(([, r]) => r?.note)
    .sort((a, b) => (b[1].ratedAt || 0) - (a[1].ratedAt || 0))[0]

  const recentMoods = Object.entries(moods)
    .filter(([, v]) => v)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 7)
  const moodLine = recentMoods.length
    ? `Mood — today: ${moods[key] ? MOOD_LABEL[moods[key]] : 'not logged'}; recent: ${recentMoods.map(([, v]) => MOOD_LABEL[v]).join(', ')}.`
    : ''

  return [
    visionLine,
    `Today (${key}): ${due.length} habits due, ${doneToday.length} done.`,
    moodLine,
    streaks.some((x) => x.s > 0) ? `Streaks: ${streaks.filter((x) => x.s > 0).map((x) => `${x.n} ${x.s}d`).join(', ')}.` : 'No active streaks.',
    habits.length ? `30-day completion: ${rates.join(', ')}.` : 'No habits tracked yet.',
    goalLines.length ? `Goals and how they connect (sub-goals feed the goal above): ${goalLines.join('; ')}.` : 'No goals set yet.',
    taskLine,
    reasons.length ? `Recent reasons for skipping: ${reasons.slice(0, 10).join(' / ')}.` : 'No skip reasons logged.',
    notesLine,
    lastReview ? `Most recent review note: "${lastReview[1].note}".` : '',
  ].filter(Boolean).join('\n')
}

// Non-streaming coach reply — reliable fallback when the browser can't read the
// SSE stream (some setups buffer it). Returns the full text at once.
export function aiCoachReply(messages, contextText, model = DEFAULT_MODEL) {
  return chat(
    [
      { role: 'system', content: `${COACH_SYSTEM}\n\nUSER DATA SNAPSHOT:\n${contextText}` },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
    { model, temperature: 0.85, max_tokens: 800 }
  )
}

// Streaming chat. Yields text deltas as they arrive.
export async function* aiChatStream(messages, contextText, model = DEFAULT_MODEL) {
  let res
  try {
    res = await fetch('/groq/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        // Strip UI-only fields (proposal/applied/dismissed) — Groq rejects any
        // message property beyond role/content.
        messages: [
          { role: 'system', content: `${COACH_SYSTEM}\n\nUSER DATA SNAPSHOT:\n${contextText}` },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
        stream: true,
        temperature: 0.85,
        max_tokens: 800,
      }),
    })
  } catch {
    throw new Error('Could not reach the AI. Make sure the app is running via “npm run dev”.')
  }
  if (!res.ok) {
    const t = await res.text()
    if (res.status === 401) throw new Error('Groq rejected the API key (401). Check .env.local.')
    if (res.status === 429) throw new Error('Rate limit hit (429). Wait a moment and try again.')
    throw new Error(`AI error ${res.status}. ${t.slice(0, 160)}`)
  }
  if (!res.body) throw new Error('AI only works with the dev server running (npm run dev).')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let nl
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim()
      buffer = buffer.slice(nl + 1)
      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (payload === '[DONE]') return
      try {
        const delta = JSON.parse(payload).choices?.[0]?.delta?.content
        if (delta) yield delta
      } catch {
        // ignore keep-alive / partial lines
      }
    }
  }
}

// Pull a {"plan":[...]} the coach may have appended (fenced or bare) out of its
// reply. Returns the prose with the block stripped + the parsed item list.
export function parseProposal(text) {
  if (!text) return { clean: text, proposal: null }
  let raw = null
  let parsed = null

  const fenceRe = /```(?:json)?\s*([\s\S]*?)```/gi
  let m
  while ((m = fenceRe.exec(text))) {
    try {
      const obj = JSON.parse(m[1].trim())
      if (obj && Array.isArray(obj.plan)) {
        raw = m[0]
        parsed = obj
      }
    } catch {
      // not the block we want
    }
  }

  if (!parsed) {
    const start = text.search(/\{\s*"plan"/)
    if (start >= 0) {
      let depth = 0
      let end = -1
      for (let j = start; j < text.length; j++) {
        if (text[j] === '{') depth++
        else if (text[j] === '}' && --depth === 0) {
          end = j
          break
        }
      }
      if (end > start) {
        try {
          const obj = JSON.parse(text.slice(start, end + 1))
          if (obj && Array.isArray(obj.plan)) {
            raw = text.slice(start, end + 1)
            parsed = obj
          }
        } catch {
          // ignore
        }
      }
    }
  }

  if (!parsed) return { clean: text.trim(), proposal: null }

  const items = parsed.plan.filter(
    (it) =>
      it && (it.kind === 'goal' || it.kind === 'task' || it.kind === 'update') && typeof it.title === 'string' && it.title.trim()
  )
  const clean = text.replace(raw, '').replace(/\n{3,}/g, '\n\n').trim()
  return { clean: clean || 'Here’s a plan you can add:', proposal: items.length ? items : null }
}
