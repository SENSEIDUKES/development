import {
  describeRewardGrants,
  isLibraryActivityKind,
  LIBRARY_ACTIVITY_LABELS,
  type AchievementsSnapshot,
  type AchievementView,
  type LibraryActivityKind,
  type MysteryScrollView,
  type OpenMysteryScrollResponse,
  type RecordLibraryActivityInput,
  type RecordLibraryActivityResponse,
} from '@seihouse/library/rewards';
import type { DaoXpLedger } from '../dao-xp/daoXpLedger';
import type { LibraryPrincipal } from '../identity/types';
import type { RewardDeliverer } from '../rewards/deliverer';
import { LIBRARY_ACHIEVEMENTS, validateAchievementCatalog, type AchievementDefinition } from './catalog';
import { DEFAULT_ACHIEVEMENTS_CONFIG, type AchievementsConfig } from './config';
import { createDefaultEvaluatorRegistry, type AchievementEvaluatorRegistry } from './evaluators';
import { AchievementValidationError, MysteryScrollNotFoundError, type AchievementRepository } from './repository';
import type { ActivityRecord, AchievementSnapshot, MysteryScrollRecord } from './types';

export interface AchievementServiceDependencies {
  repository: AchievementRepository;
  deliverer: RewardDeliverer;
  /** Read only for the optional creation daily cap; credits always go through the deliverer. */
  daoXp: DaoXpLedger;
  config?: AchievementsConfig;
  definitions?: readonly AchievementDefinition[];
  evaluators?: AchievementEvaluatorRegistry;
  now?: () => Date;
}

const HIDDEN_NAME = 'Hidden achievement';
const HIDDEN_DESCRIPTION = 'Keep reading, creating, and exploring — this goal reveals itself when you earn it.';

const snapshotOf = (definition: AchievementDefinition): AchievementSnapshot => ({
  key: definition.key,
  version: definition.version,
  category: definition.category,
  name: definition.name,
  description: definition.description,
  rarity: definition.rarity,
  presentation: definition.presentation,
  rewards: definition.rewards.map(grant => ({ ...grant })),
});

/**
 * What a cultivator may see of one scroll. A sealed concealed scroll keeps its
 * rarity and contents on the server; a curated milestone shows its reward
 * upfront; an opened scroll shows everything, including what landed.
 */
export function projectMysteryScroll(scroll: MysteryScrollRecord): MysteryScrollView {
  const revealed = scroll.status === 'opened' || scroll.achievement.presentation === 'curated';
  return {
    id: scroll.id,
    achievementKey: scroll.achievement.key,
    achievementName: scroll.achievement.name,
    category: scroll.achievement.category,
    presentation: scroll.achievement.presentation,
    status: scroll.status,
    rarity: revealed ? scroll.achievement.rarity : null,
    rewards: revealed ? scroll.achievement.rewards.map(grant => ({ ...grant })) : null,
    delivered: revealed && scroll.delivered ? scroll.delivered.map(grant => ({ ...grant })) : null,
    earnedAt: scroll.earnedAt,
    openedAt: scroll.openedAt,
  };
}

const assertText = (value: unknown, field: string, issues: string[], optional = false) => {
  if (value === undefined && optional) return;
  if (typeof value !== 'string' || !value.trim() || value.length > 200) issues.push(`${field} must be 1–200 characters.`);
};

/**
 * The achievement engine: records trusted activity, evaluates every active
 * Library goal against it, mints one Mystery Scroll per earned achievement,
 * credits creation DAO XP directly, and opens scrolls. Every grant goes
 * through the reward deliverer, so the reward policy and each ledger's
 * idempotency guard apply to all of it.
 */
export class AchievementService {
  private readonly repository: AchievementRepository;
  private readonly deliverer: RewardDeliverer;
  private readonly daoXp: DaoXpLedger;
  readonly config: AchievementsConfig;
  private readonly definitions: readonly AchievementDefinition[];
  private readonly evaluators: AchievementEvaluatorRegistry;
  private readonly now: () => Date;

  constructor(dependencies: AchievementServiceDependencies) {
    this.repository = dependencies.repository;
    this.deliverer = dependencies.deliverer;
    this.daoXp = dependencies.daoXp;
    this.config = dependencies.config ?? DEFAULT_ACHIEVEMENTS_CONFIG;
    this.evaluators = dependencies.evaluators ?? createDefaultEvaluatorRegistry();
    this.definitions = validateAchievementCatalog(dependencies.definitions ?? LIBRARY_ACHIEVEMENTS, this.evaluators);
    this.now = dependencies.now ?? (() => new Date());
  }

