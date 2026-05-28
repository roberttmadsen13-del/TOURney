-- Version-control migration for donations (table added ~2026-05-21, no migration file existed).
-- Not tournament-scoped — linked to mygolf_profiles via mygolf_profile_id.
-- CREATE TABLE IF NOT EXISTS guards are safe — table already exists in live DB.

CREATE TABLE IF NOT EXISTS donations (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mygolf_profile_id        uuid REFERENCES mygolf_profiles(id),
  amount_cents             integer NOT NULL,
  currency                 text NOT NULL DEFAULT 'usd',
  stripe_payment_intent_id text,
  message                  text,
  created_at               timestamptz DEFAULT now()
);

ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own donations" ON donations;
CREATE POLICY "Users read own donations" ON donations
  FOR SELECT USING (auth.uid() = mygolf_profile_id);
