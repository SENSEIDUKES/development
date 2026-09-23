import type {
  AchievementCategory,
  DeliveredRewardGrant,
  LibraryActivityKind,
  MysteryScrollPresentation,
  RewardGrant,
  RewardRarity,
} from '@seihouse/library/rewards';
import type { JsonObject } from '../qi/qiLedger';

/** One trusted activity. One record per (uid, idempotencyKey); a repeat is a replay. */
export interface ActivityRecord {
  id: string;
  uid: string;
  kind: LibraryActivityKind;
  subjectId: string;
  storyId: string | null;
  idempotencyKey: string;
  occurredAt: string;
  metadata: JsonObject;
}

/**
 * Immutable evidence of the evaluation that earned a scroll: which evaluator
 * and version decided it, which activity completed it, and the facts it saw.
 * Carried over from the Relic v3 foundation's completion evidence.
 */
export interface CompletionEvidence {
  evaluatorKey: string;
  evaluatorVersion: number;
  sourceType: 'library-activity';
  sourceId: string;
  observedAt: string;
  facts: JsonObject;
}

/** The definition as it stood when the scroll was earned; later edits never rewrite it. */
export interface AchievementSnapshot {
  key: string;
  version: number;
  category: AchievementCategory;
  name: string;
  description: string;
  rarity: RewardRarity;
  presentation: MysteryScrollPresentation;
  rewards: RewardGrant[];
}

/**
 * One earned achievement and its Mystery Scroll. Unique per (uid,
 * achievementKey): an achievement is earned once per account.
 */
export interface MysteryScrollRecord {
  id: string;
  uid: string;
  achievement: AchievementSnapshot;
  evidence: CompletionEvidence[];
  status: 'sealed' | 'opened';
  /** The ledger lines the reward became, once delivered. */
  delivered: DeliveredRewardGrant[] | null;
  earnedAt: string;
  openedAt: string | null;
}
