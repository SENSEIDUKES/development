import { isLibraryActivityKind, type LibraryActivityKind } from '@seihouse/library/rewards';
import type { JsonObject } from '../qi/qiLedger';
import type { ActivityRecord } from './types';

export interface AchievementEvaluation {
  current: number;
  target: number;
  complete: boolean;
  /** The activity that crossed the target, recorded as completion evidence. */
  completingActivity: ActivityRecord | null;
  facts: JsonObject;
}

/**
 * A versioned, pure rule over an account's trusted activity. Kept from the
 * Relic v3 foundation: definitions store `evaluatorKey@version` as data, so
 * the rule can evolve without rewriting earned history.
 */
export interface AchievementEvaluator {
  readonly key: string;
  readonly version: number;
  /** Returns validation issues for a definition's parameters; empty when valid. */
  validate(parameters: JsonObject): string[];
  /** Which activity kinds can move this goal, so unrelated activity skips it. */
  kinds(parameters: JsonObject): readonly LibraryActivityKind[];
  evaluate(parameters: JsonObject, activities: readonly ActivityRecord[]): AchievementEvaluation;
}

const registryKey = (key: string, version: number) => `${key}@${version}`;

export class AchievementEvaluatorNotRegisteredError extends Error {
  constructor(key: string, version: number) {
    super(`No achievement evaluator is registered for ${registryKey(key, version)}.`);
    this.name = 'AchievementEvaluatorNotRegisteredError';
  }
}

export class AchievementEvaluatorRegistry {
  private readonly evaluators = new Map<string, AchievementEvaluator>();

  register(evaluator: AchievementEvaluator): this {
    const key = registryKey(evaluator.key, evaluator.version);
    if (this.evaluators.has(key)) throw new Error(`Achievement evaluator ${key} is already registered.`);
    this.evaluators.set(key, evaluator);
    return this;
  }

  resolve(key: string, version: number): AchievementEvaluator {
    const evaluator = this.evaluators.get(registryKey(key, version));
    if (!evaluator) throw new AchievementEvaluatorNotRegisteredError(key, version);
    return evaluator;
  }
}

interface ActivityCountParameters {
  kinds: LibraryActivityKind[];
  target: number;
  /** Count distinct subjects (chapters, entries, worlds) or distinct stories. */
  distinctBy: 'subject' | 'story';
}

const readCountParameters = (parameters: JsonObject): ActivityCountParameters => parameters as unknown as ActivityCountParameters;

/**
 * `activity.count@1` — reach `target` distinct subjects (or distinct stories)
 * across the listed activity kinds. Re-reading the same chapter or reopening
 * the same Codex entry never counts twice.
 */
export const activityCountEvaluator: AchievementEvaluator = {
  key: 'activity.count',
  version: 1,
  validate(parameters) {
    const issues: string[] = [];
    const { kinds, target, distinctBy } = readCountParameters(parameters);
    if (!Array.isArray(kinds) || kinds.length === 0 || !kinds.every(isLibraryActivityKind)) issues.push('kinds must list known Library activity kinds.');
    if (!Number.isSafeInteger(target) || target < 1) issues.push('target must be a positive whole number.');
    if (distinctBy !== 'subject' && distinctBy !== 'story') issues.push('distinctBy must be subject or story.');
    return issues;
  },
  kinds: parameters => readCountParameters(parameters).kinds,
  evaluate(parameters, activities) {
    const { kinds, target, distinctBy } = readCountParameters(parameters);
    const counted = new Set<string>();
    let completingActivity: ActivityRecord | null = null;
    const ordered = [...activities]
      .filter(activity => kinds.includes(activity.kind))
      .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt));
    for (const activity of ordered) {
      const key = distinctBy === 'story' ? activity.storyId : `${activity.kind}\u0000${activity.subjectId}`;
      if (!key || counted.has(key)) continue;
      counted.add(key);
      if (counted.size === target) completingActivity = activity;
    }
    const current = Math.min(counted.size, target);
    return {
      current,
      target,
      complete: counted.size >= target,
      completingActivity,
      facts: { counted: counted.size, target, distinctBy, kinds: [...kinds] },
    };
  },
};

/** The evaluators the Library currently defines goals with. */
export const createDefaultEvaluatorRegistry = () => new AchievementEvaluatorRegistry().register(activityCountEvaluator);
