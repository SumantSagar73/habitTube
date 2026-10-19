import { goalPercent, goalsAt, LEVEL_LABEL, periodLabel, tasksInPeriod } from './planUtils'
import { currentStreak, habitRate, habitsForDate, isDone, todayKey } from './utils'
import { supabase } from './utils/supabase'
import { arcDay, normalizeArcPlan, normalizeWeekPlan } from './arcs'
import { byokRequest, getByok } from './byok'

export const DEFAULT_MODEL = 'openai/gpt-oss-120b'
// Hosted models. The provider is implied by the model id (the server picks the
// upstream from it), so a saved `aiModel` string is all the app needs to store.
// Keep in sync with MODELS in api/ai.js.
export const AI_MODELS = [
  { id: 'gemini-2.5-flash', provider: 'Gemini', label: 'Gemini 2.5 Flash — best for plans' },
  { id: 'gemini-2.5-flash-lite', provider: 'Gemini', label: 'Gemini 2.5 Flash-Lite — cheapest' },
  { id: 'openai/gpt-oss-120b', provider: 'Groq', label: 'GPT-OSS 120B — smart' },
  { id: 'openai/gpt-oss-20b', provider: 'Groq', label: 'GPT-OSS 20B — fastest' },
]
export const providerOfModel = (id) => AI_MODELS.find((m) => m.id === id)?.provider || 'Groq'

