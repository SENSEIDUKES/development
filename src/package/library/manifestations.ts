export { default as MediaManifestationZone } from '../../components/chapter-manifestation/development/MediaManifestationZone';
export type { MediaManifestationZoneProps } from '../../components/chapter-manifestation/development/MediaManifestationZone';
export { default as NarrativeManifestationZone } from '../../components/chapter-manifestation/development/NarrativeManifestationZone';
export type { NarrativeManifestationZoneProps } from '../../components/chapter-manifestation/development/NarrativeManifestationZone';

export { default as GenerationOverlay } from '../../components/chapter-manifestation/development/GenerationOverlay';
export type { GenerationOverlayProps } from '../../components/chapter-manifestation/development/GenerationOverlay';
export type { GenerationOverlaySignals } from '../../library/manifestations/generationOverlay';
export { default as GenerationOverlayController } from '../../components/chapter-manifestation/development/GenerationOverlayController';
export type { GenerationOverlayControllerMode, GenerationOverlayControllerProps } from '../../components/chapter-manifestation/development/GenerationOverlayController';
export { default as GenerationOverlayView } from '../../components/chapter-manifestation/development/GenerationOverlayView';
export type { GenerationOverlayViewProps } from '../../components/chapter-manifestation/development/GenerationOverlayView';
export { default as CompactGenerationOverlay } from '../../components/chapter-manifestation/development/CompactGenerationOverlay';
export type { CompactGenerationOverlayProps } from '../../components/chapter-manifestation/development/CompactGenerationOverlay';
export { StatusMessage, type StatusMessageProps } from '../../components/chapter-manifestation/development/StatusMessage';
export { ProgressIndicator, type ProgressIndicatorProps } from '../../components/chapter-manifestation/development/ProgressIndicator';
export { AmbientEffects, type AmbientEffectsProps } from '../../components/chapter-manifestation/development/AmbientEffects';
export { ProgressLabel, type ProgressLabelProps } from '../../components/chapter-manifestation/development/ProgressLabel';

// Compatibility exports for published callers and historical reference adapters.
// Active code uses the canonical names above; these share the same implementations.
export { default as AILoadingVeil } from '../../components/chapter-manifestation/development/GenerationOverlay';
export type { GenerationOverlaySignals as AILoadingVeilProps } from '../../library/manifestations/generationOverlay';
export { default as LoadingSystem } from '../../components/chapter-manifestation/development/GenerationOverlayController';
export type { GenerationOverlayControllerMode as LoadingSystemMode, GenerationOverlayControllerProps as LoadingSystemProps } from '../../components/chapter-manifestation/development/GenerationOverlayController';
export { default as LoadingVeilCard } from '../../components/chapter-manifestation/development/GenerationOverlayView';
export type { GenerationOverlayViewProps as LoadingVeilCardProps } from '../../components/chapter-manifestation/development/GenerationOverlayView';
export { default as CompactIndicator } from '../../components/chapter-manifestation/development/CompactGenerationOverlay';
export type { CompactGenerationOverlayProps as CompactIndicatorProps } from '../../components/chapter-manifestation/development/CompactGenerationOverlay';
export { buildGenerationOverlayTaskCard as buildAILoadingTaskCard } from '../../library/manifestations/taskCard';
export type { GenerationOverlayTaskInput as AILoadingTaskInput } from '../../library/manifestations/taskCard';

export { DEFAULT_OMEN_SCENE_ID, OMEN_SCENES, selectOmenSceneId } from '../../components/chapter-manifestation/development/omen-scenes';
export * from '../../library/manifestations/taskCard';
export { LoadingFamiliarProvider, loadingFamiliarPresentation } from '../../library/manifestations/familiar';
export type { LoadingFamiliarPresentation } from '../../library/manifestations/familiar';