  async getSnapshot(principal: Pick<LibraryPrincipal, 'uid'>): Promise<AchievementsSnapshot> {
    const [activities, scrolls] = await Promise.all([
      this.repository.listActivities(principal.uid),
      this.repository.listScrolls(principal.uid),
    ]);
    return this.snapshotFrom(principal.uid, activities, scrolls);
  }

  private snapshotFrom(uid: string, activities: readonly ActivityRecord[], scrolls: readonly MysteryScrollRecord[]): AchievementsSnapshot {
    const earned = new Map(scrolls.map(scroll => [scroll.achievement.key, scroll]));
    const achievements = this.definitions.map((definition): AchievementView => {
      const scroll = earned.get(definition.key);
      const curated = definition.presentation === 'curated';
      if (scroll) {
        const opened = scroll.status === 'opened';
        const target = Number(scroll.evidence[0]?.facts.target ?? 1);
        return {
          key: definition.key, category: scroll.achievement.category, status: 'earned', hidden: false,
          name: scroll.achievement.name, description: scroll.achievement.description,
          presentation: scroll.achievement.presentation,
          rarity: opened || scroll.achievement.presentation === 'curated' ? scroll.achievement.rarity : null,
          progress: { current: target, target, unit: definition.progressUnit },
          curatedRewards: scroll.achievement.presentation === 'curated' ? scroll.achievement.rewards.map(grant => ({ ...grant })) : null,
          scrollId: scroll.id, earnedAt: scroll.earnedAt,
        };
      }
      const hidden = definition.hidden;
      const base = {
        key: definition.key, category: definition.category, hidden,
        name: hidden ? HIDDEN_NAME : definition.name,
        description: hidden ? HIDDEN_DESCRIPTION : definition.description,
        presentation: definition.presentation,
        rarity: curated && !hidden ? definition.rarity : null,
        curatedRewards: curated && !hidden ? definition.rewards.map(grant => ({ ...grant })) : null,
        scrollId: null, earnedAt: null,
      };
      if (definition.status === 'planned') return { ...base, status: 'planned', progress: null };
      const evaluation = this.evaluate(definition, activities);
      return {
        ...base,
        status: evaluation.current > 0 ? 'in-progress' : 'locked',
        progress: hidden ? null : { current: evaluation.current, target: evaluation.target, unit: definition.progressUnit },
      };
    });
    return {
      uid,
      achievements,
      scrolls: scrolls.map(projectMysteryScroll),
      delivery: this.config.delivery,
      creationDaoXp: { perActivity: { ...this.config.creationDaoXp }, dailyCap: this.config.creationDailyCap },
      updatedAt: this.now().toISOString(),
    };
  }

  private evaluate(definition: AchievementDefinition, activities: readonly ActivityRecord[]) {
    const evaluator = this.evaluators.resolve(definition.condition.evaluatorKey, definition.condition.evaluatorVersion);
    return { evaluator, ...evaluator.evaluate(definition.condition.parameters, activities) };
  }

  /**
   * Records one trusted activity and applies everything it earns. The host
   * calls this from its own servers; the Workshop reaches it through the
   * development-only HTTP operation. Repeating an activity changes nothing.
   */
  async recordActivity(uid: string, input: RecordLibraryActivityInput & { idempotencyKey?: string }): Promise<RecordLibraryActivityResponse> {
    const issues: string[] = [];
    if (!uid?.trim()) issues.push('A user id is required.');
    if (!isLibraryActivityKind(input.kind)) issues.push('The activity kind is unknown.');
    assertText(input.subjectId, 'subjectId', issues);
    assertText(input.storyId, 'storyId', issues, true);
    if (issues.length) throw new AchievementValidationError(issues);

    const occurredAt = this.now().toISOString();
    const { activity, replayed } = await this.repository.recordActivity({
      uid, kind: input.kind, subjectId: input.subjectId.trim(), storyId: input.storyId?.trim() ?? null,
      idempotencyKey: input.idempotencyKey ?? `${input.kind}:${input.subjectId.trim()}`,
      occurredAt,
    });
    if (replayed) {
      return { recorded: false, earned: [], creationDaoXp: 0, snapshot: await this.getSnapshot({ uid }) };
    }

    const creationDaoXp = await this.creditCreation(uid, activity);
    const activities = await this.repository.listActivities(uid);
    const earnedKeys = new Set((await this.repository.listScrolls(uid)).map(scroll => scroll.achievement.key));
    const earned: MysteryScrollRecord[] = [];
    for (const definition of this.definitions) {
      if (definition.status !== 'active' || earnedKeys.has(definition.key)) continue;
      const evaluator = this.evaluators.resolve(definition.condition.evaluatorKey, definition.condition.evaluatorVersion);
      if (!evaluator.kinds(definition.condition.parameters).includes(activity.kind)) continue;
      const evaluation = evaluator.evaluate(definition.condition.parameters, activities);
      if (!evaluation.complete) continue;
      const completing = evaluation.completingActivity ?? activity;
      const { scroll, created } = await this.repository.mintScroll({
        uid,
        achievement: snapshotOf(definition),
        evidence: [{
          evaluatorKey: evaluator.key,
          evaluatorVersion: evaluator.version,
          sourceType: 'library-activity',
          sourceId: completing.id,
          observedAt: completing.occurredAt,
          facts: evaluation.facts,
        }],
        earnedAt: occurredAt,
      });
      if (!created) continue;
      earned.push(this.config.delivery === 'on-earn' ? await this.deliverOnEarn(scroll) : scroll);
    }
    return {
      recorded: true,
      earned: earned.map(projectMysteryScroll),
      creationDaoXp,
      snapshot: await this.getSnapshot({ uid }),
    };
  }

