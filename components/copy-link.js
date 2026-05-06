// components/copy-link.js — <copy-link href="..."> custom element.
// Click → copies href to clipboard, swaps icon to check briefly, fires haptic.
// Usage: <copy-link href="https://tourney.greenskeeper.studio/t/bova/">Copy URL</copy-link>

(() => {
  if (customElements.get('copy-link')) return;

  class CopyLink extends HTMLElement {
    static get observedAttributes() { return ['href', 'label']; }

    connectedCallback() {
      this._render();
      this.addEventListener('click', this._onClick);
    }
    disconnectedCallback() {
      this.removeEventListener('click', this._onClick);
    }
    attributeChangedCallback() { this._render(); }

    _render() {
      const label = this.getAttribute('label') || this.textContent || 'Copy link';
      const href  = this.getAttribute('href') || '';
      this.style.cssText =
        'display:inline-flex;align-items:center;gap:0.45rem;cursor:pointer;' +
        'background:rgba(255,255,255,0.04);border:1px solid var(--border,rgba(192,144,48,0.22));' +
        'border-radius:4px;padding:0.35rem 0.7rem;font-size:0.74rem;color:var(--text,#e8dcc8);' +
        'font-family:var(--font-mono,monospace);transition:all var(--dur-fast,120ms) var(--ease-out);' +
        'user-select:none;';
      this.innerHTML =
        '<span class="cl-icon" aria-hidden="true">⧉</span>' +
        '<span class="cl-label">' + this._esc(label) + '</span>';
      this.title = href;
      this.setAttribute('role', 'button');
      this.setAttribute('tabindex', '0');
    }

    _esc(s) {
      const d = document.createElement('div');
      d.textContent = String(s ?? '');
      return d.innerHTML;
    }

    _onClick = async (e) => {
      e.preventDefault();
      const href = this.getAttribute('href') || '';
      if (!href) return;
      const ok = await (window.tourneyUtil?.copyToClipboard?.(href) ?? this._fallbackCopy(href));
      if (ok) {
        const icon  = this.querySelector('.cl-icon');
        const label = this.querySelector('.cl-label');
        const prevIcon  = icon?.textContent;
        const prevLabel = label?.textContent;
        if (icon)  icon.textContent  = '✓';
        if (label) label.textContent = 'Copied';
        this.style.borderColor = 'var(--green, #27ae60)';
        this.style.color = 'var(--green, #27ae60)';
        window.tourneyUtil?.haptic?.(8);
        setTimeout(() => {
          if (icon)  icon.textContent  = prevIcon  || '⧉';
          if (label) label.textContent = prevLabel || 'Copy link';
          this.style.borderColor = 'var(--border, rgba(192,144,48,0.22))';
          this.style.color = 'var(--text, #e8dcc8)';
        }, 1400);
      } else {
        window.tourneyUtil?.toast?.('Couldn\'t copy. Long-press the URL instead.', { kind: 'err' });
      }
    };

    async _fallbackCopy(text) {
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
  }

  customElements.define('copy-link', CopyLink);
})();
