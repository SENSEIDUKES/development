/**
 * `@seihouse/sen/reader-codex` — the Reader Codex surface.
 *
 * The older Codex's pieces: every Codex section view, the Codex context
 * provider, and the hooks and utilities that drive Codex editing, imagery, and
 * voice. Its stylesheet travels with them. The Codex page itself is remade on
 * the HARNESS record (`StoryCodex` in `./harness-generation`).
 *
 * The Codex renders inside the Reader Chamber's typography, so this entry
 * carries both stylesheets.
 *
 * Card-level Codex pieces are exported from this entry; there is no parallel
 * Codex-card package surface.
 */
import '../../components/reader-chamber/shared/reader-chamber.css';
import '../../components/reader-codex/shared/reader-codex.css';

export { DestinyChoicePanel } from '../../components/reader-codex/shared/DestinyChoicePanel';

export {
  CodexProvider,
  useCodex,
  type CodexContextEditorTarget,
  type CodexEntryCollection,
} from '../../components/reader-codex/shared/codex/CodexContext';
export { CodexEntryContextDialog } from '../../components/reader-codex/shared/codex/CodexEntryContextDialog';
export { CodexEntryContextFields } from '../../components/reader-codex/shared/codex/CodexEntryContextFields';
export { ReaderCodexArtifacts } from '../../components/reader-codex/shared/codex/ReaderCodexArtifacts';
export { ReaderCodexCharacters } from '../../components/reader-codex/shared/codex/ReaderCodexCharacters';
export {
  ReaderCodexCollage,
  type VisualMemory,
} from '../../components/reader-codex/shared/codex/ReaderCodexCollage';
export { ReaderCodexDashboards } from '../../components/reader-codex/shared/codex/ReaderCodexDashboards';
export { ReaderCodexFactions } from '../../components/reader-codex/shared/codex/ReaderCodexFactions';
export { ReaderCodexFate } from '../../components/reader-codex/shared/codex/ReaderCodexFate';
export { ReaderCodexGlossary } from '../../components/reader-codex/shared/codex/ReaderCodexGlossary';
export { ReaderCodexImageGallery } from '../../components/reader-codex/shared/codex/ReaderCodexImageGallery';
export { ReaderCodexMysteries } from '../../components/reader-codex/shared/codex/ReaderCodexMysteries';
export { ReaderCodexPower } from '../../components/reader-codex/shared/codex/ReaderCodexPower';
export { ReaderCodexRelations } from '../../components/reader-codex/shared/codex/ReaderCodexRelations';
export { ReaderCodexTimeline } from '../../components/reader-codex/shared/codex/ReaderCodexTimeline';
export { resolveEntityImageHistory } from '../../components/reader-codex/shared/codex/entityImageHistory';

export * from '../../components/reader-codex/shared/hooks/useCodexAnalytics';
export * from '../../components/reader-codex/shared/hooks/useCodexCharacterEditing';
export * from '../../components/reader-codex/shared/hooks/useCodexDeletions';
export * from '../../components/reader-codex/shared/hooks/useCodexImageEvolution';
export * from '../../components/reader-codex/shared/hooks/useCodexLocations';
export * from '../../components/reader-codex/shared/hooks/useCodexVoiceCards';
export * from '../../components/reader-codex/shared/hooks/useCodexVoiceQuote';
export * from '../../components/reader-codex/shared/hooks/useHistoricalMediaUrls';

export * from '../../narrative/codexHighlighting';
export * from '../../components/reader-codex/shared/codexContext';
export * from '../../components/reader-codex/shared/codexEntryContext';
export * from '../../components/reader-codex/shared/assetIdentity';
export * from '../../components/reader-codex/shared/types';
export { handleDownload } from '../../components/reader-codex/shared/downloadUtils';
