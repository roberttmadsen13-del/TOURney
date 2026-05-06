// lib/observability.js — Sentry stub + offline indicator + perf marks.
// Load AFTER tourney-init.js on every page:
//   <script src="/tourney-init.js"></script>
//   <script src="/lib/observability.js"></script>
//
// Sentry: gated on window.SENTRY_DSN being set. Until DSN is configured, this is a no-op.
// Offline indicator: toggles body.is-offline based on navigator.onLine + connectivity probe.

(() => {
  // ─── Sentry stub ──────────────────────────────────────────────────────────
  // Once Rob signs up for Sentry and sets window.SENTRY_DSN somewhere global
  // (e.g. an inline <script> on each page or in tourney-init.js), the snippet
  // below loads Sentry from CDN and initializes it. Until then this is silent.
  function initSentry() {
    const dsn = window.SENTRY_DSN;
    if (!dsn || typeof dsn !== 'string') return;
    if (window.Sentry) return; // already loaded

    const s = document.createElement('script');
    s.src = 'https://browser.sentry-cdn.com/7.119.2/bundle.tracing.min.js';
    s.crossOrigin = 'anonymous';
    s.onload = () => {
      try {
        window.Sentry?.init({
          dsn,
          tracesSampleRate: 0.1,
          environment: location.hostname.includes('staging') ? 'staging' : 'production',
          release: window.TOURNEY_RELEASE || 'unknown',
          beforeSend(event) {
            // Strip emails / phone numbers from breadcrumbs to reduce PII surface.
            if (event.request?.url) {
              event.request.url = event.request.url.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '<email>');
            }
            return event;
          },
        });
      } catch (e) {
        // Sentry itself failed to init — don't crash the app.
        console.warn('[observability] Sentry init failed:', e);
      }
    };
    document.head.appendChild(s);
  }

  // ─── Offline indicator ────────────────────────────────────────────────────
  // Toggles body.is-offline so tokens.css can show the .nav-offline-dot.
  // Pages that want the dot in their nav should include this markup somewhere
  // visible (e.g. inside the nav element):
  //   <span class="nav-offline-dot" title="Offline — changes will sync on reconnect"></span>
  function initOfflineIndicator() {
    const body = document.body;
    if (!body) return;

    function setState(online) {
      body.classList.toggle('is-offline', !online);
      // Optional toast on transition.
      if (window._tourneyOnlinePrev !== undefined && window._tourneyOnlinePrev !== online) {
        const t = window.tourneyUtil?.toast;
        if (t) {
          if (online) t('Back online. Syncing…', { kind: 'ok', ms: 2200 });
          else        t('Offline — changes will sync when you reconnect.', { kind: 'warn', ms: 3500 });
        }
      }
      window._tourneyOnlinePrev = online;
    }

    setState(navigator.onLine);
    window.addEventListener('online',  () => setState(true));
    window.addEventListener('offline', () => setState(false));
  }

  // ─── Performance marks ────────────────────────────────────────────────────
  // Cheap web-vitals collection. Logs to console for now; once Sentry is on,
  // these can ship as custom events.
  function initPerfMarks() {
    if (!('performance' in window) || !performance.mark) return;
    try {
      performance.mark('tourney:script-start');
      window.addEventListener('load', () => {
        performance.mark('tourney:load-complete');
        try {
          performance.measure('tourney:total-load', 'tourney:script-start', 'tourney:load-complete');
        } catch (_) {}
      });
    } catch (_) {}
  }

  // Run all initializers — order doesn't matter, they're independent.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initSentry();
      initOfflineIndicator();
      initPerfMarks();
    });
  } else {
    initSentry();
    initOfflineIndicator();
    initPerfMarks();
  }
})();
