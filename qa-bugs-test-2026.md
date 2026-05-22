# QA Bug Log — TOURney Platform (updated: 2026-05-20)

### 2026-05-20 — 5-20-26-deployment-review execute audit
<!-- 5-20-26-deployment-review execute audit clean for shipped steps -->
- [DONE] send-push .select('id') → .select('tournament_id') at supabase/functions/send-push/index.ts:53 — root cause of bugs #6/#9/#10 eliminated. Status: fixed
- [DONE] SW cache auto-bump — ci.yml bump-sw-cache job added, fires on push to main (not bot pushes). Status: fixed
- [INFO] git worktree prune Windows ACL errors on .git/worktrees/ internal metadata — benign, repo content unaffected. Status: observation only
- [BLOCKED] SEND_INSTALL_EMAIL_SECRET — Rob manual. Status: open
- [BLOCKED] Sentry error monitoring — deferred. Status: open
- [BLOCKED] platform_bugs #6/#9/#10 DB status update — Supabase MCP disconnected, cannot UPDATE. Status: open

---

### 2026-05-20 — bug triage: /create Live Pages + d35a8d29 audit-stage claim

- [P1 OPEN] /create missing from Live Pages App Pages group on /platform (platform.html:1821) — code shows entry present post-commit 7c2261e; observed missing on live site. Fix: verify deploy reflects 7c2261e; if still absent check renderReference() APP_PAGES render path. Status: open
- [INVALID] d35a8d29 "audit stage not in execute skill" — NOT CONFIRMED. SKILL.md has §Audit at Step 3 (lines 44-55) + Step 5c (lines 117-138) + lifecycle bar stage (line 89). Bug ID not found in bugs.html. Closed/invalid.

### 2026-05-20 — fresh sweep: commits a8b5a8b + 796bb9b

- [CLEAN] tournament_admins id→tournament_id fix (796bb9b): verified all 7 live files. admin.html :885/:901 use `select('email')`, champions.html :284 / profile.html :246 / feed.html :694 / scorecard.html :490 use `select('tournament_id')`, player.html :337/:616 use `select('tournament_id')`. No `select('id')` on tournament_admins anywhere. Fix correct.
- [CLEAN] admin.html subtitle (a8b5a8b): subtitle sets tournament.name (:954) as loading state, then renderTeamUI() (:993-994) overwrites with team format after settings load. Intended behavior — not a bug.
- [BLOCKED] SEND_INSTALL_EMAIL_SECRET — Rob manual. Carried from prior audit. Status: open
- [BLOCKED] GitHub CI deploy secrets — Rob manual. Carried from prior audit. Status: open
- [OBSERVATION LOW] admin.html :993-994 renderTeamUI() unconditionally overwrites adminPageSub on every settings load. Commit message "shows tournament name in subtitle" is misleading — final subtitle is always team format. Cosmetic only, not a regression.

---

### 2026-05-19 — 5-15-26-claude-review execute audit
- [DONE] Duplicate 006 migration prefix — renamed to `006b_multi_tourney_players.sql` + header comment added. Status: fixed
- [DONE] player_accounts anon SELECT USING(true) — migration 012 applied to Supabase, anon policy dropped, `auth read own player_account` scoped to `email = auth.email()`. Status: fixed
- [DONE] feed.html blank-flash on load — 3 skeleton shimmer divs added (`.skeleton` class from tokens.css). Status: fixed
- [SKIPPED] vercel.json ticket rewrite — `/platform/:slug` catch-all already handles `/platform/5-15-26-claude-review` → `/5-15-26-claude-review.html`. Status: not needed
- [BLOCKED] SEND_INSTALL_EMAIL_SECRET — Rob manual: Supabase dashboard env var + DB webhook Authorization header. Status: open
- [BLOCKED] GitHub CI deploy secrets — Rob manual: add SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_REF to repo secrets. Status: open

---

### 2026-05-15 — 5-15-26-claude-review weekly automated review

- [MEDIUM] Schema governance — duplicate migration prefix 006. Both `migrations/006_drop_is_admin.sql` and `migrations/006_multi_tourney_players.sql` carry the 006 prefix. Supabase applies by filename alpha-sort; ordering is implicit, not explicit. Fresh schema apply on a new environment is ambiguous. Fix: rename `006_multi_tourney_players.sql` → `006b_multi_tourney_players.sql`. Add header comment documenting the history. Status: open

