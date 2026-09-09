import type { StorySeedInput } from '../shared/storySeedSchema';
import type { SeedUpdate } from './seedState';
import { StorySeedWorkspaceChrome } from './StorySeedWorkspaceChrome';

/** Compatibility adapter for hosts using the existing standalone header export. */
export function StorySeedHeader(props: {
  onNavigateHome: () => void;
  seed: StorySeedInput; updateSeed: (update: SeedUpdate) => void; isGenerating: boolean;
  savedFeedback: boolean; showStoryBank: boolean; onSaveDraft: () => void;
  onToggleStoryBank: () => void; onOpenHelp: () => void;
  onStoryBankIntent?: () => void; onHelpIntent?: () => void;
}) {
  return <StorySeedWorkspaceChrome {...props} layout="header" activeSection="origin" onSelectSection={() => {}}
    helpOpen={false} canManifest={false} manifestLabel="Manifest" status={props.savedFeedback ? 'Draft saved' : 'Story Seed'}
    onManifest={() => {}}
    headerSaveOnly>{null}</StorySeedWorkspaceChrome>;
}
