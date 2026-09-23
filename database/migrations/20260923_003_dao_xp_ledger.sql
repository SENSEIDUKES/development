-- Permanent DAO XP ledger.
--
-- The durable reference implementation of the `DaoXpLedger` boundary in
-- `src/server/dao-xp`. It assumes the host supplies a `user_account` table
-- keyed by uid, like the Energy and QI ledgers.
--
-- DAO XP alone determines Cultivator Rank, and rank only chooses the
-- cultivator's Library colours. The ledger is credit-only: no spend, no
-- decay, no purchase. The `source` CHECK is the final guard on what may move
-- rank — achievements (their Mystery Scrolls), creation, and Fate Survival
-- Relics — plus the one-time `opening-balance` carry-over of a legacy
-- profile's DAO XP when this ledger first becomes authoritative. QI, the Dao
-- Pillar, the Celestial Store and Familiar training cannot reach it.
--
-- `dao_xp_apply_credit` locks the account row, replays a repeated key without
-- moving anything (and refuses one that describes a different credit), and
-- writes the movement and its history line together.
--
-- This development migration is not applied to any production database by
-- this repository; a production host owns applying and backfilling its schema.

BEGIN;

CREATE TABLE dao_xp_account (
  uid TEXT PRIMARY KEY REFERENCES user_account(uid) ON DELETE CASCADE,
  balance BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE dao_xp_transaction (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence BIGINT GENERATED ALWAYS AS IDENTITY,
  uid TEXT NOT NULL REFERENCES dao_xp_account(uid) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('credit')),
  amount BIGINT NOT NULL CHECK (amount > 0),
  source TEXT NOT NULL CHECK (source IN ('achievement', 'creation', 'fate-survival-relic', 'opening-balance')),
  idempotency_key TEXT NOT NULL CHECK (length(idempotency_key) BETWEEN 1 AND 220),
  description TEXT NOT NULL CHECK (length(btrim(description)) > 0),
  balance_after BIGINT NOT NULL CHECK (balance_after >= 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- The race-safe rule: one ledger line per idempotency key per account.
  CONSTRAINT dao_xp_transaction_one_per_key UNIQUE (uid, idempotency_key)
);

CREATE INDEX dao_xp_transaction_uid_sequence_idx ON dao_xp_transaction (uid, sequence DESC);

CREATE FUNCTION dao_xp_ensure_account(p_uid TEXT) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  acct dao_xp_account;
BEGIN
  INSERT INTO dao_xp_account (uid) VALUES (p_uid) ON CONFLICT (uid) DO NOTHING;
  SELECT * INTO acct FROM dao_xp_account WHERE uid = p_uid;
  RETURN to_jsonb(acct);
END;
$$;

CREATE FUNCTION dao_xp_apply_credit(
  p_uid TEXT,
  p_amount BIGINT,
  p_key TEXT,
  p_source TEXT,
  p_description TEXT,
  p_metadata JSONB
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  acct dao_xp_account;
  txn dao_xp_transaction;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'dao_xp_validation: DAO XP amount must be a positive whole number.';
  END IF;
  IF p_source IS NULL OR p_source NOT IN ('achievement', 'creation', 'fate-survival-relic', 'opening-balance') THEN
    RAISE EXCEPTION 'dao_xp_validation: DAO XP cannot be credited by "%".', p_source;
  END IF;
  PERFORM dao_xp_ensure_account(p_uid);
  SELECT * INTO acct FROM dao_xp_account WHERE uid = p_uid FOR UPDATE;
  SELECT * INTO txn FROM dao_xp_transaction WHERE uid = p_uid AND idempotency_key = p_key;
  IF FOUND THEN
    IF txn.amount <> p_amount OR txn.source <> p_source THEN
      RAISE EXCEPTION 'dao_xp_conflict: Idempotency key % already credited % DAO XP from %.', p_key, txn.amount, txn.source;
    END IF;
    RETURN jsonb_build_object('replayed', TRUE, 'account', to_jsonb(acct), 'transaction', to_jsonb(txn));
  END IF;
  UPDATE dao_xp_account
    SET balance = balance + p_amount, updated_at = CURRENT_TIMESTAMP
    WHERE uid = p_uid
    RETURNING * INTO acct;
  INSERT INTO dao_xp_transaction (uid, kind, amount, source, idempotency_key, description, balance_after, metadata)
    VALUES (p_uid, 'credit', p_amount, p_source, p_key, p_description, acct.balance, COALESCE(p_metadata, '{}'::jsonb))
    RETURNING * INTO txn;
  RETURN jsonb_build_object('replayed', FALSE, 'account', to_jsonb(acct), 'transaction', to_jsonb(txn));
END;
$$;

COMMIT;
