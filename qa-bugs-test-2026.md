# QA Bug Log — TOURney Platform (updated: 2026-05-06)

Last QA pass: hero/about photo leak fix (2026-05-06)
Last commits: 2f0795b (admin team names C-H), c486ac2 (create billing gate), a613da5 (nav-mobile dedup + player-upgrade ham), a567171 (player phone+handicap), 4276116 (logo leak)

---

## 🔴 Open Bugs — Must Fix

- **Bova formats unconfirmed**: seeded Day1=stroke, Day2=scramble, Day3=best_ball based on about text ("scramble, shambles, best ball, stroke play"). Shambles not mapped to a day. **Verify with Chris Bova before tournament runs. BLOCKED — human verification required.**

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

- **Admin inline team name editing**: saveTeamCount ✓ done. Need per-team rename fields in UI.
- **Admin toggles for RSVP settings**: reg_show_dates, reg_min_players, reg_max_players editable from admin UI.
- **Competitive/Casual mode badge on scoreboard**: visible pill so players know if scores are handicap-adjusted.
- **Stripe payment gate**: activate at reg_open flip, not at /create. P4.
- **Test scores**: seed scores into test tourneys to verify leaderboard + scorecard rendering end-to-end.
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
