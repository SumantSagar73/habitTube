import { expect, test } from '@playwright/test'
import { mergeStates, stampChanges } from '../../src/mergeState.js'
import {
  appendParts, clearRevise, doneSince, dueRevisions, flagRevise, isComplete, linkLabel, markRevised, newResource,
  nextPart, progress, setPartDone, setSectionDone, studyQueue, studySummary,
} from '../../src/resources.js'

const TODAY = '2026-10-20'
const res = (extra = {}) =>
  newResource({
    type: 'udemy',
    title: 'React course',
    parts: [
      { title: 'Intro', section: 'Basics', minutes: 3 },
      { title: 'JSX', section: 'Basics', minutes: 8 },
      { title: 'Hooks', section: 'Advanced', minutes: 12 },
    ],
    ...extra,
  })

test('a resource without parts is a single part; with parts it keeps their order and sections', () => {
  const single = newResource({ type: 'article', title: 'Great post' })
  expect(single.parts.map((p) => p.title)).toEqual(['Great post'])
  const r = res()
  expect(r.parts.map((p) => p.section)).toEqual(['Basics', 'Basics', 'Advanced'])
  expect(progress(r)).toMatchObject({ done: 0, total: 3, pct: 0, revise: 0 })
})

test('ticking parts updates progress, stamps the day, and starts the resource', () => {
  let r = res()
  expect(r.started).toBe(false)
  r = setPartDone(r, r.parts[0].id, true, TODAY)
  expect(r.started).toBe(true)
  expect(r.parts[0]).toMatchObject({ done: true, doneAt: TODAY })
  expect(progress(r)).toMatchObject({ done: 1, total: 3, pct: 33 })
  expect(nextPart(r).title).toBe('JSX')
  r = setPartDone(r, r.parts[0].id, false, TODAY)
  expect(r.parts[0]).toMatchObject({ done: false, doneAt: null })
  expect(isComplete(r)).toBe(false)
})

test('marking a whole section done only touches that section', () => {
  let r = res()
  r = setSectionDone(r, 'Basics', true, TODAY)
  expect(r.parts.map((p) => p.done)).toEqual([true, true, false])
  expect(isComplete(setSectionDone(r, 'Advanced', true, TODAY))).toBe(true)
  expect(setSectionDone(r, 'Basics', false, TODAY).parts.map((p) => p.done)).toEqual([false, false, false])
})

test('revision comes back after 1, 3, 7 and 14 days, then finishes', () => {
  let r = res()
  const id = r.parts[0].id
  r = flagRevise(r, id, '2026-10-20')
  expect(r.parts[0]).toMatchObject({ revise: true, reviseStage: 0, reviseDue: '2026-10-21' })

  r = markRevised(r, id, '2026-10-21')
  expect(r.parts[0]).toMatchObject({ revise: true, reviseStage: 1, reviseDue: '2026-10-24' }) // +3
  r = markRevised(r, id, '2026-10-24')
  expect(r.parts[0]).toMatchObject({ reviseStage: 2, reviseDue: '2026-10-31' }) // +7
  r = markRevised(r, id, '2026-10-31')
  expect(r.parts[0]).toMatchObject({ reviseStage: 3, reviseDue: '2026-11-14' }) // +14
  r = markRevised(r, id, '2026-11-14')
  expect(r.parts[0]).toMatchObject({ revise: false, reviseStage: 0, reviseDue: null }) // done
})

test('clearing a flag removes the schedule; only due parts are listed, oldest first', () => {
  let a = res()
  let b = res({ title: 'Second' })
  a = flagRevise(a, a.parts[0].id, '2026-10-18') // due 10-19
  b = flagRevise(b, b.parts[1].id, '2026-10-15') // due 10-16
  const c = flagRevise(res({ title: 'Later' }), res().parts[0].id, TODAY) // wrong id, no-op
  expect(c.parts.some((p) => p.revise)).toBe(false)

  const due = dueRevisions([a, b], TODAY)
  expect(due.map((d) => d.res.title)).toEqual(['Second', 'React course'])
  expect(dueRevisions([a, b], '2026-10-17').map((d) => d.res.title)).toEqual(['Second'])
  expect(dueRevisions([a, b], '2026-10-15')).toEqual([])

  a = clearRevise(a, a.parts[0].id)
  expect(a.parts[0]).toMatchObject({ revise: false, reviseDue: null })
  expect(dueRevisions([a], TODAY)).toEqual([])
})

