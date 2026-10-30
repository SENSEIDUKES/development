import { MotionConfig } from 'motion/react';
import type { DaoSparkHost } from '../shared/MainLibraryAdapter';
import { DaoInsights } from './main-library/DaoInsights';
import { MainLibraryClipboardProvider, type MainLibraryCopyText } from './mainLibraryClipboard';
import './main-library/main-library-header.css';

/**
 * The Sparks button where writers create (the Creator Space and Story Seed's
 * Origin), with the clipboard and motion its panel needs. `purpose` says what
 * a chosen spark does: plant a new Story Seed, or fill the open seed's Origin.
 */
export function DaoSparksButton({ host, copyText, purpose = 'new-seed' }: {
  host?: DaoSparkHost;
  copyText: MainLibraryCopyText;
  purpose?: 'new-seed' | 'fill-seed';
}) {
  return <MainLibraryClipboardProvider copyText={copyText}>
    <MotionConfig reducedMotion="user">
      <DaoInsights host={host} purpose={purpose} />
    </MotionConfig>
  </MainLibraryClipboardProvider>;
}
