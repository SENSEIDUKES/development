/**
 * The Fate Survival Relic catalogue — a small development set, not the full
 * content catalogue.
 *
 * Relics are lightweight, Fate Survival-exclusive rewards that may grant DAO
 * XP and Energy, more at higher rarities. Every name, rarity mapping and
 * amount below is a placeholder development value awaiting product tuning;
 * each entry is validated against the Relic reward policy at load.
 */
import { isRewardRarity, type RewardGrant, type RewardRarity } from '@seihouse/library/rewards';
import type { FateSurvivalOutcome } from '@seihouse/library/relics';
import { assertRewardGrants } from '../rewards/deliverer';

export interface RelicDefinition {
  key: string;
  name: string;
  description: string;
  rarity: RewardRarity;
  rewards: RewardGrant[];
}

export const FATE_SURVIVAL_RELICS: readonly RelicDefinition[] = [
  { key: 'scarred-talisman', name: 'Scarred Talisman', rarity: 'Common',
    description: 'A charm cracked by a fate you only half escaped.',
    rewards: [{ type: 'dao-xp', amount: 20 }, { type: 'energy', amount: 5 }] },
  { key: 'thread-of-mercy', name: 'Thread of Mercy', rarity: 'Rare',
    description: 'One strand of destiny that bent instead of breaking.',
    rewards: [{ type: 'dao-xp', amount: 50 }, { type: 'energy', amount: 10 }] },
  { key: 'broken-doom-bell', name: 'Broken Doom Bell', rarity: 'Epic',
    description: 'It rang for you. It will not ring again.',
    rewards: [{ type: 'dao-xp', amount: 100 }, { type: 'energy', amount: 20 }] },
  { key: 'karmic-compass', name: 'Karmic Compass', rarity: 'Legendary',
    description: 'Its needle points away from every ending already written.',
    rewards: [{ type: 'dao-xp', amount: 200 }, { type: 'energy', amount: 40 }] },
  { key: 'unwritten-page', name: 'The Unwritten Page', rarity: 'Mythic',
    description: 'Torn from the book of your ending before the ink could dry.',
    rewards: [{ type: 'dao-xp', amount: 400 }, { type: 'energy', amount: 75 }] },
  { key: 'star-that-refused', name: 'The Star That Refused', rarity: 'Transcendent',
    description: 'A heavenly verdict, overturned.',
    rewards: [{ type: 'dao-xp', amount: 800 }, { type: 'energy', amount: 150 }] },
];

/**
 * Which rarity each judged outcome earns. A development default awaiting the
 * Fate Survival design (challenge difficulty may decide rarity instead).
 */
export const FATE_SURVIVAL_OUTCOME_RARITY: Readonly<Record<FateSurvivalOutcome, RewardRarity | null>> = {
  'FATE AVERTED': 'Legendary',
  'FATE SCARRED': 'Rare',
  'DOOM MANIFESTED': null,
};

export class RelicCatalogError extends Error {
  constructor(issues: string[]) {
    super(`The Relic catalogue is not valid: ${issues.join(' ')}`);
    this.name = 'RelicCatalogError';
  }
}

export function validateRelicCatalog(relics: readonly RelicDefinition[], outcomes = FATE_SURVIVAL_OUTCOME_RARITY): readonly RelicDefinition[] {
  const issues: string[] = [];
  const keys = new Set<string>();
  for (const relic of relics) {
    if (!/^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$/.test(relic.key)) issues.push(`${relic.key}: key must be a stable lowercase key.`);
    if (keys.has(relic.key)) issues.push(`${relic.key}: duplicate key.`);
    keys.add(relic.key);
    if (!relic.name.trim() || !relic.description.trim()) issues.push(`${relic.key}: name and description are required.`);
    if (!isRewardRarity(relic.rarity)) issues.push(`${relic.key}: rarity is unsupported.`);
    try {
      assertRewardGrants('fate-survival-relic', relic.rewards);
    } catch (error) {
      issues.push(`${relic.key}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  for (const [outcome, rarity] of Object.entries(outcomes)) {
    if (rarity && !relics.some(relic => relic.rarity === rarity)) issues.push(`${outcome} earns ${rarity}, but no ${rarity} Relic exists.`);
  }
  if (issues.length) throw new RelicCatalogError(issues);
  return relics;
}

/** Deterministic pick within a rarity, so the same challenge always yields the same Relic. */
export function relicForChallenge(relics: readonly RelicDefinition[], rarity: RewardRarity, challengeId: string): RelicDefinition | null {
  const pool = relics.filter(relic => relic.rarity === rarity);
  if (!pool.length) return null;
  let hash = 0;
  for (const character of challengeId) hash = (Math.imul(hash, 31) + character.charCodeAt(0)) | 0;
  return pool[Math.abs(hash) % pool.length];
}
