-- Migration 024: Enforce format scope at the DB level.
--
-- Some scoring formats span a whole 18-hole round (Nassau, Match Play, Wolf,
-- Skins, Bogey/Par, Quota, BBB, Snake, Vegas, Waltz, Four-Ball Match).
-- For these, format_front and format_back MUST match — splitting them
-- corrupts leaderboard math.
--
-- Tourney-locked formats (Eclectic, Peoria, Callaway) span every round +
-- both nines. That invariant is enforced in application code; this CHECK
-- only enforces the per-row round-locked invariant since CHECK can't span rows.
--
-- Pre-flight: any existing rows violating this constraint MUST be repaired
-- before this migration applies. The DO block below repairs them by forcing
-- format_back = format_front for any round-locked front.

BEGIN;

-- Repair any pre-existing illegal combos (round-locked front, mismatched back)
UPDATE rounds
   SET format_back = format_front,
       updated_at  = now()
 WHERE format_front IN (
         'nassau','match','wolf','skins','bogey_par','quota',
         'bingo_bango_bongo','snake','vegas','waltz','four_ball_match'
       )
   AND format_back <> format_front;

-- Also handle the reverse: round-locked back, mismatched front
UPDATE rounds
   SET format_front = format_back,
       updated_at   = now()
 WHERE format_back IN (
         'nassau','match','wolf','skins','bogey_par','quota',
         'bingo_bango_bongo','snake','vegas','waltz','four_ball_match'
       )
   AND format_front <> format_back;

-- Add the CHECK constraint
ALTER TABLE rounds
  ADD CONSTRAINT rounds_format_scope_check
  CHECK (
    -- If front is round-locked, back must match
    (format_front NOT IN ('nassau','match','wolf','skins','bogey_par','quota',
                          'bingo_bango_bongo','snake','vegas','waltz','four_ball_match')
     OR format_back = format_front)
    AND
    -- If back is round-locked, front must match
    (format_back NOT IN ('nassau','match','wolf','skins','bogey_par','quota',
                         'bingo_bango_bongo','snake','vegas','waltz','four_ball_match')
     OR format_front = format_back)
  );

COMMIT;
