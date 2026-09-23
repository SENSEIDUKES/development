/**
 * Production's retired Relic shapes, kept only for the locked reference
 * replicas (`src/components/relics/reference/RelicReveal.tsx` and
 * `src/components/user-profile/reference/*`).
 *
 * These describe the old inventory Relic: attunement, weekly offerings, and
 * status effects with QI multipliers. That model is retired in development —
 * Relics are now lightweight Fate Survival rewards
 * (`src/library/relics/contracts.ts`) and active cosmetic effects belong to
 * Familiars. Nothing outside the locked references may import this file; it
 * is a Workshop-owned adapter and ships in no package.
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
  type: 'cosmetic' | 'sen_workshop' | 'customization' | 'profile_item' | 'badge' | 'theme' | 'other';
  label: string;
  description?: string;
}

export type LegacyRelicRarity = 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic' | 'Transcendent';

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
  rarity: LegacyRelicRarity;
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
