# Phase 2: Tourney Multi-Tenancy Refactor

**Goal:** Transform single-tenant Bova Invitational into "Tourney" — white-label tournament platform.
**Constraint:** Keep static HTML + Supabase + Vercel. No framework. No build step.
**Non-goal:** Don't break live Bova Invitational during migration.

---

## Architecture Decision: Path-Based Tenancy

URL pattern: `tourney.app/t/{slug}/` (e.g. `/t/bova-2026/`)

**Why path over subdomain:** Static Vercel deploy doesn't need wildcard DNS. Zero infra change.

Supabase anon key stays public in HTML — RLS is the data gate, not key secrecy.

---

## Phase 2 Milestones

### M1 — DB Schema: Add Tenancy Layer

```sql
-- New anchor table
CREATE TABLE tournaments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,        -- 'bova-2026', 'smith-invt'
  name        TEXT NOT NULL,               -- 'Bova Invitational 2026'
  short_name  TEXT,                        -- 'BOVA'
  logo_url    TEXT,
  owner_email TEXT NOT NULL,              -- Rob or tournament organizer
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Scope existing tables
ALTER TABLE players  ADD COLUMN tournament_id UUID REFERENCES tournaments(id);
ALTER TABLE scores   ADD COLUMN tournament_id UUID REFERENCES tournaments(id);
ALTER TABLE settings ADD COLUMN tournament_id UUID REFERENCES tournaments(id);

-- Settings key unique per tournament (not globally)
ALTER TABLE settings DROP CONSTRAINT settings_pkey;
ALTER TABLE settings ADD PRIMARY KEY (tournament_id, key);

-- Backfill Bova v1
INSERT INTO tournaments (slug, name, short_name, logo_url, owner_email)
VALUES ('bova-2026', 'Bova Invitational 2026', 'BOVA', '<existing_logo_url>', 'robert.t.madsen13@gmail.com')
RETURNING id;  -- capture this UUID for backfill

UPDATE players  SET tournament_id = '<bova_uuid>';
UPDATE scores   SET tournament_id = '<bova_uuid>';
UPDATE settings SET tournament_id = '<bova_uuid>';

-- Enforce NOT NULL after backfill
ALTER TABLE players  ALTER COLUMN tournament_id SET NOT NULL;
ALTER TABLE scores   ALTER COLUMN tournament_id SET NOT NULL;
ALTER TABLE settings ALTER COLUMN tournament_id SET NOT NULL;
```

### M2 — RLS: Tournament-Scoped Isolation

```sql
-- Enable RLS (if not already)
ALTER TABLE players  ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores   ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Public read scoped to tournament
CREATE POLICY "read own tournament players"
  ON players FOR SELECT USING (
    tournament_id = current_setting('app.tournament_id', true)::uuid
  );

CREATE POLICY "read own tournament scores"
  ON scores FOR SELECT USING (
    tournament_id = current_setting('app.tournament_id', true)::uuid
  );

CREATE POLICY "read own tournament settings"
  ON settings FOR SELECT USING (
    tournament_id = current_setting('app.tournament_id', true)::uuid
  );

-- Write policies (players can only touch their own scores)
CREATE POLICY "insert own scores"
  ON scores FOR INSERT WITH CHECK (
    tournament_id = current_setting('app.tournament_id', true)::uuid
    AND player_id = auth.uid()
  );
```

**Note:** `app.tournament_id` set via Supabase Edge Function or via RPC call at session init.
Alternative (simpler): Pass `tournament_id` as explicit filter on every query (no session var needed).
**Recommendation:** Explicit filter on every query — simpler, no session config required for static HTML.

Revised simpler RLS (anon can read any tournament — public scoreboard use case):
```sql
-- Public read: open (tournaments are public events)
CREATE POLICY "public read players"  ON players  FOR SELECT USING (true);
CREATE POLICY "public read scores"   ON scores   FOR SELECT USING (true);
CREATE POLICY "public read settings" ON settings FOR SELECT USING (true);

-- Writes: only authenticated users can write to their own tournament
CREATE POLICY "auth insert scores"
  ON scores FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT id FROM players 
      WHERE tournament_id = scores.tournament_id
    )
  );
```

### M3 — Shared Init Module: `tourney-init.js`

Single JS file included on every page. Replaces hardcoded Supabase init + tournament context.

