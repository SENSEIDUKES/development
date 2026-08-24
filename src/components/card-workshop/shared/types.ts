import type { SystemEvent } from '../../reader-chamber/shared/types';
import type { CodexCardTerm } from '../../reader-chamber/development/CodexCard';

export type CardPresentationKind =
  | 'codex-card'
  | 'system-block'
  | 'fate-result'
  | 'manifestation-image';

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
  /** Retained solely for the locked production Reference pane. */
  referenceOnly?: boolean;

  // Payload variants depending on presentation kind
  systemEvent?: SystemEvent;
  systemContent?: string;
  codexReveal?: CodexCardTerm;
  manifestationImage?: {
    url?: string;
    caption?: string;
    chapterNumber?: number;
    quote?: string;
  };
}

export type SystemPromptContentStyle =
  | 'breakthrough'
  | 'broken-promise'
  | 'target-scan'
  | 'structured'
  | 'guild-bounty'
  | 'mission-board';

export interface CardWorkshopOverrides {
  viewportMode: ViewportMode;
  imageState: ImagePreviewState;
  codexEntryState: CodexEntryPreviewState;
  entityMention: EntityMentionPreviewState;
  portraitKind: PortraitKindPreviewState;
  isSenMode: boolean;
  isRevealVisible: boolean;
  selectedFateOutcome?: 'FATE AVERTED' | 'FATE SCARRED' | 'DOOM MANIFESTED';
  systemPromptContentStyle?: SystemPromptContentStyle;
}
