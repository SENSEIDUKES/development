import { MotionConfig } from 'motion/react';
import type { DaoSparkHost } from '../shared/MainLibraryAdapter';
import { DaoInsights } from './main-library/DaoInsights';
import { MainLibraryClipboardProvider, type MainLibraryCopyText } from './mainLibraryClipboard';
import { useLibraryPathways } from './LibraryNavigation';
import './main-library/main-library-header.css';

/**
 * Dao Insights in its Home placement: directly under the featured area and
 * above the Library collection tabs. Only the placement is decided here; the
 * Story Spark panel itself is `DaoInsights`.
 *
 * In the Main Library the header's center carries it on laptops, where the
 * Pathways sidebar is shown, so Home leaves it out there. A host whose header
 * has no Dao Insights (NovelExpanded) passes `everyWidth` to keep it in Home.
 */
export function MainLibraryHomeInsights({ adapter, everyWidth = false }: {
  adapter: { copyText: MainLibraryCopyText; daoSparks?: DaoSparkHost };
  everyWidth?: boolean;
}) {
  const pathways = useLibraryPathways();
  if (pathways && !everyWidth) return null;
  return <MainLibraryClipboardProvider copyText={adapter.copyText}>
    <MotionConfig reducedMotion="user">
      <div className="main-library-home-insights" data-home-dao-insights>
        <DaoInsights host={adapter.daoSparks} />
      </div>
    </MotionConfig>
  </MainLibraryClipboardProvider>;
}
