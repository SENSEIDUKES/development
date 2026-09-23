/**
 * Familiar bond, mastery and name-effect contracts shared by the
 * server-owned Familiar account and every Library surface.
 *
 * Two scales describe a Familiar, and they never stand in for each other:
 *
 * - **Familiar rarity** (`FamiliarRarity`, from the host catalogue) says how
 *   rare the Familiar is. It is content and never changes per cultivator.
 * - **Bond Rank** (`FamiliarBondRank`) says how far this cultivator has
 *   cultivated this Familiar by offering it QI. An Epic familiar can reach a
 *   Legendary bond.
 *
 * Both use the words Common, Rare, Epic and Legendary, so every label names
 * its scale: "Epic familiar", "Legendary bond".
 *
 * Name effects come in two kinds:
 *
 * - **Elements** are shared instruments. Every Familiar channels one, and any
 *   cultivator can master any of them. Through Common, Rare and Epic bond the
 *   Familiar's elemental title grows stronger but shows only while that
 *   Familiar is the Active Familiar. At Legendary bond the cultivator masters
 *   the element: its effect joins the permanent collection and can be worn
 *   with any Familiar.
 * - **Signatures** are custom animation pieces SEIHouse writes in code for one
 *   specific Familiar. No setting produces one, and a signature never leaves
 *   its Familiar.
 *
 * The Active Familiar (which companion follows the cultivator) is host
 * profile state. The Active Elemental Effect (what letters the DAO name) is
 * the Familiar account's choice. Before an element is mastered the two are
 * coupled; mastery lets them separate.
 *
 * Every effect is cosmetic. None carries a boost, multiplier, discount,
 * rarity advantage, or gameplay benefit — the shapes below have no field
 * that could express one, and the server validates its content at load.
 */

/** The `LibraryElementalTitle` elements a Familiar can channel (never `none`). */
export const FAMILIAR_ELEMENTS = ['fire', 'lightning', 'frost', 'celestial', 'void'] as const;
export type FamiliarElement = (typeof FAMILIAR_ELEMENTS)[number];
export type FamiliarEffectIntensity = 'subtle' | 'active' | 'legendary';

export const FAMILIAR_ELEMENT_LABELS: Readonly<Record<FamiliarElement, string>> = {
  fire: 'Fire', lightning: 'Lightning', frost: 'Frost', celestial: 'Celestial', void: 'Void',
};

/** How far a cultivator has cultivated one Familiar. Not the Familiar's rarity. */
export const FAMILIAR_BOND_RANKS = ['common', 'rare', 'epic', 'legendary'] as const;
export type FamiliarBondRank = (typeof FAMILIAR_BOND_RANKS)[number];

const BOND_RANK_NAMES: Readonly<Record<FamiliarBondRank, string>> = {
  common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary',
};

/** "Legendary bond" — always name the scale, so it never reads as the Familiar's rarity. */
export const bondRankLabel = (rank: FamiliarBondRank) => `${BOND_RANK_NAMES[rank]} bond`;
export const bondRankIndex = (rank: FamiliarBondRank) => FAMILIAR_BOND_RANKS.indexOf(rank);

/**
 * The cultivator's name lettered in an element. `mastered` is false for the
 * bond effects a Familiar lends while it is active, and true for the effect
 * of an element the cultivator has mastered.
 */
export interface FamiliarElementalTitleEffect {
  id: string;
  kind: 'elemental-title';
  label: string;
  element: FamiliarElement;
  intensity: FamiliarEffectIntensity;
  mastered: boolean;
}

/**
 * A signature piece: custom animation SEIHouse wrote for one Familiar. The
 * contract carries only its identity; the animation itself is code, looked up
 * by `id` in the client's signature registry.
 */
export interface FamiliarSignatureEffect {
  id: string;
  kind: 'signature';
  label: string;
  familiarId: string;
}

export type FamiliarCosmeticEffect = FamiliarElementalTitleEffect | FamiliarSignatureEffect;

/**
 * An alternate appearance for the companion itself. Until dedicated form
 * artwork is supplied, a form is a presentation treatment over the
 * Familiar's existing artwork. Forms stay with their Familiar.
 */
export interface FamiliarForm {
  id: string;
  label: string;
  description: string;
  treatment: { glow: string; saturate: number; brightness: number; hueRotate: number };
}

export type FamiliarUnlock =
  /** The Familiar's elemental title at this bond rank, worn while it is active. */
  | { kind: 'bond-effect'; effect: FamiliarElementalTitleEffect }
  | { kind: 'form'; form: FamiliarForm }
  /** Legendary bond: the element's mastered effect joins the permanent collection. */
  | { kind: 'mastery'; element: FamiliarElement; effect: FamiliarElementalTitleEffect }
  /** This Familiar's signature piece, when SEIHouse has written one. */
  | { kind: 'signature'; effect: FamiliarSignatureEffect };

