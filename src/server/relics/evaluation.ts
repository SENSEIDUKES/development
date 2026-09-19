import { cloneJson } from '@seihouse/library/relics';
import type { ApplyRelicEvaluationResult, RelicRepository } from './repository';
import { RELIC_SCHEMA_VERSION, type JsonObject, type StoryRelicAssignment } from '@seihouse/library/relics';

export interface RelicObservation {
  type: string;
  id: string;
  occurredAt: string;
  facts: JsonObject;
}

export interface RelicEvaluatorInput {
  assignment: StoryRelicAssignment;
  observation: RelicObservation;
}

export type RelicEvaluatorResult =
  | { kind: 'no_change' }
  | {
      kind: 'progress';
      current: number;
      target: number;
      unit?: string;
      metadata?: JsonObject;
    }
  | {
      kind: 'complete';
      current: number;
      target: number;
      unit?: string;
      metadata?: JsonObject;
      evidence: {
        sourceType: string;
        sourceId: string;
        facts: JsonObject;
      };
    };

export interface RelicAchievementEvaluator {
  readonly key: string;
  readonly version: number;
  evaluate(input: RelicEvaluatorInput): Promise<RelicEvaluatorResult> | RelicEvaluatorResult;
}

const registryKey = (key: string, version: number): string => `${key}@${version}`;

export class RelicEvaluatorNotRegisteredError extends Error {
  constructor(key: string, version: number) {
    super(`No Relic evaluator is registered for ${registryKey(key, version)}.`);
    this.name = 'RelicEvaluatorNotRegisteredError';
  }
}

/** Versioned registry only; no product evaluators are chosen or generated here. */
export class RelicEvaluatorRegistry {
  private readonly evaluators = new Map<string, RelicAchievementEvaluator>();

  register(evaluator: RelicAchievementEvaluator): void {
    const key = registryKey(evaluator.key, evaluator.version);
    if (this.evaluators.has(key)) throw new Error(`Relic evaluator ${key} is already registered.`);
    this.evaluators.set(key, evaluator);
  }

  resolve(key: string, version: number): RelicAchievementEvaluator {
    const evaluator = this.evaluators.get(registryKey(key, version));
    if (!evaluator) throw new RelicEvaluatorNotRegisteredError(key, version);
    return evaluator;
  }
}

export interface EvaluateStoryRelicCommand {
  ownerId: string;
  storyId: string;
  assignmentId: string;
  observation: RelicObservation;
}

export type EvaluateStoryRelicResult =
  | { kind: 'no_change'; assignment: StoryRelicAssignment }
  | ({ kind: 'updated' } & ApplyRelicEvaluationResult);

/**
 * Coordinates an injected evaluator with durable storage. It intentionally has
 * no built-in generation, chapter scanning, trust policy, or verifier.
 */
export class RelicEvaluationService {
  constructor(
    private readonly repository: RelicRepository,
    private readonly evaluators: RelicEvaluatorRegistry,
  ) {}

  async evaluate(command: EvaluateStoryRelicCommand): Promise<EvaluateStoryRelicResult> {
    const assignment = await this.repository.getStoryAssignment(
      command.ownerId,
      command.storyId,
      command.assignmentId,
    );
    if (!assignment) throw new Error(`Story Relic assignment ${command.assignmentId} was not found.`);

    const condition = assignment.achievement.condition;
    const evaluator = this.evaluators.resolve(condition.evaluatorKey, condition.evaluatorVersion);
    const result = await evaluator.evaluate({
      assignment: cloneJson(assignment),
      observation: cloneJson(command.observation),
    });

    if (result.kind === 'no_change') return { kind: 'no_change', assignment };

    const application = await this.repository.applyEvaluation({
      ownerId: command.ownerId,
      storyId: command.storyId,
      assignmentId: command.assignmentId,
      progress: {
        current: result.current,
        target: result.target,
        unit: result.unit,
        metadata: cloneJson(result.metadata ?? {}),
      },
      evaluatedAt: command.observation.occurredAt,
      completionEvidence: result.kind === 'complete'
        ? [{
            schemaVersion: RELIC_SCHEMA_VERSION,
            evaluatorKey: evaluator.key,
            evaluatorVersion: evaluator.version,
            sourceType: result.evidence.sourceType,
            sourceId: result.evidence.sourceId,
            observedAt: command.observation.occurredAt,
            facts: cloneJson(result.evidence.facts),
          }]
        : undefined,
    });

    return { kind: 'updated', ...application };
  }
}
