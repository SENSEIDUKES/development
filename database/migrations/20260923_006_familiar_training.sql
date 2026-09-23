-- Familiar ownership, QI training, and cosmetic selections.
--
-- Requires 20260923_001_qi_spend.sql and 20260923_002_energy_spend.sql. The
-- durable reference implementation of the `FamiliarRepository` boundary in
-- `src/server/familiars`. It assumes the host supplies a `user_account` table
-- keyed by uid.
--
-- A Familiar is owned once it is bought in the Celestial Store (or granted to
-- a development account); the default Familiar comes with every account and
-- has no ownership row. Offering QI trains one owned Familiar. Training tiers
-- unlock alternate forms and cosmetic effects such as the elemental title —
-- never a boost, multiplier, discount, or other advantage. The ladder itself
-- (tier costs and unlocks) is Library code, so the database stores only the
-- QI each Familiar has been offered and derives nothing from it.
--
-- `familiar_apply_offer` and `familiar_apply_purchase` lock the account row
-- and move QI (or Energy) through the ledger functions in the same
-- transaction as the training or ownership change, so a spend can never land
-- without what it paid for. The caller resolves today's Store price and the
-- training cap from Library code before calling.
--
-- This development migration is not applied to any production database by
-- this repository; a production host owns applying and backfilling its schema.

BEGIN;

CREATE TABLE familiar_account (
  uid TEXT PRIMARY KEY REFERENCES user_account(uid) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE familiar_ownership (
  uid TEXT NOT NULL REFERENCES familiar_account(uid) ON DELETE CASCADE,
  familiar_id TEXT NOT NULL CHECK (familiar_id ~ '^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$'),
  acquired_via TEXT NOT NULL CHECK (acquired_via IN ('purchase', 'development')),
  -- The purchase key or development grant that acquired it.
  source_key TEXT NOT NULL CHECK (length(source_key) BETWEEN 1 AND 240),
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (uid, familiar_id),
  CONSTRAINT familiar_ownership_one_per_source UNIQUE (uid, source_key)
);

CREATE TABLE familiar_training (
  uid TEXT NOT NULL REFERENCES familiar_account(uid) ON DELETE CASCADE,
  familiar_id TEXT NOT NULL CHECK (familiar_id ~ '^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$'),
  qi_offered BIGINT NOT NULL DEFAULT 0 CHECK (qi_offered >= 0),
  -- The chosen look; the service accepts only unlocked choices and drops any
  -- a later ladder change no longer unlocks.
  form_id TEXT CHECK (form_id IS NULL OR length(form_id) BETWEEN 1 AND 120),
  effect_id TEXT CHECK (effect_id IS NULL OR length(effect_id) BETWEEN 1 AND 120),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (uid, familiar_id)
);

CREATE TABLE familiar_offer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid TEXT NOT NULL REFERENCES familiar_account(uid) ON DELETE CASCADE,
  familiar_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL CHECK (length(idempotency_key) BETWEEN 1 AND 200),
  requested BIGINT NOT NULL CHECK (requested > 0),
  spent BIGINT NOT NULL CHECK (spent > 0 AND spent <= requested),
  qi_before BIGINT NOT NULL CHECK (qi_before >= 0),
  qi_after BIGINT NOT NULL,
  qi_transaction_id UUID NOT NULL REFERENCES qi_transaction(id),
  offered_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT familiar_offer_totals CHECK (qi_after = qi_before + spent),
  CONSTRAINT familiar_offer_one_per_key UNIQUE (uid, idempotency_key)
);

CREATE INDEX familiar_offer_uid_familiar_idx ON familiar_offer (uid, familiar_id, offered_at DESC);

CREATE FUNCTION familiar_ensure_account(p_uid TEXT) RETURNS VOID
LANGUAGE sql
AS $$
  INSERT INTO familiar_account (uid) VALUES (p_uid) ON CONFLICT (uid) DO NOTHING;
$$;

