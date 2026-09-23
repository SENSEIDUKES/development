/**
 * The Library's achievement catalogue — a small, representative development
 * set, not the full content catalogue.
 *
 * Achievements recognize natural activity (reading, creation, exploration,
 * and eventually other media); they are not a separate challenge system and
 * no daily challenges live here. Each one mints a Mystery Scroll when earned:
 * most are `concealed`, and the selected major milestones are `curated`, so
 * their reward shows upfront.
 *
 * Names, targets, rarities and every reward amount below are placeholder
 * development values awaiting product tuning. Rewards are validated against
 * the Mystery Scroll reward policy at load, so a definition can never grant a
 * balance scrolls may not credit.
 */
import { isRewardRarity, type AchievementCategory, type MysteryScrollPresentation, type RewardGrant, type RewardRarity } from '@seihouse/library/rewards';
import type { JsonObject } from '../qi/qiLedger';
import { assertRewardGrants } from '../rewards/deliverer';
import type { AchievementEvaluatorRegistry } from './evaluators';

export interface AchievementDefinition {
  key: string;
  /** Bumped when the goal's meaning changes; earned scrolls keep their snapshot. */
  version: number;
  /** `planned` goals are shown as coming, and never evaluated. */
  status: 'active' | 'planned';
  category: AchievementCategory;
  name: string;
  description: string;
  /** Hidden goals show only a generic hint until earned. */
  hidden: boolean;
  rarity: RewardRarity;
  presentation: MysteryScrollPresentation;
  condition: { evaluatorKey: string; evaluatorVersion: number; parameters: JsonObject };
  /** The unit progress is counted in, e.g. `chapters`. */
  progressUnit: string;
  /** Sealed inside the scroll; shown upfront only for curated milestones. */
  rewards: RewardGrant[];
}

const count = (kinds: string[], target: number, distinctBy: 'subject' | 'story' = 'subject') => ({
  evaluatorKey: 'activity.count',
  evaluatorVersion: 1,
  parameters: { kinds, target, distinctBy },
});

export const LIBRARY_ACHIEVEMENTS: readonly AchievementDefinition[] = [
  {
    key: 'reading.first-chapter', version: 1, status: 'active', category: 'reading',
    name: 'First Page Turned', description: 'Read your first chapter in the Library.',
    hidden: false, rarity: 'Common', presentation: 'concealed',
    condition: count(['chapter.read'], 1), progressUnit: 'chapters',
    rewards: [{ type: 'dao-xp', amount: 25 }, { type: 'qi', amount: 100 }],
  },
  {
    key: 'reading.ten-chapters', version: 1, status: 'active', category: 'reading',
    name: 'Steady Lantern', description: 'Read ten chapters.',
    hidden: false, rarity: 'Rare', presentation: 'concealed',
    condition: count(['chapter.read'], 10), progressUnit: 'chapters',
    rewards: [{ type: 'dao-xp', amount: 75 }, { type: 'qi', amount: 250 }],
  },
  {
    key: 'reading.three-worlds', version: 1, status: 'active', category: 'reading',
    name: 'Wanderer of Worlds', description: 'Read chapters in three different stories.',
    hidden: false, rarity: 'Epic', presentation: 'concealed',
    condition: count(['chapter.read'], 3, 'story'), progressUnit: 'stories',
    rewards: [{ type: 'dao-xp', amount: 150 }, { type: 'qi', amount: 400 }],
  },
  {
    key: 'reading.long-arc', version: 1, status: 'active', category: 'reading',
    name: 'Keeper of the Long Arc', description: 'Read fifty chapters. A major milestone: its reward is shown upfront.',
    hidden: false, rarity: 'Legendary', presentation: 'curated',
    condition: count(['chapter.read'], 50), progressUnit: 'chapters',
    rewards: [{ type: 'dao-xp', amount: 500 }, { type: 'qi', amount: 1_500 }],
  },
  {
    key: 'creation.first-story', version: 1, status: 'active', category: 'creation',
    name: 'First Manifestation', description: 'Create your first story. A major milestone: its reward is shown upfront.',
    hidden: false, rarity: 'Legendary', presentation: 'curated',
    condition: count(['story.created'], 1), progressUnit: 'stories',
    rewards: [{ type: 'dao-xp', amount: 300 }, { type: 'qi', amount: 1_000 }],
  },
  {
    key: 'creation.five-chapters', version: 1, status: 'active', category: 'creation',
    name: 'Chapter Weaver', description: 'Create five chapters.',
    hidden: false, rarity: 'Epic', presentation: 'concealed',
    condition: count(['chapter.created'], 5), progressUnit: 'chapters',
    rewards: [{ type: 'dao-xp', amount: 150 }, { type: 'qi', amount: 400 }],
  },
  {
    key: 'exploration.codex-seeker', version: 1, status: 'active', category: 'exploration',
    name: 'Codex Seeker', description: 'Open five different Codex entries.',
    hidden: false, rarity: 'Rare', presentation: 'concealed',
    condition: count(['codex.entry-opened'], 5), progressUnit: 'entries',
    rewards: [{ type: 'dao-xp', amount: 60 }, { type: 'qi', amount: 200 }],
  },
  {
    key: 'exploration.hidden-archivist', version: 1, status: 'active', category: 'exploration',
    name: 'The Hidden Archivist', description: 'Visit three worlds made by other creators.',
    hidden: true, rarity: 'Mythic', presentation: 'concealed',
    condition: count(['world.visited'], 3), progressUnit: 'worlds',
    rewards: [{ type: 'dao-xp', amount: 250 }, { type: 'qi', amount: 600 }],
  },
  {
    key: 'media.first-resonance', version: 1, status: 'planned', category: 'media',
    name: 'First Resonance', description: 'Experience a story through another medium — audio, manga, or motion. Arrives with other media.',
    hidden: false, rarity: 'Rare', presentation: 'concealed',
    condition: count(['media.experienced'], 1), progressUnit: 'experiences',
    rewards: [{ type: 'dao-xp', amount: 50 }, { type: 'qi', amount: 150 }],
  },
];

