-- P1: Write RLS for courses + course_holes
-- Migration 017 added SELECT USING(true) only — admin writes 403'd without these.

-- Tournament owner can INSERT/UPDATE/DELETE courses
DROP POLICY IF EXISTS "owner write courses" ON courses;
CREATE POLICY "owner write courses" ON courses
  FOR ALL TO authenticated
  USING (tournament_id IN (
    SELECT id FROM tournaments WHERE owner_email = auth.email()
  ))
  WITH CHECK (tournament_id IN (
    SELECT id FROM tournaments WHERE owner_email = auth.email()
  ));

-- Tournament admin can INSERT/UPDATE/DELETE courses
DROP POLICY IF EXISTS "admin write courses" ON courses;
CREATE POLICY "admin write courses" ON courses
  FOR ALL TO authenticated
  USING (tournament_id IN (
    SELECT tournament_id FROM tournament_admins WHERE email = auth.email()
  ))
  WITH CHECK (tournament_id IN (
    SELECT tournament_id FROM tournament_admins WHERE email = auth.email()
  ));

-- Owner write course_holes (via course → tournament ownership)
DROP POLICY IF EXISTS "owner write course_holes" ON course_holes;
CREATE POLICY "owner write course_holes" ON course_holes
  FOR ALL TO authenticated
  USING (course_id IN (
    SELECT c.id FROM courses c
    JOIN tournaments t ON t.id = c.tournament_id
    WHERE t.owner_email = auth.email()
  ))
  WITH CHECK (course_id IN (
    SELECT c.id FROM courses c
    JOIN tournaments t ON t.id = c.tournament_id
    WHERE t.owner_email = auth.email()
  ));

-- Admin write course_holes
DROP POLICY IF EXISTS "admin write course_holes" ON course_holes;
CREATE POLICY "admin write course_holes" ON course_holes
  FOR ALL TO authenticated
  USING (course_id IN (
    SELECT c.id FROM courses c
    WHERE c.tournament_id IN (
      SELECT tournament_id FROM tournament_admins WHERE email = auth.email()
    )
  ))
  WITH CHECK (course_id IN (
    SELECT c.id FROM courses c
    WHERE c.tournament_id IN (
      SELECT tournament_id FROM tournament_admins WHERE email = auth.email()
    )
  ));
