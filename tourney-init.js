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

  // Platform-level paths that must never be prefixed with /t/{slug}/
  const PLATFORM_PATHS = ['/player', '/player-upgrade', '/create', '/platform'];

  // Only rebase links when actually on a /t/:slug/ URL — root URL pages stay on root paths.
  function rebaseNavLinks(slug) {
    document.querySelectorAll('a[href^="/"]').forEach(a => {
      const href = a.getAttribute('href');
      if (!href.startsWith('/t/') && !PLATFORM_PATHS.some(p => href === p || href.startsWith(p + '?') || href.startsWith(p + '/'))) {
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
      .in('key', ['tourney_location', 'tourney_year', 'team_a_name', 'team_b_name', 'hero_photo_url', 'about_photo_url']);

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
      if (email === 'robert.t.madsen13@gmail.com') {
        if (window._navInjectLink) {
          window._navInjectLink(
            'https://tourney.greenskeeper.studio/platform',
            '⬡ Operations',
            'border-top:1px solid rgba(192,144,48,0.2);color:rgba(192,144,48,0.7);font-size:.7rem;letter-spacing:.12em;text-transform:uppercase;padding:.65rem 1.25rem'
          );
        }
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
        if (key === 'hero_photo_url')   data.hero_photo_url  = value;
        if (key === 'about_photo_url')  data.about_photo_url = value;
      });
      // Hero background — use setting if present, hide default stock photo if absent
      const applyHero = () => {
        const heroImg = document.querySelector('.hero-img');
        if (!heroImg) return;
        if (data.hero_photo_url) {
          heroImg.src = data.hero_photo_url;
          heroImg.style.display = '';
        } else {
          heroImg.style.display = 'none';
        }
      };
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyHero);
      } else {
        applyHero();
      }
      const applyAboutPhoto = () => {
        const aboutImg = document.getElementById('aboutPhotoImg');
        if (!aboutImg) return;
        if (data.about_photo_url) {
          aboutImg.src = data.about_photo_url;
          aboutImg.style.display = '';
        } else {
          aboutImg.style.display = 'none';
        }
      };
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyAboutPhoto);
      } else {
        applyAboutPhoto();
      }
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
      .in('key', ['color_primary','color_ink','color_bg',
                  'team_a_color','team_b_color','team_c_color','team_d_color',
                  'team_e_color','team_f_color','team_g_color','team_h_color']);
    if (!data) return;
    let primary = '#c09030', ink = '#1a1008', bg = '#f5ede0';
    const teamColors = {};
    data.forEach(({ key, value }) => {
      if (key === 'color_primary') primary = value;
      if (key === 'color_ink')     ink     = value;
      if (key === 'color_bg')      bg      = value;
      const tm = key.match(/^team_([a-h])_color$/);
      if (tm && value) teamColors[tm[1]] = value;
    });
    applyBrandColors(primary, ink, bg);
    const root = document.documentElement;
    'abcdefgh'.split('').forEach(l => {
      if (teamColors[l]) root.style.setProperty(`--team-${l}`, teamColors[l]);
    });
  }

  function _injectGlobalBugLog() {
    if (document.getElementById('globalBugFab')) return;
    const style = document.createElement('style');
    style.textContent = `
      .gb-fab{position:fixed;bottom:2rem;right:2rem;width:56px;height:56px;border-radius:50%;background:rgba(200,80,60,0.85);color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.6rem;box-shadow:0 4px 16px rgba(200,80,60,0.4);cursor:pointer;z-index:9999;transition:all .2s;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.15);}
      .gb-fab:hover{transform:scale(1.05);background:rgba(220,90,70,0.95);}
      .gb-modal{position:fixed;inset:0;background:rgba(0,0,0,0.45);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);z-index:10000;display:none;align-items:flex-start;justify-content:center;padding:.5rem;overflow-y:auto;-webkit-overflow-scrolling:touch;}
      .gb-content{background:rgba(20,15,10,0.35);border:1px solid rgba(255,255,255,0.08);border-radius:18px;padding:.85rem;width:100%;max-width:440px;box-shadow:0 12px 40px rgba(0,0,0,0.5);display:flex;flex-direction:column;gap:.55rem;margin:auto;}
      .gb-hdr{display:flex;justify-content:space-between;align-items:center;color:rgba(255,255,255,0.8);font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;font-weight:700;letter-spacing:.12em;font-size:.85rem;}
      .gb-close{background:rgba(255,255,255,0.06);border:none;border-radius:50%;width:24px;height:24px;color:rgba(255,255,255,0.7);font-size:.8rem;cursor:pointer;display:flex;align-items:center;justify-content:center;}
      .gb-close:hover{background:rgba(255,255,255,0.18);}
      .gb-input{background:rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.12);color:#fff;padding:.6rem .8rem;font-family:'Barlow',sans-serif;font-size:.95rem;border-radius:10px;outline:none;transition:border-color .2s;}
      .gb-input:focus{border-color:rgba(200,80,60,0.7);background:rgba(0,0,0,0.75);}
      .gb-input::placeholder{color:rgba(255,255,255,0.35);}
      .gb-ta{min-height:64px;resize:vertical;}
      .gb-btn{background:rgba(200,80,60,0.55);color:#fff;border:1px solid rgba(200,80,60,0.4);padding:.55rem;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:.8rem;letter-spacing:.12em;text-transform:uppercase;border-radius:10px;cursor:pointer;backdrop-filter:blur(4px);transition:background .2s;}
      .gb-btn:hover{background:rgba(220,90,70,0.75);}
    `;
    document.head.appendChild(style);

    const fab = document.createElement('div');
    fab.id = 'globalBugFab';
    fab.className = 'gb-fab';
    fab.innerHTML = '🐛';
    document.body.appendChild(fab);

    const modal = document.createElement('div');
    modal.className = 'gb-modal';
    modal.innerHTML = `
      <div class="gb-content" onclick="event.stopPropagation()">
        <div class="gb-hdr"><span>Log Bug / Note</span><button class="gb-close" onclick="this.closest('.gb-modal').style.display='none'">✕</button></div>
        <input type="text" id="gbTitle" class="gb-input" placeholder="Title (e.g. Bug on scoring, or Note on UI)">
        <textarea id="gbDesc" class="gb-input gb-ta" placeholder="Description, steps to reproduce, or notes..."></textarea>
        <div style="display:flex;align-items:center;gap:1rem;">
          <label style="cursor:pointer;background:rgba(255,255,255,0.04);padding:.35rem .7rem;border-radius:6px;font-family:'DM Mono',monospace;font-size:.55rem;color:rgba(255,255,255,0.6);border:1px solid rgba(255,255,255,0.08);text-transform:uppercase;letter-spacing:.1em;">
            + Screenshot
            <input type="file" id="gbImg" accept="image/*" style="display:none;">
          </label>
          <img id="gbImgThumb" style="max-height:44px;border-radius:6px;display:none;border:1px solid rgba(255,255,255,0.1);">
        </div>
        <button class="gb-btn" id="gbSubmitBtn">Save to Bug Log</button>
      </div>
    `;
    document.body.appendChild(modal);

    fab.onclick = () => {
      modal.style.display = 'flex';
      const title = document.getElementById('gbTitle');
      title.focus();
      setTimeout(() => title.scrollIntoView({block:'center',behavior:'smooth'}), 250);
    };
    modal.onclick = () => { modal.style.display = 'none'; };

    const imgInput = document.getElementById('gbImg');
    const thumb = document.getElementById('gbImgThumb');
    let imgData = null;
    imgInput.onchange = () => {
      const f = imgInput.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = e => { imgData = e.target.result; thumb.src = imgData; thumb.style.display = 'block'; };
      r.readAsDataURL(f);
    };

    document.getElementById('gbSubmitBtn').onclick = () => {
      const t = document.getElementById('gbTitle').value.trim();
      const d = document.getElementById('gbDesc').value.trim();
      if (!t && !d) return;
      
      const bugs = JSON.parse(localStorage.getItem('gks_bugs') || '[]');
      bugs.unshift({
        id: 'bug_' + Date.now(),
        title: t,
        desc: d,
        img: imgData,
        date: new Date().toISOString(),
        status: 'open',
        url: location.href
      });
      localStorage.setItem('gks_bugs', JSON.stringify(bugs));
      
      document.getElementById('gbTitle').value = '';
      document.getElementById('gbDesc').value = '';
      imgInput.value = '';
      thumb.style.display = 'none';
      imgData = null;
      modal.style.display = 'none';
      
      if (window.renderBugLog) window.renderBugLog();
    };
  }

  // Owner-only global Bug FAB — runs on every page (platform, home, tenant), independent of tournament context.
  function _setupOwnerFab() {
    db.auth.getSession().then((res) => {
      const email = res.data?.session?.user?.email;
      if (email !== 'robert.t.madsen13@gmail.com') return;
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _injectGlobalBugLog);
      } else {
        _injectGlobalBugLog();
      }
    });
  }
  _setupOwnerFab();

  window.tourney = { db, ready: init(), applyBrandColors };
})();
