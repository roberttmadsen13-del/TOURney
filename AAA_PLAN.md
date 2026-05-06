# TOURney AAA Plan — Architecture A+ · Feature Depth A+ · UX Polish A+

**Generated:** 2026-05-06
**Author:** Claude Sonnet 4.6
**Owner:** Rob Madsen, Greenskeeper Studios

Sequenced implementation plan to take TOURney's three product axes from A-/A-/B to A+ across the board. ~22 sprints, ~38 dev-days for one engineer. Order optimized so each sprint unlocks the next.

---

## §1 — Architecture: A- → A+

**What keeps it at A-:** zero build step is a strength but ceiling-imposing. Code duplication is real (every page redefines `esc()`, every page inlines its own CSS). 87–151KB single-file HTMLs. No type safety. No automated tests. No staging env. No observability. Round names hardcoded `day1/day2/day3`.

**A+ definition:** zero-runtime-dep ethos preserved, but every page shares a single component layer. Type-checked. Tested. Observable in production. Schema changes managed via CLI. Backups verified.

### Sprint A1 — Shared Module Layer (3 days)
- Extract every duplicated helper (`esc()`, `_esc()`, format constants, date utils) into `lib/util.js` — single source of truth.
- Extract repeated UI fragments (nav, modal, toast, skeleton) into `components/*.js` — vanilla web components or template literals exposed via globals.
- Replace inline `<script>` + `<style>` in each HTML with `<link>` + `<script src>` so files drop from 150KB to ~30KB HTML + cached shared assets.
- **Acceptance:** admin.html drops below 60KB. `grep -c "function esc" *.html` returns 0.

### Sprint A2 — Design Token File (1 day)
- Move all CSS custom properties (`--gold`, `--ink`, etc) into `tokens.css`. Every page imports it. Tournament theming overrides via `<style>` inline at top of each page injected by `tourney-init.js`.
- **Acceptance:** changing brand gold value in `tokens.css` propagates everywhere on next load.

### Sprint A3 — Type Safety Without Build Step (2 days)
- Add JSDoc type annotations on every exported function in `lib/`.
- `tsconfig.json` with `checkJs: true, allowJs: true, noEmit: true`.
- GitHub Action: `npx tsc` on PR. Fails CI if types broken.
- **Acceptance:** `npx tsc` returns zero errors. No build artifacts shipped.

### Sprint A4 — Test Suite (4 days)
- Vitest for unit tests on `lib/*.js`.
- Playwright for end-to-end: full creation wizard, score submit + leaderboard reflect, admin grant flow.
- GitHub Action runs both on PR + main.
- **Acceptance:** 70%+ coverage on `lib/`. 5 e2e flows green.

### Sprint A5 — Staging Environment (2 days)
- Second Supabase project: `tourney-staging`. Vercel preview branch deploys point at staging Supabase keys via env vars.
- Migration workflow: apply to staging first, run smoke tests, promote to prod via `supabase db push`.
- **Acceptance:** `git push origin staging` deploys to `staging.tourney.greenskeeper.studio` against staging DB.

### Sprint A6 — Observability (1 day)
- Sentry CDN snippet in `tourney-init.js`. Captures unhandled rejections + sourcemaps.
- Posthog free-tier for page views + funnel tracking on `/create` wizard.
- **Acceptance:** throw a test error, see it in Sentry within 30s with stack trace.

### Sprint A7 — Schema Discipline (2 days)
- Adopt `supabase migration new` for every schema change. No more dashboard SQL editor edits.
- Add `006_drop_is_admin.sql` (after Security work eliminates dual source).
- Add `007_round_model.sql` — replace hardcoded `day1/day2/day3` with `rounds (tournament_id, ordinal, name, format)` table.
- **Acceptance:** `supabase db diff` returns empty between repo + prod.

### Sprint A8 — Backup Drill (1 day)
- GitHub Action weekly `pg_dump` of Supabase to private S3 bucket (or Backblaze).
- Monthly restore drill: pull dump, restore to scratch Supabase project, run smoke tests.
- **Acceptance:** documented restore time-to-green under 30 min.

