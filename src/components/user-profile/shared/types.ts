/**
 * Production's profile types, kept for the locked reference replica
 * (`src/components/user-profile/reference/*`) only.
 *
 * Light-Novels' `UserProfile` still carries the retired reward economy: the
 * inventory Relic with attunement and weekly offerings, benefit status
 * effects, the special-QI reserves, and the legacy daily check-in. The
 * development Cave's contract (`../development/types.ts`, published as
 * `@seihouse/library/profile`) dropped all of it. This Workshop-owned adapter
 * rebuilds production's shape as that contract plus the retired fields, so the
 * locked reference keeps rendering exactly as production does while nothing
 * in development can read them. It ships in no package.
 */
import type { UserProfile as DevelopmentUserProfile } from '@seihouse/library/profile';
import type { ActiveStatusEffect, CosmicArtifact } from '../../relics/shared/types';

export type {
  AccountRole,
  AdminStoryRow,
  AppUser,
  ChapterWritingStyle,
  PremiumTier,
  Story,
  StorySeed,
} from '@seihouse/library/profile';
export type { ActiveStatusEffect, CosmicArtifact, SpecialUnlockDef, StatusEffectDef } from '../../relics/shared/types';

export interface UserProfile extends DevelopmentUserProfile {
  /** Legacy spendable-QI field. It must never be used as DAO XP. */
  qi?: number;
  heavenly_qi?: number;
  sect_qi?: number;
  demonic_qi?: number;
  daoPillarStreak?: number;
  daoPillarCracked?: boolean;
  cosmicInventory?: CosmicArtifact[];
  equippedArtifactId?: string;
  activeStatusEffects?: ActiveStatusEffect[];
}
