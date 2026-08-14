import type { WorldCardEvent, SystemEvent } from '../../reader-chamber/shared/types';
import type { CodexRevealTerm } from '../../reader-chamber/development/CodexRevealCard';

export type CardPresentationKind =
  | 'world-entity'
  | 'codex-reveal'
  | 'system-block'
  | 'fate-result'
  | 'manifestation-image'
  | 'under-review-route';

export interface CardCapabilities {
  hasImage: boolean;
  hasManifestAction: boolean;
  hasAudio: boolean;
  hasCodexLink: boolean;
  hasQuoteOrProse: boolean;
}

export interface DeveloperExplanation {
  componentName: string;
  sourceFile: string;
  currentTrigger: string;
  entityOrEventType: string;
  codexDestination: string;
  capabilities: CardCapabilities;
  architecturalNotes?: string;
}

export type ViewportMode = 'mobile' | 'tablet' | 'desktop';
export type ImagePreviewState = 'existing' | 'manifest' | 'missing';
export type AudioPreviewState = 'available' | 'unavailable' | 'loading' | 'playing';
export type CodexEntryPreviewState = 'present' | 'missing';
export type EntityMentionPreviewState = 'reveal' | 'reference';
export type PortraitKindPreviewState = 'human' | 'non-human';

export interface CardPreset {
  id: string;
  title: string;
  subtitle: string;
  kind: CardPresentationKind;
  description: string;
  explanation: DeveloperExplanation;

  // Payload variants depending on presentation kind
  worldCard?: WorldCardEvent;
  systemEvent?: SystemEvent;
  systemContent?: string;
  codexReveal?: CodexRevealTerm;
  manifestationImage?: {
    url?: string;
    caption?: string;
    chapterNumber?: number;
    quote?: string;
  };
}

export interface CardWorkshopOverrides {
  viewportMode: ViewportMode;
  imageState: ImagePreviewState;
  audioState: AudioPreviewState;
  codexEntryState: CodexEntryPreviewState;
  entityMention: EntityMentionPreviewState;
  portraitKind: PortraitKindPreviewState;
  isAudioMuted: boolean;
  isSenMode: boolean;
  isRevealVisible: boolean;
  selectedSystemKind?: string;
  selectedFateOutcome?: 'FATE AVERTED' | 'FATE SCARRED' | 'DOOM MANIFESTED';
}
