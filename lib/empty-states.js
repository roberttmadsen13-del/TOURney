// lib/empty-states.js — copy library for empty states with personality.
// Goal: every "no data yet" surface gets brand-voice, never clinical "—" or "No data".
// Pages import via <script src="/lib/empty-states.js"></script>; reads window.tourneyEmpty.

(() => {
  /** @typedef {{ title: string, subtitle?: string, cta?: string }} EmptyCopy */

  /** @type {Record<string, EmptyCopy>} */
  const COPY = {
    'players.none': {
      title: 'No players registered yet.',
      subtitle: "Be the first to secure your spot. The leaderboard's lonely without you.",
      cta: 'RSVP',
    },
    'scores.none': {
      title: 'No scores yet.',
      subtitle: 'Be the first to brag.',
    },
    'scores.round-pending': {
      title: 'This round hasn\'t started.',
      subtitle: 'Scores appear once the admin opens the round.',
    },
    'feed.none': {
      title: 'Feed\'s quiet.',
      subtitle: 'No hole-in-ones, no eagles, no shit talk yet. Earn it.',
    },
    'trash.none': {
      title: 'No shit talk yet.',
      subtitle: "Don't be shy. Someone has to start.",
    },
    'champions.none': {
      title: 'No champions on the wall yet.',
      subtitle: 'First tournament hasn\'t finished. The plaque is hungry.',
    },
    'directory.none': {
      title: 'Roster\'s empty.',
      subtitle: 'Players land here once they register.',
    },
    'tournaments.none': {
      title: 'No tournaments yet.',
      subtitle: 'Spin one up and we\'ll fill this list.',
      cta: 'Create tournament',
    },
    'achievements.none': {
      title: 'No achievements yet.',
      subtitle: 'Hole-in-ones, eagles, and comebacks land here. Go earn one.',
    },
    'pairings.none': {
      title: 'Pairings not set.',
      subtitle: 'Open the Pairings tab to assign teams.',
    },
    'course.unset': {
      title: 'Course not set.',
      subtitle: 'Admins: pick a course in the Course tab so scorecards know your pars.',
    },
    'leaderboard.none': {
      title: 'Leaderboard\'s waiting.',
      subtitle: 'Scores will appear once play begins.',
    },
  };

  /**
   * Look up an empty-state copy entry by key. Returns a fallback if missing
   * so calling code never crashes on a typo.
   * @param {string} key
   * @returns {EmptyCopy}
   */
  function get(key) {
    return COPY[key] || { title: 'Nothing here yet.', subtitle: '' };
  }

  /**
   * Render an empty-state into a target element (replaces innerHTML).
   * Uses inline styles so it works on any page regardless of CSS scope.
   * @param {HTMLElement} el
   * @param {string} key
   * @param {{ onCta?: () => void }} [opts]
   */
  function render(el, key, opts = {}) {
    if (!el) return;
    const c = get(key);
    const ctaHTML = c.cta && opts.onCta
      ? `<button class="empty-cta" style="margin-top:0.75rem;background:var(--gold-dim,rgba(192,144,48,0.18));color:var(--gold,#c09030);border:1px solid var(--border,rgba(192,144,48,0.3));border-radius:4px;padding:0.45rem 1rem;font-size:0.78rem;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;cursor:pointer;font-family:inherit;">${c.cta}</button>`
      : '';
    el.innerHTML = `
      <div style="text-align:center;padding:2.5rem 1rem;color:var(--muted,#7a6a54);">
        <div style="font-size:0.95rem;color:var(--text,#e8dcc8);font-weight:600;margin-bottom:0.4rem;">${c.title}</div>
        ${c.subtitle ? `<div style="font-size:0.82rem;font-style:italic;max-width:340px;margin:0 auto;line-height:1.5;">${c.subtitle}</div>` : ''}
        ${ctaHTML}
      </div>
    `;
    if (opts.onCta) {
      const btn = el.querySelector('.empty-cta');
      if (btn) btn.addEventListener('click', opts.onCta);
    }
  }

  window.tourneyEmpty = { get, render };
})();