- [HIGH] player_accounts anon SELECT exposed. `migrations/005_invitations_and_accounts.sql`: `CREATE POLICY "anon read player_accounts" ON player_accounts FOR SELECT TO anon USING (true)`. Migration 008 only fixed the UPDATE path — SELECT still open. Any anonymous visitor can enumerate all player emails, plan tiers, and billing_status. Fix: migration 012 — drop anon policy, replace with `auth read own player_account` scoped to `email = auth.email()`. Status: open

---

### 2026-05-14 — 5-14-26-claude-review execute audit
- [HIGH] XSS — feed.html buildPostMessage DOM escape pattern (feed.html:375) — replace with explicit `& < > "` escaping chain. Status: fixed (commit a562e7d)
- [HIGH] XSS — admin.html url innerHTML image previews (admin.html:2187, 2342) — use DOM methods, assign url to img.src property. Status: fixed (commit a562e7d)

---

Last QA pass: security hardening + live QA both sites clean (2026-05-07)
Last commits: 997b043 (sec: send-install-email webhook secret gate)

---

## 🔴 Open Bugs — Must Fix

- **[CRITICAL] scorecard.html user-scalable=no** (scorecard.html:4 — viewport meta)
  Fix: Remove `user-scalable=no` from meta viewport. WCAG 1.4.4 fail. Inputs already use `font-size:1rem` so iOS auto-zoom won't trigger. One attribute removal.
  Status: closed — commit c9cc497 (confirmed scorecard.html:7 clean viewport, no user-scalable)

- **[HIGH] login.html raw Supabase errors exposed** (login.html — doSignIn(), doSignUp())
  Fix: Map GoTrue error codes to friendly strings. Fallback: "Sign in failed — check your email and password." Never pass `error?.message` directly to user.
  Status: closed — commit 10a676f (login.html:181/240/288 all sanitized)

- **[HIGH] No loading skeletons site-wide** (scoreboard.html, home.html, scorecard.html, player.html)
  Fix: Add CSS shimmer skeleton to leaderboard + home as P1. Known sprint item since leadership 5-8-26.
  Status: closed — commit 10a676f (scoreboard both tbodies + home heroLeaderboard shimmer)

- **[MEDIUM] No prefers-reduced-motion guard on home.html** (home.html — scroll animations)
  Fix: Add `@media (prefers-reduced-motion: reduce) { .will-animate { transition: none; opacity: 1; transform: none; } }`.
  Status: closed — commit 10a676f (home.html:381 @media guard)

- **[MEDIUM] No aria-live on toast or live leaderboard** (scoreboard.html, home.html)
  Fix: Add `aria-live="polite"` to toast container and leaderboard list container.
  Status: closed — commit 10a676f (home toast:666, scoreboard tbodies:276/302, heroLeaderboard:450)

<!-- UX review audit clean pass — 2026-05-12 — 5 bugs logged from tourney-review-ux -->

## Session 15 — May 13, 2026 (UX Polish Review — post-sprint)

- [MEDIUM] heroLogoImg alt="" — empty alt on meaningful brand logo (home.html:429)
  Fix: set `alt` dynamically from `map.tourney_name + ' logo'` after settings load. 1 line.
  Status: closed — false positive. home.html:888 already sets `heroLogoImg.alt = tournament.name` when logo_url exists. When no logo, img is display:none so empty alt irrelevant.

- [MEDIUM] login.html no submit spinner — button stays active during async signIn/signUp, double-tap risk (login.html — doSignIn/doSignUp)
  Fix: `btn.disabled=true; btn.textContent='Signing in…'` on click, restore in `.finally()`.
  Status: closed — false positive. login.html:175-176 (signIn), :222-223 (signUp), :277-278 (forgot) all already disable+relabel button. All 3 paths covered.

- [LOW] home.html zero-player empty state missing — heroLeaderboard blank when no players registered (home.html — heroLeaderboard render)
  Fix: when `players.length === 0` show "Registration open — no players yet." card.
  Status: closed — false positive. home.html:1148 fires "Scores will appear once play begins." when ranked is empty, which covers 0-player case.

