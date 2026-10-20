// Multi-device merge for the single synced state blob. Plain functions, no React.
//
// The blob used to be "last device to save wins", which silently dropped changes made
// on another device. Now every edit to the things people actually touch on several
// devices is stamped with the time it happened, and two copies are merged per item:
//
//   completions   one entry per (date, habit)          path  c|date|habitId
//   tasks         one entry per (date, task id)        path  t|date|taskId
//   notes         one entry per date                   path  n|date
//   moods         one entry per date                   path  m|date
//   dayCheckins   one entry per date                   path  k|date
//   habits / goals / arcs / recurringTasks  by id      path  h|id  g|id  a|id  r|id
//
// state._ts[path]  = when that entry was last added or changed
// state._del[path] = when it was removed (tombstone, so a delete isn't undone by a merge)
//
// Everything else (settings, caches, ...) keeps whole-key "newer copy wins".
// Data written before stamps existed has none: entries present on either side are kept.

const ITEMS = { habits: 'h', goals: 'g', arcs: 'a', recurringTasks: 'r' }
const SLICES = [...Object.keys(ITEMS), 'completions', 'tasks', 'notes', 'moods', 'dayCheckins']

const DEL_TTL = 90 * 86400000 // tombstones older than this are dropped
const TS_TTL = 180 * 86400000 // stamps older than this are dropped (entry then merges as "unstamped")

const same = (a, b) => a === b || JSON.stringify(a) === JSON.stringify(b)

// Entries of one slice as Map(path -> value).
function flattenSlice(state, slice) {
  const out = new Map()
  if (slice in ITEMS) {
    const prefix = ITEMS[slice]
    for (const it of state[slice] || []) if (it && it.id != null) out.set(`${prefix}|${it.id}`, it)
  } else if (slice === 'completions') {
    for (const [date, ids] of Object.entries(state.completions || {})) for (const id of ids || []) out.set(`c|${date}|${id}`, true)
  } else if (slice === 'tasks') {
    for (const [date, list] of Object.entries(state.tasks || {})) for (const t of list || []) if (t && t.id != null) out.set(`t|${date}|${t.id}`, t)
  } else {
    const prefix = { notes: 'n', moods: 'm', dayCheckins: 'k' }[slice]
    for (const [date, v] of Object.entries(state[slice] || {})) if (v) out.set(`${prefix}|${date}`, v)
  }
  return out
}

export function flatten(state) {
  const all = new Map()
  for (const s of SLICES) for (const [k, v] of flattenSlice(state, s)) all.set(k, v)
  return all
}

// Called with the previous and next state of every user edit. Returns `next` with
// _ts/_del updated for exactly the entries that changed (or `next` itself if none did).
export function stampChanges(prev, next, now = Date.now()) {
  if (prev === next) return next
  let ts = null
  let del = null
  for (const slice of SLICES) {
    if (prev[slice] === next[slice]) continue
    const before = flattenSlice(prev, slice)
    const after = flattenSlice(next, slice)
    for (const [path, value] of after) {
      if (before.has(path) && same(before.get(path), value)) continue
      ts ||= { ...(next._ts || prev._ts || {}) }
      del ||= { ...(next._del || prev._del || {}) }
      ts[path] = now
      delete del[path]
    }
    for (const path of before.keys()) {
      if (after.has(path)) continue
      ts ||= { ...(next._ts || prev._ts || {}) }
      del ||= { ...(next._del || prev._del || {}) }
      del[path] = now
      delete ts[path]
    }
  }
  return ts || del ? { ...next, _ts: ts || next._ts || {}, _del: del || next._del || {} } : next
}

// Rebuild the entity slices of `base` from merged entries. Order: local order first,
// then entries that only the other side had.
function rebuild(base, merged) {
  const out = { ...base }
  for (const [slice, prefix] of Object.entries(ITEMS)) {
    out[slice] = [...merged].filter(([p]) => p.startsWith(prefix + '|')).map(([, v]) => v)
  }
  const completions = {}
  const tasks = {}
  const notes = {}
  const moods = {}
  const dayCheckins = {}
  for (const [path, value] of merged) {
    const [kind, a, b] = path.split('|')
    if (kind === 'c') (completions[a] ||= []).push(b)
    else if (kind === 't') (tasks[a] ||= []).push(value)
    else if (kind === 'n') notes[a] = value
    else if (kind === 'm') moods[a] = value
    else if (kind === 'k') dayCheckins[a] = value
  }
  return { ...out, completions, tasks, notes, moods, dayCheckins }
}

function unionById(local = [], remote = [], pick) {
  const map = new Map()
  for (const x of remote) if (x && x.id != null) map.set(x.id, x)
  for (const x of local) {
    if (!x || x.id == null) continue
    const other = map.get(x.id)
    map.set(x.id, other ? pick(x, other) : x)
  }
  return [...map.values()]
}

// Merge two copies of the state. `remoteNewer`: the remote copy was saved after the
// last time this device synced, so it wins for settings and other whole-key values.
export function mergeStates(local, remote, remoteNewer, now = Date.now()) {
  const lts = local._ts || {}
  const rts = remote._ts || {}
  const ldel = local._del || {}
  const rdel = remote._del || {}
  const lf = flatten(local)
  const rf = flatten(remote)

  const paths = new Set([...lf.keys(), ...rf.keys()])
  const merged = new Map()
  const ts = {}
  const del = {}

  for (const path of paths) {
    const hasL = lf.has(path)
    const hasR = rf.has(path)
    const lStamp = lts[path] ?? 0
    const rStamp = rts[path] ?? 0
    const dStamp = Math.max(ldel[path] ?? 0, rdel[path] ?? 0)
    let value
    let stamp
    if (hasL && hasR) {
      value = rStamp > lStamp ? rf.get(path) : lf.get(path)
      stamp = Math.max(lStamp, rStamp)
    } else if (hasL) {
      value = lf.get(path)
      stamp = lStamp
    } else {
      value = rf.get(path)
      stamp = rStamp
    }
    if (dStamp > stamp) {
      del[path] = dStamp // removed after it was last written: stays removed
    } else {
      merged.set(path, value)
      if (stamp) ts[path] = stamp
    }
  }
  // tombstones for entries neither side has any more
  for (const [path, t] of Object.entries({ ...rdel, ...ldel })) {
    const stamp = Math.max(ldel[path] ?? 0, rdel[path] ?? 0, t)
    if (!merged.has(path) && !(path in del)) del[path] = stamp
  }

  // whole-key values: the newer copy wins; a few collections are unioned
  const base = remoteNewer ? { ...local, ...remote } : { ...remote, ...local }
  const result = rebuild(base, merged)

  result.chatSessions = unionById(local.chatSessions, remote.chatSessions, (a, b) => ((a.updatedAt || 0) >= (b.updatedAt || 0) ? a : b))
  result.notifications = unionById(local.notifications, remote.notifications, (a, b) => (a.read ? a : b))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 50)
  const seen = new Set()
  result.focusLog = [...(local.focusLog || []), ...(remote.focusLog || [])].filter((f) => {
    const k = JSON.stringify(f)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })

  for (const [p, t] of Object.entries(ts)) if (now - t > TS_TTL) delete ts[p]
  for (const [p, t] of Object.entries(del)) if (now - t > DEL_TTL) delete del[p]
  result._ts = ts
  result._del = del
  return result
}

// Key-order independent JSON, to tell "same content" from "same bytes".
export function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`
  }
  return JSON.stringify(value)
}
