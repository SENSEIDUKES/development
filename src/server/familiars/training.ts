/**
 * The Familiar training ladder — the development content for what offering
 * QI to a Familiar unlocks.
 *
 * One shared ladder applies to every Familiar, lettered in that Familiar's
 * element. Tier names, QI thresholds, element affinities and the placeholder
 * form treatment are development values awaiting product tuning and form
 * artwork; the ladder is validated at load so no unlock can ever carry a
 * gameplay value.
 */
import {
  FAMILIAR_ELEMENTS,
  type FamiliarCosmeticEffect,
  type FamiliarEffectIntensity,
  type FamiliarElement,
  type FamiliarForm,
  type FamiliarUnlock,
} from '@seihouse/library/familiar';

export interface FamiliarTrainingTier {
  tier: number;
  name: string;
  /** Total QI offered to one Familiar to reach this tier. */
  qiRequired: number;
  unlocks: (element: FamiliarElement) => FamiliarUnlock[];
}

const ELEMENT_LABELS: Readonly<Record<FamiliarElement, string>> = {
  fire: 'Fire', lightning: 'Lightning', frost: 'Frost', celestial: 'Celestial', void: 'Void',
};

const ELEMENT_GLOW: Readonly<Record<FamiliarElement, string>> = {
  fire: '#ff6a13', lightning: '#2589ff', frost: '#6bd6f0', celestial: '#d5b668', void: '#994bfa',
};

const INTENSITY_LABELS: Readonly<Record<FamiliarEffectIntensity, string>> = {
  subtle: 'Whisper', active: 'Blaze', legendary: 'Ascendant',
};

export const elementalTitleEffect = (element: FamiliarElement, intensity: FamiliarEffectIntensity): FamiliarCosmeticEffect => ({
  id: `elemental-title:${element}:${intensity}`,
  kind: 'elemental-title',
  label: `${ELEMENT_LABELS[element]} Title · ${INTENSITY_LABELS[intensity]}`,
  element,
  intensity,
});

export const radiantForm = (element: FamiliarElement): FamiliarForm => ({
  id: 'radiant',
  label: 'Radiant form',
  description: `Placeholder form: the Familiar’s artwork wreathed in ${ELEMENT_LABELS[element].toLowerCase()} light until dedicated form artwork is supplied.`,
  treatment: { glow: ELEMENT_GLOW[element], saturate: 1.25, brightness: 1.08, hueRotate: 0 },
});

export const FAMILIAR_TRAINING_LADDER: readonly FamiliarTrainingTier[] = [
  { tier: 1, name: 'Common', qiRequired: 0, unlocks: () => [] },
  { tier: 2, name: 'Rare', qiRequired: 1_000, unlocks: element => [{ kind: 'effect', effect: elementalTitleEffect(element, 'subtle') }] },
  {
    tier: 3, name: 'Epic', qiRequired: 4_000,
    unlocks: element => [{ kind: 'form', form: radiantForm(element) }, { kind: 'effect', effect: elementalTitleEffect(element, 'active') }],
  },
  { tier: 4, name: 'Legendary', qiRequired: 10_000, unlocks: element => [{ kind: 'effect', effect: elementalTitleEffect(element, 'legendary') }] },
];

/** Each Familiar's element. Unlisted Familiars fall back to Celestial. */
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

export const MAX_TRAINING_QI = (ladder = FAMILIAR_TRAINING_LADDER) => ladder[ladder.length - 1].qiRequired;

/** The highest tier the offered QI has reached. */
export function tierFor(qiOffered: number, ladder = FAMILIAR_TRAINING_LADDER): FamiliarTrainingTier {
  let reached = ladder[0];
  for (const tier of ladder) if (qiOffered >= tier.qiRequired) reached = tier;
  return reached;
}

const EFFECT_KEYS = ['id', 'kind', 'label', 'element', 'intensity'];
const FORM_KEYS = ['id', 'label', 'description', 'treatment'];
const TREATMENT_KEYS = ['glow', 'saturate', 'brightness', 'hueRotate'];
const onlyKeys = (value: object, allowed: readonly string[]) => Object.keys(value).every(key => allowed.includes(key));

export class FamiliarTrainingLadderError extends Error {
  constructor(issues: string[]) {
    super(`The Familiar training ladder is not valid: ${issues.join(' ')}`);
    this.name = 'FamiliarTrainingLadderError';
  }
}

/**
 * Throws unless the ladder is ascending and every unlock is presentation
 * only: an effect or form with any field beyond its cosmetic shape — a
 * multiplier, a discount, a boost — is refused before the server starts.
 */
export function validateTrainingLadder(ladder: readonly FamiliarTrainingTier[] = FAMILIAR_TRAINING_LADDER): readonly FamiliarTrainingTier[] {
  const issues: string[] = [];
  if (ladder[0]?.qiRequired !== 0) issues.push('The first tier must require no QI.');
  ladder.forEach((tier, index) => {
    if (tier.tier !== index + 1) issues.push(`Tier ${tier.tier} is out of order.`);
    if (index > 0 && tier.qiRequired <= ladder[index - 1].qiRequired) issues.push(`Tier ${tier.tier} must require more QI than the tier before.`);
    for (const element of FAMILIAR_ELEMENTS) {
      for (const unlock of tier.unlocks(element)) {
        if (unlock.kind === 'effect') {
          if (!onlyKeys(unlock.effect, EFFECT_KEYS) || unlock.effect.kind !== 'elemental-title') issues.push(`Tier ${tier.tier} unlocks a non-cosmetic effect.`);
        } else if (unlock.kind === 'form') {
          if (!onlyKeys(unlock.form, FORM_KEYS) || !onlyKeys(unlock.form.treatment, TREATMENT_KEYS)) issues.push(`Tier ${tier.tier} unlocks a form with non-presentation data.`);
        } else {
          issues.push(`Tier ${tier.tier} unlocks an unknown kind.`);
        }
      }
    }
  });
  if (issues.length) throw new FamiliarTrainingLadderError([...new Set(issues)]);
  return ladder;
}