- [LOW] manifest.json only 2 icon sizes — missing apple-touch-icon 180px, iOS generates low-res fallback (manifest.json)
  Fix: add icon-180.png + `<link rel="apple-touch-icon" sizes="180x180" href="/icon-180.png">` to all page heads.
  Status: open — requires icon-180.png asset export from logo source. Rob must create PNG.

- **Bova formats unconfirmed**: seeded Day1=stroke, Day2=scramble, Day3=best_ball based on about text ("scramble, shambles, best ball, stroke play"). Shambles not mapped to a day. **Verify with Chris Bova before tournament runs. BLOCKED — human verification required.**

---

## ✅ Fixed — Session 14 (2026-05-12, edge function security deploys)

- **send-push zero auth in prod**: fix was committed in session 13 but never deployed. Deployed v7 via Supabase MCP — now requires valid JWT (owner or admin of tournament). [supabase/functions/send-push/index.ts, commit `997b043`-adjacent, deployed v7]
- **send-install-email no auth gate**: anyone could POST to it and spam emails via Resend. Added `SEND_INSTALL_EMAIL_SECRET` webhook secret check — rejects any caller without `Authorization: Bearer <secret>`. Deployed v4. [supabase/functions/send-install-email/index.ts, commit `997b043`]

⚠️ **MANUAL REQUIRED (Rob)**: Set `SEND_INSTALL_EMAIL_SECRET` env var in Supabase dashboard → Project Settings → Edge Functions. Then update the `players` INSERT database webhook to send `Authorization: Bearer <your-secret>` header. Until done, send-install-email will 401 on every player registration.

---

## ✅ Fixed — Session 13 (2026-05-07, security hardening)

- **admin auth consolidated to tournament_admins**: removed legacy `player.is_admin` field check from `doLogin()` + `checkSession()`. Single source of truth: `tournament_admins` table. [admin.html, commit `e477457`]
- **Admin player table admin badge**: `renderTable()` now marks players who are also admins via `_admins` array (not stale `p.is_admin` field). [admin.html, commit `e477457`]
- **removePlayer name lookup**: `removePlayer(id)` no longer requires caller to pass name — looks up from local `players` array. [admin.html, commit `e477457`]
- **home.html XSS helper**: added `esc()` sanitizer (`s.replace(/&/g,'&amp;')...`) for safe DOM interpolation. [home.html, commit `e477457`]
- **create-checkout CORS locked**: `Access-Control-Allow-Origin: *` → only `*.greenskeeper.studio`. [supabase/functions/create-checkout/index.ts, commit `e477457`]
- **create-checkout email from JWT**: removed `user_email` from request body; ownership verified via `user.email` from JWT — prevents email spoofing. [supabase/functions/create-checkout/index.ts, commit `e477457`]
- **send-push CORS locked + auth required**: restricted CORS to `*.greenskeeper.studio`; now requires authenticated user who is owner/admin before sending push notifications (was unauthenticated). [supabase/functions/send-push/index.ts, commit `e477457`]
- **SECURITY_PLAN.md**: full audit document added — baseline D+, target A, RLS gaps identified for follow-up. [commit `e477457`]

---

## ✅ Fixed — Session 12 (2026-05-06, hero/about photo leak)

- **CRITICAL: Hero/about photo leaking to all tourneys**: `hero_photo_url` hardcoded Unsplash src shown for every tourney; `about_photo_url` had no JS handler at all. Fix: `.hero-img` default `src="" style="display:none"`, `#aboutPhotoWrap` default `display:none`. JS now shows/hides both from settings keys; `about_photo_url` added to settings fetch. [home.html:417, home.html:455, home.html:686, home.html:845-853]

---

## ✅ Fixed — Session 11 (2026-05-05, nav/hamburger + billing gate + admin team names)

