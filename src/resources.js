// Study resources (YouTube, GitHub, Udemy, articles, books, docs) attached to a goal or an arc.
//
// resource: { id, type, title, url, arcId, goalId, notes, started, createdAt, updatedAt,
//             parts: [{ id, title, section, minutes, done, doneAt, revise, reviseStage, reviseDue }] }
//
// A resource is a list of parts (lectures, videos, chapters). Each part has two independent
// marks: done, and "revise". A part flagged for revision comes back on a spaced schedule.
import { addDays, dateKey, parseKey, todayKey, uid } from './utils'

export const RESOURCE_TYPES = [
  { id: 'youtube', label: 'YouTube' },
  { id: 'github', label: 'GitHub' },
  { id: 'udemy', label: 'Udemy' },
  { id: 'article', label: 'Article' },
  { id: 'book', label: 'Book' },
  { id: 'docs', label: 'Docs' },
]

// Days until the next revision: 1 day after flagging, then 3, 7 and 14 days after each revision.
export const REVISE_STEPS = [1, 3, 7, 14]

export const addDaysKey = (key, n) => dateKey(addDays(parseKey(key), n))

export function makePart({ title, section = '', minutes = null }) {
  return { id: uid(), title: String(title).trim(), section: section || '', minutes: minutes ?? null, done: false, doneAt: null, revise: false, reviseStage: 0, reviseDue: null }
}

// parts: [{ title, section?, minutes? }]. With none given, the resource is a single part.
export function newResource({ type = 'article', title, url = '', arcId = null, goalId = null, parts = [] }, now = Date.now()) {
  const list = parts.length ? parts : [{ title }]
  return {
    id: uid(),
    type,
    title: String(title).trim(),
    url: url.trim(),
    arcId: arcId || null,
    goalId: goalId || null,
    notes: '',
    started: false,
    createdAt: todayKey(),
    updatedAt: now,
    parts: list.map(makePart),
  }
}

export function progress(res) {
  const total = res.parts.length
  const done = res.parts.filter((p) => p.done).length
  return { total, done, revise: res.parts.filter((p) => p.revise).length, pct: total ? Math.round((done / total) * 100) : 0 }
}

export const isComplete = (res) => res.parts.length > 0 && res.parts.every((p) => p.done)
export const nextPart = (res) => res.parts.find((p) => !p.done) || null

// ---- edits: each returns a new resource ----
const withParts = (res, parts, now) => ({ ...res, parts, updatedAt: now })
const mapPart = (res, partId, fn, now) => withParts(res, res.parts.map((p) => (p.id === partId ? fn(p) : p)), now)

export function setPartDone(res, partId, done, today = todayKey(), now = Date.now()) {
  const next = mapPart(res, partId, (p) => ({ ...p, done, doneAt: done ? today : null }), now)
  return done && res.parts.some((p) => p.id === partId) ? { ...next, started: true } : next
}

export function setSectionDone(res, section, done, today = todayKey(), now = Date.now()) {
  const parts = res.parts.map((p) => (p.section === section ? { ...p, done, doneAt: done ? p.doneAt || today : null } : p))
  return { ...withParts(res, parts, now), started: res.started || done }
}

export function flagRevise(res, partId, today = todayKey(), now = Date.now()) {
  return mapPart(res, partId, (p) => ({ ...p, revise: true, reviseStage: 0, reviseDue: addDaysKey(today, REVISE_STEPS[0]) }), now)
}

export function clearRevise(res, partId, now = Date.now()) {
  return mapPart(res, partId, (p) => ({ ...p, revise: false, reviseStage: 0, reviseDue: null }), now)
}

// You revised it: schedule the next round, or finish after the last one.
export function markRevised(res, partId, today = todayKey(), now = Date.now()) {
  return mapPart(res, partId, (p) => {
    const stage = (p.reviseStage || 0) + 1
    if (stage >= REVISE_STEPS.length) return { ...p, revise: false, reviseStage: 0, reviseDue: null }
    return { ...p, revise: true, reviseStage: stage, reviseDue: addDaysKey(today, REVISE_STEPS[stage]) }
  }, now)
}

export function appendParts(res, parts, now = Date.now()) {
  return withParts(res, [...res.parts, ...parts.map(makePart)], now)
}

// ---- reading ----

// Parts flagged for revision whose date has come, oldest first.
export function dueRevisions(resources = [], today = todayKey()) {
  const out = []
  for (const res of resources) {
    for (const part of res.parts || []) if (part.revise && part.reviseDue && part.reviseDue <= today) out.push({ res, part })
  }
  return out.sort((a, b) => a.part.reviseDue.localeCompare(b.part.reviseDue) || a.part.title.localeCompare(b.part.title))
}

// Resources worth offering "continue" for: started (or tied to a running arc) and not finished.
export function studyQueue(resources = [], arcs = []) {
  const running = new Set(arcs.filter((a) => a.status === 'active').map((a) => a.id))
  return resources
    .filter((r) => !isComplete(r) && (r.started || (r.arcId && running.has(r.arcId))))
    .map((res) => ({ res, part: nextPart(res), ...progress(res) }))
    .filter((x) => x.part)
}

export const doneSince = (res, fromKey) => res.parts.filter((p) => p.done && p.doneAt && p.doneAt >= fromKey).length

export function linkLabel(res, arcs = [], goals = []) {
  if (res.arcId) return arcs.find((a) => a.id === res.arcId)?.title || 'Unsorted'
  if (res.goalId) return goals.find((g) => g.id === res.goalId)?.title || 'Unsorted'
  return 'Unsorted'
}

// One line per resource for the coach and the weekly check-in.
export function studySummary(resources = [], { arcId = null, sinceKey = null, limit = 5, today = todayKey() } = {}) {
  const list = resources.filter((r) => !isComplete(r) && (arcId ? r.arcId === arcId : r.started || r.arcId))
  return list.slice(0, limit).map((r) => {
    const { done, total } = progress(r)
    const gained = sinceKey ? doneSince(r, sinceKey) : 0
    const due = r.parts.filter((p) => p.revise && p.reviseDue && p.reviseDue <= today).length
    return `"${r.title}" ${done}/${total}${gained ? ` (+${gained} recently)` : ''}${due ? `, ${due} revision${due > 1 ? 's' : ''} due` : ''}`
  })
}
