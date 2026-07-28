// Bridge between the HabitTube web page and the extension service worker.
// The page talks via window.postMessage (it can't call chrome.* directly);
// this relays those to the background worker and passes responses back.

window.addEventListener('message', (e) => {
  if (e.source !== window || !e.data || e.data.__ht !== 'req') return
  chrome.runtime.sendMessage(e.data.msg, (resp) => {
    const err = chrome.runtime.lastError
    window.postMessage({ __ht: 'res', id: e.data.id, resp: err ? { error: err.message } : resp }, '*')
  })
})

// Background-initiated events (e.g. session ended) → forward to the page
chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.toPage) window.postMessage({ __ht: 'event', msg }, '*')
})

// Let the page know the extension is installed
window.postMessage({ __ht: 'present' }, '*')
