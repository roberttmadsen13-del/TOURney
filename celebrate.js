// celebrate.js — HIO celebration: canvas confetti + rotating lasers + shockwave rings + sound
// Usage: window.celebrate.show({ name: 'John Doe', hole: 7, style: 'full'|'confetti' })
//        window.celebrate.hide()
// Colors read from tournament CSS vars (--gold, --gold-l, --gold-p) automatically.
(function () {
  var _raf = null, _overlay = null, _cCtx = null, _lCtx = null;
  var _particles = [], _lasers = [], _rings = [];
  var _t0 = 0, _colors = [];
  var _style = 'full';

  function _css(v) {
    return getComputedStyle(document.documentElement).getPropertyValue(v).trim() || null;
  }

  function _build() {
    if (_overlay) return;
    _overlay = document.createElement('div');
    _overlay.style.cssText = 'display:none;position:fixed;inset:0;z-index:9998;cursor:pointer;overflow:hidden;background:rgba(8,5,2,0.93);';

    var lc = document.createElement('canvas');
    lc.id = '_cel_lc';
    lc.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';

    var cc = document.createElement('canvas');
    cc.id = '_cel_cc';
    cc.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';

    var ui = document.createElement('div');
    ui.style.cssText = 'position:relative;z-index:10;text-align:center;padding:2rem;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;gap:.25rem;';
    ui.innerHTML =
      '<div id="_cel_eye" style="font-family:\'DM Mono\',monospace;font-size:.55rem;letter-spacing:.45em;text-transform:uppercase;margin-bottom:.5rem;"></div>' +
      '<div style="font-size:3.5rem;line-height:1;margin-bottom:.25rem;">⛳</div>' +
      '<div id="_cel_name" style="font-family:\'Playfair Display\',serif;font-size:clamp(2rem,8vw,4.5rem);font-weight:900;line-height:1;margin-bottom:.35rem;"></div>' +
      '<div id="_cel_det" style="font-family:\'Barlow Condensed\',sans-serif;font-size:1.1rem;font-weight:700;letter-spacing:.22em;text-transform:uppercase;opacity:.75;margin-bottom:2rem;"></div>' +
      '<div style="font-family:\'DM Mono\',monospace;font-size:.42rem;letter-spacing:.2em;text-transform:uppercase;opacity:.3;">tap anywhere to dismiss</div>';

    _overlay.appendChild(lc);
    _overlay.appendChild(cc);
    _overlay.appendChild(ui);
    document.body.appendChild(_overlay);
    _overlay.addEventListener('click', hide);
    _lCtx = lc.getContext('2d');
    _cCtx = cc.getContext('2d');
  }

  function _resize() {
    var w = window.innerWidth, h = window.innerHeight;
    ['_cel_lc', '_cel_cc'].forEach(function (id) {
      var c = /** @type {HTMLCanvasElement|null} */ (document.getElementById(id));
      if (c) { c.width = w; c.height = h; }
    });
    _lCtx = /** @type {HTMLCanvasElement} */ (document.getElementById('_cel_lc')).getContext('2d');
    _cCtx = /** @type {HTMLCanvasElement} */ (document.getElementById('_cel_cc')).getContext('2d');
  }

  function _initParticles() {
    var w = window.innerWidth;
    _particles = [];
    for (var i = 0; i < 180; i++) {
      _particles.push({
        x: Math.random() * w,
        y: -20 - Math.random() * 400,
        vx: (Math.random() - 0.5) * 5,
        vy: 2 + Math.random() * 6,
        rot: Math.random() * Math.PI * 2,
        rv: (Math.random() - 0.5) * 0.14,
        pw: 5 + Math.random() * 9,
        ph: 3 + Math.random() * 8,
        col: _colors[Math.floor(Math.random() * _colors.length)],
        circ: Math.random() > 0.6
      });
    }
  }

  function _initLasers() {
    var n = 18;
    _lasers = [];
    for (var i = 0; i < n; i++) {
      _lasers.push({
        a: (i / n) * Math.PI * 2,
        spd: (0.3 + Math.random() * 0.7) * (Math.random() > 0.5 ? 1 : -1),
        col: _colors[i % _colors.length],
        w: 0.7 + Math.random() * 2.2
      });
    }
  }

  function _initRings() {
    var mx = Math.max(window.innerWidth, window.innerHeight);
    _rings = [
      { r: 0, maxR: mx * 1.1, a: 1.0, col: _colors[0], delay: 0 },
      { r: 0, maxR: mx * 0.9, a: 0.7, col: _colors[1] || _colors[0], delay: 90 },
      { r: 0, maxR: mx * 1.3, a: 0.45, col: _colors[2] || _colors[0], delay: 210 }
    ];
  }

  function _sound() {
    try {
      var ac = new (window.AudioContext || window.webkitAudioContext)();
      // Ascending arpeggio: C5 E5 G5 C6 + sparkle
      [523, 659, 784, 1047].forEach(function (f, i) {
        var osc = ac.createOscillator(), g = ac.createGain();
        osc.connect(g); g.connect(ac.destination);
        osc.frequency.value = f;
        osc.type = 'sine';
        var t = ac.currentTime + i * 0.11;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.16, t + 0.025);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
        osc.start(t); osc.stop(t + 0.4);
      });
      // Sparkle top note
      var osc2 = ac.createOscillator(), g2 = ac.createGain();
      osc2.connect(g2); g2.connect(ac.destination);
      osc2.frequency.value = 1568; osc2.type = 'triangle';
      var ts = ac.currentTime + 0.5;
      g2.gain.setValueAtTime(0.1, ts);
      g2.gain.exponentialRampToValueAtTime(0.001, ts + 0.55);
      osc2.start(ts); osc2.stop(ts + 0.6);
    } catch (e) {}
  }

  function _frame(ts) {
    if (!_overlay || _overlay.style.display === 'none') return;
    var elapsed = ts - _t0;
    var w = window.innerWidth, h = window.innerHeight;
    var cx = w / 2, cy = h / 2;
    var diag = Math.max(w, h) * 1.6;

    // ── Lasers + rings on _lCtx (full show only)
    _lCtx.clearRect(0, 0, w, h);
    if (_style === 'full') {
      var laserA = Math.max(0, (1 - elapsed / 9000) * 0.55);

      _lasers.forEach(function (l) {
        l.a += l.spd * 0.018;
        var ex = cx + Math.cos(l.a) * diag;
        var ey = cy + Math.sin(l.a) * diag;
        _lCtx.beginPath();
        _lCtx.moveTo(cx, cy);
        _lCtx.lineTo(ex, ey);
        _lCtx.strokeStyle = l.col;
        _lCtx.globalAlpha = laserA;
        _lCtx.lineWidth = l.w;
        _lCtx.stroke();
      });

      _rings.forEach(function (ring) {
        if (elapsed < ring.delay) return;
        ring.r += (ring.maxR - ring.r) * 0.055 + 3;
        var ra = ring.a * Math.max(0, 1 - ring.r / ring.maxR);
        if (ra <= 0.01) return;
        _lCtx.beginPath();
        _lCtx.arc(cx, cy, ring.r, 0, Math.PI * 2);
        _lCtx.strokeStyle = ring.col;
        _lCtx.globalAlpha = ra * 0.75;
        _lCtx.lineWidth = 2.5;
        _lCtx.stroke();
      });

      _lCtx.globalAlpha = 1;
    }

    // ── Confetti on _cCtx
    var confA = Math.min(1, Math.max(0, 1 - (elapsed - 9000) / 3000));
    _cCtx.clearRect(0, 0, w, h);
    _particles.forEach(function (p) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.06;
      p.rot += p.rv;
      if (p.y > h + 20) { p.y = -20; p.x = Math.random() * w; p.vy = 2 + Math.random() * 4; }
      _cCtx.save();
      _cCtx.translate(p.x, p.y);
      _cCtx.rotate(p.rot);
      _cCtx.globalAlpha = confA;
      _cCtx.fillStyle = p.col;
      if (p.circ) {
        _cCtx.beginPath();
        _cCtx.arc(0, 0, p.pw / 2, 0, Math.PI * 2);
        _cCtx.fill();
      } else {
        _cCtx.fillRect(-p.pw / 2, -p.ph / 2, p.pw, p.ph);
      }
      _cCtx.restore();
    });

    if (elapsed > 14000) { hide(); return; }
    _raf = requestAnimationFrame(_frame);
  }

  function show(opts) {
    opts = opts || {};
    _style = opts.style || 'full';
    _build();
    _resize();

    var gold = _css('--gold') || '#c09030';
    var goldL = _css('--gold-l') || '#d4aa50';
    var goldP = _css('--gold-p') || '#e8cc80';
    _colors = [gold, goldL, goldP, '#ffffff', '#2a7a20', gold, '#f0e6cc', goldL];

    var eye = document.getElementById('_cel_eye');
    var nameEl = document.getElementById('_cel_name');
    var detEl = document.getElementById('_cel_det');
    if (eye) { eye.textContent = '⛳  Hole in One'; eye.style.color = gold; }
    if (nameEl) { nameEl.textContent = opts.name || 'Incredible Shot'; nameEl.style.color = gold; }
    if (detEl) { detEl.textContent = opts.hole ? 'Hole ' + opts.hole + ' · Ace' : 'Ace'; }

    _initParticles();
    if (_style === 'full') {
      _initLasers();
      _initRings();
      _sound();
    }

    _overlay.style.display = 'flex';
    _overlay.style.alignItems = 'center';
    _overlay.style.justifyContent = 'center';

    if (_raf) cancelAnimationFrame(_raf);
    _t0 = performance.now();
    _raf = requestAnimationFrame(_frame);
  }

  function hide() {
    if (_raf) { cancelAnimationFrame(_raf); _raf = null; }
    if (_overlay) _overlay.style.display = 'none';
  }

  window.celebrate = { show: show, hide: hide };
})();
