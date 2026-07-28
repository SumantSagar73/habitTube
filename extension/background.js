// HabitTube Focus — service worker.
// Enforces "block everything except the allowlist" during a focus session,
// driven by messages from the HabitTube web app (relayed by content.js).

const STORAGE = 'ht_focus_session'
const ALWAYS_ALLOW = ['localhost', '127.0.0.1']

function normDomain(input) {
  try {
    const u = new URL(/^https?:\/\//.test(input) ? input : 'https://' + input)
    return u.hostname.replace(/^www\./, '')
  } catch {
    return String(input || '').trim().replace(/^www\./, '').replace(/\/.*$/, '').toLowerCase()
  }
}

async function getSession() {
  const o = await chrome.storage.local.get(STORAGE)
  return o[STORAGE] || null
}
function setSession(s) { return chrome.storage.local.set({ [STORAGE]: s }) }
function clearSession() { return chrome.storage.local.remove(STORAGE) }

function domainMatch(host, list) {
  return (list || []).some((d) => host === d || host.endsWith('.' + d))
}

function hostAllowed(url, allow) {
  try {
    const h = new URL(url).hostname.replace(/^www\./, '')
    return domainMatch(h, allow)
  } catch {
    return true // non-http (extension pages, about:blank) — never block
  }
}

function isOffLimits(domain, s) {
  const h = normDomain(domain)
  return domainMatch(h, s.block || [])
}

// Permanent allowlist + any still-valid temporary allows
function activeAllow(s) {
  const now = Date.now()
  const temp = (s.temp || []).filter((t) => t.until > now).map((t) => t.d)
  return [...new Set([...(s.allow || []), ...temp])]
}

async function applyRules(s) {
  const existing = await chrome.declarativeNetRequest.getDynamicRules()
  // Capture the original URL (group 1) and pass it to blocked.html?u=... so the
  // page can offer a temporary allow for exactly that site.
  const rules = [
    {
      id: 1,
      priority: 1,
      action: { type: 'redirect', redirect: { regexSubstitution: chrome.runtime.getURL('blocked.html') + '?u=\\1' } },
      condition: { resourceTypes: ['main_frame'], regexFilter: '^(https?://.*)$' },
    },
  ]
  const allow = activeAllow(s)
  if (allow.length) {
    rules.push({
      id: 2,
      priority: 2,
      action: { type: 'allow' },
      condition: { resourceTypes: ['main_frame'], requestDomains: allow },
    })
  }
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existing.map((r) => r.id),
    addRules: rules,
  })
}

async function clearRules() {
  const existing = await chrome.declarativeNetRequest.getDynamicRules()
  if (existing.length) {
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: existing.map((r) => r.id), addRules: [] })
  }
}

// Redirect already-open distraction tabs when a session starts
async function sweepTabs(allow) {
  const tabs = await chrome.tabs.query({})
  for (const t of tabs) {
    if (t.id != null && t.url && /^https?:/.test(t.url) && !hostAllowed(t.url, allow)) {
      chrome.tabs.update(t.id, { url: chrome.runtime.getURL('blocked.html') }).catch(() => {})
    }
  }
}

async function updateBadge() {
  const s = await getSession()
  if (!s) { chrome.action.setBadgeText({ text: '' }); return }
  const mins = Math.max(0, Math.ceil((s.endsAt - Date.now()) / 60000))
  chrome.action.setBadgeText({ text: String(mins) })
  chrome.action.setBadgeBackgroundColor({ color: '#111111' })
}

async function broadcastToApp(payload) {
  const tabs = await chrome.tabs.query({})
  for (const t of tabs) {
    if (t.id != null) chrome.tabs.sendMessage(t.id, payload).catch(() => {})
  }
}

async function startFocus({ endsAt, allowlist, blocklist, label, appHost }) {
  const block = [...new Set((blocklist || []).map(normDomain).filter(Boolean))]
  const allow = [...new Set([
    ...(allowlist || []).map(normDomain).filter(Boolean),
    ...ALWAYS_ALLOW,
    appHost,
  ].filter(Boolean))].filter((d) => !domainMatch(d, block)) // off-limits wins over allow
  const s = { endsAt, allow, block, temp: [], label: label || '', blocked: 0, startedAt: Date.now() }
  await setSession(s)
  await applyRules(s)
  await sweepTabs(activeAllow(s))
  await updateBadge()
  chrome.alarms.create('ht-tick', { periodInMinutes: 1 })
  chrome.alarms.create('ht-end', { when: endsAt })
}

async function stopFocus(reason) {
  const s = await getSession()
  await clearRules()
  await clearSession()
  chrome.alarms.clear('ht-tick')
  chrome.alarms.clear('ht-end')
  chrome.action.setBadgeText({ text: '' })
  broadcastToApp({ toPage: true, type: 'FOCUS_ENDED', reason, blocked: s ? s.blocked : 0 })
}

chrome.alarms.onAlarm.addListener(async () => {
  const s = await getSession()
  if (!s) return
  if (Date.now() >= s.endsAt) { await stopFocus('completed'); return }
  // Expire any temporary allows whose window has passed → re-block them
  const before = (s.temp || []).length
  s.temp = (s.temp || []).filter((t) => t.until > Date.now())
  if (s.temp.length !== before) { await setSession(s); await applyRules(s) }
  await updateBadge()
})

async function reArm() {
  const s = await getSession()
  if (!s) return
  if (Date.now() < s.endsAt) {
    await applyRules(s)
    chrome.alarms.create('ht-tick', { periodInMinutes: 1 })
    chrome.alarms.create('ht-end', { when: s.endsAt })
    updateBadge()
  } else {
    await stopFocus('completed')
  }
}
chrome.runtime.onStartup.addListener(reArm)
chrome.runtime.onInstalled.addListener(reArm)

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  ;(async () => {
    try {
      if (msg.type === 'START') {
        const appHost = sender.url ? new URL(sender.url).hostname.replace(/^www\./, '') : null
        await startFocus({ endsAt: msg.endsAt, allowlist: msg.allowlist, label: msg.label, appHost })
        sendResponse({ ok: true })
      } else if (msg.type === 'STOP') {
        await stopFocus('app')
        sendResponse({ ok: true })
      } else if (msg.type === 'STATUS') {
        sendResponse({ installed: true, session: await getSession() })
      } else if (msg.type === 'GET_SESSION') {
        sendResponse({ session: await getSession() })
      } else if (msg.type === 'BLOCKED_HIT') {
        const s = await getSession()
        if (s) { s.blocked = (s.blocked || 0) + 1; await setSession(s) }
        sendResponse({ session: await getSession() })
      } else if (msg.type === 'TEMP_ALLOW') {
        const s = await getSession()
        if (s && isOffLimits(msg.domain, s)) {
          sendResponse({ ok: false, offLimits: true })
        } else if (s) {
          const d = normDomain(msg.domain)
          const minutes = Math.max(1, Math.min(60, msg.minutes || 10))
          const until = Date.now() + minutes * 60000
          s.temp = [...(s.temp || []).filter((t) => t.d !== d), { d, until }]
          await setSession(s)
          await applyRules(s)
          chrome.alarms.create('ht-temp', { when: until + 500 }) // re-block just after it expires
          sendResponse({ ok: true, until })
        } else {
          sendResponse({ ok: false })
        }
      } else if (msg.type === 'END_EARLY') {
        await stopFocus('gave-up')
        sendResponse({ ok: true })
      } else {
        sendResponse({ ok: false })
      }
    } catch (e) {
      sendResponse({ ok: false, error: e.message })
    }
  })()
  return true // keep the message channel open for the async response
})
