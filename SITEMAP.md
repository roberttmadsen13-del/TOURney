# TOURney Platform — Site Map

---

## Platform Pages (tourney.greenskeeper.studio)

| URL | File | Description |
|-----|------|-------------|
| `/` | `marketing.html` | Platform sales page. Explains TOURney, shows pricing tiers, live tournament grid, links to `/create`. Entry point for new customers. |
| `/create` | `create.html` | 5-step wizard for new tournament owners. Creates Supabase auth account → seeds tournament + settings in DB → redirects owner to their admin. |
| `/platform` | `platform.html` | Rob-only super admin. Shows all tournaments, player counts, status badges, delete controls. |

---

## Tournament Pages ({slug}.greenskeeper.studio or /t/{slug}/)

| URL | File | Description | Connects To |
|-----|------|-------------|-------------|
| `/` | `home.html` | Tournament landing page. Hero, about section, registration CTA. Public-facing. Fully editable from admin. | login, install, scoreboard |
| `/admin` | `admin.html` | Owner/co-admin dashboard. Command center (rounds, pairings, course setup), Design tab (logo, colors, content), player management, admin grant/revoke. | all tournament pages |
| `/login` | `login.html` | Player auth. Email + password via Supabase. Redirects to home on success. | home |
| `/install` | `install.html` | PWA install guide. Shows logo, step-by-step "Add to Home Screen" instructions. Linked from registration email. | home (after install) |
| `/scoreboard` | `scoreboard.html` | Live leaderboard. Team standings, scores by round, real-time Supabase updates, trash talk. | scorecard |
| `/scorecard` | `scorecard.html` | Score entry for players. Hole-by-hole input, submits to Supabase. Triggers leaderboard update. | scoreboard |
| `/feed` | `feed.html` | Activity feed. Hole-in-one alerts, score highlights, trash talk, push notifications. | profile |
| `/profile` | `profile.html` | Individual player profile. Stats, scores, handicap. | directory |
| `/directory` | `directory.html` | Full player roster. Names, handicaps, team assignments. | profile |
| `/course` | `course.html` | Course info. Par, yardage, hole layout for the round's course. | scorecard |
| `/champions` | `champions.html` | Hall of fame. Past winners by year. | — (read-only) |

---

## Data Backbone

All pages talk to **Supabase** (`jllugkiojeoopitdvzsa`).

`tourney-init.js` loads on every tournament page — detects slug, fetches tournament row, injects brand colors, exposes `window.tourney.db` + `window.tourney.ready`.

localStorage keys are namespaced by slug: `{slug}_profile_email`, `{slug}_scores_{round}`, `{slug}_scorecard_session`, `{slug}_offline_queue`.

---

## Key Settings Keys (home.html ↔ admin.html)

| Setting Key | Admin Field | home.html Effect |
|-------------|-------------|-----------------|
| `homepage_subtitle` | Hero Eyebrow Line | Hero eyebrow text |
| `homepage_details` | Hero Meta Line | Hero meta line |
| `hero_cta_primary` | Primary CTA Button | CTA button label |
| `hero_photo_url` | Upload Photo (hero) | Hero background image |
| `homepage_about` | About Text | About body paragraphs |
| `about_photo_url` | Upload Photo (about) | About section image |
| `about_stat_teams` | Teams Stat | Stat block: Teams value |
| `about_stat_days` | Days Stat | Stat block: Days value |
| `about_stat_holes` | Holes Stat | Stat block: Holes value |
| `homepage_format_note` | Format Note | Format note box |
| `team_a_name` | Team A Name | Team banners, scoreboard |
| `team_b_name` | Team B Name | Team banners, scoreboard |
| `reg_open` | Registration Status | RSVP form visibility |
| `reg_max_players` | Max Players | RSVP `/N` denominator |
| `logo_url` | Logo Upload | Nav, hero, PWA manifest icon, favicon |
| `color_primary` | Primary Color | All brand gold variables |
| `color_ink` | Ink Color | Text + background |
| `color_bg` | Background Color | Surface + cream variables |
