/**
 * `@seihouse/sen/manifestations` — the Manifestation surfaces.
 *
 * Everything that carries a chapter from request to reveal: the
 * manifestation chamber and its zones, the loading system and veils, the
 * journey scrubber, the omen scenes, and the manifestation model — modes,
 * operations, media kinds, reveal states, and the loading task card builder.
 */
export { default as ManifestationChamber, CHAMBER_FOREGROUND_MOTE_LIMIT, ChamberForegroundMotes } from '../components/chapter-manifestation/development/ManifestationChamber';
export type { ManifestationChamberProps } from '../components/chapter-manifestation/development/ManifestationChamber';
export { default as ManifestationReveal } from '../components/chapter-manifestation/development/ManifestationReveal';
export type { ManifestationRevealProps } from '../components/chapter-manifestation/development/ManifestationReveal';
export { default as MediaManifestationZone } from '../components/chapter-manifestation/development/MediaManifestationZone';
export type { MediaManifestationZoneProps } from '../components/chapter-manifestation/development/MediaManifestationZone';
export { default as NarrativeManifestationZone } from '../components/chapter-manifestation/development/NarrativeManifestationZone';
export type { NarrativeManifestationZoneProps } from '../components/chapter-manifestation/development/NarrativeManifestationZone';
export { default as AILoadingVeil } from '../components/chapter-manifestation/development/AILoadingVeil';
export { default as LoadingSystem } from '../components/chapter-manifestation/development/LoadingSystem';
export type { LoadingSystemMode, LoadingSystemProps } from '../components/chapter-manifestation/development/LoadingSystem';
export { default as LoadingVeilCard } from '../components/chapter-manifestation/development/LoadingVeilCard';
export type { LoadingVeilCardProps } from '../components/chapter-manifestation/development/LoadingVeilCard';
export { default as CelestialChannel } from '../components/chapter-manifestation/development/CelestialChannel';
export { default as SwordCultivatorClash } from '../components/chapter-manifestation/development/SwordCultivatorClash';
export { default as CompactIndicator } from '../components/chapter-manifestation/shared/CompactIndicator';
export type { CompactIndicatorProps } from '../components/chapter-manifestation/shared/CompactIndicator';
export { default as CelestialScrollVessel } from '../components/chapter-manifestation/development/vessels/CelestialScrollVessel';
export { default as JourneyScrubber } from '../components/chapter-manifestation/development/journey-scrubber/JourneyScrubber';
export type {
  JourneyScrubberProps,
  JourneyScrubberStatus,
} from '../components/chapter-manifestation/development/journey-scrubber/JourneyScrubber';
export {
  DEFAULT_DESTINATION_BY_TRAVELER,
  DEFAULT_DESTINATION_ID,
  defaultDestinationFor,
  resolveDestination,
  type DestinationComponent,
  type DestinationRenderProps,
} from '../components/chapter-manifestation/development/journey-scrubber/destinations';
export {
  DEFAULT_TRAVELER_ID,
  resolveTraveler,
  type TravelerComponent,
  type TravelerRenderProps,
} from '../components/chapter-manifestation/development/journey-scrubber/travelers';
export {
  DEFAULT_TRAIL_ID,
  resolveTrail,
  type TrailMarkerComponent,
  type TrailMarkerProps,
} from '../components/chapter-manifestation/development/journey-scrubber/trails';
export {
  DEFAULT_OMEN_SCENE_ID,
  OMEN_SCENES,
  selectOmenSceneId,
} from '../components/chapter-manifestation/development/omen-scenes';

export * from '../components/chapter-manifestation/shared/manifestation';
export * from '../components/chapter-manifestation/shared/manifestationReveal';
export * from '../components/chapter-manifestation/shared/taskCard';
