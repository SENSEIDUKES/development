-- Energy ledger foundation.
--
-- The current durable reference implementation of the `EnergyRepository`
-- boundary. It assumes the host supplies a `user_account` table keyed by uid.
-- Which repository and which store finally run this is decided during
-- production-repository reconstruction; it is not applied to any production
-- database by this change.
--
-- Energy is the meter every SEN generation feature will draw from. The
-- database owns the truth: balances only move through the ledger functions
-- below, each of which locks the account row, applies the movement and its
-- transaction line together, and honours idempotency keys so a retry, a
-- duplicate request or a double-click can never charge twice.
--
-- `src/server/energy/postgresEnergyRepository.ts` is the thin adapter over
-- these functions; `inMemoryEnergyRepository.ts` mirrors the same rules for
-- tests and the Workshop dev server.

BEGIN;

CREATE TABLE energy_account (
  uid TEXT PRIMARY KEY REFERENCES user_account(uid) ON DELETE CASCADE,
  -- Settled Energy the account owns.
  balance BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0),
  -- Energy reserved for in-flight generation, not yet charged or released.
  held BIGINT NOT NULL DEFAULT 0 CHECK (held >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT energy_account_held_within_balance CHECK (held <= balance)
);

CREATE TABLE energy_reservation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid TEXT NOT NULL REFERENCES energy_account(uid) ON DELETE CASCADE,
  -- Permanent action identifiers; see src/components/energy/shared/energyContracts.ts.
  action_id TEXT NOT NULL CHECK (action_id IN (
    'chapter.generate', 'image.generate', 'soundscape.generate', 'narration.generate', 'translation.generate'
  )),
  amount BIGINT NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'held' CHECK (status IN ('held', 'settled', 'released')),
  idempotency_key TEXT NOT NULL CHECK (length(idempotency_key) BETWEEN 1 AND 200),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  settled_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  -- One reservation per user intent. A retry with the same key finds this row.
  CONSTRAINT energy_reservation_one_per_key UNIQUE (uid, idempotency_key),
  CONSTRAINT energy_reservation_state_consistent CHECK (
    (status = 'settled') = (settled_at IS NOT NULL)
    AND (status = 'released') = (released_at IS NOT NULL)
  )
);

CREATE INDEX energy_reservation_uid_status_idx ON energy_reservation (uid, status);

CREATE TABLE energy_transaction (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Monotonic order for history; ids are random.
  sequence BIGINT GENERATED ALWAYS AS IDENTITY,
  uid TEXT NOT NULL REFERENCES energy_account(uid) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('grant', 'reserve', 'charge', 'release')),
  amount BIGINT NOT NULL CHECK (amount > 0),
  action_id TEXT,
  reservation_id UUID REFERENCES energy_reservation(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL CHECK (length(idempotency_key) BETWEEN 1 AND 220),
  description TEXT NOT NULL CHECK (length(btrim(description)) > 0),
  balance_after BIGINT NOT NULL CHECK (balance_after >= 0),
  held_after BIGINT NOT NULL CHECK (held_after >= 0),
  -- Internal only (provider cost, story ids). Never returned to a browser.
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- The final race-safe rule: one ledger line per idempotency key per account.
  CONSTRAINT energy_transaction_one_per_key UNIQUE (uid, idempotency_key)
);

CREATE INDEX energy_transaction_uid_sequence_idx ON energy_transaction (uid, sequence DESC);

CREATE FUNCTION energy_ensure_account(p_uid TEXT) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  acct energy_account;
BEGIN
  INSERT INTO energy_account (uid) VALUES (p_uid) ON CONFLICT (uid) DO NOTHING;
  SELECT * INTO acct FROM energy_account WHERE uid = p_uid;
  RETURN to_jsonb(acct);
END;
$$;

