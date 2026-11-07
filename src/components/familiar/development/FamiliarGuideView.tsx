import { useEffect, useRef, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { Clapperboard, ChevronLeft, ChevronRight, Square, Volume2 } from 'lucide-react';
import type { FamiliarGuide } from '../shared/familiar';
import { FamiliarClip } from './FamiliarClip';
import { useFamiliarReadAloud } from './familiarHelperContext';
import './familiar.css';

const SWIPE_DISTANCE = 48;

export interface FamiliarGuideViewProps {
  guides: readonly FamiliarGuide[];
  /** Which guide is showing. */
  at: number;
  onStep: (by: 1 | -1) => void;
  /** The Familiar teaching: its name. */
  name: string;
  /** Called once a recorded guide is shown, so it is counted as watched. */
  onSeen?: (guideId: string) => void;
  /** Above the title: the Guides tab's Start here; in the player, its header (who is showing you, Close). */
  head?: ReactNode;
  /** Under the steps: the player's Done, shown in place of Next on the last guide. */
  foot?: ReactNode;
  /** Focus the title when the guide changes (not on first show, where the opener decides). */
  focusOnChange?: boolean;
  /**
   * The full-screen guide player (the Familiar's tour): progress at the top,
   * the recording filling the middle, what the Familiar says under it, and
   * Back with Next (Done, from `foot`, on the last guide) in the thumb's reach.
   * It fills the box it is given and never scrolls.
   */
  player?: boolean;
}

/**
 * One guide, wherever it is watched: its short silent recording (wide or
 * tall, shown whole), what the Familiar says over it, read aloud on request,
 * and Previous / Next (swipe and arrow keys too). Watching never navigates:
 * the reader stays where they are. Used by the Familiar page's Guides and,
 * as the full-screen player, by the Familiar's tour.
 */
export function FamiliarGuideView({ guides, at, onStep, name, onSeen, head, foot, focusOnChange = true, player = false }: FamiliarGuideViewProps) {
  const guide = guides[at];
  const voice = useFamiliarReadAloud();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  // A reading this view started stops when the view goes (All guides, another tab, Done), not only on the next guide.
  const voiceRef = useRef(voice);
  voiceRef.current = voice;
  const readingHere = useRef(false);
  useEffect(() => () => { if (readingHere.current && voiceRef.current?.speaking) voiceRef.current.stop(); }, []);
  useEffect(() => { if (!voice?.speaking) readingHere.current = false; }, [voice?.speaking]);
  // Watching a recorded guide counts it as seen; one still coming soon is only read.
  useEffect(() => {
    if (guide?.videoUrl) onSeen?.(guide.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guide?.id]);
  // Moving to another guide stops the Familiar mid-sentence; its title takes focus.
  const shown = useRef(guide?.id);
  useEffect(() => {
    if (shown.current === guide?.id) return;
    shown.current = guide?.id;
    if (voice?.speaking) voice.stop();
    if (focusOnChange) titleRef.current?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guide?.id]);
  if (!guide) return null;

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.target instanceof HTMLElement && event.target.closest('video')) return;
    if (event.key === 'ArrowRight') { event.preventDefault(); onStep(1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); onStep(-1); }
  };
  const onPointerUp = (event: PointerEvent) => {
    const start = pointer.current;
    pointer.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    if (Math.abs(dx) >= SWIPE_DISTANCE && Math.abs(dx) > Math.abs(event.clientY - start.y)) onStep(dx < 0 ? 1 : -1);
  };
  const title = <h4 ref={titleRef} tabIndex={-1} className="familiar-guide-title">{guide.title}</h4>;
  const hear = voice ? (
    <button type="button" className="familiar-guide-hear" aria-label={voice.speaking ? 'Stop' : `Hear ${name} say it`}
      onClick={() => { if (voice.speaking) voice.stop(); else { readingHere.current = true; voice.read(guide.line, guide.audioUrl); } }} data-familiar-guide-hear>
      {voice.speaking ? <Square size={16} aria-hidden /> : <Volume2 size={18} aria-hidden />}
    </button>
  ) : null;
  const line = <p data-familiar-guide-line>{guide.line}</p>;
  const soon = <><span className="familiar-guide-soon-badge">Coming soon</span> {name} is still recording this one.</>;
  const group = {
    role: 'group', 'aria-roledescription': 'guide', 'aria-label': `Guide ${at + 1} of ${guides.length}: ${guide.title}`,
    'data-familiar-guide-open': guide.id, onKeyDown,
    onPointerDown: (event: PointerEvent) => { pointer.current = { x: event.clientX, y: event.clientY }; },
    onPointerUp, onPointerCancel: () => { pointer.current = null; },
  } as const;

  if (player) {
    const last = at === guides.length - 1;
    return (
      <div className="familiar-guide is-player" {...group}>
        {guides.length > 1 ? (
          <ol className="familiar-guide-progress" aria-hidden>
            {guides.map((entry, index) => <li key={entry.id} data-done={index < at || undefined} data-current={index === at || undefined} />)}
          </ol>
        ) : null}
        {head}
        <div className="familiar-guide-stage">
          {guide.videoUrl
            ? <FamiliarClip fill src={guide.videoUrl} label={`${guide.title}, shown`} />
            : <p className="familiar-guide-soon is-stage" data-familiar-guide-video="none"><Clapperboard size={28} aria-hidden /> {soon}</p>}
        </div>
        <div className="familiar-guide-caption">
          <div className="familiar-guide-caption-head">{title}{hear}</div>
          {line}
        </div>
        <div className="familiar-guide-steps is-player">
          {guides.length > 1 ? (
            <button type="button" className="familiar-guide-back" onClick={() => onStep(-1)} disabled={at === 0} aria-label="Previous guide" data-familiar-guide-step="previous">
              <ChevronLeft size={22} aria-hidden />
            </button>
          ) : null}
          {last ? foot : (
            <button type="button" className="familiar-guide-next" onClick={() => onStep(1)} aria-label="Next guide" data-familiar-guide-step="next">
              Next <ChevronRight size={18} aria-hidden />
            </button>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="familiar-guide" {...group}>
      <div className="familiar-guide-head">
        {head ?? <span />}
        <span className="familiar-guide-count" aria-hidden>{at + 1} / {guides.length}</span>
      </div>
      {title}
      {guide.videoUrl
        ? <FamiliarClip src={guide.videoUrl} label={`${guide.title}, shown`} />
        : <p className="familiar-guide-soon" data-familiar-guide-video="none">{soon}</p>}
      <div className="familiar-guide-line">
        {line}
        {hear}
      </div>
      {guides.length > 1 ? (
        <div className="familiar-guide-steps">
          <button type="button" onClick={() => onStep(-1)} aria-label="Previous guide" data-familiar-guide-step="previous"><ChevronLeft size={18} aria-hidden /> Previous</button>
          <button type="button" onClick={() => onStep(1)} aria-label="Next guide" data-familiar-guide-step="next">Next <ChevronRight size={18} aria-hidden /></button>
        </div>
      ) : null}
      {foot}
    </div>
  );
}
