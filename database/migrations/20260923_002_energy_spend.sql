-- Direct Energy spend for Celestial Store offers.
--
-- Requires 20260918_001_energy_ledger.sql. The Celestial Store is one
-- storefront with QI-priced and Energy-priced offers; an Energy-priced
-- purchase debits settled Energy directly. Generation never uses this path:
-- it keeps reserving first and charging only after a result is stored.
--
-- `energy_apply_spend` locks the account row, refuses a repeated key that
-- describes a different movement, never touches Energy held for in-flight
-- generation (it spends only `balance - held`), and writes the movement and
-- its history line together.
--
-- This development migration is not applied to any production database by
-- this repository; a production host owns applying and backfilling its schema.

BEGIN;

ALTER TABLE energy_transaction DROP CONSTRAINT IF EXISTS energy_transaction_kind_check;
ALTER TABLE energy_transaction
  ADD CONSTRAINT energy_transaction_kind_check CHECK (kind IN ('grant', 'reserve', 'charge', 'release', 'spend'));

CREATE FUNCTION energy_apply_spend(
  p_uid TEXT,
  p_amount BIGINT,
  p_key TEXT,
  p_description TEXT,
  p_metadata JSONB
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  acct energy_account;
  txn energy_transaction;
  available BIGINT;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'energy_validation: Energy amount must be a positive whole number.';
  END IF;
  PERFORM energy_ensure_account(p_uid);
  SELECT * INTO acct FROM energy_account WHERE uid = p_uid FOR UPDATE;
  SELECT * INTO txn FROM energy_transaction WHERE uid = p_uid AND idempotency_key = p_key;
  IF FOUND THEN
    IF txn.kind <> 'spend' OR txn.amount <> p_amount THEN
      RAISE EXCEPTION 'energy_conflict: Idempotency key % already recorded a % Energy %.', p_key, txn.amount, txn.kind;
    END IF;
    RETURN jsonb_build_object('replayed', TRUE, 'account', to_jsonb(acct), 'transaction', to_jsonb(txn));
  END IF;
  available := acct.balance - acct.held;
  IF p_amount > available THEN
    RAISE EXCEPTION 'energy_insufficient: This needs % Energy and % is available.', p_amount, available
      USING DETAIL = format('required=%s available=%s', p_amount, available);
  END IF;
  UPDATE energy_account
    SET balance = balance - p_amount, updated_at = CURRENT_TIMESTAMP
    WHERE uid = p_uid
    RETURNING * INTO acct;
  INSERT INTO energy_transaction
    (uid, kind, amount, action_id, reservation_id, idempotency_key, description, balance_after, held_after, metadata)
  VALUES
    (p_uid, 'spend', p_amount, NULL, NULL, p_key, p_description, acct.balance, acct.held, COALESCE(p_metadata, '{}'::jsonb))
  RETURNING * INTO txn;
  RETURN jsonb_build_object('replayed', FALSE, 'account', to_jsonb(acct), 'transaction', to_jsonb(txn));
END;
$$;

COMMIT;
