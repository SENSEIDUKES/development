-- Daily Dao Pillar claim history.
--
-- The durable reference implementation of the `DaoPillarRepository` boundary
-- in `src/server/dao-pillar`. Requires 20260918_002_qi_ledger.sql.
--
-- Theme configuration and the thirty-day reward schedule live in code
-- (`src/server/dao-pillar/themes.ts`); the database stores only what a
-- cultivator actually collected. Each claim row snapshots the reward payload
-- it was made under, so a later theme edit never rewrites history, and the
-- unique (uid, cycle_id, day_number) constraint is the final guard against
-- awarding one scheduled day twice.
--
-- `dao_pillar_claim_day` is the one write path. Inside a single transaction it
-- locks the cultivator's Qi account, inserts the claim and deposits every Qi
-- entry through `qi_apply_deposit`, so a refresh, retry, double tap or
-- duplicate request can only ever replay the original claim.

BEGIN;

CREATE TABLE dao_pillar_claim (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid TEXT NOT NULL REFERENCES user_account(uid) ON DELETE CASCADE,
  theme_id TEXT NOT NULL CHECK (length(btrim(theme_id)) BETWEEN 1 AND 64),
  -- '<theme_id>:<starts_on>' — the same theme run again later is a new cycle.
  cycle_id TEXT NOT NULL CHECK (length(btrim(cycle_id)) BETWEEN 1 AND 96),
  day_number SMALLINT NOT NULL CHECK (day_number BETWEEN 1 AND 366),
  -- The calendar date (in the cycle's time zone) the day was scheduled on.
  scheduled_date DATE NOT NULL,
  -- Generic reward payload snapshot: [{"type":"qi","amount":100}, ...].
  rewards JSONB NOT NULL CHECK (jsonb_typeof(rewards) = 'array' AND jsonb_array_length(rewards) > 0),
  status TEXT NOT NULL DEFAULT 'delivered' CHECK (status IN ('delivered', 'reversed')),
  -- What actually landed, per entry: [{"type":"qi","amount":100,"transactionId":...,"balanceAfter":...}].
  delivered JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(delivered) = 'array'),
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  CONSTRAINT dao_pillar_claim_once_per_day UNIQUE (uid, cycle_id, day_number)
);

CREATE INDEX dao_pillar_claim_uid_date_idx ON dao_pillar_claim (uid, scheduled_date DESC);

CREATE FUNCTION dao_pillar_claim_day(
  p_uid TEXT,
  p_theme_id TEXT,
  p_cycle_id TEXT,
  p_day_number SMALLINT,
  p_scheduled_date DATE,
  p_rewards JSONB,
  p_description TEXT,
  p_metadata JSONB
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  claim dao_pillar_claim;
  entry JSONB;
  entry_index INT := 0;
  deposit JSONB;
  landed JSONB := '[]'::jsonb;
BEGIN
  IF p_rewards IS NULL OR jsonb_typeof(p_rewards) <> 'array' OR jsonb_array_length(p_rewards) = 0 THEN
    RAISE EXCEPTION 'dao_pillar_validation: A claim needs at least one reward entry.';
  END IF;
  -- Serialize every claim for one cultivator behind their Qi account row.
  PERFORM qi_ensure_account(p_uid);
  PERFORM 1 FROM qi_account WHERE uid = p_uid FOR UPDATE;
  SELECT * INTO claim FROM dao_pillar_claim
    WHERE uid = p_uid AND cycle_id = p_cycle_id AND day_number = p_day_number;
  IF FOUND THEN
    RETURN jsonb_build_object('replayed', TRUE, 'claim', to_jsonb(claim));
  END IF;
  INSERT INTO dao_pillar_claim (uid, theme_id, cycle_id, day_number, scheduled_date, rewards, metadata)
    VALUES (p_uid, p_theme_id, p_cycle_id, p_day_number, p_scheduled_date, p_rewards, COALESCE(p_metadata, '{}'::jsonb))
    RETURNING * INTO claim;
  FOR entry IN SELECT * FROM jsonb_array_elements(p_rewards) LOOP
    IF entry->>'type' = 'qi' THEN
      deposit := qi_apply_deposit(
        p_uid,
        (entry->>'amount')::BIGINT,
        'dao-pillar:' || claim.id::text || ':' || entry_index::text,
        'dao-pillar',
        p_description,
        jsonb_build_object('claimId', claim.id, 'cycleId', p_cycle_id, 'day', p_day_number)
      );
      landed := landed || jsonb_build_array(jsonb_build_object(
        'type', 'qi',
        'amount', (entry->>'amount')::BIGINT,
        'transactionId', deposit->'transaction'->>'id',
        'balanceAfter', (deposit->'account'->>'balance')::BIGINT
      ));
    ELSE
      RAISE EXCEPTION 'dao_pillar_unsupported_reward: Reward type % cannot be delivered yet.', entry->>'type';
    END IF;
    entry_index := entry_index + 1;
  END LOOP;
  UPDATE dao_pillar_claim SET delivered = landed WHERE id = claim.id RETURNING * INTO claim;
  RETURN jsonb_build_object('replayed', FALSE, 'claim', to_jsonb(claim));
END;
$$;

COMMIT;
