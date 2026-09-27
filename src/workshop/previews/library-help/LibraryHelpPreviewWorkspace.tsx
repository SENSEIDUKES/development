import { LibraryHelpWorkspace } from '../../LibraryHelpWorkspace';

export function LibraryHelpPreviewWorkspace() {
  return <LibraryHelpWorkspace onClose={() => window.location.assign('/?tab=systems')} />;
}