CREATE FUNCTION energy_apply_grant(
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
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'energy_validation: Energy amount must be a positive whole number.';
  END IF;
  PERFORM energy_ensure_account(p_uid);
  SELECT * INTO acct FROM energy_account WHERE uid = p_uid FOR UPDATE;
  SELECT * INTO txn FROM energy_transaction WHERE uid = p_uid AND idempotency_key = p_key;
  IF FOUND THEN
    RETURN jsonb_build_object('replayed', TRUE, 'account', to_jsonb(acct), 'transaction', to_jsonb(txn));
  END IF;
  UPDATE energy_account
    SET balance = balance + p_amount, updated_at = CURRENT_TIMESTAMP
    WHERE uid = p_uid
    RETURNING * INTO acct;
  INSERT INTO energy_transaction
    (uid, kind, amount, action_id, reservation_id, idempotency_key, description, balance_after, held_after, metadata)
  VALUES
    (p_uid, 'grant', p_amount, NULL, NULL, p_key, p_description, acct.balance, acct.held, COALESCE(p_metadata, '{}'::jsonb))
  RETURNING * INTO txn;
  RETURN jsonb_build_object('replayed', FALSE, 'account', to_jsonb(acct), 'transaction', to_jsonb(txn));
END;
$$;

CREATE FUNCTION energy_create_reservation(
  p_uid TEXT,
  p_action_id TEXT,
  p_amount BIGINT,
  p_key TEXT,
  p_description TEXT,
  p_metadata JSONB
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  acct energy_account;
  res energy_reservation;
  txn energy_transaction;
  available BIGINT;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'energy_validation: Energy amount must be a positive whole number.';
  END IF;
  PERFORM energy_ensure_account(p_uid);
  SELECT * INTO acct FROM energy_account WHERE uid = p_uid FOR UPDATE;
  SELECT * INTO res FROM energy_reservation WHERE uid = p_uid AND idempotency_key = p_key;
  IF FOUND THEN
    SELECT * INTO txn FROM energy_transaction WHERE uid = p_uid AND idempotency_key = 'reserve:' || p_key;
    RETURN jsonb_build_object('replayed', TRUE, 'account', to_jsonb(acct), 'reservation', to_jsonb(res), 'transaction', to_jsonb(txn));
  END IF;
  available := acct.balance - acct.held;
  IF p_amount > available THEN
    RAISE EXCEPTION 'energy_insufficient: This needs % Energy and % is available.', p_amount, available
      USING DETAIL = format('required=%s available=%s', p_amount, available);
  END IF;
  INSERT INTO energy_reservation (uid, action_id, amount, status, idempotency_key, metadata)
    VALUES (p_uid, p_action_id, p_amount, 'held', p_key, COALESCE(p_metadata, '{}'::jsonb))
    RETURNING * INTO res;
  UPDATE energy_account
    SET held = held + p_amount, updated_at = CURRENT_TIMESTAMP
    WHERE uid = p_uid
    RETURNING * INTO acct;
  INSERT INTO energy_transaction
    (uid, kind, amount, action_id, reservation_id, idempotency_key, description, balance_after, held_after, metadata)
  VALUES
    (p_uid, 'reserve', p_amount, p_action_id, res.id, 'reserve:' || p_key, p_description, acct.balance, acct.held, COALESCE(p_metadata, '{}'::jsonb))
  RETURNING * INTO txn;
  RETURN jsonb_build_object('replayed', FALSE, 'account', to_jsonb(acct), 'reservation', to_jsonb(res), 'transaction', to_jsonb(txn));
END;
$$;

CREATE FUNCTION energy_settle_reservation(
  p_uid TEXT,
  p_reservation_id UUID,
  p_description TEXT,
  p_metadata JSONB
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  acct energy_account;
  res energy_reservation;
  txn energy_transaction;
BEGIN
  SELECT * INTO acct FROM energy_account WHERE uid = p_uid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'energy_not_found: Energy reservation % was not found.', p_reservation_id;
  END IF;
  SELECT * INTO res FROM energy_reservation WHERE id = p_reservation_id AND uid = p_uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'energy_not_found: Energy reservation % was not found.', p_reservation_id;
  END IF;
  IF res.status = 'settled' THEN
    SELECT * INTO txn FROM energy_transaction WHERE uid = p_uid AND idempotency_key = 'charge:' || res.id::text;
    RETURN jsonb_build_object('replayed', TRUE, 'account', to_jsonb(acct), 'reservation', to_jsonb(res), 'transaction', to_jsonb(txn));
  END IF;
  IF res.status = 'released' THEN
    RAISE EXCEPTION 'energy_conflict: Energy reservation % was already released and cannot be charged.', res.id;
  END IF;
  UPDATE energy_reservation
    SET status = 'settled', settled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = res.id
    RETURNING * INTO res;
  UPDATE energy_account
    SET balance = balance - res.amount, held = held - res.amount, updated_at = CURRENT_TIMESTAMP
    WHERE uid = p_uid
    RETURNING * INTO acct;
  INSERT INTO energy_transaction
    (uid, kind, amount, action_id, reservation_id, idempotency_key, description, balance_after, held_after, metadata)
  VALUES
    (p_uid, 'charge', res.amount, res.action_id, res.id, 'charge:' || res.id::text, p_description, acct.balance, acct.held, COALESCE(p_metadata, '{}'::jsonb))
  RETURNING * INTO txn;
  RETURN jsonb_build_object('replayed', FALSE, 'account', to_jsonb(acct), 'reservation', to_jsonb(res), 'transaction', to_jsonb(txn));
END;
$$;

CREATE FUNCTION energy_release_reservation(
  p_uid TEXT,
  p_reservation_id UUID,
  p_description TEXT,
  p_metadata JSONB
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  acct energy_account;
  res energy_reservation;
  txn energy_transaction;
BEGIN
  SELECT * INTO acct FROM energy_account WHERE uid = p_uid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'energy_not_found: Energy reservation % was not found.', p_reservation_id;
  END IF;
  SELECT * INTO res FROM energy_reservation WHERE id = p_reservation_id AND uid = p_uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'energy_not_found: Energy reservation % was not found.', p_reservation_id;
  END IF;
  IF res.status = 'released' THEN
    SELECT * INTO txn FROM energy_transaction WHERE uid = p_uid AND idempotency_key = 'release:' || res.id::text;
    RETURN jsonb_build_object('replayed', TRUE, 'account', to_jsonb(acct), 'reservation', to_jsonb(res), 'transaction', to_jsonb(txn));
  END IF;
  IF res.status = 'settled' THEN
    RAISE EXCEPTION 'energy_conflict: Energy reservation % was already charged and cannot be released.', res.id;
  END IF;
  UPDATE energy_reservation
    SET status = 'released', released_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = res.id
    RETURNING * INTO res;
  UPDATE energy_account
    SET held = held - res.amount, updated_at = CURRENT_TIMESTAMP
    WHERE uid = p_uid
    RETURNING * INTO acct;
  INSERT INTO energy_transaction
    (uid, kind, amount, action_id, reservation_id, idempotency_key, description, balance_after, held_after, metadata)
  VALUES
    (p_uid, 'release', res.amount, res.action_id, res.id, 'release:' || res.id::text, p_description, acct.balance, acct.held, COALESCE(p_metadata, '{}'::jsonb))
  RETURNING * INTO txn;
  RETURN jsonb_build_object('replayed', FALSE, 'account', to_jsonb(acct), 'reservation', to_jsonb(res), 'transaction', to_jsonb(txn));
END;
$$;

-- Development only. Removes the account, its reservations and its history so
-- the next read starts the account over.
CREATE FUNCTION energy_reset_account(p_uid TEXT) RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM energy_account WHERE uid = p_uid;
END;
$$;

COMMIT;
