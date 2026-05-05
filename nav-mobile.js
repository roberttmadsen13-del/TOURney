/* Responsive nav — injects hamburger + slide-down drawer on every page. */
(function () {
  function init() {
    var nav = document.querySelector('nav.nav');
    if (!nav || nav.dataset.mobileInit === '1') return;
    nav.dataset.mobileInit = '1';

    if (!document.getElementById('nav-mobile-css')) {
      var _s = document.createElement('style');
      _s.id = 'nav-mobile-css';
      _s.textContent = '.nav-drawer{display:none;position:fixed;left:0;right:0;top:64px;z-index:198;background:rgba(10,6,2,0.97);border-bottom:1px solid rgba(192,144,48,0.18);backdrop-filter:blur(10px)}.nav-drawer.open{display:block}.nav-drawer-inner{display:flex;flex-direction:column;padding:1rem 2rem 1.5rem;gap:0}.nav-drawer-inner a,.nav-drawer-inner button{display:block;padding:0.7rem 0;font-family:"Barlow Condensed",sans-serif;font-size:1rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:rgba(240,230,204,.7);text-decoration:none;background:none;border:none;border-bottom:1px solid rgba(192,144,48,.08);cursor:pointer;text-align:left;width:100%;transition:color .15s}.nav-drawer-inner a:hover,.nav-drawer-inner button:hover,.nav-drawer-inner a.active{color:var(--gold,#c09030)}.nav-hamburger{display:none;align-items:center;justify-content:center;background:none;border:none;color:inherit;cursor:pointer;padding:.4rem;flex-shrink:0}@media(max-width:760px){.nav-hamburger{display:flex}.nav-links{display:none!important}}.fab-enter-scores{position:fixed;bottom:1.5rem;right:1.5rem;z-index:999;display:none;align-items:center;gap:.5rem;padding:.75rem 1.25rem;background:var(--gold,#c09030);color:var(--ink,#1a1008);font-family:"Barlow Condensed",sans-serif;font-size:.72rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;text-decoration:none;border-radius:50px;box-shadow:0 4px 16px rgba(0,0,0,.28)}@media(max-width:760px){.fab-enter-scores{display:flex}}';
      document.head.insertBefore(_s, document.head.firstChild);
    }

    // Collect links/buttons to mirror into the drawer
    var items = [];
    var _seenHrefs = new Set();
    nav.querySelectorAll('.nav-links a').forEach(function (el) {
      var h = (el.getAttribute('href') || '').replace(/\/$/, '');
      _seenHrefs.add(h);
      items.push(el);
    });
    nav.querySelectorAll('.nav-right > a, .nav-right > button').forEach(function (el) {
      // skip status-only elements
      if (el.classList.contains('live-dot') || el.classList.contains('nav-round')) return;
      // skip duplicates already in nav-links
      var h = (el.getAttribute('href') || '').replace(/\/$/, '');
      if (h && _seenHrefs.has(h)) return;
      items.push(el);
    });

    // Build drawer
    var drawer = document.createElement('div');
    drawer.className = 'nav-drawer';
    drawer.setAttribute('role', 'menu');
    var inner = document.createElement('div');
    inner.className = 'nav-drawer-inner';

    items.forEach(function (src) {
      // Skip scoring link — the FAB handles this
      if (src.tagName === 'A' && (src.getAttribute('href') || '').replace(/\/$/, '') === '/scorecard') return;
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

    drawer.appendChild(inner);

    // Mark the active page link in the drawer
    var currentPath = window.location.pathname.replace(/\/$/, '') || '/';
    inner.querySelectorAll('a').forEach(function (a) {
      var href = (a.getAttribute('href') || '').replace(/\/$/, '') || '/';
      if (href === currentPath || (href !== '/' && currentPath.endsWith(href))) {
        a.classList.add('active');
      }
    });

    if (nav.parentNode) nav.parentNode.insertBefore(drawer, nav.nextSibling);

    // Always inject "My Golf" portal link for players (skip if already there)
    var _curPath = window.location.pathname.replace(/\/$/, '');
    if (_curPath !== '/player' && !_curPath.endsWith('/player')) {
      var myGolfLink = document.createElement('a');
      myGolfLink.href = '/player';
      myGolfLink.textContent = '⛳ My Golf';
      myGolfLink.style.cssText = 'color:rgba(192,144,48,0.7);font-size:0.6rem;letter-spacing:0.18em;';
      inner.appendChild(myGolfLink);
    }

    // Allow post-init injection (e.g. platform link for owner, admin link per page)
    window._navInjectLink = function(href, label, style) {
      var a = document.createElement('a');
      a.href = href;
      a.textContent = label;
      a.style.cssText = style || '';
      inner.appendChild(a);
    };

    // FAB: floating "Enter Scores" button on all pages except scorecard + admin
    var path = window.location.pathname.replace(/\/$/, '');
    var skipFab = path === '/scorecard' || path === '/admin' ||
                  path.endsWith('/scorecard.html') || path.endsWith('/admin.html') ||
                  path.endsWith('/scorecard') || path.endsWith('/admin');
    if (!skipFab) {
      var fab = document.createElement('a');
      fab.href = '/scorecard';
      fab.className = 'fab-enter-scores';
      fab.setAttribute('aria-label', 'Enter Scores');
      fab.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" style="flex-shrink:0"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg><span>Enter Scores</span>';
      document.body.appendChild(fab);
    }

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
