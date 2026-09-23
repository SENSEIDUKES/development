import type { DeliveredRewardGrant, LibraryActivityKind } from '@seihouse/library/rewards';
import type { JsonObject } from '../qi/qiLedger';
import type { ActivityRecord, AchievementSnapshot, CompletionEvidence, MysteryScrollRecord } from './types';

export class AchievementValidationError extends Error {
  readonly issues: string[];
  constructor(issues: string[]) {
    super(issues.join(' '));
    this.name = 'AchievementValidationError';
    this.issues = issues;
  }
}

export class MysteryScrollNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MysteryScrollNotFoundError';
  }
}

export interface RecordActivityCommand {
  uid: string;
  kind: LibraryActivityKind;
  subjectId: string;
  storyId: string | null;
  idempotencyKey: string;
  occurredAt: string;
  metadata?: JsonObject;
}

export interface MintScrollCommand {
  uid: string;
  achievement: AchievementSnapshot;
  evidence: CompletionEvidence[];
  earnedAt: string;
}

/**
 * Durable achievement storage. Each method is one atomic unit of work:
 *
 * - `recordActivity` is idempotent per (uid, idempotencyKey);
 * - `mintScroll` is idempotent per (uid, achievement key) — an achievement is
 *   earned once per account even if two evaluations race;
 * - `completeOpening` moves a sealed scroll to opened once, storing what the
 *   ledgers delivered, and returns the stored scroll to every later caller.
 *
 * The Postgres migration carries those guards as unique constraints; the
 * in-memory adapter mirrors them for tests and the Workshop.
 */
export interface AchievementRepository {
  recordActivity(command: RecordActivityCommand): Promise<{ activity: ActivityRecord; replayed: boolean }>;
  listActivities(uid: string): Promise<ActivityRecord[]>;
  mintScroll(command: MintScrollCommand): Promise<{ scroll: MysteryScrollRecord; created: boolean }>;
  listScrolls(uid: string): Promise<MysteryScrollRecord[]>;
  getScroll(uid: string, scrollId: string): Promise<MysteryScrollRecord | null>;
  /** Records what an on-earn delivery credited, without opening the scroll. */
  recordDelivery(uid: string, scrollId: string, delivered: DeliveredRewardGrant[]): Promise<MysteryScrollRecord>;
  completeOpening(uid: string, scrollId: string, delivered: DeliveredRewardGrant[] | null, openedAt: string): Promise<{ scroll: MysteryScrollRecord; opened: boolean }>;
}
