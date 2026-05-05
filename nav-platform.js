/* nav-platform.js — hamburger for platform pages (marketing, player, create, player-upgrade). */
(function () {
  function init() {
    var nav = document.querySelector('nav') || document.querySelector('header.hdr');
    if (!nav || nav.dataset.platformInit === '1') return;
    nav.dataset.platformInit = '1';

    // Collect links/buttons — skip logo and nav-back elements
    var items = [];
    nav.querySelectorAll('a, button').forEach(function (el) {
      if (el.closest('.nav-logo, .wordmark') || el.classList.contains('nav-back')) return;
      items.push(el);
    });
    if (!items.length) return;

    // Mark parent container so CSS can hide it at mobile
    var linkWrap = items[0].parentElement;
    if (linkWrap && linkWrap !== nav) linkWrap.classList.add('np-links-wrap');

    // Inject styles once
    if (!document.getElementById('np-css')) {
      var s = document.createElement('style');
      s.id = 'np-css';
      s.textContent =
        '.np-drawer{display:none;position:fixed;left:0;right:0;top:56px;z-index:198;' +
        'background:rgba(10,6,2,0.97);border-bottom:1px solid rgba(192,144,48,0.18);' +
        'backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}' +
        '.np-drawer.open{display:block}' +
        '.np-inner{display:flex;flex-direction:column;padding:1rem 2rem 1.5rem;gap:0}' +
        '.np-inner a,.np-inner button{display:block;padding:.7rem 0;' +
        'font-family:"Barlow Condensed",sans-serif;font-size:1rem;font-weight:600;' +
        'letter-spacing:.12em;text-transform:uppercase;color:rgba(240,230,204,.7);' +
        'text-decoration:none;background:none;border:none;' +
        'border-bottom:1px solid rgba(192,144,48,.08);' +
        'cursor:pointer;text-align:left;width:100%;transition:color .15s}' +
        '.np-inner a:hover,.np-inner button:hover{color:#c09030}' +
        '.np-ham{display:none;align-items:center;justify-content:center;' +
        'background:none;border:none;color:rgba(240,230,204,.7);' +
        'cursor:pointer;padding:.4rem;flex-shrink:0}' +
        '@media(max-width:760px){' +
        '.np-ham{display:flex!important}' +
        '.np-links-wrap{display:none!important}' +
        '}';
      document.head.appendChild(s);
    }

    // Build drawer
    var drawer = document.createElement('div');
    drawer.className = 'np-drawer';
    var inner = document.createElement('div');
    inner.className = 'np-inner';
    items.forEach(function (src) {
      var clone = src.cloneNode(true);
      clone.removeAttribute('id');
      clone.removeAttribute('style');
      clone.removeAttribute('onmouseover');
      clone.removeAttribute('onmouseout');
      clone.querySelectorAll('[id]').forEach(function (n) { n.removeAttribute('id'); });
      inner.appendChild(clone);
    });
    drawer.appendChild(inner);
    nav.parentNode.insertBefore(drawer, nav.nextSibling);

    // Mark active link
    var cur = window.location.pathname.replace(/\/$/, '') || '/';
    inner.querySelectorAll('a').forEach(function (a) {
      if ((a.getAttribute('href') || '').replace(/\/$/, '') === cur) a.classList.add('active');
    });

    // Expose hook for post-init injection (e.g. auth-aware items)
    window._navPlatformInject = function (href, label, isButton) {
      var el = document.createElement(isButton ? 'button' : 'a');
      if (!isButton) el.href = href;
      el.textContent = label;
      inner.appendChild(el);
      return el;
    };

    // Hamburger button
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'np-ham';
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
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = drawer.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
    });
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
