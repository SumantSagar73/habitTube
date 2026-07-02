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
    throw new Error('Could not reach the AI. Make sure the app is running via "npm run dev".')
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

export async function quickChat(messages, model = DEFAULT_MODEL) {
  return chat(messages, { model, max_tokens: 150, temperature: 0.7 })
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

function statsSummary({ habits, completions, goals, tasks = {}, missNotes = {}, moods = {} }) {
  const ctx = { goals, tasks, habits, completions }
  const key = todayKey()

  // Today's stats
  const dueToday = habitsForDate(habits, new Date())
  const doneToday = dueToday.filter((h) => isDone(h, completions, key))
  const tasksToday = tasks[key] || []
  const doneTasksToday = tasksToday.filter((t) => t.done)

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
    `Today (${key}):`,
    `- Habits: ${doneToday.length}/${dueToday.length} done${doneToday.length ? ` (${doneToday.map((h) => h.name).join(', ')})` : ''}`,
    `- Tasks: ${doneTasksToday.length}/${tasksToday.length} done${doneTasksToday.length ? ` (${doneTasksToday.map((t) => t.title).join(', ')})` : ''}`,
    moods[key] ? `- Mood: ${MOOD_LABEL[moods[key]] || moods[key]}` : '',
    '',
    habits.length
      ? `Habits (30-day completion %, streak): ${rates.map((r) => `${r.name} ${r.rate}% (${r.streak}d)`).join('; ')}.`
      : 'No habits yet.',
    goals.length
      ? `Goals: ${goals.map((g) => `${LEVEL_LABEL[g.level]} "${g.title}" ${goalPercent(g, ctx)}%`).join('; ')}.`
      : 'No goals yet.',
    reasons.length ? `Reasons given for skipped habits: ${reasons.slice(0, 12).join(' / ')}.` : 'No skip reasons recorded.',
  ]
  return lines.filter(Boolean).join('\n')
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
          'You are a sharp, data-savvy habit coach. Analyze the user\'s tracking data including habits, goals, tasks, and today\'s status. Respond in GitHub markdown with exactly these sections: "**What\'s working**" (1-2 lines), "**What\'s slipping**" (1-2 lines), and "**Try this**" (2 concrete, personalized bullet suggestions). Reference real habit/goal names and numbers. Under 150 words. Be honest and useful, not flattering.',
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
const COACH_SYSTEM = `You are the user's "1% Coach" inside HabitTube — sharp, direct, data-driven. Your purpose: help the user build habits, reach goals, and execute daily.

SCOPE (non-negotiable):
- ONLY discuss: habits, streaks, goal progress, tasks, focus sessions, consistency patterns, what to do next.
- If asked anything outside this scope, redirect: "I'm focused on your 1% daily improvement — let's stay there."
- Never give medical advice. If user seems in distress: "That sounds hard — please talk to someone you trust. I'm here for habits and goals when you're ready."

HOW TO RESPOND WHEN THE USER MENTIONS A NEW GOAL OR INTENTION:
Step 1 — Offer 2-3 distinct plan options (different approaches), each as a one-line label. Ask which one resonates, or if they have their own idea.
Step 2 — Once they confirm an option (or describe their own), output a COMPLETE cascade plan covering ALL levels: year → quarter → month → week, plus concrete daily tasks AND recurring habits to build. This is the full plan — don't hold back.

EXAMPLE of Step 1 (offer options):
User: "I want to get fit"
You: "Here are 3 angles — which fits you best?
A) Strength-first: build muscle through 3x/week lifting
B) Cardio-first: run a 5K in 8 weeks
C) Hybrid: 20 min movement every day, no excuses
Or tell me what you have in mind."

EXAMPLE of Step 2 (full plan after "B"):
Then output a complete plan with year goal, quarter goal, month goal, week goal, daily tasks for this week, AND a recurring habit — all in one json block.

YOUR OTHER JOBS:
1. Find the ONE most impactful 1% improvement from their data. Lead with it when not planning.
2. If slipping → prescribe a smaller, sustainable version. Cutting scope IS winning.
3. If crushing it → suggest a 1% stretch.
4. When unsure, ask ONE tight clarifying question.

REPLY STYLE:
- Short, specific. Use their real habit names and numbers.
- No hashtags, buzzwords, generic platitudes.
- Keep non-plan replies under 120 words.

CRITICAL JSON RULE — when proposing a plan, you MUST end your reply with a fenced code block that starts with \`\`\`json and contains a single object with a "plan" array. NO exceptions. The array holds every item. Never output a bare JSON object. Never put items outside the array.

CORRECT format (always wrap everything in {"plan":[...]}):
\`\`\`json
{"plan":[
 {"kind":"goal","level":"year","title":"Get fit and strong","type":"checklist"},
 {"kind":"goal","level":"quarter","title":"Run a 5K without stopping","type":"checklist"},
 {"kind":"goal","level":"month","title":"Run 60 km this month","type":"numeric","target":60,"unit":"km"},
 {"kind":"goal","level":"week","title":"Run 15 km this week","type":"numeric","target":15,"unit":"km"},
 {"kind":"habit","name":"Morning run","emoji":"🏃","days":[1,3,5],"time":"07:00"},
 {"kind":"task","title":"First easy 3 km run — just show up","dayOffset":0,"priority":"high"},
 {"kind":"task","title":"Plan this week's run routes","dayOffset":1,"priority":"medium"}
]}
\`\`\`

WRONG (never do this — bare object, missing plan wrapper):
\`\`\`json
{"kind":"task","title":"Morning stretch","dayOffset":0}
\`\`\`

SCHEMA RULES:
- goal: level = year|quarter|month|week; type = checklist or numeric (numeric needs target + unit); always include ALL 4 levels.
- habit: name (string), emoji (one emoji), days (array of 0-6 where 0=Sun), time (optional "HH:MM").
- task: title, dayOffset 0-6 (0=today), optional priority high|medium|low.
- Order in array: goals year→quarter→month→week, then habits, then tasks.
- Write explanation BEFORE the json block. Never say it's already added — user confirms by clicking the button.
- Do NOT output any json if you are NOT proposing a complete plan (e.g. during the option-selection step).

UPDATES — adjust existing items (user still confirms):
\`\`\`json
{"plan":[
 {"kind":"update","target":"goal","title":"Run 60 km this month","set":{"target":40}}
]}
\`\`\``


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
    { model, temperature: 0.85, max_tokens: 2000 }
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
        max_tokens: 2000,
      }),
    })
  } catch {
    throw new Error('Could not reach the AI. Make sure the app is running via "npm run dev".')
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

// Filter raw parsed items into valid plan entries.
function filterItems(arr) {
  if (!Array.isArray(arr)) return []
  return arr.filter((it) => {
    if (!it || typeof it !== 'object') return false
    if (it.kind === 'habit') return typeof it.name === 'string' && it.name.trim()
    return (it.kind === 'goal' || it.kind === 'task' || it.kind === 'update') && typeof it.title === 'string' && it.title.trim()
  })
}

// Pull a plan the coach may have appended out of its reply.
// Handles all formats the model might emit:
//   {"plan":[...]}          ← ideal
//   [{...}, {...}]          ← bare array
//   {"kind":"habit",...}    ← single bare object
// Returns the prose with the block stripped + the parsed item list.
export function parseProposal(text) {
  if (!text) return { clean: text, proposal: null }
  let raw = null
  let items = null

  const fenceRe = /```(?:json)?\s*([\s\S]*?)```/gi
  let m
  while ((m = fenceRe.exec(text))) {
    try {
      const body = m[1].trim()
      const obj = JSON.parse(body)
      let found = null
      if (obj && Array.isArray(obj.plan)) found = filterItems(obj.plan)           // {"plan":[...]}
      else if (Array.isArray(obj)) found = filterItems(obj)                        // [{...},...]
      else if (obj && obj.kind) found = filterItems([obj])                         // {"kind":...}
      if (found && found.length) { raw = m[0]; items = found; break }
    } catch {}
  }

  // Fallback: scan bare JSON outside fences
  if (!items) {
    // Try {"plan":[...]}
    const start = text.search(/\{\s*"plan"/)
    if (start >= 0) {
      let depth = 0, end = -1
      for (let j = start; j < text.length; j++) {
        if (text[j] === '{') depth++
        else if (text[j] === '}' && --depth === 0) { end = j; break }
      }
      if (end > start) {
        try {
          const obj = JSON.parse(text.slice(start, end + 1))
          const found = obj && Array.isArray(obj.plan) ? filterItems(obj.plan) : null
          if (found && found.length) { raw = text.slice(start, end + 1); items = found }
        } catch {}
      }
    }
  }

  if (!items) return { clean: text.trim(), proposal: null }

  const clean = text.replace(raw, '').replace(/\n{3,}/g, '\n\n').trim()
  return { clean: clean || 'Here\'s a plan you can add:', proposal: items }
}
