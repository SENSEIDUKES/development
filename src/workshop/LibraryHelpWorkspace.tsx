import { lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';

const LibraryHelpMenu = lazy(() => import('@seihouse/library/story-seed')
  .then(module => ({ default: module.LibraryHelpMenu })));

/** Opens the canonical Library guidance surface from its dedicated workspace. */
export function LibraryHelpWorkspace({ onClose }: { onClose: () => void }) {
  return createPortal(
    <Suspense fallback={<span role="status">Loading Library Help…</span>}>
      <LibraryHelpMenu open onClose={onClose} />
    </Suspense>,
    document.body,
  );
}
