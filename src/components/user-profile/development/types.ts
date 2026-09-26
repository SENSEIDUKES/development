/**
 * Domain types for the development Cultivator Cave.
 *
 * Started as a copy of `SENSEIDUKES/Light-Novels` `src/types.ts` (kept, in its
 * production shape, at `../shared/types.ts` for the locked reference). The
 * reward rework retired the fields that belonged to the old economy, so this
 * development contract no longer carries them:
 *
 * - `cosmicInventory`, `equippedArtifactId`, `activeStatusEffects` — the
 *   inventory Relic, attunement, weekly offerings and benefit effects.
 *   Relics are Fate Survival rewards read from the Relics ledger; cosmetic
 *   effects belong to Familiars.
 * - `qi`, `heavenly_qi`, `sect_qi`, `demonic_qi` — QI is one spendable
 *   currency read from the QI ledger; the special reserves are gone.
 * - `daoPillarStreak`, `daoPillarCracked` — the legacy daily check-in. The
 *   Daily Dao Pillar calendar owns the streak.
 *
 * Field names and literal unions are otherwise preserved verbatim — they are
 * persisted values and API compatibility strings. The language fields carry
 * SEN language codes rather than production's display names.
 */
import { type ChapterWritingStyle, type SenLanguageCode } from '@seihouse/sen/contracts';

/** SEN owns the Reading Mode values; the profile stores the account's default. */
export type { ChapterWritingStyle };

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
  /** The equipped Familiar. Ownership is Familiar-account state; the host validates it when saving. */
  familiarId?: string;
  /** Familiar scale preference; 1 is the default size. */
  familiarSize?: number;
  /** The account's UI language. Distinct from the reading language. */
  interfaceLanguage: SenLanguageCode;
  /** The language Reader Chamber displays by default; never story canon. */
  defaultReadingLanguage: SenLanguageCode;
  /**
   * The account's default Reading Mode, copied onto each new Story Seed.
   * Existing seeds and stories keep their own value.
   */
  defaultChapterWritingStyle?: ChapterWritingStyle;
  savedStoryCount: number;
  activeStories: string[];
  inactiveStories: string[];
  joinedDate: string;
  updatedAt: string;
  role?: AccountRole;
  /**
   * The cultivator's permanent DAO XP as their profile record carries it.
   * For the signed-in cultivator the Cave reads the DAO XP ledger instead and
   * projects its balance here; a public record carries it for other creators.
   */
  dao_xp?: number;
  /** A saved rank name, resolved to DAO XP only when `dao_xp` is absent. */
  dao_rank?: string;
  premiumTier?: PremiumTier;
  imageGenerationCount?: number;
  imageQuotaResetAt?: string;
  writingStreak?: number;

  /** Closed-Door Cultivation's session marker. Its future mechanic is undecided. */
  lastSessionEnd?: string;
  lastReadDate?: string;
  lastInteractionDate?: string;
}

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

/**
 * Only the `Story` fields the profile surfaces read. Production's `Story` is a
 * large narrative graph; the Cave must never depend on that shape.
 */
export interface Story {
  id: string;
  title: string;
  userId?: string;
  deleted?: boolean;
  sourceSeedId?: string;
}

/** Only the `StorySeed` fields the Story Seeds index renders. */
export interface StorySeed {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

/** Row shape the Akashic Switchboard renders, named exactly as the admin overview returns them. */
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
