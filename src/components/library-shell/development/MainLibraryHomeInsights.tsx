import { MotionConfig } from 'motion/react';
import { MainLibraryAdapterContext } from '../shared/MainLibraryAdapter';
import { DaoInsights } from './main-library/DaoInsights';
import { MainLibraryClipboardProvider } from './mainLibraryClipboard';
import type { MainLibraryHeaderAdapter } from './MainLibraryHeader';
import './main-library/main-library-header.css';

/**
 * Dao Insights in its Home placement: directly under the featured area and
 * above the Library collection tabs.
 *
 * This is a placement only. `DaoInsights` itself is untouched — the same
 * quotes, the same 14-second rotation, the same category filtering, the same
 * modal, clipboard writer, provider check and static fallback — it simply
 * renders in Home's content column instead of the top header's context slot,
 * where it competed with the page title for a phone's header row.
 */
export function MainLibraryHomeInsights({ adapter }: { adapter: MainLibraryHeaderAdapter }) {
  return <MainLibraryAdapterContext.Provider value={adapter}>
    <MainLibraryClipboardProvider copyText={adapter.copyText}>
      <MotionConfig reducedMotion="user">
        <div className="main-library-home-insights" data-home-dao-insights>
          <DaoInsights />
        </div>
      </MotionConfig>
    </MainLibraryClipboardProvider>
  </MainLibraryAdapterContext.Provider>;
}
