import { expect, test } from '@playwright/test'
import { mergeStates, stableStringify, stampChanges } from '../../src/mergeState.js'

// Pure-function tests for the multi-device merge: no browser, no network.

const D = '2026-10-20'
const T0 = 1_000_000_000_000 // an arbitrary "now"; later edits add milliseconds to it
const base = () => ({
  habits: [
    { id: 'h1', name: 'Run' },
    { id: 'h2', name: 'Read' },
  ],
  goals: [],
  arcs: [],
  recurringTasks: [],
  completions: {},
  tasks: {},
  notes: {},
  moods: {},
  dayCheckins: {},
  theme: 'dark',
  chatSessions: [],
  notifications: [],
  focusLog: [],
  _ts: {},
  _del: {},
})

// an edit by one device at time t
const edit = (state, fn, t) => stampChanges(state, fn(state), t)
const ids = (state, date = D) => [...(state.completions[date] || [])].sort()
const titles = (state, date = D) => (state.tasks[date] || []).map((t) => t.title).sort()

test('ticking different habits on two devices keeps both', () => {
  const a = edit(base(), (s) => ({ ...s, completions: { [D]: ['h1'] } }), T0 + 1)
  const b = edit(base(), (s) => ({ ...s, completions: { [D]: ['h2'] } }), T0 + 2)
  expect(ids(mergeStates(a, b, true))).toEqual(['h1', 'h2'])
  expect(ids(mergeStates(b, a, false))).toEqual(['h1', 'h2'])
})

test('an un-tick made later is not undone by merging an older copy', () => {
  const ticked = edit(base(), (s) => ({ ...s, completions: { [D]: ['h1', 'h2'] } }), T0 + 1)
  const other = ticked // the other device still has both ticks
  const unticked = edit(ticked, (s) => ({ ...s, completions: { [D]: ['h2'] } }), T0 + 5)
  expect(ids(mergeStates(unticked, other, false))).toEqual(['h2'])
  expect(ids(mergeStates(other, unticked, true))).toEqual(['h2'])
})

test('a re-tick after an un-tick wins over the tombstone', () => {
  const s1 = edit(base(), (s) => ({ ...s, completions: { [D]: ['h1'] } }), T0 + 1)
  const s2 = edit(s1, (s) => ({ ...s, completions: {} }), T0 + 2)
  const s3 = edit(s2, (s) => ({ ...s, completions: { [D]: ['h1'] } }), T0 + 3)
  expect(ids(mergeStates(s3, s2, false))).toEqual(['h1'])
  expect(ids(mergeStates(s2, s3, true))).toEqual(['h1'])
})

test('deleting a task on one device and editing another on the other device both survive', () => {
  const start = edit(
    base(),
    (s) => ({ ...s, tasks: { [D]: [{ id: 't1', title: 'one' }, { id: 't2', title: 'two' }] } }),
    T0 + 1,
  )
  const a = edit(start, (s) => ({ ...s, tasks: { [D]: s.tasks[D].filter((t) => t.id !== 't1') } }), T0 + 10)
  const b = edit(start, (s) => ({ ...s, tasks: { [D]: s.tasks[D].map((t) => (t.id === 't2' ? { ...t, title: 'two (edited)' } : t)) } }), T0 + 11)
  const merged = mergeStates(a, b, true)
  expect(titles(merged)).toEqual(['two (edited)'])
  expect(titles(mergeStates(b, a, false))).toEqual(['two (edited)'])
})

test('concurrent edits to the same task: the later one wins', () => {
  const start = edit(base(), (s) => ({ ...s, tasks: { [D]: [{ id: 't1', title: 'draft' }] } }), T0 + 1)
  const a = edit(start, (s) => ({ ...s, tasks: { [D]: [{ id: 't1', title: 'from A' }] } }), T0 + 5)
  const b = edit(start, (s) => ({ ...s, tasks: { [D]: [{ id: 't1', title: 'from B' }] } }), T0 + 9)
  expect(titles(mergeStates(a, b, true))).toEqual(['from B'])
  expect(titles(mergeStates(b, a, false))).toEqual(['from B'])
})

test('tasks added on both devices for the same day are both kept', () => {
  const a = edit(base(), (s) => ({ ...s, tasks: { [D]: [{ id: 'ta', title: 'A task' }] } }), T0 + 1)
  const b = edit(base(), (s) => ({ ...s, tasks: { [D]: [{ id: 'tb', title: 'B task' }] } }), T0 + 2)
  expect(titles(mergeStates(a, b, true))).toEqual(['A task', 'B task'])
})

