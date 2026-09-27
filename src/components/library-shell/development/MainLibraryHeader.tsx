import { MotionConfig } from 'motion/react';
import { MainLibraryAdapterContext, type MainLibraryAdapter } from '../shared/MainLibraryAdapter';
import { GlobalHeader } from './main-library/GlobalHeader';
import { MainLibraryClipboardProvider, type MainLibraryCopyText, useHeaderClipboard } from './mainLibraryClipboard';

export interface MainLibraryHeaderAdapter extends MainLibraryAdapter {
  copyText: MainLibraryCopyText;
}
export { useHeaderClipboard };

/** Home contributes its identity, guidance and commands to the shared header. */
export function MainLibraryHeader({ adapter, landmark }: {
  adapter: MainLibraryHeaderAdapter;
  /** `'none'` inside `WorkspaceShell`, which owns the banner landmark. */
  landmark?: 'banner' | 'none';
}) {
  return <MainLibraryAdapterContext.Provider value={adapter}>
    <MainLibraryClipboardProvider copyText={adapter.copyText}>
      <MotionConfig reducedMotion="user"><GlobalHeader landmark={landmark} /></MotionConfig>
    </MainLibraryClipboardProvider>
  </MainLibraryAdapterContext.Provider>;
}
