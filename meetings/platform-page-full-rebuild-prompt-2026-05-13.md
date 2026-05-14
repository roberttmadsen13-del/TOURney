# Platform Page — Full Rebuild Prompt
# File: platform.html (TOURney repo root)
# Generated: 2026-05-13 by CPO review

Rebuild `platform.html` addressing all identified issues in the order below.
Do not skip phases. Do not reorder. Each phase unblocks the next.

---

## PHASE 1 — SECURITY (do first, no exceptions)

### 1a. Audit `platform-action` edge function auth
Read `supabase/functions/platform-action/index.ts`.
Confirm it requires a valid authenticated session before executing `comp`, `revoke`, or `list` actions.
If it does NOT verify auth:
- Add `Authorization` header check using Supabase service role or user JWT
- Reject unauthenticated requests with 401
- Add rate limiting: max 10 calls/minute per IP
Document what you find either way before proceeding.

---

## PHASE 2 — DATA INTEGRITY

### 2a. Replace `deleteTourney` client-side cascade with a Postgres function
Currently `deleteTourney()` deletes from 7 tables in sequential `await` calls.
If any step fails, data is permanently inconsistent.

Create a Postgres function (via migration) that wraps all deletes in a transaction:

```sql
create or replace function delete_tournament(p_id uuid)
returns void language plpgsql security definer as $$
begin
  delete from push_subscriptions  where tournament_id = p_id;
  delete from scores               where tournament_id = p_id;
  delete from trash_talk           where tournament_id = p_id;
  delete from tournament_admins    where tournament_id = p_id;
  delete from invitations          where tournament_id = p_id;
  delete from players              where tournament_id = p_id;
  delete from settings             where tournament_id = p_id;
  delete from rounds               where tournament_id = p_id;
  delete from tournaments          where id = p_id;
end;
$$;
```

Replace the client-side delete logic with:
```js
const { error } = await sb.rpc('delete_tournament', { p_id: id });
```

---

## PHASE 3 — QUICK UX FIXES (all small, do together)

### 3a. Remove duplicate "Waiting on Rob" from Action Board
The Action Board has TWO renders of CEO_TASKS:
- Top 2-column grid: `tqWaiting` div (renders `waitingItems`)
- Bottom standalone section: `ceoList` div with "Only you can do these — AI cannot"

Remove `tqWaiting` from the top grid entirely.
Keep the bottom `ceoList` section — it has the `why` field and is the cleaner implementation.
Rename it label to: **"Checklist — Rob Only"**
Adjust the 2-column today-queue grid to 3 sections: Do Now | Agent Can Do | Recently Shipped.

### 3b. Remove "Bugs" filter from Artifacts tab
The Artifacts tab filter bar has: All / Reviews / Plans / Audits / Runbooks / Bugs / Favorites / Show Archived
Remove the "Bugs" filter button. Bugs has its own tab. One line deleted.

### 3c. Fix mobile tab labels
Current `data-short` values are wrong:
- Tenants: "Ops" → change to "Tenants"
- Artifacts: "Files" → change to "Docs"

### 3d. Consolidate Dashboard — remove Launch Readiness strip
Dashboard currently shows both the Axis Scorecard grade grid AND a "Launch Readiness" 6-axis pill strip below it. Same 6 axes rendered twice.
Remove the `launch-strip` div and all associated CSS/JS (`ls-pill`, `ls-label`, `ls-val`, `ls-*` styles, the Launch Readiness `mc-hdr`).
The grade grid is the canonical view. The strip is redundant.

---

## PHASE 4 — PERFORMANCE: KILL THE POLLING LOOPS

### 4a. Replace polling with Supabase Realtime subscriptions
Currently three polling intervals fire continuously:
```js
setInterval(loadArtifacts, 5000);   // every 5s
setInterval(loadGrades, 10000);     // every 10s
setInterval(renderBugLog, 2000);    // every 2s ← worst offender
```
Remove all three `setInterval` calls.

