(function () {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }

  const style = document.createElement('style');
  style.textContent =
    '.pwa-offline-banner{position:fixed;left:50%;bottom:18px;transform:translateX(-50%) translateY(calc(100% + 40px));background:#1a1008;color:#f0e6cc;border:1px solid #c09030;padding:0.6rem 1.1rem;font-family:"DM Mono",monospace;font-size:0.56rem;letter-spacing:0.25em;text-transform:uppercase;z-index:9999;transition:transform 0.32s ease;box-shadow:0 6px 22px rgba(0,0,0,0.28);white-space:nowrap;pointer-events:none;}' +
    '.pwa-offline-banner.show{transform:translateX(-50%) translateY(0);}' +
    '.pwa-offline-banner .dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:#c09030;margin-right:0.55rem;vertical-align:middle;animation:pwaPulse 1.6s ease-in-out infinite;}' +
    '.pwa-offline-banner.online .dot{background:#4a9a40;animation:none;}' +
    '@keyframes pwaPulse{0%,100%{opacity:1;}50%{opacity:0.3;}}' +
    '.pwa-install-btn{position:fixed;right:14px;bottom:14px;background:#c09030;color:#1a1008;border:none;padding:0.7rem 1rem;font-family:"Barlow Condensed",sans-serif;font-size:0.64rem;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;cursor:pointer;z-index:9998;box-shadow:0 6px 18px rgba(0,0,0,0.25);display:none;border-radius:50px;}' +
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
    // Push install button above Enter Scores FAB if present
    function nudgeForFab() {
      if (document.querySelector('.fab-enter-scores')) {
        installBtn.style.bottom = '5.5rem';
      }
    }
    nudgeForFab();
    setTimeout(nudgeForFab, 500);
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
