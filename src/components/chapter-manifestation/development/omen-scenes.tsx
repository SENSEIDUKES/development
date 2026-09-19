import type { ComponentType } from 'react';
import { SwordCultivatorClash } from '@seihouse/library-ui';
import { CelestialChannel } from '@seihouse/library-ui';

/**
 * Narrative omen scenes — the registry the narrative manifestation zone
 * selects from. An omen scene is a stage-only looping diorama rendered
 * inside the ManifestationChamber's Layer 1; it takes no props and inherits
 * the chamber's layering contract.
 *
 * Scenes are SYSTEM-SELECTED: callers either name a registered scene
 * explicitly (`sceneId` on the narrative ManifestationSpec) or leave the
 * choice to `selectOmenSceneId`, which picks deterministically per
 * operation so a given operation always omens the same scene. There is no
 * user-facing scene selection.
 *
 * A new omen scene is one stage-only component plus one registry entry.
 */
export const OMEN_SCENES: Record<string, ComponentType> = {
  'sword-cultivator-clash': SwordCultivatorClash,
  'celestial-channel': CelestialChannel,
};

/** Stable registry order for seeded selection. */
const OMEN_SCENE_IDS = Object.keys(OMEN_SCENES);

/** Fallback when nothing valid is named or derivable. */
export const DEFAULT_OMEN_SCENE_ID = 'sword-cultivator-clash';

/**
 * Resolve which omen scene renders for a narrative operation:
 * 1. an explicit, registered `sceneId` always wins;
 * 2. otherwise a deterministic pick seeded by the operation's identity
 *    (e.g. its tracker title), so the same operation always omens the
 *    same scene while different operations vary;
 * 3. unknown ids and missing seeds fall back to DEFAULT_OMEN_SCENE_ID.
 */
export function selectOmenSceneId(
  sceneId?: string | null,
  seed?: string | null,
): string {
  if (sceneId && OMEN_SCENES[sceneId]) return sceneId;
  if (seed) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    }
    return OMEN_SCENE_IDS[hash % OMEN_SCENE_IDS.length];
  }
  return DEFAULT_OMEN_SCENE_ID;
}
