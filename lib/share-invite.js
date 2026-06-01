// TOURney share-invite — Web Share API w/ clipboard fallback.
// Usage:
//   <button onclick="shareInvite()">Share Invite</button>
// Reads slug + name from window.tourneyInit / DOM data attrs.
(function (global) {
  function getSlug() {
    return (global.tourneyShareCtx && global.tourneyShareCtx.slug)
        || document.documentElement.dataset.slug
        || (location.pathname.match(/^\/t\/([^/]+)/) || [])[1]
        || null;
  }
  function getName() {
    return (global.tourneyShareCtx && global.tourneyShareCtx.name)
        || document.documentElement.dataset.tourneyName
        || 'our tournament';
  }
  async function shareInvite() {
    const slug = getSlug();
    if (!slug) { toast('No tournament loaded — try again in a moment.'); return; }
    const name = getName();
    const url  = `https://tourney.greenskeeper.studio/t/${slug}`;
    const text = `You're invited to play in ${name}. Sign up + score live here: ${url}`;
    const title = `Invite — ${name}`;

    if (navigator.share) {
      try { await navigator.share({ title, text, url }); return; }
      catch (e) { if (e.name === 'AbortError') return; /* fall through to copy */ }
    }
    // Clipboard fallback
    try {
      await navigator.clipboard.writeText(text);
      toast('Invite copied. Paste into a text.');
    } catch {
      // Last resort — show prompt
      window.prompt('Copy this invite text:', text);
    }
  }
  function toast(msg) {
    let el = document.getElementById('shareInviteToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'shareInviteToast';
      el.style.cssText = 'position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%);background:#0f0a05;color:#f5ede0;border:1px solid #c09030;border-radius:4px;padding:0.7rem 1.2rem;font-family:"DM Mono",monospace;font-size:0.62rem;letter-spacing:0.12em;text-transform:uppercase;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,0.5);opacity:0;transition:opacity 0.18s;';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    requestAnimationFrame(() => { el.style.opacity = '1'; });
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.style.opacity = '0'; }, 2400);
  }
  global.shareInvite = shareInvite;
})(window);