- **Duplicate HOME in tourney drawer**: nav-mobile.js `href="/"` normalizes to `""` (falsy), `if (h && _seenHrefs.has(h))` skipped set lookup. Fix: removed `h &&` guard → `if (_seenHrefs.has(h)) return;`. [nav-mobile.js, commit `a613da5`]
- **player-upgrade.html no hamburger**: Added inline `.pu-ham` button + `.pu-drawer` with ← My Golf + ← TOURney Platform links. JS IIFE: toggle, outside-click, Escape, resize handlers. [player-upgrade.html, commit `a613da5`]
- **player.html myGolf portal missing phone**: `phone_number` added to select query, rendered as `tel:` link with `formatPhone()` helper (10-digit + +1 11-digit normalization). [player.html, commit `a567171`]
- **player.html myGolf portal missing handicap range**: Added "My Golf Profile" section — tier always shown, avg score shown after 5+ rounds (computed from `scores` table grouped by player+tourney+round). [player.html, commit `a567171`]
- **create.html no billing gate**: Anyone with auth could access /create. Added `BILLING_OK = new Set(['active','comped','trial'])`, `checkBillingThenGo(user)` checks `player_accounts.billing_status` → redirects to `/player-upgrade?email=...` if not billing-ok. Both session restore + post-auth flow route through gate. [create.html, commit `c486ac2`]
- **admin Design tab missing team names C-H**: Only A+B existed. Added C-H inputs with `class="ds-team-extra"`, `style="display:none"`. `loadDesignSettings()` shows/hides based on `team_count`. `DS_FIELD_MAP` + `saveRegistration()` updated. [admin.html, commit `2f0795b`]

---

## ✅ Fixed — Session 10 (2026-05-05, logo leak + multi-tenant cleanup)

- **CRITICAL: All tourneys showing Bova logo**: 3 hardcoded base64 PNG `<img>` tags in home.html (nav:400, hero:423, footer:657) — all replaced with id-handle imgs, `display:none` by default, JS sets `src` from `map.logo_url` setting. [home.html:400/423/657, commit `4276116`]
- **footer-copy hardcoded "Inaugural Edition · Myrtle Beach, SC · Est. 2026"**: cleared HTML content, `tourney-init.js` now patches `.footer-copy` with same eyebrow text (location · year). [home.html:660, tourney-init.js:200, commit `4276116`]
- **scoreboard.html DEFAULT_FORMATS `shamble` typo**: → `shambles`. [scoreboard.html:463, commit `f0d8f10`]
- **`bova_profile_email` localStorage dead code**: key was written in login.html + profile.html but never read anywhere — deleted. [login.html:190/257, profile.html:246/383, commit `f0d8f10`]
- **`bova_install_dismissed` sessionStorage key hardcoded**: → `tourney_install_dismissed`. [pwa.js:100/113, commit `f0d8f10`]
- **navLogoImg not set on non-home pages**: tourney-init.js now sets `#navLogoImg` src from `data.logo_url` (tournaments table) alongside favicon. [tourney-init.js, commit `f0d8f10`]
- **admin FORMAT_OPTIONS `shamble` value typo**: → `shambles`. Also expanded from 4 → 12 canonical formats (stableford, mod_stableford, match, alt_shot, chapman, greensomes, nassau, skins added). [admin.html, commit `6681b92`]
- **admin renderFormatSection/saveFormats: `DEFAULT_FORMATS[d.key].front` throws on day4+**: → optional chaining `?.front || 'stroke'`. [admin.html, commit `6681b92`]
- **admin loadRoundStates: `roundStates` merged not replaced**: hardcoded `{day1,day2,day3}` init polluted 1-day tourneys. Reset to `{}` before DB merge. [admin.html:1015, commit `fe78ee6`]
- **admin loadPars hardcoded to 3 days**: `in(['pars_day1..3'])` → `like('pars_day%')`. [admin.html:1025, commit `fe78ee6`]
- **admin loadCourseNames hardcoded to 3 days**: `in(['course_name_day1..3'])` → `like('course_name_day%')`. [admin.html:1578, commit `fe78ee6`]

---

## 📊 Creation Flow Verification — 2026-05-05

DB check: all 4 test tourneys have zero missing critical keys (verified via missing-keys query below).