test('the study queue offers started resources and those on a running arc, never finished ones', () => {
  const started = setPartDone(res({ title: 'Started' }), res().parts[0].id, true) // wrong id on purpose: stays unstarted
  expect(started.started).toBe(false)
  const reallyStarted = (() => { const r = res({ title: 'Started' }); return setPartDone(r, r.parts[0].id, true, TODAY) })()
  const onArc = res({ title: 'On arc', arcId: 'a1' })
  const onPausedArc = res({ title: 'Paused arc', arcId: 'a2' })
  const idle = res({ title: 'Idle' })
  const finished = (() => { let r = res({ title: 'Finished', arcId: 'a1' }); for (const p of r.parts) r = setPartDone(r, p.id, true, TODAY); return r })()

  const arcs = [{ id: 'a1', status: 'active' }, { id: 'a2', status: 'paused' }]
  const q = studyQueue([reallyStarted, onArc, onPausedArc, idle, finished], arcs)
  expect(q.map((x) => x.res.title)).toEqual(['Started', 'On arc'])
  expect(q[0].part.title).toBe('JSX') // continues where you left off
})

test('appending parts keeps existing progress', () => {
  let r = res()
  r = setPartDone(r, r.parts[0].id, true, TODAY)
  r = appendParts(r, [{ title: 'Testing', section: 'Advanced' }])
  expect(r.parts).toHaveLength(4)
  expect(r.parts[0].done).toBe(true)
  expect(r.parts[3]).toMatchObject({ title: 'Testing', done: false })
})

test('study summary reads well for the coach: progress, recent gains, revisions due', () => {
  let r = res()
  r = setPartDone(r, r.parts[0].id, true, '2026-10-19')
  r = setPartDone(r, r.parts[1].id, true, '2026-10-20')
  r = flagRevise(r, r.parts[0].id, '2026-10-17') // due 10-18
  const lines = studySummary([r], { sinceKey: '2026-10-14', today: TODAY })
  expect(lines).toEqual(['"React course" 2/3 (+2 recently), 1 revision due'])
  expect(doneSince(r, '2026-10-20')).toBe(1)
  expect(studySummary([r], { arcId: 'someone-else' })).toEqual([])
})

test('link labels fall back to Unsorted', () => {
  const arcs = [{ id: 'a1', title: 'Fit Sprint' }]
  const goals = [{ id: 'g1', title: 'Learn React' }]
  expect(linkLabel(res({ arcId: 'a1' }), arcs, goals)).toBe('Fit Sprint')
  expect(linkLabel(res({ goalId: 'g1' }), arcs, goals)).toBe('Learn React')
  expect(linkLabel(res(), arcs, goals)).toBe('Unsorted')
  expect(linkLabel(res({ arcId: 'gone' }), arcs, goals)).toBe('Unsorted')
})

// ---- sync: resources merge by id like habits and goals ----
const stateWith = (resources) => ({
  habits: [], goals: [], arcs: [], recurringTasks: [], resources, completions: {}, tasks: {}, notes: {}, moods: {}, dayCheckins: {},
  chatSessions: [], notifications: [], focusLog: [], _ts: {}, _del: {},
})

test('resources added on two devices are both kept; a delete is not undone by an older copy', () => {
  const a1 = res({ title: 'From phone' })
  const b1 = res({ title: 'From laptop' })
  const a = stampChanges(stateWith([]), stateWith([a1]), 1000)
  const b = stampChanges(stateWith([]), stateWith([b1]), 2000)
  expect(mergeStates(a, b, true).resources.map((r) => r.title).sort()).toEqual(['From laptop', 'From phone'])

  const afterDelete = stampChanges(a, { ...a, resources: [] }, 3000)
  expect(mergeStates(afterDelete, a, false).resources).toEqual([]) // the older copy still has it
})

test('the later edit to the same resource wins', () => {
  const r = res()
  const start = stampChanges(stateWith([]), stateWith([r]), 1000)
  const onA = stampChanges(start, { ...start, resources: [{ ...r, notes: 'from A' }] }, 2000)
  const onB = stampChanges(start, { ...start, resources: [{ ...r, notes: 'from B' }] }, 3000)
  expect(mergeStates(onA, onB, true).resources[0].notes).toBe('from B')
  expect(mergeStates(onB, onA, false).resources[0].notes).toBe('from B')
})
