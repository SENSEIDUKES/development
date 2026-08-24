/**
 * `@seihouse/sen/reader-chamber` — the Reader Chamber surface.
 *
 * The chapter reading experience: the chamber shell, its viewport, header,
 * controls, settings, fate surfaces, and the reading-model types and
 * utilities a host application needs to feed them. The chamber stylesheet
 * travels with this entry so consumers never hand-import it.
 *
 * `ReaderChamber`, `ReaderViewport`, and `ReaderControls/AudioMenu` still
 * import the Workshop's mock application state directly (`shared/stubs`,
 * `shared/trackLibrary`, `MOCK_VOICES`), so those mocks are bundled into this
 * entry today rather than excluded from it. They are temporary DEV runtime
 * dependencies, not a real store or audio catalog — replacing them with a
 * host-supplied store and audio catalog is follow-up work for production
 * integration, not something this restructure has done yet.
 */
import '../components/reader-chamber/shared/reader-chamber.css';

export { default as ReaderChamber, getReaderChamberSurfaceClass } from '../components/reader-chamber/development/ReaderChamber';
export { ReaderViewport } from '../components/reader-chamber/development/ReaderViewport';
export { ReaderHeader } from '../components/reader-chamber/development/ReaderHeader';
export { ReaderSettings } from '../components/reader-chamber/development/ReaderSettings';
export { ReaderFateAlerts } from '../components/reader-chamber/development/ReaderFateAlerts';
export { ReaderControls } from '../components/reader-chamber/development/ReaderControls';
export { AlterFatePanel } from '../components/reader-chamber/development/AlterFatePanel';
export { CosmicBookmarksPanel } from '../components/reader-chamber/development/CosmicBookmarksPanel';
export { ContextInspector } from '../components/reader-chamber/development/ContextInspector';
export { FateResultCard } from '../components/reader-chamber/development/FateResultCard';
export { FateSurvivalExplanation } from '../components/reader-chamber/development/FateSurvivalExplanation';
export { ParticleSystem } from '../components/reader-chamber/development/ParticleSystem';
export { SystemBlock } from '../components/reader-chamber/development/SystemBlock';
export { SystemColorLegend } from '../components/reader-chamber/development/SystemColorLegend';
export { VirtualizedList } from '../components/reader-chamber/development/VirtualizedList';
export {
  InlineAudio,
  InlineAudioControl,
  InlineAudioText,
} from '../components/reader-chamber/development/InlineAudio';
export type {
  InlineAudioControlProps,
  InlineAudioProps,
  InlineAudioStatus,
  InlineAudioTextProps,
} from '../components/reader-chamber/development/InlineAudio';

export * from '../components/reader-chamber/shared/types';
export * from '../components/reader-chamber/shared/colorCodes';
export * from '../components/reader-chamber/shared/readerTypography';
export * from '../components/reader-chamber/shared/readerLegend';
export * from '../components/reader-chamber/shared/autoCuePolicy';
export * from '../components/reader-chamber/shared/manifestationEligibility';
export * from '../components/reader-chamber/shared/alterFateLock';
export * from '../components/reader-chamber/shared/batchToReaderAdapter';
export * from '../components/reader-chamber/shared/dialect';
export { generateId, generateUUID } from '../components/reader-chamber/shared/id';
export type {
  AudioSettings,
  ChapterNavigationState,
  CommentsControl,
  ImmersionPreferences,
  PlaybackState,
  ReaderControlsProps,
} from '../components/reader-chamber/development/ReaderControls/types';
