-- Add chapter tagging to the Energy reservation action allowlist (SENSEI,
-- 2026-11-04: tagging a chapter costs one Energy).
--
-- Same guard as 20260922_001: the database accepts only the shared catalog's
-- action ids. This development migration is not applied to a production
-- database by this repository; a production host owns applying its schema.

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
    'translation.generate',
    'chapter.tag'
  ));

COMMIT;
