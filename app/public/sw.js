// Cache simples: a app abre sem rede (ginásio com má cobertura).
// Os pedidos ao Supabase nunca passam pela cache.
const CACHE = 'forma-v2'

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/', '/manifest.webmanifest', '/icon-192.png'])))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))))
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET' || url.origin !== location.origin) return
  // Rede primeiro, cache como reserva.
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone()
        caches.open(CACHE).then((c) => c.put(e.request, copy))
        return res
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('/'))),
  )
})

// Notificações (lembretes enviados pela função reminders do Supabase).
self.addEventListener('push', (e) => {
  let data = { title: 'Forma', body: '', url: '/', tag: 'forma' }
  try {
    data = { ...data, ...e.data.json() }
  } catch {
    if (e.data) data.body = e.data.text()
  }
  e.waitUntil(self.registration.showNotification(data.title, {
    body: data.body, tag: data.tag, icon: '/icon-192.png', badge: '/icon-192.png', data: { url: data.url },
  }))
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = e.notification.data?.url || '/'
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => 'focus' in c)
      if (open) {
        open.navigate(url)
        return open.focus()
      }
      return self.clients.openWindow(url)
    }),
  )
})
