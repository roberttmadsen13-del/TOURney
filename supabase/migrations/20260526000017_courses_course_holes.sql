-- Courses + course_holes: tournament-specific hole data (par, yardage)
-- Applied 2026-05-26. Tables already existed in prod from prior work; policies confirmed.
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Course',
  tee_box TEXT NOT NULL DEFAULT 'White',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tournament_id, tee_box)
);

CREATE TABLE IF NOT EXISTS course_holes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  hole_number INT NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
  par INT NOT NULL DEFAULT 4 CHECK (par BETWEEN 3 AND 5),
  yardage INT CHECK (yardage > 0 AND yardage < 700),
  UNIQUE(course_id, hole_number)
);

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_holes ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "public read courses" ON courses FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "admin write courses" ON courses FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM tournament_admins WHERE tournament_id = courses.tournament_id AND email = auth.email()))
  WITH CHECK (EXISTS (SELECT 1 FROM tournament_admins WHERE tournament_id = courses.tournament_id AND email = auth.email()));

CREATE POLICY IF NOT EXISTS "public read course_holes" ON course_holes FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "admin write course_holes" ON course_holes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM tournament_admins ta JOIN courses c ON c.id = course_holes.course_id WHERE ta.tournament_id = c.tournament_id AND ta.email = auth.email()))
  WITH CHECK (EXISTS (SELECT 1 FROM tournament_admins ta JOIN courses c ON c.id = course_holes.course_id WHERE ta.tournament_id = c.tournament_id AND ta.email = auth.email()));
