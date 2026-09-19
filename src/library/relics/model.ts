import {
  MAX_RELIC_QI_REWARD,
  RELIC_RARITIES,
  RELIC_SCHEMA_VERSION,
  type JsonObject,
  type JsonValue,
  type RelicAchievementSnapshot,
  type RelicAchievementTemplate,
  type RelicCompletionEvidence,
  type RelicConditionDefinition,
  type RelicConditionDisclosure,
  type RelicRewardDefinition,
  type StoryRelicProgress,
} from './contracts';

export class RelicValidationError extends Error {
  constructor(readonly issues: string[]) {
    super(`Invalid Relic v3 data: ${issues.join(' ')}`);
    this.name = 'RelicValidationError';
  }
}

const KEY_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{0,126}[a-z0-9])?$/;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object'
  && value !== null
  && !Array.isArray(value)
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);

const isJsonValue = (value: unknown): value is JsonValue => {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  return isPlainObject(value) && Object.values(value).every(isJsonValue);
};

const requireText = (value: string, field: string, issues: string[]): void => {
  if (!value.trim()) issues.push(`${field} is required.`);
};

const requireKey = (value: string, field: string, issues: string[]): void => {
  if (!KEY_PATTERN.test(value)) {
    issues.push(`${field} must be a stable lowercase key using letters, numbers, dots, dashes, or underscores.`);
  }
};

const requirePositiveVersion = (value: number, field: string, issues: string[]): void => {
  if (!Number.isSafeInteger(value) || value < 1) issues.push(`${field} must be a positive integer.`);
};

const requireIsoTime = (value: string, field: string, issues: string[]): void => {
  if (!value || Number.isNaN(Date.parse(value))) issues.push(`${field} must be an ISO timestamp.`);
};

const validateCondition = (condition: RelicConditionDefinition, issues: string[]): void => {
  requireKey(condition.evaluatorKey, 'condition.evaluatorKey', issues);
  requirePositiveVersion(condition.evaluatorVersion, 'condition.evaluatorVersion', issues);
  if (typeof condition.hidden !== 'boolean') issues.push('condition.hidden must be boolean.');
  if (!isPlainObject(condition.parameters) || !isJsonValue(condition.parameters)) {
    issues.push('condition.parameters must be a JSON object.');
  }
};

const validateRewards = (rewards: RelicRewardDefinition, issues: string[]): void => {
  if (!Number.isSafeInteger(rewards.qi) || rewards.qi < 0 || rewards.qi > MAX_RELIC_QI_REWARD) {
    issues.push(`rewards.qi must be an integer from 0 to ${MAX_RELIC_QI_REWARD}.`);
  }

  if (rewards.title) {
    requireKey(rewards.title.key, 'rewards.title.key', issues);
    requireText(rewards.title.title, 'rewards.title.title', issues);
  }

  if (!Array.isArray(rewards.cosmetics)) {
    issues.push('rewards.cosmetics must be an array.');
    return;
  }

  const cosmeticKeys = new Set<string>();
  rewards.cosmetics.forEach((cosmetic, index) => {
    requireKey(cosmetic.key, `rewards.cosmetics[${index}].key`, issues);
    requireText(cosmetic.kind, `rewards.cosmetics[${index}].kind`, issues);
    requireText(cosmetic.label, `rewards.cosmetics[${index}].label`, issues);
    if (!isPlainObject(cosmetic.metadata) || !isJsonValue(cosmetic.metadata)) {
      issues.push(`rewards.cosmetics[${index}].metadata must be a JSON object.`);
    }
    if (cosmeticKeys.has(cosmetic.key)) {
      issues.push(`rewards.cosmetics contains duplicate key ${cosmetic.key}.`);
    }
    cosmeticKeys.add(cosmetic.key);
  });
};

export interface RelicTemplateDefinition {
  key: string;
  status: RelicAchievementTemplate['status'];
  name: string;
  description: string;
  rarity: RelicAchievementTemplate['rarity'];
  condition: RelicConditionDefinition;
  rewards: RelicRewardDefinition;
}

export const assertRelicTemplateDefinition = (definition: RelicTemplateDefinition): void => {
  const issues: string[] = [];
  requireKey(definition.key, 'key', issues);
  requireText(definition.name, 'name', issues);
  requireText(definition.description, 'description', issues);
  if (!RELIC_RARITIES.includes(definition.rarity)) issues.push('rarity is unsupported.');
  if (!['draft', 'active', 'retired'].includes(definition.status)) issues.push('status is unsupported.');
  validateCondition(definition.condition, issues);
  validateRewards(definition.rewards, issues);
  if (issues.length) throw new RelicValidationError(issues);
};

export const assertStoryRelicProgress = (progress: StoryRelicProgress): void => {
  const issues: string[] = [];
  if (!Number.isSafeInteger(progress.current) || progress.current < 0) {
    issues.push('progress.current must be a non-negative integer.');
  }
  if (!Number.isSafeInteger(progress.target) || progress.target < 1) {
    issues.push('progress.target must be a positive integer.');
  }
  if (progress.current > progress.target) issues.push('progress.current cannot exceed progress.target.');
  if (progress.unit !== undefined && !progress.unit.trim()) issues.push('progress.unit cannot be blank.');
  if (!isPlainObject(progress.metadata) || !isJsonValue(progress.metadata)) {
    issues.push('progress.metadata must be a JSON object.');
  }
  requireIsoTime(progress.updatedAt, 'progress.updatedAt', issues);
  if (issues.length) throw new RelicValidationError(issues);
};

export const assertCompletionEvidence = (evidence: RelicCompletionEvidence): void => {
  const issues: string[] = [];
  if (evidence.schemaVersion !== RELIC_SCHEMA_VERSION) issues.push('evidence.schemaVersion is unsupported.');
  requireKey(evidence.evaluatorKey, 'evidence.evaluatorKey', issues);
  requirePositiveVersion(evidence.evaluatorVersion, 'evidence.evaluatorVersion', issues);
  requireText(evidence.sourceType, 'evidence.sourceType', issues);
  requireText(evidence.sourceId, 'evidence.sourceId', issues);
  requireIsoTime(evidence.observedAt, 'evidence.observedAt', issues);
  if (!isPlainObject(evidence.facts) || !isJsonValue(evidence.facts)) {
    issues.push('evidence.facts must be a JSON object.');
  }
  if (issues.length) throw new RelicValidationError(issues);
};

export const cloneJson = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const snapshotRelicTemplate = (template: RelicAchievementTemplate): RelicAchievementSnapshot => ({
  schemaVersion: RELIC_SCHEMA_VERSION,
  templateId: template.id,
  templateKey: template.key,
  templateVersion: template.version,
  name: template.name,
  description: template.description,
  rarity: template.rarity,
  condition: cloneJson(template.condition),
  rewards: cloneJson(template.rewards),
});

/** Redacts the evaluator and its parameters until a hidden achievement is earned. */
export const discloseRelicCondition = (
  condition: RelicConditionDefinition,
  hasEarned: boolean,
): RelicConditionDisclosure => {
  if (condition.hidden && !hasEarned) return { hidden: true };
  return {
    hidden: false,
    evaluatorKey: condition.evaluatorKey,
    evaluatorVersion: condition.evaluatorVersion,
    parameters: cloneJson(condition.parameters),
  };
};

export const initialStoryRelicProgress = (
  updatedAt: string,
  target = 1,
  unit?: string,
): StoryRelicProgress => {
  const progress: StoryRelicProgress = { current: 0, target, unit, metadata: {}, updatedAt };
  assertStoryRelicProgress(progress);
  return progress;
};