  /** Creation credits DAO XP directly, idempotently per activity, within the optional daily cap. */
  private async creditCreation(uid: string, activity: ActivityRecord): Promise<number> {
    const configured = this.config.creationDaoXp[activity.kind as LibraryActivityKind] ?? 0;
    if (configured <= 0) return 0;
    let amount = configured;
    if (this.config.creationDailyCap !== null) {
      const today = activity.occurredAt.slice(0, 10);
      const earnedToday = (await this.daoXp.listTransactions(uid, 1_000))
        .filter(line => line.source === 'creation' && line.createdAt.slice(0, 10) === today)
        .reduce((total, line) => total + line.amount, 0);
      amount = Math.max(0, Math.min(configured, this.config.creationDailyCap - earnedToday));
    }
    if (amount <= 0) return 0;
    await this.deliverer.deliver({
      uid, source: 'creation', grants: [{ type: 'dao-xp', amount }],
      keyPrefix: `creation:${activity.idempotencyKey}`,
      description: `${LIBRARY_ACTIVITY_LABELS[activity.kind]} · creation`,
      metadata: { activityId: activity.id, kind: activity.kind, subjectId: activity.subjectId },
    });
    return amount;
  }

  private deliver(scroll: MysteryScrollRecord) {
    return this.deliverer.deliver({
      uid: scroll.uid,
      source: 'mystery-scroll',
      grants: scroll.achievement.rewards,
      keyPrefix: `mystery-scroll:${scroll.id}`,
      description: `${scroll.achievement.name} · Mystery Scroll`,
      metadata: { scrollId: scroll.id, achievementKey: scroll.achievement.key },
    });
  }

  private async deliverOnEarn(scroll: MysteryScrollRecord): Promise<MysteryScrollRecord> {
    return this.repository.recordDelivery(scroll.uid, scroll.id, await this.deliver(scroll));
  }

  /**
   * Opens one sealed scroll the principal owns. Under `on-open` delivery the
   * reward reaches the ledgers here; a scroll whose earlier delivery was
   * interrupted is completed here too. Repeating the call replays the first
   * opening and never credits twice.
   */
  async openScroll(principal: Pick<LibraryPrincipal, 'uid'>, scrollId: string): Promise<OpenMysteryScrollResponse> {
    if (typeof scrollId !== 'string' || !scrollId.trim()) throw new AchievementValidationError(['A scroll id is required.']);
    const scroll = await this.repository.getScroll(principal.uid, scrollId);
    if (!scroll) throw new MysteryScrollNotFoundError(`Mystery Scroll ${scrollId} was not found.`);
    if (scroll.status === 'opened') {
      return {
        outcome: 'already-opened',
        message: `${scroll.achievement.name} was already opened.`,
        scroll: projectMysteryScroll(scroll),
        snapshot: await this.getSnapshot(principal),
      };
    }
    const delivered = scroll.delivered ?? await this.deliver(scroll);
    const { scroll: stored, opened } = await this.repository.completeOpening(principal.uid, scrollId, delivered, this.now().toISOString());
    return {
      outcome: opened ? 'opened' : 'already-opened',
      message: opened
        ? `${stored.achievement.name}: ${describeRewardGrants(stored.achievement.rewards)}.`
        : `${stored.achievement.name} was already opened.`,
      scroll: projectMysteryScroll(stored),
      snapshot: await this.getSnapshot(principal),
    };
  }
}