**Architecture A+ checklist:** shared module layer · design tokens · type-checked · tested · staging env · Sentry + Posthog · migration CLI workflow · verified backups

---

## §2 — Feature Depth: A- → A+

**What keeps it at A-:** TOURney is feature-rich for a single live event but lacks the longitudinal layer. No series concept. No templates. No spectator mode. No achievements. Champions page is static. No exports. Stripe tier columns exist but gate nothing.

**A+ definition:** every common organizer ask has a built-in answer. Tournament owners run year-2 in 5 minutes by cloning year-1. Players have a longitudinal record across years. Tier gating drives revenue.

### Sprint F1 — Tournament Series (3 days)
- Schema: `series (id, name, slug, owner_email)` + `tournaments.series_id FK`.
- Series landing page `/s/{slug}/` shows all events with year tabs.
- Champions page rolls up across series.
- **Acceptance:** navigate `/s/bova/` → see Bova 2025 + 2026 + future events.

### Sprint F2 — Tournament Templates + Roster Carry-Forward (2 days)
- Admin "Clone tournament" button: copies all settings rows + course pars + branding to new tournament with new slug.
- Player roster carry-forward: checkbox on /create to import last year's players (within same series).
- **Acceptance:** admin clones Bova 2026 → blank Bova 2027 in <30s.

### Sprint F3 — Achievements + Auto-Awards (2 days)
- Schema: `achievements (player_id, tournament_id, type, hole, round, awarded_at)`.
- Postgres triggers auto-award on score insert: hole-in-one, eagle, double-eagle, birdie streak (3+), comeback win.
- Profile page shows badges. Feed posts auto-fire on award.
- **Acceptance:** insert score of 1 on par-3 → achievement row → push notification → feed post.

### Sprint F4 — Spectator Mode (1 day)
- Generate per-tournament passcode. `/t/{slug}/spectate?p={passcode}` for non-player guests.
- Read-only scoreboard + feed, no auth required.
- **Acceptance:** open spectate URL incognito → see live scoreboard, no login.

### Sprint F5 — Auto-Generated Recap Page (2 days)
- On admin "End Tournament": edge function generates recap with final standings, MVP, hole-in-one count, longest streak, biggest comeback.
- Public URL `/t/{slug}/recap`. Send recap email to all players.
- **Acceptance:** admin closes tournament → recap URL works in 10s.

### Sprint F6 — Player Comparison + Round Replay (2 days)
- Comparison view: pick 2 players, side-by-side hole-by-hole table with running diff.
- Round replay: slider on scoreboard scrubs through tournament showing leaderboard at hole N.
- **Acceptance:** scrub slider on scoreboard → leaderboard reorders smoothly.

### Sprint F7 — Tier Gating (Stripe Plumbing → Revenue) (3 days)
- Define feature flags per tier in `tier-config.js`. Starter: 1 active tournament, 24 players max, no series. Pro: 5 tournaments, 96 players, series, achievements. Club: unlimited.
- Wire feature flags into admin UI — disabled states + upgrade CTA on locked features.
- **Acceptance:** Starter-tier owner clicks "Series" tab → sees upgrade modal with Stripe link.

### Sprint F8 — Exports + Printables (1 day)
- Admin "Export CSV" → all scores + players + settings as ZIP.
- Scorecard "Print" button → CSS `@page` styling for paper backup.
- **Acceptance:** print preview shows clean black-and-white scorecard with all 18 holes.

### Sprint F9 — GHIN Handicap Sync (2 days, optional)
- Add GHIN ID field. Edge function fetches verified handicap.
- **Acceptance:** enter GHIN ID → handicap auto-fills + locks.

### Sprint F10 — Course Library (1 day)
- Promote `courses-db.js` to Supabase `courses` table. Admin picker on tournament create.
- **Acceptance:** 10 courses available at /create, courses persist to DB.

