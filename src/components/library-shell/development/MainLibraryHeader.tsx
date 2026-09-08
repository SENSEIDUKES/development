import { createContext, useContext } from 'react';
import { MotionConfig } from 'motion/react';
import { MainLibraryAdapterContext, type MainLibraryAdapter } from '../shared/MainLibraryAdapter';
import { GlobalHeader } from './main-library/GlobalHeader';

export interface MainLibraryHeaderAdapter extends MainLibraryAdapter {
  copyText: (text: string) => Promise<void>;
}
const CopyContext = createContext<MainLibraryHeaderAdapter['copyText'] | null>(null);
export function useHeaderClipboard() {
  const copy = useContext(CopyContext);
  if (!copy) throw new Error('MainLibraryHeader requires a clipboard adapter');
  return copy;
}

/** The global Library composition retains host identity, cloud entry, commands and DAO. */
export function MainLibraryHeader({ adapter }: { adapter: MainLibraryHeaderAdapter }) {
  return <MainLibraryAdapterContext.Provider value={adapter}>
    <CopyContext.Provider value={adapter.copyText}>
      <MotionConfig reducedMotion="user"><GlobalHeader /></MotionConfig>
    </CopyContext.Provider>
  </MainLibraryAdapterContext.Provider>;
}