export class AchievementCatalogError extends Error {
  readonly issues: string[];
  constructor(issues: string[]) {
    super(`The achievement catalogue is not valid: ${issues.join(' ')}`);
    this.name = 'AchievementCatalogError';
    this.issues = issues;
  }
}

const KEY_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{0,126}[a-z0-9])?$/;

/** Throws `AchievementCatalogError` unless every definition can be evaluated and delivered as written. */
export function validateAchievementCatalog(
  definitions: readonly AchievementDefinition[],
  evaluators: AchievementEvaluatorRegistry,
): readonly AchievementDefinition[] {
  const issues: string[] = [];
  const keys = new Set<string>();
  for (const definition of definitions) {
    const where = definition.key || '(missing key)';
    if (!KEY_PATTERN.test(definition.key)) issues.push(`${where}: key must be a stable lowercase key.`);
    if (keys.has(definition.key)) issues.push(`${where}: duplicate key.`);
    keys.add(definition.key);
    if (!Number.isSafeInteger(definition.version) || definition.version < 1) issues.push(`${where}: version must be a positive whole number.`);
    if (!definition.name.trim() || !definition.description.trim()) issues.push(`${where}: name and description are required.`);
    if (!isRewardRarity(definition.rarity)) issues.push(`${where}: rarity is unsupported.`);
    if (definition.presentation !== 'concealed' && definition.presentation !== 'curated') issues.push(`${where}: presentation must be concealed or curated.`);
    if (definition.rewards.length === 0) issues.push(`${where}: a scroll needs at least one reward.`);
    try {
      assertRewardGrants('mystery-scroll', definition.rewards);
    } catch (error) {
      issues.push(`${where}: ${error instanceof Error ? error.message : String(error)}`);
    }
    try {
      const evaluator = evaluators.resolve(definition.condition.evaluatorKey, definition.condition.evaluatorVersion);
      issues.push(...evaluator.validate(definition.condition.parameters).map(issue => `${where}: ${issue}`));
    } catch (error) {
      issues.push(`${where}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (issues.length) throw new AchievementCatalogError(issues);
  return definitions;
}
