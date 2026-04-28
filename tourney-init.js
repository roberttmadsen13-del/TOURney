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

  const FALLBACK_SLUG = 'bova-2026';
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
      .select('id, slug, name, short_name, logo_url')
      .eq('slug', slug)
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

    return { db, tournament: data };
  }

  async function injectBrandColors(tournamentId) {
    const { data } = await db.from('settings')
      .select('key,value')
      .eq('tournament_id', tournamentId)
      .in('key', ['color_primary', 'color_ink', 'color_bg']);
    if (!data) return;
    data.forEach(({ key, value }) => {
      if (key === 'color_primary') document.documentElement.style.setProperty('--gold', value);
      if (key === 'color_ink')     document.documentElement.style.setProperty('--ink',  value);
      if (key === 'color_bg')      document.documentElement.style.setProperty('--bg',   value);
    });
  }

  window.tourney = { db, ready: init() };
})();