**Feature Depth A+ checklist:** series concept · templates + roster carry-forward · achievements · spectator mode · auto recap · comparison + replay · tier gating drives revenue · exports + printables · course library

---

## §3 — UX Polish: B → A+

**What keeps it at B:** functional but missing the feel layer. Scoreboard re-sorts silently. Forms throw `alert()`. No skeleton loaders. No microanimations. No tooltips. Modal dialogs minimal. Mobile hamburger works but isn't smooth. No haptics. No optimistic UI. Onboarding for new admins doesn't exist.

**A+ definition:** every interaction feels intentional. Score submits feel instant. Empty states have personality. The product looks expensive. New tournament owners are guided to their aha moment without thinking.

### Sprint U1 — Skeleton Loaders + Loading State Contract (2 days)
- Every async render gets a skeleton: gray pulsing placeholders matching final layout.
- Standardize: every fetch uses `state = idle | loading | success | error` pattern.
- **Acceptance:** navigate any page on slow 3G → skeleton shows, no flash of empty.

### Sprint U2 — Optimistic UI on Score Submit (1 day)
- Score submit renders new value immediately + dims it. On 200 OK undim. On error rollback + inline retry toast.
- **Acceptance:** submit score → appears immediately. Confirms server-side in <500ms.

### Sprint U3 — Animated Rank Changes on Scoreboard (1 day)
- Track previous rank per team. On Realtime update, FLIP-animate rows to new positions.
- Toast for milestones: "🦅 Eagle — Team A" auto-dismiss.
- **Acceptance:** submit low score in second tab → scoreboard reshuffles with animation.

### Sprint U4 — Custom Toast + Modal System (2 days)
- Replace every `alert()` with toast. Toasts support actions ("Saved · Undo"). Stack at top-right, auto-dismiss with progress bar.
- Modal: backdrop blur, animated entry, focus trap, ESC to close.
- **Acceptance:** zero `alert()` calls remain. `grep -rn "alert(" *.html` returns 0.

### Sprint U5 — Microanimations (2 days)
- Button press: scale to 0.96 + spring back.
- Save success: green checkmark animation overlay on save button.
- Card hover: 1px lift + shadow.
- Tab transitions in admin: 200ms cross-fade.
- **Acceptance:** every interactive element has visual feedback within 16ms.

### Sprint U6 — Empty States with Personality (1 day)
- Every empty state gets brand-voice copy + small illustration.
- "No scores yet. Be the first to brag." instead of "—".
- **Acceptance:** walk every page in fresh tournament → no clinical empty states remain.

### Sprint U7 — Haptics + Sound (1 day)
- `navigator.vibrate` on score submit, hole-in-one, tournament end.
- Toggleable sound effects: eagle swoosh, hole-in-one cheer, save chime. Off by default.
- **Acceptance:** submit score on iPhone → feel haptic.

### Sprint U8 — Inline Form Validation (1 day)
- Field-level errors with specific messaging + shake animation on invalid submit.
- Replace alerts with red-bordered field + caption text.
- **Acceptance:** submit /create with bad slug → field shakes + caption "slug must be lowercase, no spaces".

### Sprint U9 — Admin Onboarding Tour (2 days)
- First-time admin gets guided overlay: "1. Add your logo · 2. Set your course · 3. Open registration · 4. Add players · 5. Open scoring."
- Each step links to relevant tab. Persistent progress bar at top until 100%.
- **Acceptance:** new admin from /create → lands in admin → sees tour automatically.

### Sprint U10 — Keyboard Shortcuts in Admin (1 day)
- `?` opens shortcut overlay. `g r` rounds tab, `g p` pairings, `g d` design, `n p` add player, `cmd+s` save current.
- **Acceptance:** power user navigates admin without mouse.

### Sprint U11 — Mobile Polish (2 days)
- Nav hamburger → slide-in drawer with backdrop, swipe-to-close.
- Bottom tab nav option (toggleable).
- Pull-to-refresh on scoreboard + feed.
- Swipe between holes on scorecard.
- **Acceptance:** complete entire scorecard flow with thumb-only on iPhone SE.

