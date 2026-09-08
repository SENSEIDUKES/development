import type { StorySeedInput } from '../shared/storySeedSchema';
import type { SeedUpdate } from './seedState';
import type { SeedSectionId } from './seedSections';
import { StorySeedWorkspaceChrome } from './StorySeedWorkspaceChrome';

/** Compatibility adapter; responsive mechanics live in the reusable workspace infrastructure. */
export function StorySeedMobileNavigation(props: {
  seed: StorySeedInput; updateSeed: (update: SeedUpdate) => void; activeSection: SeedSectionId;
  equippedTitle?: string | null; showStoryBank: boolean; helpOpen: boolean; isGenerating: boolean;
  savedFeedback: boolean; canManifest: boolean; onSelectSection: (id: SeedSectionId) => void;
  onToggleStoryBank: () => void; onOpenHelp: () => void; onSaveDraft: () => void; onManifest: () => void;
}) {
  return <StorySeedWorkspaceChrome {...props} layout="mobile" manifestLabel="Manifest" status="Story Seed">{null}</StorySeedWorkspaceChrome>;
}
