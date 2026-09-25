import { ManifestationChamber, ChamberForegroundMotes } from '@seihouse/library-ui';
import { OMEN_SCENES, selectOmenSceneId } from './omen-scenes';

export interface NarrativeManifestationZoneProps {
  isVersa: boolean;
  /** Explicit omen scene id from the narrative ManifestationSpec (optional). */
  sceneId?: string;
  /**
   * Operation identity used to seed the system selection when no sceneId is
   * given — the same operation always omens the same scene.
   */
  seed?: string;
}

/**
 * Narrative manifestation zone — the Aura Veil's active zone for story and
 * narrative-generation operations (World Blueprint, Initial Arc, Chapter).
 * The ManifestationChamber hosts a system-selected
 * omen scene from the narrative registry, behind the chamber's three-layer
 * stacking contract. This is the veil's original active zone, extracted so
 * the shell can swap zones by manifestation mode without touching it.
 */
export default function NarrativeManifestationZone({
  isVersa,
  sceneId,
  seed,
}: NarrativeManifestationZoneProps) {
  const Scene = OMEN_SCENES[selectOmenSceneId(sceneId, seed)];
  return (
    <ManifestationChamber
      isVersa={isVersa}
      scene={<Scene />}
      foreground={<ChamberForegroundMotes isVersa={isVersa} />}
    />
  );
}