```javascript
// tourney-init.js — included on every page before other scripts
const SUPABASE_URL  = 'https://jllugkiojeoopitdvzsa.supabase.co';
const SUPABASE_KEY  = 'sb_publishable_DnBMNLaSu61ykJ6P_fI2fw_D9DdAScn';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Extract tournament slug from URL: /t/{slug}/
function getTournamentSlug() {
  const match = window.location.pathname.match(/\/t\/([^/]+)/);
  return match ? match[1] : null;
}

// Load tournament context — call once on every page
async function loadTournamentContext() {
  const slug = getTournamentSlug();
  if (!slug) return null;

  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !data) {
    document.body.innerHTML = '<p>Tournament not found.</p>';
    return null;
  }

  window.TOURNAMENT = data;  // { id, slug, name, short_name, logo_url }
  return data;
}
```

Every page: replace inline `createClient` with `<script src="/tourney-init.js">`, then use `window.TOURNAMENT.id` in all queries.

### M4 — Vercel Routing Update

```json
// vercel.json
{
  "rewrites": [
    { "source": "/t/:slug",          "destination": "/index.html" },
    { "source": "/t/:slug/admin",    "destination": "/admin.html" },
    { "source": "/t/:slug/scoreboard", "destination": "/scoreboard.html" },
    { "source": "/t/:slug/scorecard",  "destination": "/scorecard.html" },
    { "source": "/t/:slug/profile",    "destination": "/profile.html" },
    { "source": "/t/:slug/directory",  "destination": "/directory.html" },
    { "source": "/t/:slug/feed",       "destination": "/feed.html" },
    { "source": "/t/:slug/course",     "destination": "/course.html" },
    { "source": "/t/:slug/champions",  "destination": "/champions.html" },
    { "source": "/t/:slug/login",      "destination": "/login.html" }
  ]
}
```

All relative links inside HTML stay unchanged (`href="/scorecard"` → becomes `/t/{slug}/scorecard` via router). Add base href handling in `tourney-init.js`.

### M5 — Admin: Tournament Creation (super-admin only)

New page: `/admin/tournaments.html` — Rob-only, gated by email.

Flow:
1. Enter: tournament name, slug, short name, logo URL
2. Creates row in `tournaments` table
3. Copies default `settings` rows (round states, default pars) for new tournament
4. Shows shareable URL: `tourney.app/t/{slug}/`

MVP: Rob creates via Supabase dashboard directly. Skip UI for Phase 2, add in Phase 3.

### M6 — is_admin Scope Fix

Current: `is_admin` is global boolean on `players` table.
Problem: Admin for Bova ≠ admin for all tournaments.

Fix: Add `tournament_admins` join table:
```sql
CREATE TABLE tournament_admins (
  tournament_id UUID REFERENCES tournaments(id),
  player_id     UUID REFERENCES auth.users(id),
  PRIMARY KEY (tournament_id, player_id)
);
```

Admin check changes from:
```javascript
// old
const { data } = await supabase.from('players').select('is_admin').eq('id', user.id).single();
```
to:
```javascript
// new
const { data } = await supabase
  .from('tournament_admins')
  .select('player_id')
  .eq('tournament_id', window.TOURNAMENT.id)
  .eq('player_id', user.id)
  .maybeSingle();
const isAdmin = !!data;
```

Keep `is_admin` column for backwards compat during migration. Remove post-migration.

---

## Sprint Breakdown

| Sprint | Work | Deliverable |
|--------|------|-------------|
| **2A** | DB migration (M1) + backfill Bova | All tables have `tournament_id`, Bova still works |
| **2B** | `tourney-init.js` + remove hardcoded creds from all HTML (M3) | Single credential source |
| **2C** | All queries filter by `window.TOURNAMENT.id` | Per-tournament data isolation |
| **2D** | Vercel routing (M4) + URL redirect `bova-2026` → `/t/bova-2026/` | Live multi-tenant routing |
| **2E** | `tournament_admins` table + admin check refactor (M6) | Tournament-scoped admin |
| **2F** | RLS tightening (M2) + QA full regression | Production-hardened |

**Total estimate:** 4–6 focused sessions.

---

## Migration Safety: Don't Break Bova

- All DB changes are additive (ADD COLUMN, new tables) before backfill
- Backfill Bova first, test, then enforce NOT NULL
- Keep existing `/admin`, `/scoreboard`, etc. routes working via redirect until all tenanted URLs verified
- QA checklist: full Bova happy-path after every sprint

---

## Open Questions

1. **Branding:** Ship as `tourney.app` domain or `[tournament].greenskeeper.io`?
2. **Auth isolation:** Should players from one tournament be blocked from signing up for another? (Probably no — same platform, same auth.users)
3. **Round naming:** Hardcoded `day1/day2/day3` — make configurable per tournament in Phase 2 or defer to Phase 3?
4. **sw.js caching:** Service worker caches static assets. Multi-tournament routing may break offline mode. Needs update.
