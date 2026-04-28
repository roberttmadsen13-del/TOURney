// Tourney platform bootstrap — include before all page scripts.
// Exposes window.tourney.db (Supabase client) and window.tourney.ready (Promise).
// Usage on every page:
//   const { db, tournament } = await window.tourney.ready;

(() => {
  const SUPABASE_URL = 'https://jllugkiojeoopitdvzsa.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_DnBMNLaSu61ykJ6P_fI2fw_D9DdAScn';

  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true }
  });

  const FALLBACK_SLUG = 'bova';
  const PLATFORM_SUFFIX = '.greenskeeper.studio';
  const PLATFORM_HOST   = 'tourney.greenskeeper.studio';

  function getSlug() {
    // 1. Path-based: /t/{slug}/
    const m = location.pathname.match(/\/t\/([^/?#]+)/);
    if (m) return m[1];
    // 2. Subdomain-based: {slug}.greenskeeper.studio (not the platform host itself)
    const h = location.hostname;
    if (h.endsWith(PLATFORM_SUFFIX) && h !== PLATFORM_HOST) {
      return h.slice(0, h.length - PLATFORM_SUFFIX.length);
    }
    return null;
  }

  // Only rebase links when actually on a /t/:slug/ URL — root URL pages stay on root paths.
  function rebaseNavLinks(slug) {
    document.querySelectorAll('a[href^="/"]').forEach(a => {
      const href = a.getAttribute('href');
      if (!href.startsWith('/t/')) {
        // href="/" → /t/slug (no trailing slash — Vercel route is /t/:slug not /t/:slug/)
        a.setAttribute('href', href === '/' ? `/t/${slug}` : `/t/${slug}${href}`);
      }
    });
  }

  async function init() {
    const slug = getSlug() || FALLBACK_SLUG;
    const onTenantUrl = !!location.pathname.match(/\/t\/([^/?#]+)/);

    const { data, error } = await db
      .from('tournaments')
      .select('id, slug, name, short_name, logo_url, tier, carry_forward_enabled')
      .eq('slug', slug)
      .eq('status', 'active')
      .single();

    if (error || !data) {
      document.body.innerHTML =
        '<div style="padding:2rem;font-family:sans-serif;color:#fff;background:#1a1a1a;min-height:100vh">' +
        '<h2>Tournament not found</h2>' +
        '<p>No tournament matches <code>' + slug + '</code>. Check the URL.</p>' +
        '</div>';
      throw new Error('Tournament not found: ' + slug);
    }

    // Only rebase nav links when on tenant URL — root URL pages stay on root paths.
    if (onTenantUrl) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => rebaseNavLinks(slug));
      } else {
        rebaseNavLinks(slug);
      }
    }

    // Non-blocking brand color injection — all pages get the tournament's colors.
    injectBrandColors(data.id);

    // Update page title and PWA meta with actual tournament name.
    if (data.name) {
      document.title = document.title.replace(/Bova Invitational/gi, data.name);
      const metaTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
      if (metaTitle) metaTitle.content = data.short_name || data.name.split(' ')[0];
    }

    return { db, tournament: data };
  }

  function _hexToRgb(hex) {
    const h = hex.replace('#', '');
    return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
  }

  function _lightenHex(hex, amt) {
    const [r,g,b] = _hexToRgb(hex);
    const l = c => Math.min(255, Math.round(c + (255 - c) * amt));
    return '#' + [l(r),l(g),l(b)].map(c => c.toString(16).padStart(2,'0')).join('');
  }

  function _hexAlpha(hex, alpha) {
    const [r,g,b] = _hexToRgb(hex);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  // Exposed globally — call with 3 primary hex colors to set all 9 brand CSS vars.
  // Used by home.html which reads colors from its own settings fetch.
  function applyBrandColors(primary, ink, bg) {
    const root = document.documentElement;
    root.style.setProperty('--gold',   primary);
    root.style.setProperty('--ink',    ink);
    root.style.setProperty('--bg',     bg);
    root.style.setProperty('--gold-l', _lightenHex(primary, 0.15));
    root.style.setProperty('--gold-p', _lightenHex(primary, 0.35));
    root.style.setProperty('--border', _hexAlpha(primary, 0.28));
    root.style.setProperty('--muted',  _hexAlpha(ink, 0.4));
    root.style.setProperty('--card',   _lightenHex(bg, 0.04));
    root.style.setProperty('--cream',  _lightenHex(bg, 0.08));
  }

  async function injectBrandColors(tournamentId) {
    const { data } = await db.from('settings')
      .select('key,value')
      .eq('tournament_id', tournamentId)
      .in('key', ['color_primary', 'color_ink', 'color_bg']);
    if (!data) return;
    let primary = '#c09030', ink = '#1a1008', bg = '#f5ede0';
    data.forEach(({ key, value }) => {
      if (key === 'color_primary') primary = value;
      if (key === 'color_ink')     ink     = value;
      if (key === 'color_bg')      bg      = value;
    });
    applyBrandColors(primary, ink, bg);
  }

  window.tourney = { db, ready: init(), applyBrandColors };
})();
