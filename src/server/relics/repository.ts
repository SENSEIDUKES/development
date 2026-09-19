import { type EarnedRelicRecord, type JsonObject, type RelicAchievementTemplate, type RelicCompletionEvidence, type StoryRelicAssignment } from '@seihouse/library/relics';
import { type RelicTemplateDefinition } from '@seihouse/library/relics';

export class RelicConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RelicConflictError';
  }
}

export class RelicNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RelicNotFoundError';
  }
}

export interface CreateRelicTemplateCommand extends RelicTemplateDefinition {
  id?: string;
}

export interface UpdateRelicTemplateCommand {
  templateId: string;
  expectedVersion: number;
  definition: Omit<RelicTemplateDefinition, 'key'>;
}

export interface AssignStoryRelicCommand {
  id?: string;
  ownerId: string;
  storyId: string;
  templateId: string;
  progressTarget?: number;
  progressUnit?: string;
}

export interface ApplyRelicEvaluationCommand {
  ownerId: string;
  storyId: string;
  assignmentId: string;
  progress: {
    current: number;
    target: number;
    unit?: string;
    metadata: JsonObject;
  };
  evaluatedAt: string;
  completionEvidence?: RelicCompletionEvidence[];
}

export interface ApplyRelicEvaluationResult {
  assignment: StoryRelicAssignment;
  earnedRelic: EarnedRelicRecord | null;
  earningCreated: boolean;
}

/**
 * Durable Relic storage boundary. A production adapter should execute each
 * evaluation application atomically; the Postgres migration supplies the
 * final concurrency guard for earning uniqueness.
 */
export interface RelicRepository {
  createTemplate(command: CreateRelicTemplateCommand): Promise<RelicAchievementTemplate>;
  updateTemplate(command: UpdateRelicTemplateCommand): Promise<RelicAchievementTemplate>;
  getTemplate(templateId: string): Promise<RelicAchievementTemplate | null>;
  listTemplates(): Promise<RelicAchievementTemplate[]>;

  assignToStory(command: AssignStoryRelicCommand): Promise<StoryRelicAssignment>;
  getStoryAssignment(
    ownerId: string,
    storyId: string,
    assignmentId: string,
  ): Promise<StoryRelicAssignment | null>;
  listStoryAssignments(ownerId: string, storyId: string): Promise<StoryRelicAssignment[]>;
  applyEvaluation(command: ApplyRelicEvaluationCommand): Promise<ApplyRelicEvaluationResult>;

  getEarnedRelicForAchievement(
    ownerId: string,
    storyId: string,
    templateId: string,
  ): Promise<EarnedRelicRecord | null>;
  listEarnedRelics(ownerId: string, storyId?: string): Promise<EarnedRelicRecord[]>;
}
