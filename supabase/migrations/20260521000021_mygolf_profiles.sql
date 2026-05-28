-- Version-control migration for mygolf_profiles (table added ~2026-05-21, no migration file existed).
-- CREATE TABLE IF NOT EXISTS guards are safe — table already exists in live DB.

CREATE TABLE IF NOT EXISTS mygolf_profiles (
  id           uuid PRIMARY KEY,
  first_name   text NOT NULL,
  last_name    text NOT NULL,
  email        text NOT NULL,
  phone        text,
  handicap     numeric,
  avatar_url   text,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

ALTER TABLE mygolf_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own profile" ON mygolf_profiles;
CREATE POLICY "Users read own profile" ON mygolf_profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users insert own profile" ON mygolf_profiles;
CREATE POLICY "Users insert own profile" ON mygolf_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users update own profile" ON mygolf_profiles;
CREATE POLICY "Users update own profile" ON mygolf_profiles
  FOR UPDATE USING (auth.uid() = id);
