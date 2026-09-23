-- Achievements and Mystery Scrolls.
--
-- The durable reference implementation of the `AchievementRepository`
-- boundary in `src/server/achievements`. It assumes the host supplies a
-- `user_account` table keyed by uid.
--
-- This replaces the Relic v3 foundation (20260804_001, removed): achievements
-- are no longer story-scoped goals that earn Relics. They are Library-defined
-- goals over natural activity, earned once per account, and each earning is a
-- Mystery Scroll. The engine's proven pieces carry over — versioned
-- evaluators stored as data, an immutable definition snapshot per earning,
-- non-empty completion evidence, and a unique constraint as the final guard
-- against earning twice. Relics are now Fate Survival-only
-- (20260923_005_fate_survival_relics.sql).
--
-- Progress is derived from `library_activity` rather than stored, so it can
-- never drift from the activity it summarizes. A scroll's reward is delivered
-- through the QI and DAO XP ledger functions with keys
-- `mystery-scroll:<scroll id>:<currency>`; `mystery_scroll_complete_opening`
-- then moves the scroll from sealed to opened exactly once.
--
-- This development migration is not applied to any production database by
-- this repository; a production host owns applying and backfilling its schema.

BEGIN;

-- The retired Relic v3 foundation held no production data. Drop it wherever
-- an environment applied it so the old story-scoped relic model cannot linger.
DROP TABLE IF EXISTS earned_relic CASCADE;
DROP TABLE IF EXISTS story_relic_assignment CASCADE;
DROP TABLE IF EXISTS relic_achievement_template CASCADE;
DROP FUNCTION IF EXISTS relic_v3_assert_story_owner() CASCADE;

CREATE TABLE library_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid TEXT NOT NULL REFERENCES user_account(uid) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN (
    'chapter.read', 'story.created', 'chapter.created', 'codex.entry-opened', 'world.visited', 'media.experienced'
  )),
  subject_id TEXT NOT NULL CHECK (length(btrim(subject_id)) BETWEEN 1 AND 200),
  story_id TEXT CHECK (story_id IS NULL OR length(btrim(story_id)) BETWEEN 1 AND 200),
  idempotency_key TEXT NOT NULL CHECK (length(idempotency_key) BETWEEN 1 AND 220),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  -- Re-reading a chapter or reopening a Codex entry records nothing new.
  CONSTRAINT library_activity_one_per_key UNIQUE (uid, idempotency_key)
);

CREATE INDEX library_activity_uid_kind_idx ON library_activity (uid, kind, occurred_at);

CREATE TABLE mystery_scroll (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid TEXT NOT NULL REFERENCES user_account(uid) ON DELETE CASCADE,
  achievement_key TEXT NOT NULL CHECK (achievement_key ~ '^[a-z0-9](?:[a-z0-9._-]{0,126}[a-z0-9])?$'),
  achievement_version INTEGER NOT NULL CHECK (achievement_version > 0),
  -- The definition as it stood when earned; later catalogue edits never rewrite it.
  achievement_snapshot JSONB NOT NULL CHECK (jsonb_typeof(achievement_snapshot) = 'object'),
  presentation TEXT NOT NULL CHECK (presentation IN ('concealed', 'curated')),
  rarity TEXT NOT NULL CHECK (rarity IN ('Common', 'Rare', 'Epic', 'Legendary', 'Mythic', 'Transcendent')),
  -- Sealed inside the scroll: [{"type":"dao-xp","amount":25},{"type":"qi","amount":100}].
  rewards JSONB NOT NULL CHECK (jsonb_typeof(rewards) = 'array' AND jsonb_array_length(rewards) > 0),
  completion_evidence JSONB NOT NULL
    CHECK (jsonb_typeof(completion_evidence) = 'array' AND jsonb_array_length(completion_evidence) > 0),
  status TEXT NOT NULL DEFAULT 'sealed' CHECK (status IN ('sealed', 'opened')),
  -- What landed, per grant: [{"type":"qi","amount":100,"transactionId":…,"balanceAfter":…}].
  delivered JSONB CHECK (delivered IS NULL OR jsonb_typeof(delivered) = 'array'),
  earned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  opened_at TIMESTAMPTZ,
  CONSTRAINT mystery_scroll_opened_consistent CHECK ((status = 'opened') = (opened_at IS NOT NULL)),
  -- An opened scroll always records what it delivered.
  CONSTRAINT mystery_scroll_opened_delivered CHECK (status = 'sealed' OR delivered IS NOT NULL),
  -- The race-safe rule: an achievement is earned once per account.
  CONSTRAINT mystery_scroll_one_per_achievement UNIQUE (uid, achievement_key)
);

CREATE INDEX mystery_scroll_uid_earned_idx ON mystery_scroll (uid, earned_at DESC);

-- Moves one sealed scroll to opened exactly once. The caller has already
-- delivered the reward through the ledgers (idempotently, so a retry after a
-- partial failure only completes what is missing). A repeated call returns
-- the stored scroll with replayed = true.
CREATE FUNCTION mystery_scroll_complete_opening(
  p_uid TEXT,
  p_scroll_id UUID,
  p_delivered JSONB
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  scroll mystery_scroll;
BEGIN
  SELECT * INTO scroll FROM mystery_scroll WHERE id = p_scroll_id AND uid = p_uid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'mystery_scroll_not_found: Mystery Scroll % was not found.', p_scroll_id;
  END IF;
  IF scroll.status = 'opened' THEN
    RETURN jsonb_build_object('replayed', TRUE, 'scroll', to_jsonb(scroll));
  END IF;
  IF p_delivered IS NULL OR jsonb_typeof(p_delivered) <> 'array' THEN
    RAISE EXCEPTION 'mystery_scroll_validation: An opened scroll must record what it delivered.';
  END IF;
  UPDATE mystery_scroll
    SET status = 'opened', opened_at = CURRENT_TIMESTAMP, delivered = COALESCE(delivered, p_delivered)
    WHERE id = scroll.id
    RETURNING * INTO scroll;
  RETURN jsonb_build_object('replayed', FALSE, 'scroll', to_jsonb(scroll));
END;
$$;

COMMIT;
