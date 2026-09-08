/**
 * Domain types for the User Profile replica.
 *
 * Copied from `SENSEIDUKES/Light-Novels` `src/types.ts`, trimmed to exactly
 * the fields the profile surfaces read. Production's `UserProfile` carries
 * extra portrait-delivery/media-descriptor fields that only matter to the
 * services layer; they are intentionally omitted here so the Workshop replica
 * cannot grow a dependency on production media contracts. Field names and
 * literal unions are preserved verbatim — they are persisted values and API
 * compatibility strings, not developer-facing names.
 */

export interface StatusEffectDef {
  name: string;
  type: 'Curse' | 'Blessing' | 'Affliction' | 'Mutation';
  description: string;
  durationMs: number;
  scope: 'Account-wide' | 'Story-specific';
  visual?: string;
  counterplay?: string;
  rewardHook?: string;
  qiMultiplier?: number;
  sectQiMultiplier?: number;
  targetProgress?: number;
}

export interface ActiveStatusEffect {
  id: string;
  effectDef: StatusEffectDef;
  appliedAt: string;
  expiresAt: string;
  sourceArtifactId?: string;
  progress?: number;
  targetProgress?: number;
  completedAt?: string;
  isUnlockedReward?: boolean;
}

export interface SpecialUnlockDef {
  type:
    | 'cosmetic'
    | 'sen_workshop'
    | 'customization'
    | 'profile_item'
    | 'badge'
    | 'theme'
    | 'other';
  label: string;
  description?: string;
}

export interface CosmicArtifact {
  id: string;
  name: string;
  description: string;
  unlockedAt: string;
  sourceStoryId?: string;
  sourceStoryTitle?: string;
  sourceChapterNumber?: number;
  eventKey?: string;
  milestoneType:
    | 'chapter_seal'
    | 'rank_up'
    | 'challenge_complete'
    | 'first_breakthrough'
    | 'streak_attained'
    | 'codex_linked';
  milestoneName: string;
  imageUrl?: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic' | 'Transcendent';
  attributeBoost?: string;
  statusEffectDef?: StatusEffectDef;
  specialUnlock?: SpecialUnlockDef | string;

  // Weekly Offering System
  offeringWeekId?: string;
  gatheredAt?: string;
  status?: 'unsubmitted' | 'submitted' | 'auto_submitted';
  rewardValueQi?: number;
  rewardValueSectMerit?: number;
}

export type ChapterWritingStyle =
  | 'Standard'
  | 'Clear Reading'
  | 'Easy Read'
  | 'Literal Reading';

export type PremiumTier =
  | 'mortal'
  | 'outer_sect'
  | 'inner_sect'
  | 'sect_master'
  | 'immortal';

export type AccountRole = 'owner' | 'admin' | 'user';

export interface UserProfile {
  uid: string;
  username: string;
  displayName: string;
  displayNameColor?: string;
  avatarUrl: string;
  activePortraitId?: string;
  preferredLanguage: string;
  defaultTranslationLanguage: string;
  /** Default copied onto newly created stories; existing stories keep their saved value. */
  defaultChapterWritingStyle?: ChapterWritingStyle;
  savedStoryCount: number;
  activeStories: string[];
  inactiveStories: string[];
  joinedDate: string;
  updatedAt: string;
  role?: AccountRole;
  qi?: number; // legacy
  dao_xp?: number;
  dao_rank?: string;
  heavenly_qi?: number;
  sect_qi?: number;
  demonic_qi?: number;
  premiumTier?: PremiumTier;
  imageGenerationCount?: number;
  imageQuotaResetAt?: string;
  writingStreak?: number;

  // Idle Cultivation & Dao Pillar
  lastSessionEnd?: string;
  daoPillarStreak?: number;
  daoPillarCracked?: boolean;
  lastReadDate?: string;

  lastInteractionDate?: string;
  cosmicInventory?: CosmicArtifact[];
  equippedArtifactId?: string;
  activeStatusEffects?: ActiveStatusEffect[];
}

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

/**
 * Only the `Story` fields the profile surfaces read. Production's `Story` is a
 * large narrative graph; the replica must never depend on that shape.
 */
export interface Story {
  id: string;
  title: string;
  userId?: string;
  deleted?: boolean;
  sourceSeedId?: string;
}

/**
 * Only the `StorySeed` fields the Story Seeds index renders. `downloadStorySeed`
 * in production also reads `intake` / `blueprint`; export is a service call here,
 * so the replica keeps the payload opaque.
 */
export interface StorySeed {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Row shape the Akashic Switchboard renders. Production types this `any[]`;
 * these are the fields the panel actually reads, named exactly as the admin
 * overview returns them.
 */
export interface AdminStoryRow {
  id: string;
  title?: string;
  genre?: string;
  mcName?: string;
  userId?: string;
  currentChapterNumber?: number;
  createdAt?: string;
  updatedAt?: string;
  deleted?: boolean;
}
