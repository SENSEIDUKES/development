import type { ReactNode } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { NarrativeButton as LibraryButton } from '@seihouse/sen/presentation';
import { creatorPositions, positionLabel, type CreatorPosition } from './creatorSteps';
import { PinnedFooter } from './PinnedFooter';

/**
 * The character creator's pinned footer: Back, the required progress, and
 * Next to the following section (on a phone, the following part of a long
 * step first). On the Create step the host's Create button takes Next's place
 * (its price where the progress was), so the page carries exactly one. Back
 * and Next/Create sit in equal fixed cells and fill them, so a button never
 * grows or shrinks with its label.
 */
export function CreatorStepFooter({ position, withParts = false, onMove, progress, manifest, manifestAside }: {
  position: CreatorPosition;
  /** True on a phone, where Origin and Arc are walked part by part. */
  withParts?: boolean;
  onMove: (position: CreatorPosition) => void;
  progress: ReactNode;
  manifest: ReactNode;
  manifestAside?: ReactNode;
}) {
  const positions = creatorPositions(withParts);
  const index = positions.findIndex(entry => entry.page === position.page && (entry.part ?? null) === (position.part ?? null));
  const previous = index > 0 ? positions[index - 1] : null;
  const next = index >= 0 ? positions[index + 1] ?? null : null;
  return (
    <PinnedFooter data-seed-creator-footer>
      <div className="seed-creator-footer-inner">
        <div className="seed-creator-footer-cell">
          <LibraryButton variant="ghost" size="md" fullWidth icon={ArrowLeft} disabled={!previous}
            aria-label={previous ? `Back to ${positionLabel(previous)}` : 'Back'}
            onClick={() => previous && onMove(previous)} className="seed-creator-footer-back">
            Back
          </LibraryButton>
        </div>
        <div className="seed-creator-footer-progress">{next ? progress : manifestAside}</div>
        <div className="seed-creator-footer-cell">
          {next ? (
            <LibraryButton variant="secondary" size="md" fullWidth iconRight={<ArrowRight size={14} aria-hidden="true" />}
              aria-label={`Next: ${positionLabel(next)}`} onClick={() => onMove(next)} className="seed-creator-footer-next">
              <span className="seed-creator-footer-next-label"><span className="seed-creator-footer-next-prefix">Next: </span>{positionLabel(next)}</span>
            </LibraryButton>
          ) : manifest}
        </div>
      </div>
    </PinnedFooter>
  );
}
