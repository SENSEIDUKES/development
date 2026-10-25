import { MotionConfig } from 'motion/react';
import type { DaoSparkHost } from '../shared/MainLibraryAdapter';
import { DaoInsights } from './main-library/DaoInsights';
import { MainLibraryClipboardProvider, type MainLibraryCopyText } from './mainLibraryClipboard';
import { useLibraryPathways } from './LibraryNavigation';
import './main-library/main-library-header.css';

/**
 * Dao Insights with its clipboard and motion providers. Its default Home
 * placement sits below Featured and above the collection tabs. The
 * Story Spark panel itself is `DaoInsights`.
 *
 * In the Main Library the header's center carries it on laptops, where the
 * Pathways sidebar is shown, so Home leaves it out there. A host whose header
 * needs it at every width passes `everyWidth`. NovelExpanded places that
 * presentation in its header center, with host CSS controlling its spacing.
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
