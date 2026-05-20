// error-monitor.js — auto-captures JS errors, unhandled rejections, console.error, fetch failures.
// Sends to log-client-error edge function. No auth required. Rate-limited client-side.
(function () {
  const ENDPOINT = 'https://jllugkiojeoopitdvzsa.supabase.co/functions/v1/log-client-error';
  const _seen = new Set();

  function send(type, message, source, stack) {
    const key = type + '|' + message + '|' + location.href;
    if (_seen.has(key)) return;
    _seen.add(key);
    const payload = { type, message: String(message).slice(0, 500), source: source || '', stack: stack || '', url: location.href };
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, JSON.stringify(payload));
    } else {
      fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), keepalive: true }).catch(() => {});
    }
  }

  // JS errors
  window.addEventListener('error', function (e) {
    send('js-error', e.message, e.filename + ':' + e.lineno, e.error?.stack);
  });

  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', function (e) {
    const msg = e.reason?.message || String(e.reason);
    send('unhandled-rejection', msg, '', e.reason?.stack);
  });

  // console.error intercept
  const _origError = console.error.bind(console);
  console.error = function () {
    _origError.apply(console, arguments);
    try {
      const msg = Array.from(arguments).map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
      send('console-error', msg, '', '');
    } catch (_) {}
  };

  // fetch failures (4xx / 5xx + network errors)
  const _origFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    return _origFetch(input, init).then(function (res) {
      if (!res.ok && res.status >= 400) {
        const url = typeof input === 'string' ? input : input.url;
        send('fetch-' + res.status, res.status + ' ' + res.statusText + ' — ' + url, url, '');
      }
      return res;
    }).catch(function (err) {
      const url = typeof input === 'string' ? input : (input.url || '');
      send('fetch-network-error', err.message, url, err.stack);
      throw err;
    });
  };
})();
