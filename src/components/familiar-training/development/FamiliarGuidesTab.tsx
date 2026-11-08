import { useEffect, useState } from 'react';
import { FrontDeskGuideView, type FrontDeskGuide } from '@seihouse/front-desk';

export interface FamiliarGuidesTabProps {
  guides: readonly FrontDeskGuide[];
  /** The name the reader knows their Familiar by: it is the one teaching. */
  name: string;
  /** Guide ids already watched on this profile. */
  seen?: readonly string[];
  /** Called when a guide with a video is opened, so it is marked watched. */
  onSeen?: (guideId: string) => void;
  /** Opens this guide at once. */
  openGuideId?: string | null;
}

/**
 * The Guides tab: the Familiar teaches the app, one guide at a time. It opens
 * on the first guide the reader has not watched; swipe, the arrows or the
 * keyboard's arrow keys move between them (choosing one of many is a swipe,
 * per the mobile-first rule, not a column of cards). A row of dots shows where
 * the reader is and which guides are watched. Each guide is a short silent
 * recording with the Familiar's line under it, read aloud on request
 * (`FrontDeskGuideView`, the same player as the Familiar's own card); one not
 * recorded yet says coming soon.
 */
export function FamiliarGuidesTab({ guides, name, seen = [], onSeen, openGuideId }: FamiliarGuidesTabProps) {
  const seenSet = new Set(seen);
  const firstUnwatched = Math.max(0, guides.findIndex(guide => !seenSet.has(guide.id)));
  const [at, setAt] = useState(() => {
    const asked = guides.findIndex(guide => guide.id === openGuideId);
    return asked >= 0 ? asked : firstUnwatched;
  });
  useEffect(() => {
    const asked = guides.findIndex(guide => guide.id === openGuideId);
    if (asked >= 0) setAt(asked);
  }, [openGuideId, guides]);

  if (!guides.length) return <p className="familiar-stage-note">{name} has nothing to show you yet.</p>;
  const shown = Math.min(at, guides.length - 1);
  return (
    <div className="space-y-3" data-familiar-guides>
      <ol className="familiar-guide-dots" aria-label={`${name}’s guides: ${seen.filter(id => guides.some(guide => guide.id === id)).length} of ${guides.length} watched`}>
        {guides.map((guide, index) => (
          <li key={guide.id} data-familiar-guide={guide.id} data-current={index === shown || undefined} data-seen={seenSet.has(guide.id) || undefined}
            data-soon={!guide.videoUrl || undefined} aria-current={index === shown ? 'step' : undefined}>
            <span className="sr-only">{guide.title}{seenSet.has(guide.id) ? ', watched' : ''}{guide.videoUrl ? '' : ', coming soon'}</span>
          </li>
        ))}
      </ol>
      <FrontDeskGuideView guides={guides} at={shown} name={name} focusOnChange={false}
        onStep={by => setAt((shown + by + guides.length) % guides.length)}
        onSeen={id => { if (!seen.includes(id)) onSeen?.(id); }}
        head={shown === firstUnwatched && !seenSet.has(guides[shown].id) ? <span className="familiar-guide-badge" data-familiar-guide-start>Start here</span> : undefined} />
    </div>
  );
}
