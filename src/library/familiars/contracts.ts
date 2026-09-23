/**
 * Familiar training and cosmetic-effect contracts shared by the server-owned
 * Familiar account and every Library surface.
 *
 * Familiars own the active-effect mechanic. A cultivator trains one Familiar
 * at a time by offering it QI; accumulated QI raises that Familiar's tier,
 * and tiers unlock alternate forms and cosmetic effects such as a
 * `LibraryElementalTitle` treatment on the cultivator's name. The equipped
 * Familiar's selected effect is the cultivator's one active effect.
 *
 * Every effect is cosmetic. None carries a boost, multiplier, discount,
 * rarity advantage, or gameplay benefit — the shapes below have no field
 * that could express one, and the server validates its catalogue against
 * that rule at load.
 */

/** The `LibraryElementalTitle` elements a Familiar can lend (never `none`). */
export const FAMILIAR_ELEMENTS = ['fire', 'lightning', 'frost', 'celestial', 'void'] as const;
export type FamiliarElement = (typeof FAMILIAR_ELEMENTS)[number];
export type FamiliarEffectIntensity = 'subtle' | 'active' | 'legendary';

/** The cultivator's name lettered in the Familiar's element. Purely cosmetic. */
export interface FamiliarElementalTitleEffect {
  id: string;
  kind: 'elemental-title';
  label: string;
  element: FamiliarElement;
  intensity: FamiliarEffectIntensity;
}

/** Future cosmetic effect kinds join this union; each stays presentation-only. */
export type FamiliarCosmeticEffect = FamiliarElementalTitleEffect;

/**
 * An alternate appearance. Until dedicated form artwork is supplied, a form
 * is a presentation treatment over the Familiar's existing artwork.
 */
export interface FamiliarForm {
  id: string;
  label: string;
  description: string;
  treatment: { glow: string; saturate: number; brightness: number; hueRotate: number };
}

export type FamiliarUnlock =
  | { kind: 'form'; form: FamiliarForm }
  | { kind: 'effect'; effect: FamiliarCosmeticEffect };

export interface FamiliarTrainingTierView {
  tier: number;
  name: string;
  /** Total QI offered to this Familiar to reach the tier. */
  qiRequired: number;
  reached: boolean;
  unlocks: FamiliarUnlock[];
}

export interface FamiliarTrainingView {
  familiarId: string;
  owned: boolean;
  isDefault: boolean;
  element: FamiliarElement;
  /** Total QI this cultivator has offered to this Familiar. */
  qiOffered: number;
  tier: number;
  tierName: string;
  nextTier: { tier: number; name: string; qiRequired: number; qiRemaining: number } | null;
  tiers: FamiliarTrainingTierView[];
  unlockedForms: FamiliarForm[];
  unlockedEffects: FamiliarCosmeticEffect[];
  /** The form and effect the cultivator chose for this Familiar; null for none. */
  selection: { formId: string | null; effectId: string | null };
}

export interface FamiliarTrainingSnapshot {
  uid: string;
  /** Owned outright; the default Familiar is included implicitly. */
  ownedFamiliarIds: string[];
  familiars: FamiliarTrainingView[];
  updatedAt: string;
}

export interface OfferQiInput {
  familiarId: string;
  /** QI to offer. The server spends only what the next tiers still need. */
  amount: number;
  /** One offer per key: a retried offer never spends twice. */
  idempotencyKey: string;
}

export interface OfferQiResponse {
  outcome: 'trained' | 'replayed' | 'fully-trained';
  message: string;
  /** QI actually spent by this offer. */
  spent: number;
  tierBefore: number;
  tierAfter: number;
  /** What this offer unlocked, in tier order. */
  newUnlocks: FamiliarUnlock[];
  snapshot: FamiliarTrainingSnapshot;
}

export interface SelectFamiliarCosmeticsInput {
  familiarId: string;
  formId: string | null;
  effectId: string | null;
}

export interface PurchaseFamiliarInput {
  familiarId: string;
  currency: 'qi' | 'energy';
  /** The price the cultivator saw. The server refuses the purchase if today's price differs. */
  price: number;
  idempotencyKey: string;
}

export interface PurchaseFamiliarResponse {
  outcome: 'purchased' | 'already-owned';
  message: string;
  snapshot: FamiliarTrainingSnapshot;
}

export type FamiliarsHttpOperation =
  | ({ operation: 'offer-qi' } & OfferQiInput)
  | ({ operation: 'select-cosmetics' } & SelectFamiliarCosmeticsInput)
  | ({ operation: 'purchase' } & PurchaseFamiliarInput)
  | { operation: 'development.grant-familiar'; familiarId: string };

export interface FamiliarsHttpError {
  error: string;
  code: 'unauthenticated' | 'forbidden' | 'invalid_request' | 'insufficient' | 'conflict' | 'not_found' | 'method_not_allowed' | 'unavailable';
}

export const FAMILIARS_API_PATH = '/api/library-economy?capability=familiars';

/** One Familiar's training view, when the snapshot has it. */
export const familiarTraining = (snapshot: FamiliarTrainingSnapshot | null | undefined, familiarId: string | null | undefined): FamiliarTrainingView | null =>
  snapshot && familiarId ? snapshot.familiars.find(entry => entry.familiarId === familiarId) ?? null : null;

/**
 * The cultivator's active cosmetic effect: the equipped Familiar's selected
 * effect, and only while it is owned and the effect is unlocked.
 */
export function activeFamiliarEffect(snapshot: FamiliarTrainingSnapshot | null | undefined, equippedFamiliarId: string | null | undefined): FamiliarCosmeticEffect | null {
  const training = familiarTraining(snapshot, equippedFamiliarId);
  if (!training?.owned || !training.selection.effectId) return null;
  return training.unlockedEffects.find(effect => effect.id === training.selection.effectId) ?? null;
}

/** The selected, unlocked form of a Familiar, if any. */
export function activeFamiliarForm(snapshot: FamiliarTrainingSnapshot | null | undefined, familiarId: string | null | undefined): FamiliarForm | null {
  const training = familiarTraining(snapshot, familiarId);
  if (!training?.owned || !training.selection.formId) return null;
  return training.unlockedForms.find(form => form.id === training.selection.formId) ?? null;
}

/** The CSS filter that presents a form's treatment over the base artwork. */
export function familiarFormFilter(form: FamiliarForm | null | undefined): string | undefined {
  if (!form) return undefined;
  const { glow, saturate, brightness, hueRotate } = form.treatment;
  return `hue-rotate(${hueRotate}deg) saturate(${saturate}) brightness(${brightness}) drop-shadow(0 0 10px ${glow})`;
}
