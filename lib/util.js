// lib/util.js — TOURney shared utilities.
// Single source of truth for helpers that were previously redefined in every page.
// Imported via <script src="/lib/util.js"></script>; exposes window.tourneyUtil.

(() => {
  /**
   * Escape user-supplied string for safe insertion into HTML text content.
   * Use this for ANY DB-stored or user-typed value before interpolating into innerHTML.
   * @param {unknown} s
   * @returns {string}
   */
  function esc(s) {
    if (s === null || s === undefined) return '';
    const d = document.createElement('div');
    d.textContent = String(s);
    return d.innerHTML;
  }

  /**
   * Escape user-supplied string for safe insertion into an HTML attribute value.
   * Use this when interpolating into attribute contexts: <div data-x="${escAttr(v)}">.
   * @param {unknown} s
   * @returns {string}
   */
  function escAttr(s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * Format an ISO timestamp into a short, locale-aware display string.
   * @param {string|Date} input
   * @param {Intl.DateTimeFormatOptions} [opts]
   * @returns {string}
   */
  function fmtDate(input, opts = { month: 'short', day: 'numeric', year: 'numeric' }) {
    if (!input) return '';
    const d = input instanceof Date ? input : new Date(input);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, opts);
  }

  /**
   * Format a phone number as (xxx) xxx-xxxx when given 10 digits, else passthrough.
   * @param {string} raw
   * @returns {string}
   */
  function fmtPhone(raw) {
    if (!raw) return '';
    const digits = String(raw).replace(/\D/g, '');
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return raw;
  }

  /**
   * Copy a string to the clipboard. Resolves true on success, false on failure.
   * Tries the modern Clipboard API first, falls back to document.execCommand.
   * @param {string} text
   * @returns {Promise<boolean>}
   */
  async function copyToClipboard(text) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (_) {}
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (_) {
      return false;
    }
  }

  /**
   * Trigger a short haptic vibration on supporting devices. Safe no-op elsewhere.
   * @param {number|number[]} pattern
   */
  function haptic(pattern = 12) {
    try {
      navigator.vibrate?.(pattern);
    } catch (_) {}
  }

  /**
   * Debounce a function — returns a wrapped version that delays invocation
   * until `delay` ms have passed since the last call.
   * @template {(...args: any[]) => any} F
   * @param {F} fn
   * @param {number} delay
   * @returns {(...args: Parameters<F>) => void}
   */
  function debounce(fn, delay) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(null, args), delay);
    };
  }

  /**
   * Throttle a function — invokes at most once per `interval` ms.
   * @template {(...args: any[]) => any} F
   * @param {F} fn
   * @param {number} interval
   * @returns {(...args: Parameters<F>) => void}
   */
  function throttle(fn, interval) {
    let last = 0;
    return (...args) => {
      const now = Date.now();
      if (now - last >= interval) {
        last = now;
        fn.apply(null, args);
      }
    };
  }

  /**
   * Show a transient toast notification at top-right of viewport.
   * Stacks multiple toasts. Auto-dismiss after `ms`.
   * @param {string} text
   * @param {{ kind?: 'info'|'ok'|'err'|'warn', ms?: number, action?: { label: string, onClick: () => void } }} [opts]
   */
  function toast(text, opts = {}) {
    const { kind = 'info', ms = 3200, action } = opts;
    let host = document.getElementById('tourney-toast-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'tourney-toast-host';
      host.style.cssText =
        'position:fixed;top:1rem;right:1rem;z-index:9999;display:flex;flex-direction:column;gap:0.5rem;pointer-events:none;';
      document.body.appendChild(host);
    }
    const colors = {
      info: 'var(--gold, #c09030)',
      ok:   'var(--green, #27ae60)',
      err:  'var(--red, #c0392b)',
      warn: 'var(--orange, #e67e22)',
    };
    const el = document.createElement('div');
    el.style.cssText =
      `pointer-events:auto;background:rgba(28,20,10,0.96);color:var(--text,#e8dcc8);` +
      `border:1px solid ${colors[kind]};border-radius:8px;padding:0.7rem 1rem;` +
      `font-size:0.85rem;font-family:var(--font-sans,system-ui);max-width:320px;` +
      `box-shadow:var(--shadow,0 4px 12px rgba(0,0,0,0.5));` +
      `transform:translateX(120%);transition:transform 220ms cubic-bezier(0.16,1,0.3,1);`;
    el.textContent = text;
    if (action) {
      const btn = document.createElement('button');
      btn.textContent = action.label;
      btn.style.cssText =
        `margin-left:0.75rem;background:transparent;color:${colors[kind]};border:none;` +
        `font-weight:600;cursor:pointer;font-family:inherit;font-size:0.85rem;`;
      btn.addEventListener('click', () => {
        try { action.onClick(); } finally { dismiss(); }
      });
      el.appendChild(btn);
    }
    host.appendChild(el);
    requestAnimationFrame(() => { el.style.transform = 'translateX(0)'; });

    let dismissed = false;
    function dismiss() {
      if (dismissed) return;
      dismissed = true;
      el.style.transform = 'translateX(120%)';
      setTimeout(() => el.remove(), 240);
    }
    setTimeout(dismiss, ms);
  }

  // Expose globally — no module system in use yet, this matches existing conventions.
  window.tourneyUtil = {
    esc, escAttr, fmtDate, fmtPhone,
    copyToClipboard, haptic, debounce, throttle, toast,
  };
})();

// Backwards-compat window globals — avoids call-site churn during migration
window.esc      = window.tourneyUtil.esc;
window.fmtDate  = window.tourneyUtil.fmtDate;
window.showToast = (msg) => window.tourneyUtil.toast(msg);
