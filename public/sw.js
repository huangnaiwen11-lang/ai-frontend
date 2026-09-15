const CACHE_NAME = 'cling-ai-shell-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.add('/')))
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  // API、上传和回调都是实时业务事实，离线缓存不能制造旧余额或旧任务状态。
  if (request.method !== 'GET' || url.pathname.startsWith('/api/')) return
  event.respondWith(fetch(request).catch(() => caches.match(request).then((cached) => cached || caches.match('/'))))
})