| slug | team_count | days | mode | location | formats |
|------|-----------|------|------|----------|---------|
| solo-stroke-test | 1 | 1 | competitive | Phoenix, AZ | stroke/stroke |
| weekend-scramble-test | 2 | 2 | casual | Austin, TX | scramble + best_ball |
| four-team-test | 4 | 3 | competitive | Scottsdale, AZ | stroke / scramble+best_ball / match+mod_stableford |
| abt-2026 | 2 | 2 | competitive | Scottsdale AZ | stroke + scramble |

Reusable verification query (run against Supabase jllugkiojeoopitdvzsa):
```sql
SELECT t.slug, array_agg(required_key) AS missing_keys
FROM tournaments t
CROSS JOIN (VALUES
  ('tournament_mode'),('team_count'),('about_stat_days'),('tourney_location'),
  ('tourney_name'),('round_formats'),('reg_open'),('color_primary'),('pars_day1')
) AS req(required_key)
WHERE NOT EXISTS (
  SELECT 1 FROM settings s WHERE s.tournament_id = t.id AND s.key = req.required_key
)
GROUP BY t.slug;
-- Empty result = all tourneys have required keys
```

---

## ✅ Fixed — Session 9 (2026-05-05, creation flow QA + individual tourney support)

- **player.html billing gate blocks tournament admins**: admins with no `player_accounts` row hit upgrade wall. Fixed: `isAdmin = adminRows.length > 0` bypasses gate. [player.html:356, commit `2237c4d`]
- **No way to view player portal from admin**: added "Portal" button per player row → `/player?as=email`. Gold "Admin view" banner when impersonating. [admin.html:1123, player.html, commit `2237c4d`]
- **home.html schedule subtitle hardcoded "Myrtle Beach, SC"**: now `tournament.location` via JS. [home.html:481, commit `3b6c829`]
- **Teams nav link visible for individual tourneys**: `team_count <= 1` now hides `#teams` nav link. [home.html:819, commit `3b6c829`]
- **Team tab visible for individual tourneys on scoreboard**: `team_count <= 1` hides `#tab-team` + `#teamBanners`, defaults to Individual tab. [scoreboard.html:368, commit `3b6c829`]
- **scoreboard.html `tourney_mode` open bug (stale)**: was already fixed in session 6 — scoreboard:480 correctly queries `tournament_mode`. Closed.

---

## ✅ Fixed — Session 8 (2026-05-05, nav hamburgers + myGolf profile)

- **No hamburger on platform pages (marketing, create, player)**: Created `nav-platform.js` universal platform hamburger. [nav-platform.js, marketing.html, create.html, player.html, commit `baed796`]
- **Tourney pages missing platform link**: `nav-mobile.js` drawer now injects `← TOURney Platform`. [nav-mobile.js, commit `baed796`]
- **create.html missing nav links**: Added `hdr-nav` div with `← Platform` + `My Golf` links. [create.html, commit `baed796`]
- **player.html myGolf portal missing phone**: `phone_number` added to select query, rendered as `tel:` link. [player.html, commit `a567171`]
- **player.html myGolf portal missing handicap range**: Added "My Golf Profile" section — tier always, avg score after 5+ rounds. [player.html, commit `a567171`]
- **Duplicate HOME in tourney drawer**: nav-mobile.js `href="/"` normalized to `""` (falsy), skipped dedup. Fixed: removed `h &&` guard. [nav-mobile.js, commit `a613da5`]
- **player-upgrade.html no hamburger**: Added inline hamburger + drawer. [player-upgrade.html, commit `a613da5`]

---

## ✅ Fixed — Session 6 (2026-05-05, content isolation + format alignment)

