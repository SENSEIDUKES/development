import type { LibraryActivityKind, MysteryScrollDelivery } from '@seihouse/library/rewards';

/**
 * Achievement settings that are still product decisions. Each has a working
 * development default so the system runs end to end, and each is changed
 * here (or through the environment) rather than in the engine.
 */
export interface AchievementsConfig {
  /**
   * When a scroll's reward reaches the ledgers: `on-open` (default — the
   * reveal and the credit are the same moment) or `on-earn` (the reward lands
   * at once; opening is only the reveal).
   */
  delivery: MysteryScrollDelivery;
  /** DAO XP credited directly for each creation activity. Placeholder amounts. */
  creationDaoXp: Partial<Record<LibraryActivityKind, number>>;
  /** Most creation DAO XP one account may earn per UTC day; `null` means no cap (undecided). */
  creationDailyCap: number | null;
}

export const DEFAULT_ACHIEVEMENTS_CONFIG: AchievementsConfig = {
  delivery: 'on-open',
  creationDaoXp: { 'story.created': 50, 'chapter.created': 10 },
  creationDailyCap: null,
};

/**
 * - `ACHIEVEMENTS_SCROLL_DELIVERY` — `on-open` (default) or `on-earn`.
 * - `CREATION_DAO_XP_DAILY_CAP` — a positive whole number, or unset for no cap.
 */
export function resolveAchievementsConfig(environment: Record<string, string | undefined>): AchievementsConfig {
  const delivery = environment.ACHIEVEMENTS_SCROLL_DELIVERY?.trim() === 'on-earn' ? 'on-earn' : 'on-open';
  const cap = Number(environment.CREATION_DAO_XP_DAILY_CAP);
  return {
    ...DEFAULT_ACHIEVEMENTS_CONFIG,
    delivery,
    creationDailyCap: Number.isSafeInteger(cap) && cap > 0 ? cap : null,
  };
}
