-- Fate Survival Relics.
--
-- The durable reference implementation of the `RelicRepository` boundary in
-- `src/server/relics`. It assumes the host supplies a `user_account` table
-- keyed by uid.
--
-- Relics are lightweight rewards with one source: Fate Survival, the
-- Library's dedicated challenge system. A Relic records the judged outcome it
-- came from, a snapshot of the Relic definition, and what it delivered. The
-- database enforces the two rules that define a Relic: at most one per
-- Fate Survival challenge per account, and rewards limited to DAO XP and
-- Energy. Rewards are delivered through the DAO XP and Energy ledger
-- functions with keys `fate-survival-relic:<id>:<currency>`.
--
-- There is no attunement, offering, weekly pouch, status effect, title, or
-- QI payout: the profile-embedded relic inventory those belonged to is
-- retired in development.
--
-- This development migration is not applied to any production database by
-- this repository; a production host owns applying and backfilling its schema.

BEGIN;

CREATE TABLE fate_survival_relic (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid TEXT NOT NULL REFERENCES user_account(uid) ON DELETE CASCADE,
  challenge_id TEXT NOT NULL CHECK (length(btrim(challenge_id)) BETWEEN 1 AND 200),
  story_id TEXT CHECK (story_id IS NULL OR length(btrim(story_id)) BETWEEN 1 AND 200),
  outcome TEXT NOT NULL CHECK (outcome IN ('FATE AVERTED', 'FATE SCARRED', 'DOOM MANIFESTED')),
  relic_key TEXT NOT NULL CHECK (relic_key ~ '^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$'),
  -- The definition as it stood when earned; later catalogue edits never rewrite it.
  relic_snapshot JSONB NOT NULL CHECK (jsonb_typeof(relic_snapshot) = 'object'),
  rarity TEXT NOT NULL CHECK (rarity IN ('Common', 'Rare', 'Epic', 'Legendary', 'Mythic', 'Transcendent')),
  rewards JSONB NOT NULL CHECK (jsonb_typeof(rewards) = 'array' AND jsonb_array_length(rewards) > 0),
  delivered JSONB CHECK (delivered IS NULL OR jsonb_typeof(delivered) = 'array'),
  earned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- One Relic per Fate Survival challenge, however often its outcome is reported.
  CONSTRAINT fate_survival_relic_one_per_challenge UNIQUE (uid, challenge_id),
  -- Relics grant DAO XP and Energy, nothing else.
  CONSTRAINT fate_survival_relic_rewards_allowed
    CHECK (NOT jsonb_path_exists(rewards, '$[*] ? (@.type != "dao-xp" && @.type != "energy")'))
);

CREATE INDEX fate_survival_relic_uid_earned_idx ON fate_survival_relic (uid, earned_at DESC);

COMMIT;
