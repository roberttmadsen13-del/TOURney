# Bova Invitational — Setup Guide

## 1. Create Supabase Project

1. Go to supabase.com → New Project
2. Name it: bova-invitational
3. Pick a strong password, save it
4. Wait for project to provision (~2 min)
5. Go to Settings → API
6. Copy: Project URL and anon/public key

## 2. Replace placeholders in all HTML files

Search every file for:
  YOUR_SUPABASE_URL
  YOUR_SUPABASE_ANON_KEY

Replace with the values from step 1.

Files to update:
- index.html
- admin.html
- scoreboard.html
- scorecard.html
- profile.html

## 3. Run this SQL in Supabase → SQL Editor

```sql
-- PLAYERS table
create table players (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  first_name text not null,
  last_name text not null,
  email text not null unique,
  handicap text not null,
  available_dates text[] default '{}',
  why_me text,
  trash_talk text,
  hat boolean default false,
  note text
);

-- SCORES table
create table scores (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  player_id uuid references players(id) on delete cascade,
  round text not null,  -- 'day1', 'day2', 'day3'
  hole integer not null check (hole between 1 and 18),
  gross_score integer not null check (gross_score between 1 and 20),
  unique (player_id, round, hole)
);

-- SETTINGS table (key-value store for round states, team assignments, course pars)
create table settings (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);

-- Insert default settings
insert into settings (key, value) values
  ('round_day1', 'pending'),
  ('round_day2', 'pending'),
  ('round_day3', 'pending'),
  ('team_assignments', '{}'),
  ('pars_day1', '[3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3]'),
  ('pars_day2', '[4,4,5,3,4,4,3,5,4,4,4,3,5,4,4,3,5,4]'),
  ('pars_day3', '[4,4,5,3,4,4,3,5,4,4,4,3,5,4,4,3,5,4]');

-- ROW LEVEL SECURITY
alter table players enable row level security;
alter table scores enable row level security;
alter table settings enable row level security;

-- Allow public read on players (for scoreboard, scorecard dropdowns)
create policy "Public read players" on players for select using (true);

-- Allow public insert on players (registration form)
create policy "Public insert players" on players for insert with check (true);

-- Allow players to update their own record (by email match - handled app side)
create policy "Players update own" on players for update using (true);

-- Allow public read on scores (live scoreboard)
create policy "Public read scores" on scores for select using (true);

-- Allow authenticated insert/update on scores (scorers)
create policy "Public upsert scores" on scores for insert with check (true);
create policy "Public update scores" on scores for update using (true);

-- Allow public read on settings (round state, pars)
create policy "Public read settings" on settings for select using (true);

-- Only allow updates to settings via service role (admin uses supabase auth)
create policy "Public upsert settings" on settings for all using (true);

-- Enable realtime on scores table
alter publication supabase_realtime add table scores;
```

## 4. Create admin user in Supabase

1. Supabase → Authentication → Users → Add User
2. Email: robert.t.madsen13@gmail.com
3. Set a strong password — this is your admin login
4. When Chris Bova's email is confirmed, add him the same way
   and add his email to the ADMIN_EMAILS array in admin.html

## 5. Update index.html registration form

The existing registration form posts to localStorage. 
Replace the submitRsvp() function in index.html with:

```javascript
async function submitRsvp() {
  // ... existing validation ...
  if (!ok) return;

  const { error } = await sb.from('players').insert({
    first_name: first,
    last_name: last,
    email: email,
    handicap: hcap,
    available_dates: [...selectedDates],
    why_me: document.getElementById('rsvpWhyMe').value.trim(),
    trash_talk: document.getElementById('rsvpTrash').value.trim(),
    hat: wantsHat,
  });

  if (error) {
    if (error.code === '23505') {
      showToast('That email is already registered.');
    } else {
      showToast('Error — please try again.');
    }
    return;
  }

  document.getElementById('rsvpFormCard').classList.add('hidden');
  document.getElementById('successRsvp').classList.add('show');
  showToast(first + ' ' + last + ' confirmed.');
}
```

Also add the Supabase client to index.html:
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
<script>
const sb = supabase.createClient('YOUR_URL', 'YOUR_KEY');
</script>
```

## 6. Deploy to Vercel

1. Create a GitHub repo called bova-invitational
2. Push all files in this folder to it
3. Go to vercel.com → New Project → Import from GitHub
4. Select the repo → Deploy
5. Vercel auto-detects static HTML, no config needed
6. Your domain will be: bova-invitational.vercel.app
   (or set a custom domain in Vercel settings)

## 7. File structure

bova-invitational/
├── index.html        ← Main site + registration
├── admin.html        ← /admin — admin dashboard
├── scoreboard.html   ← /scoreboard — live leaderboard
├── scorecard.html    ← /scorecard — score entry
├── profile.html      ← /profile — player card editing
├── manifest.json     ← PWA manifest
├── vercel.json       ← URL routing
└── SETUP.md          ← This file

## 8. How scoring works

- Admin opens a round from /admin
- Scorers go to /scorecard
- They select their name, team, and teammate
- They enter scores hole by hole (stepper buttons, big tap targets)
- Scores auto-save to Supabase on each hole
- /scoreboard updates in real time via Supabase realtime subscriptions
- Leaderboard shows team and individual views, plus hole-by-hole scorecard

## 9. Course pars

Default pars are set in the SQL above. To update for actual courses:
- Admin can update via Supabase dashboard → Table Editor → settings
- Update pars_day1, pars_day2, pars_day3 rows
- Format: JSON array of 18 integers e.g. [4,3,5,4,4,3,4,5,4,4,3,5,4,4,3,4,5,4]

## Pages summary

| URL          | Purpose                          | Access      |
|--------------|----------------------------------|-------------|
| /            | Main site + registration         | Public      |
| /scoreboard  | Live leaderboard                 | Public      |
| /scorecard   | Score entry (hole by hole)       | Public      |
| /profile     | Edit player card                 | Email login |
| /admin       | Full admin dashboard             | Admin only  |