Replace with:
- **Artifacts**: Subscribe to the artifacts table (or the source that populates artifact cards) using `sb.channel('artifacts').on('postgres_changes', ...)`. Re-render on INSERT/UPDATE/DELETE.
- **Grades**: grades.json is a static file — it can't be subscribed to. Keep a single `loadGrades()` on login. Add a manual "Refresh" button near the scorecard header. Do not poll.
- **Bug log**: `renderBugLog` polls localStorage for bugs written by `bug-fab.js`. Replace with a `storage` event listener: `window.addEventListener('storage', e => { if (e.key === 'gks_bugs') renderBugLog(); })`. No polling needed.

### 4b. Lazy-load tabs instead of loading everything on login
`showDashboard()` currently fires 8 data fetches on login regardless of which tab is active.
Refactor: each tab loads its data the first time it becomes active, not before.

```js
const tabLoaded = {};
function switchTab(t) {
  // existing show/hide logic
  if (!tabLoaded[t]) {
    tabLoaded[t] = true;
    loadTabData(t);
  }
}
function loadTabData(t) {
  if (t === 'dash')      { loadGrades(); loadCeoTasks(); }
  if (t === 'tenants')   { loadTournaments(); loadCompAccounts(); loadCodes(); }
  if (t === 'action')    { loadMissionControl(); }
  if (t === 'artifacts') { loadArtifacts(); }
  if (t === 'reference') { renderReference(); }
  // bugs, checklist, reference are static or self-contained
}
```
Dashboard tab loads on login (it's the default). All others load on first visit.

---

## PHASE 5 — BUGS TAB: REPLACE IFRAME WITH INLINE RENDER

The Bugs tab currently loads `/platform/bugs` in a full `<iframe>`. This is fragile, can't share auth state, and can't be styled consistently.

Read `/platform/bugs` source (or `bugs.html` if that's the source file).
Extract the bug log render logic and move it inline into `platform.html` under `panel-bugs`.
The bug log reads from `localStorage('gks_bugs')` — that's already accessible in the parent page context.
Remove the `<iframe>` entirely.
The existing `renderBugLog()` function in platform.html already does this — confirm it's wired correctly to `panel-bugs` and the iframe is the only thing that needs removing.

---

## PHASE 6 — CEO_TASKS: MOVE OUT OF HARDCODED JS

`CEO_TASKS` is a hardcoded array inside `platform.html`. Every update requires a code change + deploy.

Create `/platform/ceo-tasks.json` in the repo root.
Move the `CEO_TASKS` array content into that file as valid JSON.
In `platform.html`, replace the hardcoded array with:
```js
const CEO_TASKS = await fetch('/platform/ceo-tasks.json').then(r => r.json());
```
No functional change — just makes the task list editable without touching platform.html.

---

## PHASE 7 — AGENT TASK QUEUE (platform_tasks table)

Add a migration (`supabase/migrations/YYYYMMDDXXXXXX_platform_tasks.sql`):

```sql
create table if not exists public.platform_tasks (
  id          uuid        primary key default gen_random_uuid(),
  source      text        not null,  -- 'agent' | 'rob' | 'system'
  queue       text        not null,  -- 'inbox' | 'checklist' | 'shipped'
  title       text        not null,
  body        text,
  cmd         text,                  -- slash command to run if applicable
  tag         text,                  -- display tag e.g. 'BLOCKING', 'URGENT'
  status      text        not null default 'open', -- 'open'|'done'|'dismissed'
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.platform_tasks enable row level security;

-- Only platform email can read/write
create policy "platform_owner_only" on public.platform_tasks
  for all to authenticated
  using (auth.email() = current_setting('app.platform_email', true))
  with check (auth.email() = current_setting('app.platform_email', true));
```

Update `platform-action` edge function to handle new actions:
- `action: 'task_push'` → INSERT into platform_tasks (source, queue, title, body, cmd, tag)
- `action: 'task_done'` → UPDATE status='done' by id
- `action: 'task_list'` → SELECT * WHERE status='open' ORDER BY created_at

In `platform.html`, update Action Board to:
- Load `inbox` queue items into "Agent Can Do" section (replacing client-side axis-status.json derivation)
- Load `shipped` queue items into "Recently Shipped" section
- Keep "Do Now" derived from axis blocking status (that logic is good)
- Keep "Rob Only Checklist" from CEO_TASKS (that's separate)

Any agent (Claude, local Qwen, any provider) can now call:
```
POST supabase-edge/platform-action
{ action: 'task_push', queue: 'inbox', title: '...', cmd: '/tourney-plan-security', source: 'claude-sonnet' }
```
No scraping. No static files. Fully writable from any provider.

---

## PHASE 8 — CUSTOMER HEALTH CARDS (Tenants tab upgrade)

Replace the flat tournament table with expandable health cards.

Update `loadTournaments()` to also fetch:
```js
const [{ data: tourneys }, { data: players }, { data: rounds }, { data: scores }] = await Promise.all([
  sb.from('tournaments').select('*').order('created_at', { ascending: false }),
  sb.from('players').select('tournament_id, created_at'),
  sb.from('rounds').select('tournament_id, day_number, status'),
  sb.from('scores').select('tournament_id'),
]);
```

For each tournament, derive:
- `playerCount` — count from players
- `roundCount` — count from rounds
- `roundsComplete` — count where status = 'closed'
- `scoreEntries` — count from scores
- `lastPlayer` — max created_at from players (proxy for last activity)
- `status` — existing deriveStatus() logic

Render as cards, not table rows. Card layout:

```
[Tournament Name]          [Status pill]
Owner: owner@email.com     Created: May 3, 2026
Players: 40  Rounds: 2/2  Scores: 360  Last activity: May 11
[Admin →]  [Delete]
```

Keep the aggregate stat row (Total Tournaments, Total Players, Unique Owners) at the top — it's useful.
Add a fourth stat: **Active Tournaments** (status = 'live').

---

## PHASE 9 — PAGINATION

Add cursor-based pagination to the three large lists: tournaments, comp accounts, invite codes.

Page size: 25. Add "Load more" button below each list.
Do not use offset pagination (it's wrong with ordered deletes). Use `created_at` cursor:

```js
// First page
sb.from('tournaments').select('*').order('created_at', { ascending: false }).limit(25)
// Next page
sb.from('tournaments').select('*').order('created_at', { ascending: false }).lt('created_at', lastCreatedAt).limit(25)
```

---

## PHASE 10 — QA RUN HISTORY PERSISTENCE

Read `logQaRun()` in platform.html. Confirm where run history is currently written.
If localStorage only: migrate to Supabase.

Add to the platform_tasks migration (or a separate migration):
```sql
create table if not exists public.qa_runs (
  id            uuid        primary key default gen_random_uuid(),
  slug          text        not null,
  passed        int         not null,
  total         int         not null,
  notes         text,
  created_at    timestamptz not null default now()
);
alter table public.qa_runs enable row level security;
create policy "platform_owner_qa" on public.qa_runs
  for all to authenticated
  using (auth.email() = current_setting('app.platform_email', true));
```

Update `logQaRun()` to INSERT into `qa_runs`.
Update QA run history display to load from Supabase instead of localStorage.

---

## QA CHECKLIST after all phases complete

- [ ] `platform-action` rejects unauthenticated requests (verify with curl, no auth header → 401)
- [ ] Delete tournament with network tab open — single RPC call, no sequential deletes visible
- [ ] "Waiting on Rob" appears exactly once in Action Board
- [ ] Bugs filter absent from Artifacts tab
- [ ] Mobile: Tenants tab shows "Tenants", Artifacts shows "Docs"
- [ ] Dashboard has no Launch Readiness strip
- [ ] No `setInterval` calls in JS (grep to confirm)
- [ ] Switching to Tenants tab for first time triggers network request; switching back does not
- [ ] Bugs tab renders inline, no iframe in DOM
- [ ] `/platform/ceo-tasks.json` exists and loads correctly
- [ ] POST to `platform-action` with `action:'task_push'` → item appears in Action Board
- [ ] Tenants show cards with player count, round count, score entries, last activity
- [ ] Tournament list shows "Load more" after 25 items
- [ ] `logQaRun()` writes to Supabase, persists across device/browser

---

## Notes for implementer

- Work in order. Phase 1 (security) is a blocker — do not proceed if `platform-action` is unauthenticated until it's fixed.
- Each phase should be committed separately with a clear message.
- `grades.json` and `axis-status.json` are NOT replaced in this prompt — they are external to platform.html and a separate architectural decision.
- Do not change the visual design language (gold/ink/cream palette, Barlow Condensed/DM Mono type, dark theme).
- Do not add features beyond what's specified here.
