/**
 * The Bond Rank ladder — what offering QI to a Familiar unlocks.
 *
 * One ladder applies to every Familiar, lettered in the element that
 * Familiar channels:
 *
 * - Common, Rare and Epic bond each lend a stronger elemental title, worn
 *   only while that Familiar is the Active Familiar. Epic bond also unlocks
 *   the placeholder radiant form.
 * - Legendary bond masters the element: its effect joins the cultivator's
 *   permanent collection and can be worn with any Familiar.
 *
 * QI thresholds, element affinities and the placeholder form are development
 * values awaiting product tuning and form artwork. The ladder is validated at
 * load, so no unlock can ever carry a gameplay value.
 */
import {
  FAMILIAR_BOND_RANKS,
  FAMILIAR_ELEMENT_LABELS,
  FAMILIAR_ELEMENTS,
  type FamiliarBondRank,
  type FamiliarEffectIntensity,
  type FamiliarElement,
  type FamiliarElementalTitleEffect,
  type FamiliarForm,
  type FamiliarUnlock,
} from '@seihouse/library/familiar';

export interface FamiliarBondRankDefinition {
  rank: FamiliarBondRank;
  /** Total QI offered to one Familiar to reach this rank. */
  qiRequired: number;
  unlocks: (element: FamiliarElement) => FamiliarUnlock[];
}

const ELEMENT_GLOW: Readonly<Record<FamiliarElement, string>> = {
  fire: '#ff6a13', lightning: '#2589ff', frost: '#6bd6f0', celestial: '#d5b668', void: '#994bfa',
};

const INTENSITY_LABELS: Readonly<Record<FamiliarEffectIntensity, string>> = {
  subtle: 'Whisper', active: 'Blaze', legendary: 'Ascendant',
};

/** The elemental title a Familiar lends at one bond rank, while it is active. */
export const bondTitleEffect = (element: FamiliarElement, intensity: FamiliarEffectIntensity): FamiliarElementalTitleEffect => ({
  id: `elemental-title:${element}:${intensity}`,
  kind: 'elemental-title',
  label: `${FAMILIAR_ELEMENT_LABELS[element]} Title · ${INTENSITY_LABELS[intensity]}`,
  element,
  intensity,
  mastered: false,
});

/** A mastered element: the full title, now the cultivator's own. */
export const masteryEffect = (element: FamiliarElement): FamiliarElementalTitleEffect => ({
  id: `elemental-title:${element}:mastered`,
  kind: 'elemental-title',
  label: `${FAMILIAR_ELEMENT_LABELS[element]} Mastery`,
  element,
  intensity: 'legendary',
  mastered: true,
});

export const radiantForm = (element: FamiliarElement): FamiliarForm => ({
  id: 'radiant',
  label: 'Radiant form',
  description: `Placeholder form: the Familiar’s artwork wreathed in ${FAMILIAR_ELEMENT_LABELS[element].toLowerCase()} light until dedicated form artwork is supplied.`,
  treatment: { glow: ELEMENT_GLOW[element], saturate: 1.25, brightness: 1.08, hueRotate: 0 },
});

export const FAMILIAR_BOND_LADDER: readonly FamiliarBondRankDefinition[] = [
  { rank: 'common', qiRequired: 0, unlocks: element => [{ kind: 'bond-effect', effect: bondTitleEffect(element, 'subtle') }] },
  { rank: 'rare', qiRequired: 1_000, unlocks: element => [{ kind: 'bond-effect', effect: bondTitleEffect(element, 'active') }] },
  {
    rank: 'epic', qiRequired: 4_000,
    unlocks: element => [{ kind: 'bond-effect', effect: bondTitleEffect(element, 'legendary') }, { kind: 'form', form: radiantForm(element) }],
  },
  { rank: 'legendary', qiRequired: 10_000, unlocks: element => [{ kind: 'mastery', element, effect: masteryEffect(element) }] },
];

/** The element each Familiar channels. Unlisted Familiars fall back to Celestial. */
export const FAMILIAR_ELEMENT_AFFINITY: Readonly<Record<string, FamiliarElement>> = {
  phoenix: 'fire',
  'nine-tailed-fox': 'fire',
  'lady-bug': 'fire',
  'little-monkey-king': 'lightning',
  quill: 'lightning',
  'celestial-moon-moth': 'frost',
  'celestial-guardian': 'celestial',
  'lucky-bake-danuki': 'celestial',
  'galaxy-octopus': 'void',
  'judgmental-jiangshi': 'void',
  'living-grimoire': 'void',
};

