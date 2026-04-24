/* Responsive nav — injects hamburger + slide-down drawer on every page. */
(function () {
  function init() {
    var nav = document.querySelector('nav.nav');
    if (!nav || nav.dataset.mobileInit === '1') return;
    nav.dataset.mobileInit = '1';

    // Collect links/buttons to mirror into the drawer
    var items = [];
    nav.querySelectorAll('.nav-links a').forEach(function (el) { items.push(el); });
    nav.querySelectorAll('.nav-right > a, .nav-right > button').forEach(function (el) {
      // skip status-only elements
      if (el.classList.contains('live-dot') || el.classList.contains('nav-round')) return;
      items.push(el);
    });

    // Build drawer
    var drawer = document.createElement('div');
    drawer.className = 'nav-drawer';
    drawer.setAttribute('role', 'menu');
    var inner = document.createElement('div');
    inner.className = 'nav-drawer-inner';

    items.forEach(function (src) {
      var clone = src.cloneNode(true);
      // Preserve inline onclick handlers on cloned buttons
      if (src.tagName === 'BUTTON') {
        var oc = src.getAttribute('onclick');
        if (oc) clone.setAttribute('onclick', oc);
      }
      // Strip id attrs to avoid duplicate IDs after cloning
      if (clone.id) clone.removeAttribute('id');
      clone.querySelectorAll('[id]').forEach(function (n) { n.removeAttribute('id'); });
      inner.appendChild(clone);
    });

    // Always append an Admin link at the end of the drawer
    var adminExists = Array.prototype.some.call(inner.querySelectorAll('a'), function (a) {
      return (a.getAttribute('href') || '').replace(/\/$/, '') === '/admin';
    });
    if (!adminExists) {
      var adminLink = document.createElement('a');
      adminLink.href = '/admin';
      adminLink.textContent = 'Admin';
      inner.appendChild(adminLink);
    }

    drawer.appendChild(inner);
    if (nav.parentNode) nav.parentNode.insertBefore(drawer, nav.nextSibling);

    // Build hamburger button
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nav-hamburger';
    btn.setAttribute('aria-label', 'Toggle menu');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML =
      '<svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden="true">' +
      '<line x1="0" y1="1" x2="18" y2="1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' +
      '<line x1="0" y1="7" x2="18" y2="7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' +
      '<line x1="0" y1="13" x2="18" y2="13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' +
      '</svg>';
    nav.appendChild(btn);

    function close() {
      drawer.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }
    function toggle(e) {
      if (e) e.stopPropagation();
      var open = drawer.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    btn.addEventListener('click', toggle);

    drawer.addEventListener('click', function (e) {
      if (e.target.closest('a, button')) close();
    });

    document.addEventListener('click', function (e) {
      if (!drawer.classList.contains('open')) return;
      if (drawer.contains(e.target) || btn.contains(e.target)) return;
      close();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 760) close();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* Floating "Enter Scores" FAB — shown on all pages except /scorecard and /admin */
(function () {
  var path = location.pathname.replace(/\/+$/, '').toLowerCase();
  var blocked = ['/scorecard', '/admin', '/scorecard.html', '/admin.html'];
  if (blocked.indexOf(path) !== -1) return;

  function onReady() {
    if (!document.body) return;
    var style = document.createElement('style');
    style.textContent =
      '.bova-fab{position:fixed;left:14px;bottom:14px;background:#c09030;color:#1a1008;border:none;padding:0.75rem 1.05rem;font-family:"Barlow Condensed",sans-serif;font-size:0.68rem;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;cursor:pointer;z-index:9997;box-shadow:0 6px 18px rgba(0,0,0,0.28);text-decoration:none;display:inline-flex;align-items:center;gap:0.55rem;border-radius:3px;}' +
      '.bova-fab:hover{background:#d4a140;}' +
      '.bova-fab img{width:20px;height:20px;object-fit:contain;border-radius:2px;background:#1a1008;padding:2px;}' +
      '.bova-fab svg{width:18px;height:18px;flex-shrink:0;}' +
      '@media (max-width:480px){.bova-fab{padding:0.65rem 0.9rem;font-size:0.6rem;letter-spacing:0.18em;}}';
    document.head.appendChild(style);

    var fab = document.createElement('a');
    fab.className = 'bova-fab';
    fab.href = '/scorecard';
    fab.setAttribute('aria-label', 'Enter scores');
    fab.innerHTML =
      '<svg viewBox="0 0 12 16" fill="none" aria-hidden="true">' +
      '<line x1="2" y1="1" x2="2" y2="15" stroke="#1a1008" stroke-width="1.6" stroke-linecap="round"/>' +
      '<path d="M2 2L10 5L2 8Z" fill="#1a1008"/></svg>' +
      '<span>Enter Scores</span>';
    document.body.appendChild(fab);

    try {
      fetch('https://jllugkiojeoopitdvzsa.supabase.co/rest/v1/settings?select=value&key=eq.logo_url', {
        headers: {
          'apikey': 'sb_publishable_DnBMNLaSu61ykJ6P_fI2fw_D9DdAScn',
          'Authorization': 'Bearer sb_publishable_DnBMNLaSu61ykJ6P_fI2fw_D9DdAScn'
        }
      }).then(function (r) { return r.json(); }).then(function (d) {
        var url = d && d[0] && d[0].value;
        if (url) {
          var svg = fab.querySelector('svg');
          if (svg) svg.remove();
          var img = document.createElement('img');
          img.src = url;
          img.alt = '';
          fab.insertBefore(img, fab.firstChild);
        }
      }).catch(function () {});
    } catch (_) {}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onReady);
  else onReady();
})();
