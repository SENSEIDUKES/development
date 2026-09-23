-- Familiar Bond Rank, element mastery, and the Active Elemental Effect.
--
-- Requires 20260923_006_familiar_training.sql. Brings the Familiar schema in
-- line with the bond model in `src/server/familiars`:
--
-- - Familiar rarity is catalogue content and is not stored here. Bond Rank is
--   derived from `familiar_training.qi_offered` by the Library ladder
--   (Common, Rare, Epic, Legendary), so the database stores only QI.
-- - Reaching Legendary bond masters the Familiar's element. Mastery is
--   permanent and one row per element: the first Familiar to reach Legendary
--   bond in an element masters it, recorded in the same transaction as the
--   offering that reached it.
-- - The Active Elemental Effect is one account-level choice: follow the
--   Active Familiar's bond effect or signature, wear a mastered element, or
--   none. A mastered choice must name an element the account has mastered.
--   The Active Familiar itself stays host profile state.
-- - Per-Familiar effect choices are retired: a Familiar's name effect follows
--   its Bond Rank, and a companion keeps only its chosen form.
--
-- Signatures (custom animation SEIHouse writes for one Familiar) are code,
-- not rows, and never enter the mastery collection.
--
-- This development migration is not applied to any production database by
-- this repository; a production host owns applying and backfilling its schema.

BEGIN;

ALTER TABLE familiar_training DROP COLUMN effect_id;

CREATE TABLE familiar_elemental_mastery (
  uid TEXT NOT NULL REFERENCES familiar_account(uid) ON DELETE CASCADE,
  element TEXT NOT NULL CHECK (element IN ('fire', 'lightning', 'frost', 'celestial', 'void')),
  -- The Familiar whose Legendary bond mastered the element, and the offering that reached it.
  familiar_id TEXT NOT NULL,
  offer_id UUID NOT NULL REFERENCES familiar_offer(id),
  mastered_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (uid, element)
);

ALTER TABLE familiar_account
  ADD COLUMN active_effect_source TEXT NOT NULL DEFAULT 'bond'
    CHECK (active_effect_source IN ('bond', 'signature', 'mastered', 'none')),
  ADD COLUMN active_effect_element TEXT,
  ADD CONSTRAINT familiar_account_active_effect_element
    CHECK ((active_effect_source = 'mastered') = (active_effect_element IS NOT NULL)),
  -- A mastered choice must be an element this account has mastered.
  ADD CONSTRAINT familiar_account_active_effect_mastered
    FOREIGN KEY (uid, active_effect_element) REFERENCES familiar_elemental_mastery(uid, element);

DROP FUNCTION familiar_apply_offer(TEXT, TEXT, BOOLEAN, BIGINT, BIGINT, TEXT, TEXT);

-- Cultivates one Familiar's bond. Spends LEAST(requested, p_max_qi - offered
-- so far) QI through `qi_apply_spend` (key `familiar-training:<key>`), then
-- records the offering and the new total. `p_max_qi` is the Legendary bond
-- threshold: an offering that reaches it masters `p_element`, unless the
-- account already mastered that element. A repeated key returns the stored
-- offering; a repeated key that describes a different offering raises
-- `familiar_conflict`. A Familiar already at Legendary bond returns outcome
-- 'fully-bonded' and spends nothing.
CREATE FUNCTION familiar_apply_offer(
  p_uid TEXT,
  p_familiar_id TEXT,
  p_element TEXT,
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
  mastery familiar_elemental_mastery;
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
    SELECT * INTO mastery FROM familiar_elemental_mastery WHERE uid = p_uid AND offer_id = offer.id;
    RETURN jsonb_build_object('outcome', 'replayed', 'offer', to_jsonb(offer),
      'mastery', CASE WHEN mastery.uid IS NULL THEN NULL ELSE to_jsonb(mastery) END);
  END IF;
  IF NOT p_included AND NOT EXISTS (
    SELECT 1 FROM familiar_ownership WHERE uid = p_uid AND familiar_id = p_familiar_id
  ) THEN
    RAISE EXCEPTION 'familiar_conflict: Bring this Familiar home before cultivating its bond.';
  END IF;
  INSERT INTO familiar_training (uid, familiar_id) VALUES (p_uid, p_familiar_id)
    ON CONFLICT (uid, familiar_id) DO NOTHING;
  SELECT qi_offered INTO offered FROM familiar_training WHERE uid = p_uid AND familiar_id = p_familiar_id;
  IF offered >= p_max_qi THEN
    RETURN jsonb_build_object('outcome', 'fully-bonded', 'qi_offered', offered);
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
  IF offer.qi_after >= p_max_qi THEN
    INSERT INTO familiar_elemental_mastery (uid, element, familiar_id, offer_id)
      VALUES (p_uid, p_element, p_familiar_id, offer.id)
      ON CONFLICT (uid, element) DO NOTHING
      RETURNING * INTO mastery;
  END IF;
  RETURN jsonb_build_object('outcome', 'trained', 'offer', to_jsonb(offer),
    'mastery', CASE WHEN mastery.uid IS NULL THEN NULL ELSE to_jsonb(mastery) END);
END;
$$;

COMMIT;
