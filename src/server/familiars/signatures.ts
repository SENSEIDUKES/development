/**
 * Signature pieces — custom animation SEIHouse writes for one specific
 * Familiar.
 *
 * Elements are shared instruments: any Familiar channels one, and any
 * cultivator can master one. A signature is different. It is hand-built
 * animation code tied to exactly one Familiar, and no combination of
 * settings (element, intensity, shadow, motion) can produce one. Cultivators
 * get the instruments; SEIHouse writes the signature pieces.
 *
 * A signature never enters the mastery collection: it shows only while its
 * Familiar is the Active Familiar and the cultivator's bond has reached
 * `requiredBondRank`.
 *
 * To add one: register its identity here, and its animation under the same
 * `id` in `src/components/familiar-training/development/signaturePieces.tsx`.
 * None are written yet.
 */
import { FAMILIAR_BOND_RANKS, type FamiliarBondRank, type FamiliarOption } from '@seihouse/library/familiar';

export interface FamiliarSignatureDefinition {
  /** `signature:<familiar id>`; the key the client's animation registry uses. */
  id: string;
  familiarId: string;
  label: string;
  /** The bond this cultivator needs with the Familiar before its signature shows. */
  requiredBondRank: FamiliarBondRank;
}

export const FAMILIAR_SIGNATURES: readonly FamiliarSignatureDefinition[] = [];

export class FamiliarSignatureError extends Error {
  constructor(issues: string[]) {
    super(`The Familiar signatures are not valid: ${issues.join(' ')}`);
    this.name = 'FamiliarSignatureError';
  }
}

const SIGNATURE_KEYS = ['id', 'familiarId', 'label', 'requiredBondRank'];

/** Throws unless each signature names one catalogued Familiar, at most one per Familiar, and carries identity only. */
export function validateSignatures(signatures: readonly FamiliarSignatureDefinition[], catalogue: readonly FamiliarOption[]): readonly FamiliarSignatureDefinition[] {
  const issues: string[] = [];
  const familiars = new Set<string>();
  for (const signature of signatures) {
    if (!Object.keys(signature).every(key => SIGNATURE_KEYS.includes(key))) issues.push(`${signature.id}: a signature carries its identity only; its look is code.`);
    if (signature.id !== `signature:${signature.familiarId}`) issues.push(`${signature.id}: the id must be signature:<familiar id>.`);
    if (!catalogue.some(option => option.id === signature.familiarId)) issues.push(`${signature.id}: that Familiar is not in the catalogue.`);
    if (familiars.has(signature.familiarId)) issues.push(`${signature.familiarId}: one signature per Familiar.`);
    familiars.add(signature.familiarId);
    if (!signature.label.trim()) issues.push(`${signature.id}: a label is required.`);
    if (!FAMILIAR_BOND_RANKS.includes(signature.requiredBondRank)) issues.push(`${signature.id}: unknown bond rank.`);
  }
  if (issues.length) throw new FamiliarSignatureError(issues);
  return signatures;
}
