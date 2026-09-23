-- Spendable QI.
--
-- Requires 20260918_002_qi_ledger.sql. QI is Library's spendable currency:
-- Familiar training and QI-priced Celestial Store offers spend it; the Dao
-- Pillar, opened Mystery Scrolls and development grants deposit it. QI is never
-- rank progression — permanent DAO XP has its own credit-only ledger.
--
-- `qi_apply_spend` is the one debit path. Like `qi_apply_deposit` it locks the
-- account row, replays a repeated key without moving anything, and writes the
-- movement and its history line together; it refuses to overdraw. Both
-- functions now also refuse a replayed key that describes a different movement
-- (`qi_conflict`), so a caller's key-generation bug surfaces instead of
-- silently returning an unrelated line.
--
-- This development migration is not applied to any production database by
-- this repository; a production host owns applying and backfilling its schema.

BEGIN;

ALTER TABLE qi_transaction DROP CONSTRAINT IF EXISTS qi_transaction_kind_check;
ALTER TABLE qi_transaction
  ADD CONSTRAINT qi_transaction_kind_check CHECK (kind IN ('deposit', 'spend'));

CREATE OR REPLACE FUNCTION qi_apply_deposit(
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
    IF txn.kind <> 'deposit' OR txn.amount <> p_amount THEN
      RAISE EXCEPTION 'qi_conflict: Idempotency key % already recorded a % QI %.', p_key, txn.amount, txn.kind;
    END IF;
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

CREATE FUNCTION qi_apply_spend(
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
    IF txn.kind <> 'spend' OR txn.amount <> p_amount THEN
      RAISE EXCEPTION 'qi_conflict: Idempotency key % already recorded a % QI %.', p_key, txn.amount, txn.kind;
    END IF;
    RETURN jsonb_build_object('replayed', TRUE, 'account', to_jsonb(acct), 'transaction', to_jsonb(txn));
  END IF;
  IF p_amount > acct.balance THEN
    RAISE EXCEPTION 'qi_insufficient: This needs % QI and % is available.', p_amount, acct.balance
      USING DETAIL = format('required=%s available=%s', p_amount, acct.balance);
  END IF;
  UPDATE qi_account
    SET balance = balance - p_amount, updated_at = CURRENT_TIMESTAMP
    WHERE uid = p_uid
    RETURNING * INTO acct;
  INSERT INTO qi_transaction (uid, kind, amount, source, idempotency_key, description, balance_after, metadata)
    VALUES (p_uid, 'spend', p_amount, p_source, p_key, p_description, acct.balance, COALESCE(p_metadata, '{}'::jsonb))
    RETURNING * INTO txn;
  RETURN jsonb_build_object('replayed', FALSE, 'account', to_jsonb(acct), 'transaction', to_jsonb(txn));
END;
$$;

COMMIT;
