import type { ReactNode } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { NarrativeButton as LibraryButton } from '@seihouse/sen/presentation';
import { nextPage, pageLabel, previousPage, type CreatorPageId } from './creatorSteps';

/**
 * The character creator's pinned footer: Back, the required progress, and
 * Next to the following section. On the Manifest step the host's Manifest
 * button takes Next's place, so the page carries exactly one Manifest.
 */
export function CreatorStepFooter({ page, onSelect, progress, manifest }: {
  page: CreatorPageId;
  onSelect: (page: CreatorPageId) => void;
  progress: ReactNode;
  manifest: ReactNode;
}) {
  const previous = previousPage(page);
  const next = nextPage(page);
  return (
    <div className="seed-creator-footer" data-seed-creator-footer>
      <div className="seed-creator-footer-inner">
        <LibraryButton variant="ghost" size="sm" icon={ArrowLeft} disabled={!previous}
          aria-label={previous ? `Back to ${pageLabel(previous)}` : 'Back'}
          onClick={() => previous && onSelect(previous)} className="seed-creator-footer-back">
          Back
        </LibraryButton>
        <div className="seed-creator-footer-progress">{progress}</div>
        {next ? (
          <LibraryButton variant="secondary" size="sm" iconRight={<ArrowRight size={14} aria-hidden="true" />}
            aria-label={`Next: ${pageLabel(next)}`} onClick={() => onSelect(next)} className="seed-creator-footer-next">
            <span className="seed-creator-footer-next-prefix">Next: </span>{pageLabel(next)}
          </LibraryButton>
        ) : manifest}
      </div>
    </div>
  );
}