test('a deleted habit stays deleted, unless it was edited after the delete', () => {
  const deletedHere = edit(base(), (s) => ({ ...s, habits: s.habits.filter((h) => h.id !== 'h2') }), T0 + 10)
  const stale = edit(base(), (s) => s, T0) // other device never touched h2 (no stamp)
  expect(mergeStates(deletedHere, stale, false).habits.map((h) => h.id)).toEqual(['h1'])

  const editedLater = edit(base(), (s) => ({ ...s, habits: s.habits.map((h) => (h.id === 'h2' ? { ...h, name: 'Read more' } : h)) }), T0 + 20)
  const merged = mergeStates(deletedHere, editedLater, true)
  expect(merged.habits.map((h) => h.name).sort()).toEqual(['Read more', 'Run'])
})

test('notes, moods and check-ins merge per date', () => {
  const a = edit(base(), (s) => ({ ...s, notes: { [D]: 'wrote on A' }, moods: { [D]: 4 } }), T0 + 1)
  const b = edit(base(), (s) => ({ ...s, notes: { '2026-10-19': 'wrote on B' }, dayCheckins: { [D]: { match: 'yes' } } }), T0 + 2)
  const m = mergeStates(a, b, true)
  expect(m.notes).toEqual({ [D]: 'wrote on A', '2026-10-19': 'wrote on B' })
  expect(m.moods[D]).toBe(4)
  expect(m.dayCheckins[D]).toEqual({ match: 'yes' })
})

test('copies from before stamps existed are unioned, not overwritten', () => {
  const legacyRemote = { ...base(), completions: { [D]: ['h2'] }, _ts: undefined, _del: undefined }
  const local = edit(base(), (s) => ({ ...s, completions: { [D]: ['h1'] } }), T0 + 1)
  expect(ids(mergeStates(local, legacyRemote, true))).toEqual(['h1', 'h2'])
})

test('settings: the newer copy wins; collections are unioned', () => {
  const a = { ...base(), theme: 'light', chatSessions: [{ id: 'c1', updatedAt: 1 }], focusLog: [{ date: D, minutes: 25 }] }
  const b = { ...base(), theme: 'dark', chatSessions: [{ id: 'c1', updatedAt: 5, edited: true }, { id: 'c2', updatedAt: 2 }], focusLog: [{ date: D, minutes: 25 }, { date: D, minutes: 50 }] }
  const remoteWins = mergeStates(a, b, true)
  expect(remoteWins.theme).toBe('dark')
  const localWins = mergeStates(a, b, false)
  expect(localWins.theme).toBe('light')
  expect(remoteWins.chatSessions.map((c) => c.id).sort()).toEqual(['c1', 'c2'])
  expect(remoteWins.chatSessions.find((c) => c.id === 'c1').edited).toBe(true)
  expect(remoteWins.focusLog).toHaveLength(2) // the duplicate session is not doubled
})

test('merging is stable: same result either way round, and merging again changes nothing', () => {
  const a = edit(
    edit(base(), (s) => ({ ...s, completions: { [D]: ['h1'] }, tasks: { [D]: [{ id: 't1', title: 'A' }] } }), T0 + 1),
    (s) => ({ ...s, notes: { [D]: 'n' } }),
    T0 + 3,
  )
  const b = edit(base(), (s) => ({ ...s, completions: { [D]: ['h2'] }, tasks: { [D]: [{ id: 't2', title: 'B' }] } }), T0 + 2)
  const ab = mergeStates(a, b, false)
  const ba = mergeStates(b, a, false)
  expect(ids(ab)).toEqual(ids(ba))
  expect(titles(ab)).toEqual(titles(ba))
  expect(stableStringify(mergeStates(ab, b, false).completions)).toBe(stableStringify(ab.completions))
  expect(stableStringify(mergeStates(ab, ab, false))).toBe(stableStringify(ab))
})

test('stamping only touches entries that changed', () => {
  const s0 = edit(base(), (s) => ({ ...s, notes: { [D]: 'a', '2026-10-19': 'b' } }), T0 + 1)
  const s1 = edit(s0, (s) => ({ ...s, notes: { ...s.notes, [D]: 'a2' } }), T0 + 7)
  expect(s1._ts[`n|${D}`]).toBe(T0 + 7)
  expect(s1._ts['n|2026-10-19']).toBe(T0 + 1)
  // an edit that changes nothing returns the same object (no needless re-render or push)
  expect(stampChanges(s1, { ...s1 }, T0 + 99)._ts).toBe(s1._ts)
  expect(stampChanges(s1, s1, T0 + 99)).toBe(s1)
})

test('old tombstones are pruned, recent ones kept', () => {
  const now = T0 + 200 * 86400000
  const old = { ...base(), _del: { 'h|gone': T0 } }
  const recent = { ...base(), _del: { 'h|gone2': now - 1000 } }
  const merged = mergeStates(old, recent, true, now)
  expect(merged._del['h|gone']).toBeUndefined()
  expect(merged._del['h|gone2']).toBe(now - 1000)
})