- **platform.html cascade delete FK error**: cascade-delete order — push_subscriptions → scores → trash_talk → tournament_admins → invitations → players → settings → tournaments. [platform.html, commit `d972fbd`]
- **tourney-init.js hero-eyebrow not patched**: added `.hero-eyebrow` to querySelectorAll. [tourney-init.js, commit `d972fbd`]
- **home.html RSVP MAX hardcoded 24**: dynamic from `reg_max_players`. [home.html, commit `d972fbd`]
- **home.html RSVP s-sub hardcoded**: dynamic from `reg_min_players`/`reg_max_players`. [home.html, commit `d972fbd`]
- **home.html date picker Bova-specific**: hidden by default, shown only when `reg_show_dates === 'true'`. [home.html, commit `d972fbd`]
- **home.html about section hardcoded Bova text**: now from `homepage_about` setting. [home.html, commit `59a18f7`]
- **home.html teams s-sub hardcoded "54 holes"**: → `numDays * 18` dynamic. [home.html, commit `d972fbd`]
- **nav-mobile.js duplicate links**: `_seenHrefs` Set deduplicates. [nav-mobile.js, commit `d972fbd`]
- **create.html → scorecard.html format key mismatches**: `bestball` → `best_ball`, `alternate` → `alt_shot`. [create.html, commit `96b349d`]
- **scorecard.html `shamble` typo**: → `shambles`. [scorecard.html, commit `96b349d`]
- **nassau/skins not in FORMAT_DISPLAY**: added both. [scorecard.html, commit `96b349d`]
- **create.html missing reg_min_players seed**: seeded as `Math.max(1, Math.floor(maxPlayers * 0.6))`. [create.html, commit `59a18f7`]
- **create.html reg_show_dates key mismatch**: aligned to `reg_show_dates`. [home.html, commit `59a18f7`]

---

## ✅ Fixed — Session 5 (2026-05-04, create flow QA)

- **create.html step order**: Format step moved to step 2. [create.html, commit `4ba6291`]
- **create.html back button dead on step 2**: hidden via `renderFormat()` when `S.user` is set. [create.html, commit `4fd16c6`]
- **create.html Plan row stale after tier change**: `pickTier()` re-calls `renderReview()`. [create.html, commit `4fd16c6`]

---

## ✅ Fixed — Session 4 (2026-05-02, multi-tourney + MyGolf)

- **Rob not in all tournaments (MyGolf blank)**: inserted Rob's player rows. Migration 006. [Supabase]
- **player.html admin-only tournament visibility**: queries both `players` + `tournament_admins`. [player.html, commit `adbb217`]

---

## ✅ Fixed — Session 3 (2026-05-04, exterminator task)

- **Opp2 not shown until first score logged**: live `postgres_changes` subscription on `settings`. [scorecard.html, commit `5784039`]
- **FATAL: Opponent partner not real-time**: same fix. [scorecard.html, commit `5784039`]
- **Admin renderTeamAssignment not defined**: → `renderTeamUI()`. [admin.html, commit `406dbd9`]
- **favicon.ico 404**: added `<link rel="icon">` to all HTML files. [commit `d0f0984`]
- **`<meta name="apple-mobile-web-app-capable">` deprecation**: removed. [commit `d0f0984`]

---

## ✅ Fixed — Session 2 (2026-05-02, exterminator task)

- **Settings fetch 406**: added `tournament_id` filter + `.maybeSingle()`. [home.html]
- **Push subscription 400**: `onConflict: 'tournament_id,endpoint'`. [pwa.js]
- **CTA "Buy TOURney For Your Event"**: removed. [tourney-init.js]
- **Hero title + footer wordmark**: dynamic per tournament. [tourney-init.js]
- **Manifest hardcoded name**: → `tournament.name`. [home.html]
- **Admin clear scores RLS**: DELETE policy via migration. [Supabase]
- **Admin player list TEAM column "—"**: race condition fixed. [admin.html]
- **Nav hamburger CSS**: injected from `nav-mobile.js init()`. [nav-mobile.js]
- **Scorecard "Profile" link → 404**: `/profile.html` → `/profile`. [scorecard.html]
- **404 page hardcoded title**: → "TOURney". [404.html]
- **SW stale cache**: bumped `tourney-v10` → `tourney-v11`. [sw.js]

---

## ✅ Fixed — Session 1 (prior session)

- **JS error on score entry**: `TypeError: sb.from(...).upsert(...).catch is not a function` — FIXED.
- **Auth redirect to /t/default/login**: slug not initialized when authGuard fires — FIXED.
- **Admin team assignment shows 0 assigned on load**: `renderTeamAssignment()` never called — FIXED.
- **Scorecard mini strip not real-time**: subscription skipped `renderMiniStrip()` — FIXED.
- **Opp scores refreshing too slowly**: poll reduced 10s → 3s.
- **Scorecard opponent panel**: replaced per-hole display with live match tracker — SHIPPED.
- **HIO notification**: full-screen confetti blast — SHIPPED.

