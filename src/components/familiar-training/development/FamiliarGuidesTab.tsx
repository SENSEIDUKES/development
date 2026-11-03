import { useEffect, useRef, useState } from 'react';
import { Check, List } from 'lucide-react';
import type { FamiliarGuide } from '../../familiar/shared/familiar';
import { FamiliarGuideView } from '../../familiar/development/FamiliarGuideView';

export interface FamiliarGuidesTabProps {
  guides: readonly FamiliarGuide[];
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
 * The Guides tab: every how-to the Familiar teaches, in one list. Each guide
 * is a short silent screen recording with the Familiar's line under it, read
 * aloud on request (`FamiliarGuideView`, the same player as the Familiar's own
 * card). A guide whose video is not recorded yet stays listed as coming soon,
 * so the list is the plan of what the Familiar will teach.
 */
export function FamiliarGuidesTab({ guides, name, seen = [], onSeen, openGuideId }: FamiliarGuidesTabProps) {
  const [openId, setOpenId] = useState<string | null>(() => guides.some(guide => guide.id === openGuideId) ? openGuideId! : null);
  useEffect(() => { if (openGuideId && guides.some(guide => guide.id === openGuideId)) setOpenId(openGuideId); }, [openGuideId, guides]);
  const listRef = useRef<HTMLOListElement>(null);
  const seenSet = new Set(seen);
  const startHere = guides.find(guide => !seenSet.has(guide.id))?.id;
  const at = guides.findIndex(guide => guide.id === openId);
  // Back to the list, focus returns to the guide just watched.
  const lastOpen = useRef(openId);
  useEffect(() => {
    if (!openId && lastOpen.current) listRef.current?.querySelector<HTMLButtonElement>(`[data-familiar-guide="${lastOpen.current}"]`)?.focus({ preventScroll: true });
    lastOpen.current = openId;
  }, [openId]);

  if (!guides.length) return <p className="familiar-stage-note">{name} has nothing to show you yet.</p>;

  if (at >= 0) {
    return (
      <FamiliarGuideView guides={guides} at={at} name={name}
        onStep={by => setOpenId(guides[(at + by + guides.length) % guides.length].id)}
        onSeen={id => { if (!seen.includes(id)) onSeen?.(id); }}
        head={(
          <button type="button" className="familiar-stage-link familiar-guide-back" onClick={() => setOpenId(null)} data-familiar-guides-list>
            <List size={16} aria-hidden /> All guides
          </button>
        )} />
    );
  }

  return (
    <div className="space-y-3" data-familiar-guides>
      <p className="familiar-stage-note">{name} shows you around: short clips of how things work, with {name} talking you through each one.</p>
      <ol ref={listRef} className="familiar-guide-list" aria-label={`${name}’s guides`}>
        {guides.map((entry, index) => {
          const watched = seenSet.has(entry.id);
          return (
            <li key={entry.id}>
              <button type="button" onClick={() => setOpenId(entry.id)} data-familiar-guide={entry.id} data-seen={watched || undefined}>
                <span className="familiar-guide-mark" aria-hidden>{watched ? <Check size={14} /> : index + 1}</span>
                <span className="familiar-guide-name">{entry.title}{watched ? <span className="sr-only"> (watched)</span> : null}</span>
                {entry.id === startHere || !entry.videoUrl ? (
                  <span className="familiar-guide-badges">
                    {entry.id === startHere ? <span className="familiar-guide-badge" data-familiar-guide-start>Start here</span> : null}
                    {!entry.videoUrl ? <span className="familiar-settings-soon" data-familiar-coming-soon>Coming soon</span> : null}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
