-- Extend the Energy reservation action allowlist to match the shared catalog.
--
-- The initial ledger migration deliberately used a database constraint rather
-- than trusting a caller's action id. Keep that guard, but evolve it here so
-- the durable adapter accepts every current projected generation action.
-- This development migration is not applied to a production database by this
-- repository; a production host owns applying and backfilling its schema.

BEGIN;

ALTER TABLE energy_reservation
  DROP CONSTRAINT IF EXISTS energy_reservation_action_id_check;

ALTER TABLE energy_reservation
  ADD CONSTRAINT energy_reservation_action_id_check CHECK (action_id IN (
    'chapter.generate',
    'image.generate',
    'short-cue.generate',
    'long-cue.generate',
    'soundscape.generate',
    'video.generate',
    'narration.generate',
    'translation.generate'
  ));

COMMIT;
