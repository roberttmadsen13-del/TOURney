(function () {
  const VAPID_PUBLIC = 'BBzgY-W8AYtW3QEsbKDQwIjyoF53lDg0pOEnbpFIYwy-0VO1RuSsagBiolRyQGZvyYzHCURc0-0CfZ-VmcfAi3w';

  function _urlB64ToUint8(b64) {
    const pad = '='.repeat((4 - b64.length % 4) % 4);
    const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
  }

  async function _subscribePush(sw, tournamentId) {
    if (!('PushManager' in window) || !tournamentId) return;
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return;
      const existing = await sw.pushManager.getSubscription();
      const sub = existing || await sw.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: _urlB64ToUint8(VAPID_PUBLIC),
      });
      const j = sub.toJSON();
      const sb = window.tourney?.db;
      if (!sb) return;
      await sb.from('push_subscriptions').upsert({
        tournament_id: tournamentId,
        endpoint: j.endpoint,
        p256dh: j.keys.p256dh,
        auth: j.keys.auth,
      }, { onConflict: 'endpoint' });
    } catch (_) {}
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(sw => {
          // Subscribe after tournament resolves so we have tournament_id
          if (window.tourney && window.tourney.ready) {
            Promise.resolve(window.tourney.ready).then(ctx => {
              _subscribePush(sw, ctx?.tournament?.id);
            }).catch(() => {});
          }
        })
        .catch(() => {});
    });
  }

  const style = document.createElement('style');
  style.textContent =
    '.pwa-offline-banner{position:fixed;left:50%;bottom:18px;transform:translateX(-50%) translateY(calc(100% + 40px));background:#1a1008;color:#f0e6cc;border:1px solid #c09030;padding:0.6rem 1.1rem;font-family:"DM Mono",monospace;font-size:0.56rem;letter-spacing:0.25em;text-transform:uppercase;z-index:9999;transition:transform 0.32s ease;box-shadow:0 6px 22px rgba(0,0,0,0.28);white-space:nowrap;pointer-events:none;}' +
    '.pwa-offline-banner.show{transform:translateX(-50%) translateY(0);}' +
    '.pwa-offline-banner .dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:#c09030;margin-right:0.55rem;vertical-align:middle;animation:pwaPulse 1.6s ease-in-out infinite;}' +
    '.pwa-offline-banner.online .dot{background:#4a9a40;animation:none;}' +
    '@keyframes pwaPulse{0%,100%{opacity:1;}50%{opacity:0.3;}}' +
    '.pwa-install-btn{position:fixed;right:1rem;bottom:5.5rem;background:#c09030;color:#1a1008;border:none;padding:0.7rem 1rem;font-family:"Barlow Condensed",sans-serif;font-size:0.64rem;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;cursor:pointer;z-index:9998;box-shadow:0 6px 18px rgba(0,0,0,0.25);display:none;border-radius:50px;}' +
    '.pwa-install-btn.show{display:inline-flex;align-items:center;gap:0.5rem;}' +
    '.pwa-install-btn .x{opacity:0.55;font-weight:400;margin-left:0.3rem;}';
  document.head.appendChild(style);

  const banner = document.createElement('div');
  banner.className = 'pwa-offline-banner';
  banner.innerHTML = '<span class="dot"></span>Offline — changes saved locally';

  const installBtn = document.createElement('button');
  installBtn.className = 'pwa-install-btn';
  installBtn.type = 'button';
  installBtn.innerHTML = '+ Install App<span class="x" aria-label="dismiss">&times;</span>';

  function onReady() {
    if (!document.body) return;
    document.body.appendChild(banner);
    document.body.appendChild(installBtn);
    if (!navigator.onLine) showOffline();
  }
  if (document.body) onReady();
  else document.addEventListener('DOMContentLoaded', onReady);

  let hideTimer;
  function showOffline() {
    clearTimeout(hideTimer);
    banner.classList.remove('online');
    banner.innerHTML = '<span class="dot"></span>Offline — changes saved locally';
    banner.classList.add('show');
  }
  function showBackOnline() {
    clearTimeout(hideTimer);
    banner.classList.add('online');
    banner.innerHTML = '<span class="dot"></span>Back online';
    banner.classList.add('show');
    hideTimer = setTimeout(() => banner.classList.remove('show'), 2200);
  }

  window.addEventListener('offline', showOffline);
  window.addEventListener('online', showBackOnline);

  let deferredPrompt = null;

  installBtn.addEventListener('click', async (e) => {
    if (e.target && e.target.classList && e.target.classList.contains('x')) {
      installBtn.classList.remove('show');
      sessionStorage.setItem('bova_install_dismissed', '1');
      return;
    }
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try { await deferredPrompt.userChoice; } catch (_) {}
    deferredPrompt = null;
    installBtn.classList.remove('show');
  });

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (!sessionStorage.getItem('bova_install_dismissed') && !window.matchMedia('(display-mode: standalone)').matches) {
      installBtn.classList.add('show');
    }
  });

  window.addEventListener('appinstalled', () => {
    installBtn.classList.remove('show');
    deferredPrompt = null;
  });
})();

// ── DYNAMIC MANIFEST (reads uploaded logo from settings) ─────────
(function () {
  if (!window.tourney || !window.tourney.ready) return;
  Promise.resolve(window.tourney.ready).then(function (ctx) {
    var tournament = ctx && ctx.tournament ? ctx.tournament : null;
    var tid = tournament ? tournament.id : null;
    var _sb = window.tourney.db;
    var q = _sb.from('settings').select('key,value').in('key', ['logo_url','color_bg','color_ink']);
    if (tid) q = q.eq('tournament_id', tid);
    return q.then(function (res) {
      var rows = res.data || [];
      var cfg = {};
      rows.forEach(function (r) { cfg[r.key] = r.value; });
      var iconUrl = cfg.logo_url || '/icon-192.png';
      var iconType = iconUrl.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
      var origin = location.origin;
      var m = {
        name: tournament ? tournament.name : 'TOURney',
        short_name: tournament ? (tournament.short_name || tournament.name.split(' ')[0]) : 'TOURney',
        start_url: origin + '/',
        scope: origin + '/',
        display: 'standalone',
        background_color: cfg.color_bg || '#f5ede0',
        theme_color: cfg.color_ink || '#1a1008',
        orientation: 'any',
        icons: [
          { src: iconUrl, sizes: '192x192', type: iconType, purpose: 'any maskable' },
          { src: iconUrl, sizes: '512x512', type: iconType, purpose: 'any maskable' }
        ]
      };
      var blob = new Blob([JSON.stringify(m)], { type: 'application/json' });
      var link = document.querySelector('link[rel="manifest"]');
      if (link) link.href = URL.createObjectURL(blob);
    });
  }).catch(function () {});
})();
