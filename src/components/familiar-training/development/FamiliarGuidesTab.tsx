import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Check, ChevronLeft, ChevronRight, List, Square, Volume2 } from 'lucide-react';
import type { FamiliarGuide } from '../../familiar/shared/familiar';
import { FamiliarClip } from '../../familiar/development/FamiliarClip';
import { useFamiliarReadAloud } from '../../familiar/development/FamiliarHelper';

const SWIPE_DISTANCE = 48;

export interface FamiliarGuidesTabProps {
  guides: readonly FamiliarGuide[];
  /** The name the reader knows their Familiar by: it is the one teaching. */
  name: string;
  /** Guide ids already watched on this profile. */
  seen?: readonly string[];
  /** Called when a guide with a video is opened, so it is marked watched. */
  onSeen?: (guideId: string) => void;
  /** Opens this guide at once (the first-meeting welcome's Show me around). */
  openGuideId?: string | null;
}

/**
 * The Guides tab: the Familiar teaches the app. Each guide is a short silent
 * screen recording with the Familiar's line under it, read aloud on request.
 * A guide whose video is not recorded yet stays listed as coming soon, so
 * the list is the plan of what the Familiar will teach.
 */
export function FamiliarGuidesTab({ guides, name, seen = [], onSeen, openGuideId }: FamiliarGuidesTabProps) {
  const [openId, setOpenId] = useState<string | null>(() => guides.some(guide => guide.id === openGuideId) ? openGuideId! : null);
  useEffect(() => { if (openGuideId && guides.some(guide => guide.id === openGuideId)) setOpenId(openGuideId); }, [openGuideId, guides]);
  const voice = useFamiliarReadAloud();
  const listRef = useRef<HTMLOListElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const seenSet = new Set(seen);
  const startHere = guides.find(guide => !seenSet.has(guide.id))?.id;
  const at = guides.findIndex(guide => guide.id === openId);
  const guide = at >= 0 ? guides[at] : null;

  // Watching a recorded guide counts it as seen; one still coming soon is only read.
  useEffect(() => {
    if (guide?.videoUrl && !seen.includes(guide.id)) onSeen?.(guide.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guide?.id]);
  // Moving between guides stops the Familiar mid-sentence; the new title takes focus.
  const previousId = useRef(openId);
  useEffect(() => {
    if (previousId.current === openId) return;
    if (previousId.current && voice?.speaking) voice.stop();
    if (openId) titleRef.current?.focus({ preventScroll: true });
    else listRef.current?.querySelector<HTMLButtonElement>(`[data-familiar-guide="${previousId.current}"]`)?.focus({ preventScroll: true });
    previousId.current = openId;
  }, [openId, voice]);

  if (!guides.length) return <p className="familiar-stage-note">{name} has nothing to show you yet.</p>;

  const step = (by: 1 | -1) => setOpenId(guides[(at + by + guides.length) % guides.length].id);
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.target instanceof HTMLElement && event.target.closest('video')) return;
    if (event.key === 'ArrowRight') { event.preventDefault(); step(1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1); }
  };
  const onPointerUp = (event: PointerEvent) => {
    const start = pointer.current;
    pointer.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    if (Math.abs(dx) >= SWIPE_DISTANCE && Math.abs(dx) > Math.abs(event.clientY - start.y)) step(dx < 0 ? 1 : -1);
  };

  if (guide) {
    return (
      <div className="familiar-guide" role="group" aria-roledescription="guide" aria-label={`Guide ${at + 1} of ${guides.length}: ${guide.title}`}
        data-familiar-guide-open={guide.id} onKeyDown={onKeyDown}
        onPointerDown={event => { pointer.current = { x: event.clientX, y: event.clientY }; }} onPointerUp={onPointerUp} onPointerCancel={() => { pointer.current = null; }}>
        <div className="familiar-guide-head">
          <button type="button" className="familiar-stage-link familiar-guide-back" onClick={() => setOpenId(null)} data-familiar-guides-list>
            <List size={16} aria-hidden /> All guides
          </button>
          <span className="familiar-guide-count" aria-hidden>{at + 1} / {guides.length}</span>
        </div>
        <h4 ref={titleRef} tabIndex={-1} className="familiar-guide-title">{guide.title}</h4>
        {guide.videoUrl
          ? <FamiliarClip src={guide.videoUrl} label={`${guide.title}, shown`} />
          : <p className="familiar-guide-soon" data-familiar-guide-video="none"><span className="familiar-settings-soon">Coming soon</span> {name} is still recording this one.</p>}
        <div className="familiar-guide-line">
          <p data-familiar-guide-line>{guide.line}</p>
          {voice ? (
            <button type="button" className="familiar-guide-hear" aria-label={voice.speaking ? 'Stop' : `Hear ${name} say it`}
              onClick={() => voice.speaking ? voice.stop() : voice.read(guide.line, guide.audioUrl)} data-familiar-guide-hear>
              {voice.speaking ? <Square size={16} aria-hidden /> : <Volume2 size={18} aria-hidden />}
            </button>
          ) : null}
        </div>
        <div className="familiar-guide-steps">
          <button type="button" onClick={() => step(-1)} aria-label="Previous guide" data-familiar-guide-step="previous"><ChevronLeft size={18} aria-hidden /> Previous</button>
          <button type="button" onClick={() => step(1)} aria-label="Next guide" data-familiar-guide-step="next">Next <ChevronRight size={18} aria-hidden /></button>
        </div>
      </div>
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
