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
  '/notification.mp3',
  '/alarm.mp3'
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
