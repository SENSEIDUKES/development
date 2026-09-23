import type { DeliveredRewardGrant } from '@seihouse/library/rewards';
import {
  MysteryScrollNotFoundError,
  type AchievementRepository,
  type MintScrollCommand,
  type RecordActivityCommand,
} from './repository';
import type { ActivityRecord, MysteryScrollRecord } from './types';

const newId = (kind: string): string => `${kind}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`}`;
const clone = <T,>(value: T): T => structuredClone(value);

/**
 * The achievement rules without a database: deterministic, synchronous inside
 * each call, so the idempotency and once-per-account guards hold for the
 * Workshop and tests exactly as the migration's unique constraints do.
 */
export class InMemoryAchievementRepository implements AchievementRepository {
  private readonly activities = new Map<string, ActivityRecord[]>();
  private readonly scrolls = new Map<string, MysteryScrollRecord[]>();
  private readonly idFactory: (kind: 'activity' | 'scroll') => string;

  constructor(options: { idFactory?: (kind: 'activity' | 'scroll') => string } = {}) {
    this.idFactory = options.idFactory ?? newId;
  }

  async recordActivity(command: RecordActivityCommand): Promise<{ activity: ActivityRecord; replayed: boolean }> {
    const history = this.activities.get(command.uid) ?? [];
    this.activities.set(command.uid, history);
    const existing = history.find(activity => activity.idempotencyKey === command.idempotencyKey);
    if (existing) return { activity: clone(existing), replayed: true };
    const activity: ActivityRecord = {
      id: this.idFactory('activity'),
      uid: command.uid,
      kind: command.kind,
      subjectId: command.subjectId,
      storyId: command.storyId,
      idempotencyKey: command.idempotencyKey,
      occurredAt: command.occurredAt,
      metadata: clone(command.metadata ?? {}),
    };
    history.push(activity);
    return { activity: clone(activity), replayed: false };
  }

  async listActivities(uid: string): Promise<ActivityRecord[]> {
    return (this.activities.get(uid) ?? []).map(clone);
  }

  async mintScroll(command: MintScrollCommand): Promise<{ scroll: MysteryScrollRecord; created: boolean }> {
    const owned = this.scrolls.get(command.uid) ?? [];
    this.scrolls.set(command.uid, owned);
    const existing = owned.find(scroll => scroll.achievement.key === command.achievement.key);
    if (existing) return { scroll: clone(existing), created: false };
    const scroll: MysteryScrollRecord = {
      id: this.idFactory('scroll'),
      uid: command.uid,
      achievement: clone(command.achievement),
      evidence: clone(command.evidence),
      status: 'sealed',
      delivered: null,
      earnedAt: command.earnedAt,
      openedAt: null,
    };
    owned.push(scroll);
    return { scroll: clone(scroll), created: true };
  }

  async listScrolls(uid: string): Promise<MysteryScrollRecord[]> {
    return [...(this.scrolls.get(uid) ?? [])]
      .sort((left, right) => right.earnedAt.localeCompare(left.earnedAt))
      .map(clone);
  }

  private owned(uid: string, scrollId: string): MysteryScrollRecord {
    const scroll = (this.scrolls.get(uid) ?? []).find(candidate => candidate.id === scrollId);
    if (!scroll) throw new MysteryScrollNotFoundError(`Mystery Scroll ${scrollId} was not found.`);
    return scroll;
  }

  async getScroll(uid: string, scrollId: string): Promise<MysteryScrollRecord | null> {
    const scroll = (this.scrolls.get(uid) ?? []).find(candidate => candidate.id === scrollId);
    return scroll ? clone(scroll) : null;
  }

  async recordDelivery(uid: string, scrollId: string, delivered: DeliveredRewardGrant[]): Promise<MysteryScrollRecord> {
    const scroll = this.owned(uid, scrollId);
    scroll.delivered ??= clone(delivered);
    return clone(scroll);
  }

  async completeOpening(uid: string, scrollId: string, delivered: DeliveredRewardGrant[] | null, openedAt: string): Promise<{ scroll: MysteryScrollRecord; opened: boolean }> {
    const scroll = this.owned(uid, scrollId);
    if (scroll.status === 'opened') return { scroll: clone(scroll), opened: false };
    scroll.status = 'opened';
    scroll.openedAt = openedAt;
    if (delivered) scroll.delivered ??= clone(delivered);
    return { scroll: clone(scroll), opened: true };
  }

  /** Test and development helper. */
  reset(uid: string): void {
    this.activities.delete(uid);
    this.scrolls.delete(uid);
  }
}
