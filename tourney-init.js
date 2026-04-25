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

  function getSlug() {
    const m = location.pathname.match(/\/t\/([^/?#]+)/);
    return m ? m[1] : FALLBACK_SLUG;
  }

  // Prefix all in-app hrefs with /t/{slug}/ so relative nav works under tenanted URLs.
  function rebaseNavLinks(slug) {
    document.querySelectorAll('a[href^="/"]').forEach(a => {
      const href = a.getAttribute('href');
      if (!href.startsWith('/t/')) {
        a.setAttribute('href', `/t/${slug}${href}`);
      }
    });
  }

  async function init() {
    const slug = getSlug();
    if (!slug) return { db, tournament: null };

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

    // Patch nav links after DOM ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => rebaseNavLinks(slug));
    } else {
      rebaseNavLinks(slug);
    }

    return { db, tournament: data };
  }

  window.tourney = { db, ready: init() };
})();