// The production proxy (api/ai.js) requires a valid Supabase session.
async function aiHeaders() {
  const headers = { 'Content-Type': 'application/json' }
  try {
    const { data } = await supabase.auth.getSession()
    if (data.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`
  } catch { /* dev proxy doesn't need it */ }
  return headers
}

// Low-level call. Provider keys are attached server-side (Vite dev proxy locally,
// api/ai.js on Vercel), so the browser never sees it.
// Saved settings may name a retired model; fall back so the proxy allowlist doesn't reject it.
export const safeModel = (m) => (AI_MODELS.some((x) => x.id === m) ? m : DEFAULT_MODEL)

// Where a request goes: the user's own provider (BYOK) when enabled, else our proxy.
async function aiTarget(model) {
  const b = getByok()
  if (b) return { ...byokRequest(b), model: b.model, byok: true }
  return { url: '/ai/chat/completions', headers: await aiHeaders(), model: safeModel(model), byok: false }
}

function httpError(status, text, byok) {
  if (status === 401 || status === 403) {
    return new Error(byok ? 'Your API key was rejected. Check it in Settings → AI.' : 'AI request was rejected (401). Sign in again, or check the provider API key.')
  }
  if (status === 429) return new Error('Rate limit hit (429). Wait a moment and try again.')
  return new Error(`AI error ${status}. ${text.slice(0, 160)}`)
}

async function chat(messages, { model = DEFAULT_MODEL, temperature = 0.8, max_tokens = 450, json = false, reasoning } = {}) {
  const t = await aiTarget(model)
  model = t.model
  let res
  try {
    res = await fetch(t.url, {
      method: 'POST',
      headers: t.headers,
      body: JSON.stringify({ model, messages, temperature, max_tokens, ...(json ? { response_format: { type: 'json_object' } } : {}), ...(reasoning && model.startsWith('openai/gpt-oss') ? { reasoning_effort: reasoning } : {}) }),
    })
  } catch {
    throw new Error('Could not reach the AI. Check your connection and try again.')
  }
  const text = await res.text()
  // Some models reject JSON mode — retry once as plain text; callers parse leniently.
  if (json && res.status === 400) return chat(messages, { model, temperature, max_tokens, json: false, reasoning })
  if (!res.ok) throw httpError(res.status, text, t.byok)
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('The AI returned an unreadable response. Try again.')
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

// ---- arcs ----
const ARC_SYSTEM = `You are an expert coach designing a personalized, time-boxed "arc" the user named themselves. Reply with ONLY one JSON object, no prose, no code fences.
Schema (compact arrays):
{"title":"short arc name","why":"one sentence in the user's words","weeks":[["week theme","measurable milestone with a number"], ...exactly N entries],"target":["measurable goal for the whole arc",number,"unit"] or null,"habits":[["emoji","small recurring anchor",[days 0=Sun..6],"HH:MM or empty"], ...2 to 4],"tasks":[[dayOffset 0-6,"specific session, with duration","h|m|l"], ...8 to 14, the next 7 days],"minDay":"the 15-minute version of a day for bad days"}
Quality bar:
- Be specific and concrete: name real exercises, topics, chapters, sets/reps, minutes. Never write vague advice like "stay consistent" or "walk 5 minutes" unless the user is truly a beginner with almost no time.
- Start at the user's stated level, then ramp every week (about 10-20% more volume or difficulty). Later weeks must differ from week 1.
- Week milestones must be measurable. If the user's outcome contains a number, "target" must use it.
- tasks = a real schedule for the next 7 days that fits the daily time, with rest days where sensible. Habits are small daily anchors, different from the tasks.
- Week 1 tasks must match the week 1 milestone numbers exactly (a 1 km milestone means 1 km runs, not 2 km).
- Habits must fit the stated daily time and situation. Do not invent wake-up, sleep or diet habits unless the user asked.
- Keep each string under 14 words.`

function arcContext({ habits = [], completions = {}, goals = [] }) {
  const h = habits.slice(0, 8).map((x) => `${x.name} ${habitRate(x, completions, 30)}%`).join(', ')
  const g = goals.filter((x) => !x.done).slice(0, 5).map((x) => x.title).join(', ')
  return [h && `Current habits (30d rate): ${h}.`, g && `Open goals: ${g}.`].filter(Boolean).join(' ')
}

// answers: { theme, outcome, weeks, dailyTime, obstacles[], extra }
export async function aiGenerateArc(answers, data, model) {
  const user = [
    `Arc theme: ${answers.theme}.`,
    answers.outcome ? `Success looks like: ${answers.outcome}.` : '',
    `Length: ${answers.weeks} weeks (N=${answers.weeks}). Starts today (${todayKey()}).`,
    `Daily time available: ${answers.dailyTime}.`,
    answers.level ? `Starting level: ${answers.level}.` : '',
    answers.obstacles?.length ? `What failed before: ${answers.obstacles.join(', ')}.` : '',
    answers.extra ? `More about their situation: ${answers.extra}` : '',
    arcContext(data),
  ].filter(Boolean).join('\n')
  const out = await chat(
    [{ role: 'system', content: ARC_SYSTEM }, { role: 'user', content: user }],
    { model, temperature: 0.6, max_tokens: 3500, json: true, reasoning: 'medium' }
  )
  const start = out.indexOf('{')
  const end = out.lastIndexOf('}')
  let raw = null
  try { raw = JSON.parse(out.slice(start, end + 1)) } catch { /* handled below */ }
  const plan = normalizeArcPlan(raw, answers.weeks)
  if (!plan) throw new Error('The AI reply could not be read as a plan. Try again.')
  // Remembered on the arc so weekly check-ins can plan at the same scale.
  plan.meta = { dailyTime: answers.dailyTime, level: answers.level, outcome: answers.outcome, extra: answers.extra }
  return plan
}

const WEEK_SYSTEM = `You are an expert coach planning the NEXT week of a user's arc after a check-in. Reply with ONLY one JSON object, no prose, no code fences.
Schema: {"note":"one sentence reacting to how last week went","milestone":"measurable milestone for this week","tasks":[[dayOffset 0-6,"specific session, with duration","h|m|l"], ...8 to 14]}
Rules:
- Adapt to the data: completion under 50% or "too hard" -> cut volume about 20% (never below 70% of last week) and simplify; over 85% and "too easy" -> add 15-20%; otherwise ramp about 10%.
- Address the blocker they named with a concrete change to the schedule, not advice.
- Tasks must add up to this week's milestone (use its numbers) and must not repeat last week's tasks verbatim.
- Be specific: real exercises, topics, sets, minutes. Each session should be worth doing (10+ minutes) except stretching or rest-day items. Respect the daily time. Keep each string under 14 words.`

// feedback: { rating: 'too easy'|'just right'|'too hard', blockers: [], extra }
export async function aiNextWeek(arc, weekIdx, stats, feedback, model) {
  const prev = arc.weeks[weekIdx - 1] || {}
  const cur = arc.weeks[weekIdx] || {}
  const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : 'n/a')
  const user = [
    `Arc: "${arc.title}" — ${arc.why || 'no stated why'}. Now planning week ${weekIdx + 1} of ${arc.weeks.length}.`,
    arc.meta?.outcome ? `Final outcome: ${arc.meta.outcome}.` : '',
    arc.meta?.level ? `Level: ${arc.meta.level}.` : '',
    arc.meta?.dailyTime ? `Daily time: ${arc.meta.dailyTime}.` : '',
    arc.meta?.extra ? `Situation: ${arc.meta.extra}` : '',
    `Last week's plan: ${prev.theme || '—'}${prev.milestone ? ` (${prev.milestone})` : ''}.`,
    `Last week result: habits ${pct(stats.habitDone, stats.habitDue)} done, tasks ${stats.taskDone}/${stats.taskTotal} done.`,
    stats.taskTitles.length ? `Last week's tasks: ${stats.taskTitles.slice(0, 14).join('; ')}.` : '',
    `This week's plan: ${cur.theme || '—'}${cur.milestone ? ` (${cur.milestone})` : ''}.`,
    feedback.rating ? `They said last week was: ${feedback.rating}.` : '',
    feedback.blockers?.length ? `What got in the way: ${feedback.blockers.join(', ')}.` : '',
    feedback.extra ? `Their note: ${feedback.extra}` : '',
  ].filter(Boolean).join('\n')
  const out = await chat(
    [{ role: 'system', content: WEEK_SYSTEM }, { role: 'user', content: user }],
    { model, temperature: 0.6, max_tokens: 2500, json: true, reasoning: 'medium' }
  )
  let raw = null
  try { raw = JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1)) } catch { /* handled below */ }
  const plan = normalizeWeekPlan(raw)
  if (!plan) throw new Error('The AI reply could not be read as a plan. Try again.')
  return plan
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
- KEEP IT COMPACT (the reply has a length limit): max ~20 items total, max ~10 tasks. Cover only this week's tasks. Use a habit for anything that repeats instead of listing many tasks. Short titles.
- Write explanation BEFORE the json block. Never say it's already added — user confirms by clicking the button.
- Do NOT output any json if you are NOT proposing a complete plan (e.g. during the option-selection step).