---

## 💡 Pending Features

- ~~**Admin inline team name editing**~~: ✅ DONE — Team A-H name inputs exist in Design tab (`dsTeamAName`–`dsTeamHName`), mapped in `DS_FIELD_MAP`, saved by `saveRegistration()`. (verified 2026-05-07)
- ~~**Admin toggles for RSVP settings**~~: ✅ DONE — `dsMinPlayers`, `dsMaxPlayers`, `dsShowDates`, `dsShowWhyMe`, `dsShowHat` all exist in Design tab HTML + JS. (verified 2026-05-07)
- ~~**Competitive/Casual mode badge on scoreboard**~~: ✅ DONE — `scoringModeBadge` element in HTML, JS sets text + shows on load. `hdrTotal` switches "Total"↔"Net Total". QA confirmed live on both sites. (verified 2026-05-07)
- **Stripe payment gate**: activate at reg_open flip, not at /create. **BLOCKED — waiting on Rob to form LLC.**
- **Test scores**: solo-stroke-test has 72 scores seeded. Other test tourneys still need scores for leaderboard/scorecard regression testing.
- **RLS hardening**: SECURITY_PLAN.md identifies permissive policies on `players`, `scores`, `push_subscriptions`. Needs SQL migrations before Stripe goes live.
- ~~**Supabase edge functions deploy**~~: ✅ DONE — send-push v7 + send-install-email v4 deployed via Supabase MCP (2026-05-12). **MANUAL STILL NEEDED**: set `SEND_INSTALL_EMAIL_SECRET` in Supabase dashboard + update DB webhook header.
- **Tournament series concept**: one brand → many events/years. Schema + UX TBD.

---

## 📐 Setting Keys — Ground Truth (create.html line 759+ is canonical)

| Key | Values | Notes |
|-----|--------|-------|
| `tournament_mode` | `'competitive'` \| `'casual'` | NOT `tourney_mode` |
| `team_count` | `'1'`–`'8'` | |
| `reg_max_players` | `'24'` | |
| `reg_min_players` | `'14'` | |
| `reg_show_dates` | `'true'` \| `'false'` | NOT `reg_show_date_picker` |
| `reg_show_hat` | `'true'` \| `'false'` | |
| `reg_show_why_me` | `'true'` \| `'false'` | |
| `homepage_about` | long text, `\n\n` separated | |
| `homepage_subtitle` | eyebrow text | |
| `homepage_details` | hero meta line | |
| `format_day{n}_front` | format value | canonical for scoring |
| `format_day{n}_back` | format value | canonical for scoring |
| `round_formats` | JSON `{day1:{front,back},...}` | redundant copy for scoreboard/scorecard |
| `color_primary` / `color_ink` / `color_bg` | hex | |
| `about_stat_days` / `about_stat_teams` / `about_stat_holes` | number string | |
| `schedule_json` | JSON array | |
| `course_name_day{n}` | string | |
| `pars_day{n}` | JSON array of 18 numbers | |

## 📐 Format Values — Ground Truth

| create.html value | Label | Scorecard behavior |
|---|---|---|
| `stroke` | Stroke Play | default |
| `scramble` | Scramble | PAIR_TEAM_FMTS (shared ball) |
| `best_ball` | Best Ball | isBestBallHole |
| `shambles` | Shambles | individual (NOT PAIR_TEAM_FMTS) |
| `stableford` | Stableford | isStablefordHole |
| `mod_stableford` | Modified Stableford | isStablefordHole |
| `match` | Match Play | isMatchHole |
| `alt_shot` | Alternate Shot | PAIR_TEAM_FMTS |
| `chapman` | Chapman / Pinehurst | PAIR_TEAM_FMTS |
| `greensomes` | Greensomes | PAIR_TEAM_FMTS |
| `nassau` | Nassau | stroke play (side bets only) |
| `skins` | Skins | stroke play (side bets only) |

<!-- 5-22-26-consolidation-review execute audit clean — 2026-05-22 -->
<!-- 5-22-26-claude-review execute audit clean — 2026-05-22 -->
<!-- 5-21-26-business-review execute audit clean — 2026-05-22 -->
