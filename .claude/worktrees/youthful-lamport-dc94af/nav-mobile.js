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
