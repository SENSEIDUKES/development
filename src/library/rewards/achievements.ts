/**
 * Achievement and Mystery Scroll contracts shared by the server-owned
 * achievement engine and every Library surface.
 *
 * Achievements are Library-defined goals that recognize natural activity —
 * reading, creation, exploration, and eventually other media. The server
 * records trusted activity, evaluates every active goal against it, and mints
 * one Mystery Scroll per earned achievement. A scroll is the reward mechanic:
 *
 * - `concealed` scrolls hide their rarity and contents until opened;
 * - `curated` scrolls (selected major milestones) show their reward upfront.
 *
 * Opening is the only browser action. The browser never names an amount, an
 * achievement, or a reward; it asks the server to open a scroll it owns and
 * renders the answer.
 */
import type { DeliveredRewardGrant, RewardGrant, RewardRarity } from './contracts';

export type AchievementCategory = 'reading' | 'creation' | 'exploration' | 'media';

export const ACHIEVEMENT_CATEGORY_LABELS: Readonly<Record<AchievementCategory, string>> = {
  reading: 'Reading',
  creation: 'Creation',
  exploration: 'Exploration',
  media: 'Other media',
};

/**
 * Trusted Library activity the engine evaluates. A host records these from
 * its own servers (reader progress, accepted chapters, Codex opens); a
 * browser never reports one directly outside the Workshop's development
 * simulator.
 */
export const LIBRARY_ACTIVITY_KINDS = [
  'chapter.read',
  'story.created',
  'chapter.created',
  'codex.entry-opened',
  'world.visited',
  'media.experienced',
] as const;
export type LibraryActivityKind = (typeof LIBRARY_ACTIVITY_KINDS)[number];

export const LIBRARY_ACTIVITY_CATEGORY: Readonly<Record<LibraryActivityKind, AchievementCategory>> = {
  'chapter.read': 'reading',
  'story.created': 'creation',
  'chapter.created': 'creation',
  'codex.entry-opened': 'exploration',
  'world.visited': 'exploration',
  'media.experienced': 'media',
};

export const LIBRARY_ACTIVITY_LABELS: Readonly<Record<LibraryActivityKind, string>> = {
  'chapter.read': 'Read a chapter',
  'story.created': 'Create a story',
  'chapter.created': 'Create a chapter',
  'codex.entry-opened': 'Open a Codex entry',
  'world.visited': 'Visit another creator’s world',
  'media.experienced': 'Experience other media',
};

export const isLibraryActivityKind = (value: unknown): value is LibraryActivityKind =>
  typeof value === 'string' && (LIBRARY_ACTIVITY_KINDS as readonly string[]).includes(value);

export type MysteryScrollPresentation = 'concealed' | 'curated';
/** When an earned scroll's reward reaches the ledgers. A configurable development default, not a settled decision. */
export type MysteryScrollDelivery = 'on-open' | 'on-earn';

export type AchievementStatus = 'planned' | 'locked' | 'in-progress' | 'earned';

/** One goal as a cultivator may see it. Hidden goals stay redacted until earned. */
export interface AchievementView {
  key: string;
  category: AchievementCategory;
  status: AchievementStatus;
  /** True while the goal's name, description and progress are redacted. */
  hidden: boolean;
  name: string;
  description: string;
  presentation: MysteryScrollPresentation;
  /** Null while hidden, or while a concealed scroll is still sealed. */
  rarity: RewardRarity | null;
  /** Null while hidden or planned. */
  progress: { current: number; target: number; unit: string } | null;
  /** The reward a curated milestone shows upfront; always null for concealed goals. */
  curatedRewards: RewardGrant[] | null;
  scrollId: string | null;
  earnedAt: string | null;
}

export type MysteryScrollStatus = 'sealed' | 'opened';

/** One earned scroll. A sealed concealed scroll carries no rarity or contents. */
export interface MysteryScrollView {
  id: string;
  achievementKey: string;
  achievementName: string;
  category: AchievementCategory;
  presentation: MysteryScrollPresentation;
  status: MysteryScrollStatus;
  rarity: RewardRarity | null;
  rewards: RewardGrant[] | null;
  /** What landed on the ledgers, once delivered and visible. */
  delivered: DeliveredRewardGrant[] | null;
  earnedAt: string;
  openedAt: string | null;
}

export interface AchievementsSnapshot {
  uid: string;
  achievements: AchievementView[];
  /** Newest first. */
  scrolls: MysteryScrollView[];
  delivery: MysteryScrollDelivery;
  /** DAO XP credited directly for creation, per activity, and the optional daily cap. */
  creationDaoXp: { perActivity: Partial<Record<LibraryActivityKind, number>>; dailyCap: number | null };
  updatedAt: string;
}

export interface OpenMysteryScrollResponse {
  outcome: 'opened' | 'already-opened';
  message: string;
  scroll: MysteryScrollView;
  snapshot: AchievementsSnapshot;
}

/** Development-only: the Workshop's stand-in for a host recording trusted activity. */
export interface RecordLibraryActivityInput {
  kind: LibraryActivityKind;
  /** What the activity was about, e.g. `story-7:12` for chapter 12 of story 7. */
  subjectId: string;
  /** The story it belongs to, when it belongs to one. */
  storyId?: string;
}

export interface RecordLibraryActivityResponse {
  /** False when the same activity was already recorded; nothing moved. */
  recorded: boolean;
  /** Scrolls this activity earned. */
  earned: MysteryScrollView[];
  /** DAO XP this activity credited directly for creation. */
  creationDaoXp: number;
  snapshot: AchievementsSnapshot;
}

export type AchievementsHttpOperation =
  | { operation: 'open-scroll'; scrollId: string }
  | ({ operation: 'development.record-activity' } & RecordLibraryActivityInput);

export interface AchievementsHttpError {
  error: string;
  code: 'unauthenticated' | 'forbidden' | 'invalid_request' | 'not_found' | 'method_not_allowed' | 'unavailable';
}

export const ACHIEVEMENTS_API_PATH = '/api/library-economy?capability=achievements';
