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
        a.setAttribute('href', href === '/' ? `/t/${slug}` : `/t/${slug}${href}`);
      }
    });
    // Rebase FAB injected by nav-mobile.js
    const fab = document.querySelector('.fab-enter-scores');
    if (fab && fab.getAttribute('href') === '/scorecard') {
      fab.setAttribute('href', `/t/${slug}/scorecard`);
    }
  }

  async function init() {
    const slug = getSlug();
    const onTenantUrl = !!location.pathname.match(/\/t\/([^/?#]+)/);
    if (!slug) {
      document.body.innerHTML = '<div style="padding:2rem;font-family:sans-serif;color:#fff;background:#1a1a1a;min-height:100vh"><h2>No tournament</h2><p>Visit a tournament URL to continue.</p><p><a href="/" style="color:#c09030">← TOURney Home</a></p></div>';
      throw new Error('No tournament slug in URL');
    }

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

    // Fire settings fetch in parallel with sync DOM work below.
    const settingsFetch = db.from('settings')
      .select('key,value')
      .eq('tournament_id', data.id)
      .in('key', ['tourney_location', 'tourney_year', 'team_a_name', 'team_b_name']);

    // Only rebase nav links when on tenant URL — root URL pages stay on root paths.
    if (onTenantUrl) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => rebaseNavLinks(slug));
      } else {
        rebaseNavLinks(slug);
      }
      // FAB injected by nav-mobile.js after DOM ready — observe body for it then patch
      const fabObserver = new MutationObserver(() => {
        const fab = document.querySelector('.fab-enter-scores');
        if (fab && fab.getAttribute('href') === '/scorecard') {
          fab.setAttribute('href', `/t/${slug}/scorecard`);
          fabObserver.disconnect();
        }
      });
      fabObserver.observe(document.body || document.documentElement, { childList: true, subtree: true });
    }

    // Non-blocking brand color injection — all pages get the tournament's colors.
    injectBrandColors(data.id);

    // Auth-gated nav injections: platform link for Rob + admin link for tournament admins.
    db.auth.getSession().then(async function(res) {
      const email = res.data?.session?.user?.email;
      if (!email) return;

      // Platform link for owner
      if (email === 'robert.t.madsen13@gmail.com' && window._navInjectLink) {
        window._navInjectLink(
          'https://tourney.greenskeeper.studio/platform',
          '⬡ Platform',
          'border-top:1px solid rgba(192,144,48,0.2);color:rgba(192,144,48,0.7);font-size:.7rem;letter-spacing:.12em;text-transform:uppercase;padding:.65rem 1.25rem'
        );
      }

      // Admin link for tournament owners + admins
      const isOwner = data.owner_email?.toLowerCase() === email.toLowerCase();
      const { data: adminRow } = isOwner ? { data: null } : await db
        .from('tournament_admins')
        .select('id')
        .eq('tournament_id', data.id)
        .eq('email', email)
        .maybeSingle();
      if ((isOwner || adminRow) && window._navInjectLink) {
        const adminHref = onTenantUrl ? `/t/${slug}/admin` : '/admin';
        window._navInjectLink(
          adminHref,
          '⚙ Admin',
          'color:rgba(192,144,48,0.85);font-size:.7rem;letter-spacing:.12em;text-transform:uppercase;padding:.65rem 1.25rem'
        );
      }
    });

    // Update page title — set directly from tournament name, no fragile regex replace.
    if (data.name) {
      // Preserve any page-specific prefix before " — " separator if present
      const existingTitle = document.title;
      const sep = existingTitle.indexOf(' — ');
      if (sep > 0 && !existingTitle.startsWith('The Bova') && !existingTitle.startsWith('Bova')) {
        document.title = existingTitle.slice(0, sep) + ' — ' + data.name;
      } else {
        document.title = data.name;
      }
      const metaTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
      if (metaTitle) metaTitle.content = data.short_name || data.name.split(' ')[0];
      const loginSub = document.getElementById('loginSubtitle');
      if (loginSub) loginSub.textContent = `${data.name} · Restricted`;

      // Replace nav wordmark text on every page — preserves svg/img/span siblings.
      const updateNavWordmarks = () => {
        document.querySelectorAll('.nav-logo').forEach(el => {
          const toRemove = [];
          el.childNodes.forEach(n => {
            if (n.nodeType === 3 && n.textContent.trim()) toRemove.push(n);
            else if (n.nodeType === 1 && n.tagName === 'EM') toRemove.push(n);
          });
          if (toRemove.length) {
            el.insertBefore(document.createTextNode(data.name), toRemove[0]);
            toRemove.forEach(n => n.remove());
          }
        });
      };
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateNavWordmarks);
      } else {
        updateNavWordmarks();
      }

      // Update hero title and footer wordmarks (home page only — no-ops on other pages)
      const updateHeroAndFooter = () => {
        const heroTitle = document.querySelector('.hero-title');
        if (heroTitle) {
          const words = data.name.trim().split(/\s+/);
          const last = words.pop();
          heroTitle.innerHTML = (words.length ? words.join(' ') + '<br>' : '') + '<em>' + last + '</em>';
        }
        document.querySelectorAll('.footer-wordmark').forEach(el => {
          const words = data.name.trim().split(/\s+/);
          const last = words.pop();
          el.innerHTML = (words.length ? words.join(' ') + ' ' : '') + '<em>' + last + '</em>';
        });
      };
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateHeroAndFooter);
      } else {
        updateHeroAndFooter();
      }

      // Favicon + all logo images — use tournament logo when available
      if (data.logo_url) {
        const favIcon = document.querySelector('link[rel="icon"]');
        if (favIcon) favIcon.href = data.logo_url;
        const applyLogos = () => {
          ['navLogoImg','heroLogoImg','footerLogoImg'].forEach(id => {
            const el = document.getElementById(id);
            if (el) { el.src = data.logo_url; el.alt = data.name; el.style.display = ''; }
          });
        };
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', applyLogos);
        } else {
          applyLogos();
        }
      }
    }

    // Await settings fetched in parallel above — patch data + update eyebrows.
    const { data: metaRows } = await settingsFetch;
    if (metaRows?.length) {
      metaRows.forEach(({ key, value }) => {
        if (key === 'tourney_location') data.location    = value;
        if (key === 'tourney_year')     data.year        = value;
        if (key === 'team_a_name')      data.team_a_name = value;
        if (key === 'team_b_name')      data.team_b_name = value;
      });
      const parts = [data.location, data.year].filter(Boolean);
      if (parts.length) {
        const eyebrowText = parts.join(' · ');
        const updateEyebrows = () => {
          document.querySelectorAll('.page-eyebrow, .hero-eyebrow, .footer-copy').forEach(el => el.textContent = eyebrowText);
        };
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', updateEyebrows);
        } else {
          updateEyebrows();
        }
      }
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