export const familiarElement = (familiarId: string): FamiliarElement => FAMILIAR_ELEMENT_AFFINITY[familiarId] ?? 'celestial';

/** QI that completes a bond: reaching Legendary. */
export const MAX_BOND_QI = (ladder = FAMILIAR_BOND_LADDER) => ladder[ladder.length - 1].qiRequired;

/** The highest bond rank the offered QI has reached. */
export function bondRankFor(qiOffered: number, ladder = FAMILIAR_BOND_LADDER): FamiliarBondRankDefinition {
  let reached = ladder[0];
  for (const rank of ladder) if (qiOffered >= rank.qiRequired) reached = rank;
  return reached;
}

const EFFECT_KEYS = ['id', 'kind', 'label', 'element', 'intensity', 'mastered'];
const FORM_KEYS = ['id', 'label', 'description', 'treatment'];
const TREATMENT_KEYS = ['glow', 'saturate', 'brightness', 'hueRotate'];
const onlyKeys = (value: object, allowed: readonly string[]) => Object.keys(value).every(key => allowed.includes(key));
const cosmeticTitle = (effect: FamiliarElementalTitleEffect) => onlyKeys(effect, EFFECT_KEYS) && effect.kind === 'elemental-title';

export class FamiliarBondLadderError extends Error {
  constructor(issues: string[]) {
    super(`The Bond Rank ladder is not valid: ${issues.join(' ')}`);
    this.name = 'FamiliarBondLadderError';
  }
}

/**
 * Throws unless the ladder runs Common → Rare → Epic → Legendary with rising
 * QI, each rank below Legendary lends exactly one bond effect, only Legendary
 * masters the element, and every unlock is presentation only: an effect or
 * form with any field beyond its cosmetic shape — a multiplier, a discount, a
 * boost — is refused before the server starts.
 */
export function validateBondLadder(ladder: readonly FamiliarBondRankDefinition[] = FAMILIAR_BOND_LADDER): readonly FamiliarBondRankDefinition[] {
  const issues: string[] = [];
  if (ladder.map(entry => entry.rank).join() !== FAMILIAR_BOND_RANKS.join()) issues.push('The ranks must be Common, Rare, Epic and Legendary, in order.');
  if (ladder[0]?.qiRequired !== 0) issues.push('Common bond must require no QI.');
  ladder.forEach((entry, index) => {
    if (index > 0 && entry.qiRequired <= ladder[index - 1].qiRequired) issues.push(`${entry.rank} bond must require more QI than the rank before.`);
    const final = index === ladder.length - 1;
    for (const element of FAMILIAR_ELEMENTS) {
      const unlocks = entry.unlocks(element);
      const bondEffects = unlocks.filter(unlock => unlock.kind === 'bond-effect').length;
      const masteries = unlocks.filter(unlock => unlock.kind === 'mastery').length;
      if (!final && bondEffects !== 1) issues.push(`${entry.rank} bond must lend exactly one elemental title.`);
      if (final ? masteries !== 1 : masteries !== 0) issues.push('Only Legendary bond masters the element, exactly once.');
      for (const unlock of unlocks) {
        if (unlock.kind === 'bond-effect') {
          if (!cosmeticTitle(unlock.effect) || unlock.effect.mastered || unlock.effect.element !== element) issues.push(`${entry.rank} bond lends a non-cosmetic or foreign effect.`);
        } else if (unlock.kind === 'mastery') {
          if (!onlyKeys(unlock, ['kind', 'element', 'effect']) || unlock.element !== element || !cosmeticTitle(unlock.effect) || !unlock.effect.mastered || unlock.effect.element !== element) {
            issues.push(`${entry.rank} bond masters a non-cosmetic or foreign effect.`);
          }
        } else if (unlock.kind === 'form') {
          if (!onlyKeys(unlock.form, FORM_KEYS) || !onlyKeys(unlock.form.treatment, TREATMENT_KEYS)) issues.push(`${entry.rank} bond unlocks a form with non-presentation data.`);
        } else {
          // Signatures belong to one Familiar and are authored in signatures.ts, never on the shared ladder.
          issues.push(`${entry.rank} bond unlocks a kind the shared ladder cannot hold.`);
        }
      }
    }
  });
  if (issues.length) throw new FamiliarBondLadderError([...new Set(issues)]);
  return ladder;
}