-- Trains one Familiar. Spends LEAST(requested, p_max_qi - offered so far) QI
-- through `qi_apply_spend` (key `familiar-training:<key>`), then records the
-- offering and the new total. A repeated key returns the stored offering; a
-- repeated key that describes a different offering raises `familiar_conflict`.
-- A fully trained Familiar returns outcome 'fully-trained' and spends nothing.
CREATE FUNCTION familiar_apply_offer(
  p_uid TEXT,
  p_familiar_id TEXT,
  p_included BOOLEAN, -- true for the default Familiar every account has
  p_amount BIGINT,
  p_max_qi BIGINT,
  p_key TEXT,
  p_description TEXT
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  offer familiar_offer;
  offered BIGINT;
  spend BIGINT;
  ledger JSONB;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'familiar_validation: Offer a positive whole amount of QI.';
  END IF;
  PERFORM familiar_ensure_account(p_uid);
  PERFORM 1 FROM familiar_account WHERE uid = p_uid FOR UPDATE;
  SELECT * INTO offer FROM familiar_offer WHERE uid = p_uid AND idempotency_key = p_key;
  IF FOUND THEN
    IF offer.familiar_id <> p_familiar_id OR offer.requested <> p_amount THEN
      RAISE EXCEPTION 'familiar_conflict: That offering key was already used for a different offering.';
    END IF;
    RETURN jsonb_build_object('outcome', 'replayed', 'offer', to_jsonb(offer));
  END IF;
  IF NOT p_included AND NOT EXISTS (
    SELECT 1 FROM familiar_ownership WHERE uid = p_uid AND familiar_id = p_familiar_id
  ) THEN
    RAISE EXCEPTION 'familiar_conflict: Bring this Familiar home before training it.';
  END IF;
  INSERT INTO familiar_training (uid, familiar_id) VALUES (p_uid, p_familiar_id)
    ON CONFLICT (uid, familiar_id) DO NOTHING;
  SELECT qi_offered INTO offered FROM familiar_training WHERE uid = p_uid AND familiar_id = p_familiar_id;
  IF offered >= p_max_qi THEN
    RETURN jsonb_build_object('outcome', 'fully-trained', 'qi_offered', offered);
  END IF;
  spend := LEAST(p_amount, p_max_qi - offered);
  ledger := qi_apply_spend(
    p_uid, spend, 'familiar-training:' || p_key, 'familiar-training', p_description,
    jsonb_build_object('familiarId', p_familiar_id)
  );
  UPDATE familiar_training
    SET qi_offered = offered + spend, updated_at = CURRENT_TIMESTAMP
    WHERE uid = p_uid AND familiar_id = p_familiar_id;
  INSERT INTO familiar_offer (uid, familiar_id, idempotency_key, requested, spent, qi_before, qi_after, qi_transaction_id)
    VALUES (p_uid, p_familiar_id, p_key, p_amount, spend, offered, offered + spend, (ledger -> 'transaction' ->> 'id')::UUID)
    RETURNING * INTO offer;
  RETURN jsonb_build_object('outcome', 'trained', 'offer', to_jsonb(offer));
END;
$$;

-- Buys one Familiar at the price the caller resolved from today's Celestial
-- Store rotation. Debits QI or settled Energy with key `p_key:<familiar id>`,
-- then grants ownership under `p_key`. A repeated key returns 'purchased'
-- without charging again; a key that already bought a different Familiar
-- raises `familiar_conflict`; a Familiar already owned another way returns
-- 'already-owned' and charges nothing.
CREATE FUNCTION familiar_apply_purchase(
  p_uid TEXT,
  p_familiar_id TEXT,
  p_currency TEXT,
  p_price BIGINT,
  p_key TEXT,
  p_description TEXT
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  ownership familiar_ownership;
BEGIN
  IF p_currency NOT IN ('qi', 'energy') THEN
    RAISE EXCEPTION 'familiar_validation: The Store sells for QI or Energy.';
  END IF;
  PERFORM familiar_ensure_account(p_uid);
  PERFORM 1 FROM familiar_account WHERE uid = p_uid FOR UPDATE;
  -- One purchase key buys one Familiar: a key that already bought another
  -- Familiar is refused, never read as a replay.
  SELECT * INTO ownership FROM familiar_ownership WHERE uid = p_uid AND source_key = p_key;
  IF FOUND AND ownership.familiar_id <> p_familiar_id THEN
    RAISE EXCEPTION 'familiar_conflict: That purchase key was already used for a different Familiar.';
  END IF;
  SELECT * INTO ownership FROM familiar_ownership WHERE uid = p_uid AND familiar_id = p_familiar_id;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'outcome', CASE WHEN ownership.source_key = p_key THEN 'purchased' ELSE 'already-owned' END,
      'ownership', to_jsonb(ownership)
    );
  END IF;
  -- The ledger key names the Familiar too, so a reused purchase key can never
  -- replay the payment another Familiar was bought with.
  IF p_currency = 'qi' THEN
    PERFORM qi_apply_spend(p_uid, p_price, p_key || ':' || p_familiar_id, 'celestial-store', p_description,
      jsonb_build_object('familiarId', p_familiar_id));
  ELSE
    PERFORM energy_apply_spend(p_uid, p_price, p_key || ':' || p_familiar_id, p_description,
      jsonb_build_object('source', 'celestial-store', 'familiarId', p_familiar_id));
  END IF;
  INSERT INTO familiar_ownership (uid, familiar_id, acquired_via, source_key)
    VALUES (p_uid, p_familiar_id, 'purchase', p_key)
    RETURNING * INTO ownership;
  RETURN jsonb_build_object('outcome', 'purchased', 'ownership', to_jsonb(ownership));
END;
$$;

COMMIT;
