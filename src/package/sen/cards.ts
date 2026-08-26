/**
 * `@seihouse/sen/cards` — the shared card system.
 *
 * One card family for every SEN surface. The composable card primitive
 * (media / content / header / title / description / body / metadata /
 * actions / footer) is the base every entity card is built from; the Codex
 * card, its hovercard trigger, the character and location cards, their
 * profile views, the System Prompt families, and the ambience layer behind
 * them are the narrative cards SEN ships on top of it.
 *
 * Card identity colors come from the single Color Code authority
 * (`@seihouse/sen/color-codes`) through the accent resolvers re-exported
 * here, so a generated chapter, a Codex entry, and an inline card all agree
 * on what a character, artifact, or location looks like.
 */
import '../../components/reader-chamber/shared/reader-chamber.css';
import '../../components/reader-codex/shared/reader-codex.css';

export {
  LibraryCard,
  LibraryCardActions,
  LibraryCardBody,
  LibraryCardContent,
  LibraryCardDescription,
  LibraryCardFooter,
  LibraryCardHeader,
  LibraryCardMedia,
  LibraryCardMetadata,
  LibraryCardTitle,
} from '../../components/library/LibraryCard';
export type {
  LibraryCardActionsProps,
  LibraryCardBodyProps,
  LibraryCardContentProps,
  LibraryCardDescriptionProps,
  LibraryCardFooterProps,
  LibraryCardHeaderProps,
  LibraryCardMediaProps,
  LibraryCardMetadataProps,
  LibraryCardPadding,
  LibraryCardProps,
  LibraryCardTitleProps,
  LibraryCardVariant,
} from '../../components/library/LibraryCard';

export {
  CodexCard,
  FALLBACK_BACKDROPS,
  getFallbackBackdrop,
  type CodexCardProps,
  type CodexCardTerm,
} from '../../components/reader-chamber/development/CodexCard';
export { CodexHovercard } from '../../components/reader-codex/development/CodexHovercard';
export {
  CodexCardAmbience,
  type CodexCardAmbienceProps,
} from '../../components/reader-codex/development/CodexCardAmbience';
export {
  CODEX_ENTITY_ACCENT_FALLBACK,
  resolveCodexEntityAccent,
  resolveCodexEntityColorCode,
  resolveCodexEntityBand,
  type CodexEntityAccentInput,
  type CodexEntityBand,
} from '../../components/reader-codex/development/codexEntityAccent';
export {
  MANIFEST_BACKDROPS,
  getManifestBackdrop,
} from '../../components/reader-codex/development/codexManifestBackdrop';
export { CharacterCard } from '../../components/reader-codex/shared/codex/character-cards/CharacterCard';
export { CharacterEditCard } from '../../components/reader-codex/shared/codex/character-cards/CharacterEditCard';
export { CharacterProfile } from '../../components/reader-codex/shared/codex/character-profiles/CharacterProfile';
export { LocationCard } from '../../components/reader-codex/shared/codex/location-cards/LocationCard';
export { LocationProfile } from '../../components/reader-codex/shared/codex/location-profiles/LocationProfile';

// System Prompt cards remain implemented by Reader Chamber, but every card
// family is published from this one public entry. Reader Chamber keeps its
// existing exports as compatibility aliases for established consumers.
export { FateResultCard } from '../../components/reader-chamber/development/FateResultCard';
export type { FateResultCardProps } from '../../components/reader-chamber/development/FateResultCard';
export { SystemBlock } from '../../components/reader-chamber/development/SystemBlock';
export type { SystemBlockProps } from '../../components/reader-chamber/development/SystemBlock';
export { WorldNotice } from '../../components/reader-chamber/development/WorldNotice';
export type { WorldNoticeProps } from '../../components/reader-chamber/development/WorldNotice';
export * from '../../components/reader-chamber/shared/systemPromptPresentation';
export type {
  BaseSystemEvent,
  FateResultData,
  FateSystemEvent,
  RegularSystemEvent,
  SystemEvent,
  SystemEventKind,
  SystemPromptBadge,
  SystemPromptChange,
  SystemPromptExpandedData,
  SystemPromptExpandedProgress,
  SystemPromptExpandedSection,
  SystemPromptExpandedStatus,
  SystemPromptExpandedTone,
  SystemPromptPresentation,
  WorldNoticeData,
  WorldNoticeDetail,
  WorldNoticeEntry,
} from '../../components/reader-chamber/shared/types';
