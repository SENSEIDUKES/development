export const RELIC_SCHEMA_VERSION = 3 as const;

export const RELIC_RARITIES = [
  'Common',
  'Rare',
  'Epic',
  'Legendary',
  'Mythic',
  'Transcendent',
] as const;

export type RelicRarity = (typeof RELIC_RARITIES)[number];

/** Maximum allowed award; individual achievements choose their own lower value. */
export const MAX_RELIC_QI_REWARD = 1000;

export type JsonPrimitive = boolean | number | string | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

export interface JsonObject {
  [key: string]: JsonValue;
}

export type RelicTemplateStatus = 'draft' | 'active' | 'retired';
export type StoryRelicStatus = 'assigned' | 'in_progress' | 'earned' | 'disabled';

/**
 * An evaluator identifier is stored as data so the eventual evaluation system
 * can evolve without changing the achievement or persistence contracts.
 */
export interface RelicConditionDefinition {
  evaluatorKey: string;
  evaluatorVersion: number;
  hidden: boolean;
  parameters: JsonObject;
}

export interface RelicTitleReward {
  key: string;
  title: string;
  description?: string;
}

export interface RelicCosmeticReward {
  key: string;
  kind: string;
  label: string;
  metadata: JsonObject;
}

export interface RelicRewardDefinition {
  title?: RelicTitleReward;
  qi: number;
  cosmetics: RelicCosmeticReward[];
}

export interface RelicAchievementTemplate {
  schemaVersion: typeof RELIC_SCHEMA_VERSION;
  id: string;
  key: string;
  version: number;
  status: RelicTemplateStatus;
  name: string;
  description: string;
  rarity: RelicRarity;
  condition: RelicConditionDefinition;
  rewards: RelicRewardDefinition;
  createdAt: string;
  updatedAt: string;
}

/**
 * A story keeps the exact definition it was assigned. Later template edits do
 * not silently change an existing story's target, reveal, rarity, or rewards.
 */
export interface RelicAchievementSnapshot {
  schemaVersion: typeof RELIC_SCHEMA_VERSION;
  templateId: string;
  templateKey: string;
  templateVersion: number;
  name: string;
  description: string;
  rarity: RelicRarity;
  condition: RelicConditionDefinition;
  rewards: RelicRewardDefinition;
}

export interface StoryRelicProgress {
  current: number;
  target: number;
  unit?: string;
  metadata: JsonObject;
  updatedAt: string;
}

export interface StoryRelicAssignment {
  schemaVersion: typeof RELIC_SCHEMA_VERSION;
  id: string;
  ownerId: string;
  storyId: string;
  templateId: string;
  status: StoryRelicStatus;
  achievement: RelicAchievementSnapshot;
  progress: StoryRelicProgress;
  assignedAt: string;
  updatedAt: string;
  earnedAt?: string;
}

/** Immutable evidence snapshot attached to the successful earning transaction. */
export interface RelicCompletionEvidence {
  schemaVersion: typeof RELIC_SCHEMA_VERSION;
  evaluatorKey: string;
  evaluatorVersion: number;
  sourceType: string;
  sourceId: string;
  observedAt: string;
  facts: JsonObject;
}

export interface EarnedRelicRecord {
  schemaVersion: typeof RELIC_SCHEMA_VERSION;
  id: string;
  ownerId: string;
  storyId: string;
  assignmentId: string;
  templateId: string;
  achievement: RelicAchievementSnapshot;
  completionEvidence: RelicCompletionEvidence[];
  earnedAt: string;
}

export type RelicConditionDisclosure =
  | { hidden: true }
  | {
      hidden: false;
      evaluatorKey: string;
      evaluatorVersion: number;
      parameters: JsonObject;
    };
