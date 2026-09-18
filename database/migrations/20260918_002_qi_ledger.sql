-- Qi deposit ledger.
--
-- The durable reference implementation of the `QiLedger` boundary in
-- `src/server/qi`. It assumes the host supplies a `user_account` table keyed
-- by uid, like the Energy ledger before it.
--
-- Qi is Library's cultivation currency. In production today the balance is a
-- pair of columns on the cultivator profile (daoXp / heavenlyQi) that the
-- browser moves through `awardDirectQi`; nothing records *why* a balance
-- changed and nothing stops a retried award from landing twice. This ledger is
-- the server-side owner every reward system in this repository deposits
-- through: one row per deposit, one deposit per idempotency key, and the
-- balance only ever moved by `qi_apply_deposit`, which locks the account row
-- and writes the movement and its history line together.
--
-- Which store finally runs this is decided during production-repository
-- reconstruction; it is not applied to any production database by this change.

BEGIN;

CREATE TABLE qi_account (
  uid TEXT PRIMARY KEY REFERENCES user_account(uid) ON DELETE CASCADE,
  balance BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE qi_transaction (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence BIGINT GENERATED ALWAYS AS IDENTITY,
  uid TEXT NOT NULL REFERENCES qi_account(uid) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('deposit')),
  amount BIGINT NOT NULL CHECK (amount > 0),
  -- Which system deposited: 'dao-pillar', later 'offering', 'relic', ...
  source TEXT NOT NULL CHECK (length(btrim(source)) BETWEEN 1 AND 64),
  idempotency_key TEXT NOT NULL CHECK (length(idempotency_key) BETWEEN 1 AND 220),
  description TEXT NOT NULL CHECK (length(btrim(description)) > 0),
  balance_after BIGINT NOT NULL CHECK (balance_after >= 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- The race-safe rule: one ledger line per idempotency key per account.
  CONSTRAINT qi_transaction_one_per_key UNIQUE (uid, idempotency_key)
);

CREATE INDEX qi_transaction_uid_sequence_idx ON qi_transaction (uid, sequence DESC);

CREATE FUNCTION qi_ensure_account(p_uid TEXT) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  acct qi_account;
BEGIN
  INSERT INTO qi_account (uid) VALUES (p_uid) ON CONFLICT (uid) DO NOTHING;
  SELECT * INTO acct FROM qi_account WHERE uid = p_uid;
  RETURN to_jsonb(acct);
END;
$$;

-- Deposits `p_amount` Qi once per (uid, key). Locks the account row so
-- concurrent deposits for one cultivator serialize; a repeated key returns the
-- original line with replayed = true and moves nothing.
CREATE FUNCTION qi_apply_deposit(
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
  acct qi_account;
  txn qi_transaction;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'qi_validation: Qi amount must be a positive whole number.';
  END IF;
  PERFORM qi_ensure_account(p_uid);
  SELECT * INTO acct FROM qi_account WHERE uid = p_uid FOR UPDATE;
  SELECT * INTO txn FROM qi_transaction WHERE uid = p_uid AND idempotency_key = p_key;
  IF FOUND THEN
    RETURN jsonb_build_object('replayed', TRUE, 'account', to_jsonb(acct), 'transaction', to_jsonb(txn));
  END IF;
  UPDATE qi_account
    SET balance = balance + p_amount, updated_at = CURRENT_TIMESTAMP
    WHERE uid = p_uid
    RETURNING * INTO acct;
  INSERT INTO qi_transaction (uid, kind, amount, source, idempotency_key, description, balance_after, metadata)
    VALUES (p_uid, 'deposit', p_amount, p_source, p_key, p_description, acct.balance, COALESCE(p_metadata, '{}'::jsonb))
    RETURNING * INTO txn;
  RETURN jsonb_build_object('replayed', FALSE, 'account', to_jsonb(acct), 'transaction', to_jsonb(txn));
END;
$$;

COMMIT;
