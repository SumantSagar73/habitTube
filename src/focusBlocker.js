// Page-side bridge to the HabitTube Focus browser extension. The page can't call
// chrome.* directly, so it postMessages the extension's content script and waits
// for a reply. Every call is best-effort — if the extension isn't installed,
// requests resolve to null and the app just runs without site-blocking.

let reqId = 0
const pending = new Map()
let eventCb = null

if (typeof window !== 'undefined') {
  window.addEventListener('message', (e) => {
    if (e.source !== window || !e.data || typeof e.data !== 'object') return
    const { __ht, id, resp, msg } = e.data
    if (__ht === 'res' && pending.has(id)) {
      pending.get(id)(resp)
      pending.delete(id)
    } else if (__ht === 'event' && eventCb) {
      eventCb(msg)
    }
  })
}

function send(msg, timeout = 1200) {
  return new Promise((resolve) => {
    const id = ++reqId
    pending.set(id, resolve)
    window.postMessage({ __ht: 'req', id, msg }, '*')
    setTimeout(() => {
      if (pending.has(id)) { pending.delete(id); resolve(null) }
    }, timeout)
  })
}

// Resolves to true if the extension responds (i.e. is installed & enabled)
export async function blockerInstalled() {
  const r = await send({ type: 'STATUS' })
  return !!(r && r.installed)
}

export async function blockerStatus() {
  return send({ type: 'STATUS' })
}

export async function startBlocking(endsAt, allowlist, blocklist, label) {
  return send({ type: 'START', endsAt, allowlist: allowlist || [], blocklist: blocklist || [], label: label || '' })
}

export async function stopBlocking() {
  return send({ type: 'STOP' })
}

export function onBlockerEvent(cb) {
  eventCb = cb
}
