import { assertCompletionEvidence, assertRelicTemplateDefinition, assertStoryRelicProgress, cloneJson, initialStoryRelicProgress, RelicValidationError, snapshotRelicTemplate } from '@seihouse/library/relics';
import {
  RelicConflictError,
  RelicNotFoundError,
  type ApplyRelicEvaluationCommand,
  type ApplyRelicEvaluationResult,
  type AssignStoryRelicCommand,
  type CreateRelicTemplateCommand,
  type RelicRepository,
  type UpdateRelicTemplateCommand,
} from './repository';
import { RELIC_SCHEMA_VERSION, type EarnedRelicRecord, type RelicAchievementTemplate, type StoryRelicAssignment } from '@seihouse/library/relics';

export interface InMemoryRelicRepositoryOptions {
  now?: () => string;
  idFactory?: (recordKind: 'template' | 'assignment' | 'earned') => string;
}

const defaultIdFactory = (recordKind: 'template' | 'assignment' | 'earned'): string => {
  const uuid = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${recordKind}-${uuid}`;
};

const assignmentKey = (storyId: string, templateId: string): string => `${storyId}\u0000${templateId}`;

const assertScope = (ownerId: string, storyId?: string): void => {
  const issues: string[] = [];
  if (!ownerId.trim()) issues.push('ownerId is required.');
  if (storyId !== undefined && !storyId.trim()) issues.push('storyId is required.');
  if (issues.length) throw new RelicValidationError(issues);
};

/**
 * Deterministic reference adapter used by domain tests and local reconstruction.
 * Production must use the relational store described by the migration.
 */
export class InMemoryRelicRepository implements RelicRepository {
  private readonly templates = new Map<string, RelicAchievementTemplate>();
  private readonly templateIdByKey = new Map<string, string>();
  private readonly assignments = new Map<string, StoryRelicAssignment>();
  private readonly assignmentIdByAchievement = new Map<string, string>();
  private readonly earnedRelics = new Map<string, EarnedRelicRecord>();
  private readonly earnedIdByAchievement = new Map<string, string>();
  private readonly now: () => string;
  private readonly idFactory: (recordKind: 'template' | 'assignment' | 'earned') => string;

  constructor(options: InMemoryRelicRepositoryOptions = {}) {
    this.now = options.now ?? (() => new Date().toISOString());
    this.idFactory = options.idFactory ?? defaultIdFactory;
  }

  async createTemplate(command: CreateRelicTemplateCommand): Promise<RelicAchievementTemplate> {
    assertRelicTemplateDefinition(command);
    if (this.templateIdByKey.has(command.key)) {
      throw new RelicConflictError(`Relic achievement template key ${command.key} already exists.`);
    }

    const id = command.id ?? this.idFactory('template');
    if (this.templates.has(id)) throw new RelicConflictError(`Relic achievement template ${id} already exists.`);
    const timestamp = this.now();
    const template: RelicAchievementTemplate = {
      schemaVersion: RELIC_SCHEMA_VERSION,
      id,
      key: command.key,
      version: 1,
      status: command.status,
      name: command.name,
      description: command.description,
      rarity: command.rarity,
      condition: cloneJson(command.condition),
      rewards: cloneJson(command.rewards),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.templates.set(id, template);
    this.templateIdByKey.set(template.key, id);
    return cloneJson(template);
  }

  async updateTemplate(command: UpdateRelicTemplateCommand): Promise<RelicAchievementTemplate> {
    const current = this.templates.get(command.templateId);
    if (!current) throw new RelicNotFoundError(`Relic achievement template ${command.templateId} was not found.`);
    if (current.version !== command.expectedVersion) {
      throw new RelicConflictError(
        `Relic achievement template ${command.templateId} changed from version ${command.expectedVersion} to ${current.version}.`,
      );
    }

    const definition = { key: current.key, ...command.definition };
    assertRelicTemplateDefinition(definition);
    const updated: RelicAchievementTemplate = {
      ...current,
      version: current.version + 1,
      status: command.definition.status,
      name: command.definition.name,
      description: command.definition.description,
      rarity: command.definition.rarity,
      condition: cloneJson(command.definition.condition),
      rewards: cloneJson(command.definition.rewards),
      updatedAt: this.now(),
    };
    this.templates.set(updated.id, updated);
    return cloneJson(updated);
  }

  async getTemplate(templateId: string): Promise<RelicAchievementTemplate | null> {
    const template = this.templates.get(templateId);
    return template ? cloneJson(template) : null;
  }

  async listTemplates(): Promise<RelicAchievementTemplate[]> {
    return [...this.templates.values()]
      .sort((left, right) => left.key.localeCompare(right.key))
      .map(cloneJson);
  }

  async assignToStory(command: AssignStoryRelicCommand): Promise<StoryRelicAssignment> {
    assertScope(command.ownerId, command.storyId);
    const template = this.templates.get(command.templateId);
    if (!template) throw new RelicNotFoundError(`Relic achievement template ${command.templateId} was not found.`);
    if (template.status !== 'active') {
      throw new RelicConflictError(`Relic achievement template ${command.templateId} is not active.`);
    }

    const uniqueKey = assignmentKey(command.storyId, command.templateId);
    const existingId = this.assignmentIdByAchievement.get(uniqueKey);
    if (existingId) {
      const existing = this.assignments.get(existingId)!;
      if (existing.ownerId !== command.ownerId) {
        throw new RelicConflictError('The story is already scoped to another owner.');
      }
      return cloneJson(existing);
    }

    const id = command.id ?? this.idFactory('assignment');
    if (this.assignments.has(id)) throw new RelicConflictError(`Story Relic assignment ${id} already exists.`);
    const timestamp = this.now();
    const assignment: StoryRelicAssignment = {
      schemaVersion: RELIC_SCHEMA_VERSION,
      id,
      ownerId: command.ownerId,
      storyId: command.storyId,
      templateId: command.templateId,
      status: 'assigned',
      achievement: snapshotRelicTemplate(template),
      progress: initialStoryRelicProgress(timestamp, command.progressTarget, command.progressUnit),
      assignedAt: timestamp,
      updatedAt: timestamp,
    };
    this.assignments.set(id, assignment);
    this.assignmentIdByAchievement.set(uniqueKey, id);
    return cloneJson(assignment);
  }

  async getStoryAssignment(
    ownerId: string,
    storyId: string,
    assignmentId: string,
  ): Promise<StoryRelicAssignment | null> {
    assertScope(ownerId, storyId);
    const assignment = this.assignments.get(assignmentId);
    if (!assignment || assignment.ownerId !== ownerId || assignment.storyId !== storyId) return null;
    return cloneJson(assignment);
  }

  async listStoryAssignments(ownerId: string, storyId: string): Promise<StoryRelicAssignment[]> {
    assertScope(ownerId, storyId);
    return [...this.assignments.values()]
      .filter(assignment => assignment.ownerId === ownerId && assignment.storyId === storyId)
      .sort((left, right) => left.assignedAt.localeCompare(right.assignedAt))
      .map(cloneJson);
  }

  async applyEvaluation(command: ApplyRelicEvaluationCommand): Promise<ApplyRelicEvaluationResult> {
    assertScope(command.ownerId, command.storyId);
    const assignment = this.assignments.get(command.assignmentId);
    if (!assignment || assignment.ownerId !== command.ownerId || assignment.storyId !== command.storyId) {
      throw new RelicNotFoundError(`Story Relic assignment ${command.assignmentId} was not found.`);
    }
    if (assignment.status === 'disabled') {
      throw new RelicConflictError(`Story Relic assignment ${command.assignmentId} is disabled.`);
    }

    const uniqueKey = assignmentKey(assignment.storyId, assignment.templateId);
    const existingEarnedId = this.earnedIdByAchievement.get(uniqueKey);
    if (existingEarnedId) {
      return {
        assignment: cloneJson(assignment),
        earnedRelic: cloneJson(this.earnedRelics.get(existingEarnedId)!),
        earningCreated: false,
      };
    }

    const progress = {
      ...cloneJson(command.progress),
      updatedAt: command.evaluatedAt,
    };
    assertStoryRelicProgress(progress);
    if (progress.current < assignment.progress.current) {
      throw new RelicConflictError('Relic achievement progress cannot move backwards.');
    }

    const evidence = command.completionEvidence?.map(item => {
      assertCompletionEvidence(item);
      if (
        item.evaluatorKey !== assignment.achievement.condition.evaluatorKey
        || item.evaluatorVersion !== assignment.achievement.condition.evaluatorVersion
      ) {
        throw new RelicConflictError('Completion evidence does not match the assigned evaluator.');
      }
      return cloneJson(item);
    });

    if (evidence && evidence.length === 0) {
      throw new RelicValidationError(['completionEvidence cannot be empty when supplied.']);
    }
    if (evidence && progress.current !== progress.target) {
      throw new RelicConflictError('A Relic cannot be earned before its stored progress is complete.');
    }

    const timestamp = command.evaluatedAt;
    const updatedAssignment: StoryRelicAssignment = {
      ...assignment,
      status: evidence ? 'earned' : progress.current > 0 ? 'in_progress' : assignment.status,
      progress,
      updatedAt: timestamp,
      earnedAt: evidence ? timestamp : assignment.earnedAt,
    };
    this.assignments.set(updatedAssignment.id, updatedAssignment);

    if (!evidence) {
      return { assignment: cloneJson(updatedAssignment), earnedRelic: null, earningCreated: false };
    }

    const earnedRelic: EarnedRelicRecord = {
      schemaVersion: RELIC_SCHEMA_VERSION,
      id: this.idFactory('earned'),
      ownerId: assignment.ownerId,
      storyId: assignment.storyId,
      assignmentId: assignment.id,
      templateId: assignment.templateId,
      achievement: cloneJson(assignment.achievement),
      completionEvidence: evidence,
      earnedAt: timestamp,
    };
    this.earnedRelics.set(earnedRelic.id, earnedRelic);
    this.earnedIdByAchievement.set(uniqueKey, earnedRelic.id);
    return {
      assignment: cloneJson(updatedAssignment),
      earnedRelic: cloneJson(earnedRelic),
      earningCreated: true,
    };
  }

  async getEarnedRelicForAchievement(
    ownerId: string,
    storyId: string,
    templateId: string,
  ): Promise<EarnedRelicRecord | null> {
    assertScope(ownerId, storyId);
    const earnedId = this.earnedIdByAchievement.get(assignmentKey(storyId, templateId));
    if (!earnedId) return null;
    const earnedRelic = this.earnedRelics.get(earnedId)!;
    return earnedRelic.ownerId === ownerId ? cloneJson(earnedRelic) : null;
  }

  async listEarnedRelics(ownerId: string, storyId?: string): Promise<EarnedRelicRecord[]> {
    assertScope(ownerId, storyId);
    return [...this.earnedRelics.values()]
      .filter(record => record.ownerId === ownerId && (storyId === undefined || record.storyId === storyId))
      .sort((left, right) => left.earnedAt.localeCompare(right.earnedAt))
      .map(cloneJson);
  }
}
