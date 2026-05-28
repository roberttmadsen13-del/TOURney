-- P3-P5: Performance indexes — tournament_admins, settings, tournaments, courses

-- P3: tournament_admins email lookup (RLS critical path)
-- Every RLS check on players/settings does SELECT WHERE email = auth.email() — full scan without this.
CREATE INDEX IF NOT EXISTS idx_tournament_admins_email
  ON tournament_admins(email);

CREATE INDEX IF NOT EXISTS idx_tournament_admins_tid
  ON tournament_admins(tournament_id);

-- P4: settings composite index (40+ key reads per admin page load)
CREATE INDEX IF NOT EXISTS idx_settings_tid_key
  ON settings(tournament_id, key);

-- P5: tournaments slug lookup (tourney-init.js on every page)
CREATE INDEX IF NOT EXISTS idx_tournaments_slug
  ON tournaments(slug);

-- courses tournament_id (scorecard, admin Course tab)
CREATE INDEX IF NOT EXISTS idx_courses_tournament_id
  ON courses(tournament_id);

-- course_holes course_id (scorecard per-hole yardage)
CREATE INDEX IF NOT EXISTS idx_course_holes_course_id
  ON course_holes(course_id);