UPDATES — adjust existing items (user still confirms):
\`\`\`json
{"plan":[
 {"kind":"update","target":"goal","title":"Run 60 km this month","set":{"target":40}}
]}
\`\`\``


const MOOD_LABEL = { 1: 'Rough', 2: 'Low', 3: 'Okay', 4: 'Good', 5: 'Great' }

export function buildCoachContext({ habits = [], completions = {}, goals = [], tasks = {}, missNotes = {}, reviews = {}, moods = {}, visions = {}, notes = {}, dayCheckins = {}, arcs = [] }) {
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

  const recentCheckins = Object.entries(dayCheckins)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 5)
  const checkinLine = recentCheckins.length
    ? `Evening check-ins (did the day match the plan): ${recentCheckins
        .map(([d, c]) => `${d.slice(5)} ${c.match}${c.blockers?.length ? ` (${c.blockers.join(', ')})` : ''}${c.win ? ` win: ${c.win}` : ''}`)
        .join('; ')}.`
    : ''

  const arcLines = arcs
    .filter((a) => a.status === 'active')
    .map((a) => {
      const { day, total, weekIdx } = arcDay(a)
      const wk = a.weeks?.[weekIdx] || {}
      return `"${a.title}" day ${day}/${total}, week ${weekIdx + 1}: ${wk.theme || ''}${wk.milestone ? ` (${wk.milestone})` : ''}${a.minDay ? `; minimum day: ${a.minDay}` : ''}`
    })

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
    arcLines.length ? `Active arcs: ${arcLines.join(' | ')}.` : '',
    checkinLine,
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
    { model, temperature: 0.85, max_tokens: 4000 }
  )
}

