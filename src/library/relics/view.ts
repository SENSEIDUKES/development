import type { EarnedRelicRecord, RelicRarity } from './contracts';

/** Read-only presentation of host records. None of these fields authorize an award. */
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
  rarity: RelicRarity;
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

/** Project immutable earning truth into the existing visual contract; no client reward calculation. */
export function projectEarnedRelic(record: EarnedRelicRecord, context: { storyTitle?: string; imageUrl?: string } = {}): CosmicArtifact {
  return {
    id: record.id, name: record.achievement.name, description: record.achievement.description,
    rarity: record.achievement.rarity, unlockedAt: record.earnedAt,
    sourceStoryId: record.storyId, sourceStoryTitle: context.storyTitle, imageUrl: context.imageUrl,
    eventKey: record.achievement.templateKey, milestoneType: 'challenge_complete',
    milestoneName: record.achievement.name, rewardValueQi: record.achievement.rewards.qi,
    status: 'submitted', gatheredAt: record.earnedAt,
  };
}