export interface FamiliarBondRankView {
  rank: FamiliarBondRank;
  /** Total QI offered to this Familiar to reach the rank. */
  qiRequired: number;
  reached: boolean;
  unlocks: FamiliarUnlock[];
}

export interface FamiliarTrainingView {
  familiarId: string;
  owned: boolean;
  isDefault: boolean;
  /** The element this Familiar channels. */
  element: FamiliarElement;
  /** Total QI this cultivator has offered to this Familiar. */
  qiOffered: number;
  bondRank: FamiliarBondRank;
  nextBondRank: { rank: FamiliarBondRank; qiRequired: number; qiRemaining: number } | null;
  bondRanks: FamiliarBondRankView[];
  /** The elemental title this Familiar lends at its current bond rank while it is the Active Familiar. */
  bondEffect: FamiliarElementalTitleEffect;
  /** The signature piece written for this Familiar, if any, and whether this cultivator's bond has unlocked it. */
  signature: { effect: FamiliarSignatureEffect; requiredBondRank: FamiliarBondRank; unlocked: boolean } | null;
  unlockedForms: FamiliarForm[];
  /** The companion's chosen form; null for its base look. */
  selection: { formId: string | null };
}

/** One element this cultivator has mastered. Permanent: mastery is never taken back. */
export interface FamiliarElementalMastery {
  element: FamiliarElement;
  effect: FamiliarElementalTitleEffect;
  /** The Familiar whose Legendary bond mastered it. */
  masteredWith: string;
  masteredAt: string;
}

/**
 * What letters the cultivator's DAO name.
 *
 * - `bond` (coupled): the Active Familiar's elemental title at its bond rank.
 * - `signature` (coupled): the Active Familiar's signature piece, when it has
 *   an unlocked one; otherwise its bond effect.
 * - `mastered` (independent): a mastered element, whichever Familiar is active.
 * - `none`: the rank colours.
 */
export type ActiveElementalEffectSelection =
  | { source: 'bond' }
  | { source: 'signature' }
  | { source: 'mastered'; element: FamiliarElement }
  | { source: 'none' };

export const DEFAULT_ACTIVE_ELEMENTAL_EFFECT: ActiveElementalEffectSelection = { source: 'bond' };

export interface FamiliarTrainingSnapshot {
  uid: string;
  /** Owned outright; the default Familiar is included implicitly. */
  ownedFamiliarIds: string[];
  familiars: FamiliarTrainingView[];
  /** The permanent collection of mastered elements. */
  masteredElements: FamiliarElementalMastery[];
  activeEffect: ActiveElementalEffectSelection;
  updatedAt: string;
}

export interface OfferQiInput {
  familiarId: string;
  /** QI to offer. The server spends only what the remaining bond ranks need. */
  amount: number;
  /** One offer per key: a retried offer never spends twice. */
  idempotencyKey: string;
}

export interface OfferQiResponse {
  outcome: 'trained' | 'replayed' | 'fully-bonded';
  message: string;
  /** QI actually spent by this offer. */
  spent: number;
  bondRankBefore: FamiliarBondRank;
  bondRankAfter: FamiliarBondRank;
  /** What this offer unlocked, in rank order. */
  newUnlocks: FamiliarUnlock[];
  /** The element this offer mastered, when it reached Legendary bond in an element not mastered before. */
  mastered: FamiliarElementalMastery | null;
  snapshot: FamiliarTrainingSnapshot;
}

export interface SelectFamiliarFormInput {
  familiarId: string;
  formId: string | null;
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
  | ({ operation: 'select-form' } & SelectFamiliarFormInput)
  | { operation: 'select-elemental-effect'; selection: ActiveElementalEffectSelection }
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

export interface ResolvedNameEffect {
  effect: FamiliarCosmeticEffect;
  source: 'bond' | 'signature' | 'mastered';
  /** True while the effect follows the Active Familiar; false for a mastered element worn independently. */
  coupled: boolean;
}

/**
 * The effect lettering the cultivator's DAO name: the Active Elemental Effect
 * resolved against the Active Familiar. Coupled choices follow the Active
 * Familiar, and only while the cultivator owns it; a mastered element shows
 * whichever Familiar is active.
 */
export function activeNameEffect(snapshot: FamiliarTrainingSnapshot | null | undefined, activeFamiliarId: string | null | undefined): ResolvedNameEffect | null {
  if (!snapshot) return null;
  const selection = snapshot.activeEffect;
  if (selection.source === 'none') return null;
  if (selection.source === 'mastered') {
    const mastery = snapshot.masteredElements.find(entry => entry.element === selection.element);
    return mastery ? { effect: mastery.effect, source: 'mastered', coupled: false } : null;
  }
  const active = familiarTraining(snapshot, activeFamiliarId);
  if (!active?.owned) return null;
  if (selection.source === 'signature' && active.signature?.unlocked) return { effect: active.signature.effect, source: 'signature', coupled: true };
  return { effect: active.bondEffect, source: 'bond', coupled: true };
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
