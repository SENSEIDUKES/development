import type { ReactNode } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { NarrativeButton as LibraryButton } from '@seihouse/sen/presentation';
import { nextPage, pageLabel, previousPage, type CreatorPageId } from './creatorSteps';

/**
 * The character creator's pinned footer: Back, the required progress, and
 * Next to the following section. On the Create step the host's Create button
 * takes Next's place (its price where the progress was), so the page carries
 * exactly one. Back and Next/Create sit in equal fixed cells and fill them,
 * so a button never grows or shrinks with its label.
 */
export function CreatorStepFooter({ page, onSelect, progress, manifest, manifestAside }: {
  page: CreatorPageId;
  onSelect: (page: CreatorPageId) => void;
  progress: ReactNode;
  manifest: ReactNode;
  manifestAside?: ReactNode;
}) {
  const previous = previousPage(page);
  const next = nextPage(page);
  return (
    <div className="seed-creator-footer" data-seed-creator-footer>
      <div className="seed-creator-footer-inner">
        <div className="seed-creator-footer-cell">
          <LibraryButton variant="ghost" size="md" fullWidth icon={ArrowLeft} disabled={!previous}
            aria-label={previous ? `Back to ${pageLabel(previous)}` : 'Back'}
            onClick={() => previous && onSelect(previous)} className="seed-creator-footer-back">
            Back
          </LibraryButton>
        </div>
        <div className="seed-creator-footer-progress">{next ? progress : manifestAside}</div>
        <div className="seed-creator-footer-cell">
          {next ? (
            <LibraryButton variant="secondary" size="md" fullWidth iconRight={<ArrowRight size={14} aria-hidden="true" />}
              aria-label={`Next: ${pageLabel(next)}`} onClick={() => onSelect(next)} className="seed-creator-footer-next">
              <span className="seed-creator-footer-next-label"><span className="seed-creator-footer-next-prefix">Next: </span>{pageLabel(next)}</span>
            </LibraryButton>
          ) : manifest}
        </div>
      </div>
    </div>
  );
}
