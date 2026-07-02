// Minimal offline cache: stale-while-revalidate for same-origin GETs so the
// app shell loads without a network after the first visit.
const CACHE = 'habittube-v1'

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icon.svg',
  '/icons.svg',
]

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      for (const asset of PRECACHE_ASSETS) {
        try {
          await cache.add(asset)
        } catch (err) {
          console.warn(`[sw] Pre-cache failed for: ${asset}`, err)
        }
      }
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req)
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) cache.put(req, res.clone())
          return res
        })
        .catch(() => cached || caches.match('/'))
      return cached || network
    })
  )
})

// The main page posts { type: 'NOTIFY', title, body, tag } to show a
// notification from the SW context — more reliable than new Notification() and
// works even when the tab is backgrounded.
self.addEventListener('message', (e) => {
  if (e.data?.type !== 'NOTIFY') return
  const { title, body, tag } = e.data
  e.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag: tag || 'habittube',
      icon: '/icon.svg',
      badge: '/favicon.svg',
    })
  )
})

// Clicking an OS notification focuses the app window.
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const existing = list.find((c) => c.url.startsWith(self.location.origin))
      if (existing) return existing.focus()
      return self.clients.openWindow('/')
    })
  )
})