// Streaming chat. Yields text deltas as they arrive.
export async function* aiChatStream(messages, contextText, model = DEFAULT_MODEL) {
  const t = await aiTarget(model)
  model = t.model
  let res
  try {
    res = await fetch(t.url, {
      method: 'POST',
      headers: t.headers,
      body: JSON.stringify({
        model,
        // Strip UI-only fields (proposal/applied/dismissed) — providers reject any
        // message property beyond role/content.
        messages: [
          { role: 'system', content: `${COACH_SYSTEM}\n\nUSER DATA SNAPSHOT:\n${contextText}` },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
        stream: true,
        temperature: 0.85,
        max_tokens: 4000,
      }),
    })
  } catch {
    throw new Error('Could not reach the AI. Check your connection and try again.')
  }
  if (!res.ok) throw httpError(res.status, await res.text(), t.byok)
  if (!res.body) throw new Error('The AI returned an unreadable response. Try again.')

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

// Walk the array after `"plan":[` and JSON.parse each top-level object that is
// fully closed. String-aware so braces inside titles don't confuse the depth count.
function salvageTruncatedPlan(text) {
  const m = /"plan"\s*:\s*\[/.exec(text)
  if (!m) return null
  const objs = []
  let depth = 0, inStr = false, esc = false, objStart = -1
  for (let i = m.index + m[0].length; i < text.length; i++) {
    const c = text[i]
    if (inStr) {
      if (esc) esc = false
      else if (c === '\\') esc = true
      else if (c === '"') inStr = false
      continue
    }
    if (c === '"') inStr = true
    else if (c === '{') { if (depth++ === 0) objStart = i }
    else if (c === '}' && --depth === 0 && objStart >= 0) {
      try { objs.push(JSON.parse(text.slice(objStart, i + 1))) } catch { /* skip bad item */ }
      objStart = -1
    } else if (c === ']' && depth === 0) break
  }
  const items = filterItems(objs)
  if (!items.length) return null
  // Strip from the opening fence (or the object start) to the end of the reply.
  const fence = text.lastIndexOf('```', m.index)
  const from = fence >= 0 ? fence : text.lastIndexOf('{', m.index)
  return { raw: text.slice(from), items }
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
    } catch { /* ignore */ }
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
        } catch { /* ignore */ }
      }
    }
  }

  // Last resort: the reply was cut off mid-plan (token limit). Keep every
  // complete item that arrived instead of losing the whole plan.
  if (!items) {
    const salvaged = salvageTruncatedPlan(text)
    if (salvaged) { raw = salvaged.raw; items = salvaged.items }
  }

  if (!items) return { clean: text.trim(), proposal: null }

  const clean = text.replace(raw, '').replace(/\n{3,}/g, '\n\n').trim()
  return { clean: clean || 'Here\'s a plan you can add:', proposal: items }
}

const REVIEW_SYSTEM = `You are an honest, encouraging coach reviewing a finished arc. Reply with ONLY one JSON object, no prose, no code fences.
Schema: {"summary":"2 sentences, honest, using the numbers","wins":["2-3 specific wins"],"lessons":["2-3 specific lessons about what slowed them"],"next":{"theme":"a natural next arc name","why":"one sentence"}}
Keep each string under 18 words. No flattery: if completion was low, say so kindly and plan smaller.`

export async function aiArcReview(arc, summary, model) {
  const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : 'n/a')
  const user = [
    `Arc: "${arc.title}" — ${arc.why || ''} (${arc.weeks.length} weeks).`,
    arc.meta?.outcome ? `Intended outcome: ${arc.meta.outcome}.` : '',
    `Habits done: ${summary.habitDone}/${summary.habitDue} (${pct(summary.habitDone, summary.habitDue)}). Tasks done: ${summary.taskDone}/${summary.taskTotal} (${pct(summary.taskDone, summary.taskTotal)}).`,
    summary.goalPct != null ? `Goal "${summary.goalTitle}" progress: ${summary.goalPct}%.` : '',
    Object.keys(summary.feel).length ? `How weeks felt: ${Object.entries(summary.feel).map(([k, v]) => `${k} x${v}`).join(', ')}.` : '',
    (arc.checkins || []).flatMap((c) => c.blockers || []).length
      ? `Blockers named: ${[...new Set((arc.checkins || []).flatMap((c) => c.blockers || []))].join(', ')}.`
      : '',
  ].filter(Boolean).join('\n')
  const out = await chat(
    [{ role: 'system', content: REVIEW_SYSTEM }, { role: 'user', content: user }],
    { model, temperature: 0.6, max_tokens: 1200, json: true, reasoning: 'low' }
  )
  let raw = null
  try { raw = JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1)) } catch { /* handled below */ }
  if (!raw || !String(raw.summary || '').trim()) throw new Error('The AI reply could not be read. Try again.')
  const list = (v) => (Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean).slice(0, 4) : [])
  return {
    summary: String(raw.summary).trim(),
    wins: list(raw.wins),
    lessons: list(raw.lessons),
    next: raw.next?.theme ? { theme: String(raw.next.theme).trim(), why: String(raw.next.why || '').trim() } : null,
  }
}