### Sprint U12 — Tooltips + Helpfulness (1 day)
- Every non-obvious admin icon gets tooltip on hover/long-press.
- Helper captions under dense input fields.
- **Acceptance:** hover any icon in admin → tooltip within 400ms.

### Sprint U13 — Drag-Drop + Custom Color Picker (1 day)
- Logo upload: drag-drop zone with paste-from-clipboard support.
- Custom color picker: brand-themed, with preset swatches.
- **Acceptance:** paste copied image into upload zone → uploads.

### Sprint U14 — Copy-Link Affordances (0.5 day)
- Every shareable URL gets a copy button with confirm animation ("Copied ✓").
- **Acceptance:** tournament URL, scoreboard URL, install URL, recap URL all have one-click copy.

### Sprint U15 — Offline Indicator + Network Awareness (0.5 day)
- Persistent badge in nav when SW detects offline. Color dot + tooltip.
- **Acceptance:** airplane mode on → orange dot in nav within 2s. Reconnect → dot clears.

**UX Polish A+ checklist:** skeleton loaders · optimistic UI · animated leaderboard · custom toasts/modals · microanimations · personality empty states · haptics + sound · inline validation · admin onboarding tour · keyboard shortcuts · mobile polish · tooltips · drag-drop · copy-link · offline indicator

---

## Sequencing — Recommended Order

1. **Architecture A1–A3** first (3 sprints, 6 days) — every later sprint benefits from shared module layer + type safety.
2. **Architecture A4–A6** next (7 days) — tests + staging + Sentry before any feature/UX work goes live.
3. **UX U1–U4** (6 days) — foundation UX patterns used by all later features.
4. **Feature F1–F2** (5 days) — series + templates unlock the longitudinal value prop.
5. **UX U5–U9** (7 days) — visual polish layer.
6. **Feature F3–F5** (5 days) — achievements + spectator + recap = viral moments.
7. **Feature F7** (3 days) — tier gating turns on revenue.
8. **A7–A8 + F6, F8–F10 + U10–U15** — fill in remaining items as parallel low-priority work.

---

## EXECUTION LOG

(Updated as sprints complete. Use checkbox grid below.)

### Status snapshot
- [x] **A2** — Design tokens (`tokens.css` + import on key pages)
- [x] **A1 partial** — `lib/util.js` shared module with `esc`, `escAttr`, formatters, network helpers, copy-to-clipboard
- [x] **A3 setup** — `tsconfig.json` + JSDoc on `lib/util.js`
- [x] **A6 partial** — Sentry CDN snippet stub added to `tourney-init.js` (gated on env, no-op until DSN set)
- [x] **A7 drafts** — `migrations/006_drop_is_admin.sql` + `migrations/007_round_model.sql` filed (NOT applied — pending Security plan execution + Rob review)
- [x] **U6** — empty-state personality copy file (`lib/empty-states.js`)
- [x] **U14** — `<copy-link>` web component in `components/copy-link.js`
- [x] **U15** — offline indicator wired into `tourney-init.js`
- [x] **F8 partial** — print stylesheet `print.css` for scorecard paper backup
- [ ] **A1 full** — refactor admin.html, scorecard.html, scoreboard.html, home.html to consume `lib/util.js` + drop local helpers (deferred — large surgical refactor, do per-page over multiple sessions)
- [ ] **A4** — Vitest + Playwright (deferred — needs npm/Node install, package.json, GitHub Action setup)
- [ ] **A5** — staging environment (deferred — requires creating second Supabase project + Vercel branch config, manual)
- [ ] **A8** — backup drill (deferred — requires S3 + GitHub secrets)
- [ ] **F1–F7, F9–F10** — tracked, queued
- [ ] **U1–U5, U7–U13** — tracked, queued

### What "done" means

Each sprint above has explicit acceptance criteria. Update this checklist as work lands. When all three sections are fully checked, run a fresh `tourney-review` and confirm the grades.
