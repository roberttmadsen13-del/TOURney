const CACHE = 'tourney-v55';
const PRECACHE = [
  '/',
  '/tokens.css',
  '/logo-nav.svg',
  '/logo-hero.svg',
  '/celebrate.js',
  '/home.html',
  '/admin.html',
  '/scoreboard.html',
  '/scorecard.html',
  '/feed.html',
  '/profile.html',
  '/directory.html',
  '/login.html',
  '/champions.html',
  '/course.html',
  '/install.html',
  '/player.html',
  '/player-upgrade.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/pwa.js',
  '/nav-mobile.css',
  '/nav-mobile.js',
  '/tourney-init.js',
  '/lib/share-invite.js',
  '/lib/auth-storage.js',
  '/bug-fab.js',
];

self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.title || 'Tournament Alert';
  const opts = {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/feed', type: data.type || '', player: data.player || '', hole: data.hole || '' },
    vibrate: [200, 100, 200, 100, 400],
    tag: data.tag || 'tourney',
    renotify: true,
  };
  if (data.image) opts.image = data.image;
  event.waitUntil(self.registration.showNotification(title, opts));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const d = event.notification.data || {};
  let url = d.url || '/feed';
  if (d.type === 'hio') {
    const sep = url.includes('?') ? '&' : '?';
    url += sep + 'hio=1' +
      (d.player ? '&player=' + encodeURIComponent(d.player) : '') +
      (d.hole   ? '&hole='   + encodeURIComponent(d.hole)   : '');
  }
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(wins => {
      const match = wins.find(w => w.url.includes('/feed') || w.url.includes('/scoreboard'));
      if (match) return match.focus().then(w => w.navigate(url));
      return clients.openWindow(url);
    })
  );
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never intercept Supabase API/realtime — let the app talk to the network directly.
  if (url.hostname.endsWith('supabase.co') || url.hostname.endsWith('supabase.in')) return;

  // JSON data files (qa-index, grades, manifests) must always hit the network.
  // SW cache would override Cache-Control: no-store and serve stale data.
  if (url.pathname.endsWith('.json')) return;

  // Frequently-changing app scripts: network-first so fixes propagate without cache busting.
  if (url.pathname === '/bug-fab.js' || url.pathname === '/tourney-init.js') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // HTML navigations: network-first with cache fallback so updates propagate when online.
  if (req.mode === 'navigate' || (req.destination === 'document')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('/home.html')))
    );
    return;
  }

  // Everything else (CSS, JS, fonts, SVG, images): cache-first, fall back to network, populate cache on success.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res && res.ok && (res.type === 'basic' || res.type === 'cors')) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});
