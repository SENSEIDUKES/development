/**
 * Cultivator Cave environment values.
 *
 * The cave backdrop pool is the production "IMMORTAL LAND" revelation art that
 * is already downloaded into `public/manifest-backdrops/` for the Codex
 * surfaces. The Cave reuses those stock files as its selectable environments;
 * no new background art was generated for this redesign. The environment
 * names live here rather than in the Codex pool because they are Library
 * profile copy, and the profile must not depend on a SEN surface.
 *
 * The chosen environment is transient presentation state today. Persisting it
 * needs a profile field in Light-Novels and is deliberately out of scope for
 * the Workshop.
 */

export interface CaveEnvironment {
  id: string;
  name: string;
  /** One line of mood copy shown in the environment picker. */
  mood: string;
}

export const CAVE_ENVIRONMENTS: readonly CaveEnvironment[] = [
  {
    id: "moonlit-sanctum",
    name: "Moonlit Sanctum",
    mood: "Cold moonlight over a silent valley.",
  },
  {
    id: "dawn-ascension",
    name: "Dawn Ascension",
    mood: "Golden light breaking over the sect peaks.",
  },
  {
    id: "ruined-gate",
    name: "Ruined Gate",
    mood: "Dusk through a broken stone arch.",
  },
  {
    id: "wrathful-mist",
    name: "Wrathful Mist",
    mood: "Jade and ember currents over a scarred altar.",
  },
  {
    id: "blood-moon",
    name: "Blood Moon",
    mood: "A crimson moon and a coiled shadow.",
  },
];

export const DEFAULT_CAVE_ENVIRONMENT_ID = CAVE_ENVIRONMENTS[0].id;

export function getCaveEnvironment(id?: string | null): CaveEnvironment {
  return (
    CAVE_ENVIRONMENTS.find((environment) => environment.id === id) ??
    CAVE_ENVIRONMENTS[0]
  );
}

export const CAVE_MOTTO = "Cultivate in silence. Ascend in the unseen.";

/**
 * A stage label for the current rank, derived from progress toward the next
 * rank. Purely presentational: the rank itself still comes from
 * `getDaoRankData`, and nothing is persisted.
 */
export function getCultivationStage(
  progress: number,
  nextRank: string | null,
): string {
  if (!nextRank) return "Peak";
  if (progress < 34) return "Early Stage";
  if (progress < 67) return "Middle Stage";
  return "Late Stage";
}
