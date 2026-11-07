import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import FocusLock from 'react-focus-lock';
import { X } from 'lucide-react';
import type { FamiliarGuide, FamiliarOption } from '../shared/familiar';
import { FamiliarHero } from './FamiliarHero';
import { FamiliarGuideView } from './FamiliarGuideView';
import { useFamiliarReadAloud } from './familiarHelperContext';
import './familiar.css';

export interface FamiliarWelcomeProps {
  /** The reader's Familiar, as the catalogue shows it. */
  familiar: FamiliarOption;
  /** The name the reader knows it by: their own, or the catalogue's. */
  name?: string;
  /**
   * What it says when the reader first meets it. Each Familiar will have its
   * own; until then, one greeting in its name.
   */
  greeting?: string;
  /** The how-tos it can show right here, on the page the reader is on. */
  guides?: readonly FamiliarGuide[];
  /** Called once a recorded guide has been shown, so it is counted as watched. */
  onGuideSeen?: (guideId: string) => void;
  /**
   * Where the Familiar is: floating (the card rises above it, or drops below
   * it where there is more room), or waiting in the header (the card drops
   * below the header). Found on the page when not given.
   */
  anchor?: 'bottom' | 'top';
  /** Open on the greeting (the first meeting) or straight on the guides (its Guides button). */
  startWith?: 'greeting' | 'guides';
  /** Space kept clear at the bottom (the navigation), when anchored there. */
  bottomInset?: number;
  /** The reader is done: Later, Done, Escape or a tap outside. Nothing navigates. */
  onClose: () => void;
}

/** The floating Familiar's own height above its inset, so the card rises clear of it. */
const ABOVE_FAMILIAR = 176;

/**
 * The Familiar's own card, a tip rather than a page: the screen dims a
 * little and the card pops up beside the Familiar. The first meeting opens it
 * once on a greeting. The guides (its Show me around, or the Guides button)
 * play in the guide player: on a phone the whole screen, locked like an app
 * screen and never scrolling; on a wider screen a phone-shaped sheet in the
 * middle. Done (or Close, Later, Escape, a tap outside) closes it and the
 * reader carries on where they were. It never takes them anywhere.
 */
export function FamiliarWelcome({ familiar, name = familiar.name, greeting, guides = [], onGuideSeen, anchor: anchorProp, startWith = 'greeting', bottomInset = 0, onClose }: FamiliarWelcomeProps) {
  // Floating, the card perches by the Familiar; with no floating Familiar, it waits in the header.
  const [anchor] = useState<'bottom' | 'top'>(() => anchorProp ?? (typeof document !== 'undefined' && document.querySelector('.familiar-companion') ? 'bottom' : 'top'));
  const titleId = useId();
  const lineId = useId();
  const [portraitFailed, setPortraitFailed] = useState(false);
  const [touring, setTouring] = useState<number | null>(startWith === 'guides' && guides.length ? 0 : null);
  const card = useRef<HTMLDivElement>(null);
  const voice = useFamiliarReadAloud();
  const close = () => { if (voice?.speaking) voice.stop(); onClose(); };
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  });
  // Starting the tour moves focus to the first guide's title, inside the card.
  useEffect(() => {
    if (touring !== null) card.current?.querySelector<HTMLElement>('.familiar-guide-title')?.focus({ preventScroll: true });
  }, [touring === null]); // eslint-disable-line react-hooks/exhaustive-deps

  // The card rises from the floating Familiar wherever it stands (it can be dragged), and never past the header.
  const [perch, setPerch] = useState<{ bottom?: number; top?: number; right: number } | null>(null);
  useLayoutEffect(() => {
    if (anchor !== 'bottom') return;
    const measure = () => {
      const companion = document.querySelector<HTMLElement>('.familiar-companion')?.getBoundingClientRect();
      const header = document.querySelector<HTMLElement>('.workspace-header')?.getBoundingClientRect().bottom ?? 72;
      // Above the Familiar where there is room for the card, otherwise below it (it can stand mid-screen on a short phone).
      const roomAbove = companion ? companion.top - header : 0;
      const roomBelow = companion ? window.innerHeight - companion.bottom - bottomInset : 0;
      const right = companion ? Math.round(Math.max(12, window.innerWidth - companion.right)) : 12;
      const next = !companion || !companion.height ? null
        : roomAbove >= 420 || roomAbove >= roomBelow ? { bottom: Math.round(Math.max(12, window.innerHeight - companion.top + 8)), right }
        : { top: Math.round(companion.bottom + 8), right };
      setPerch(previous => previous?.bottom === next?.bottom && previous?.top === next?.top && previous?.right === next?.right ? previous : next);
    };
    // The Familiar takes its place a moment after the page: look again for a short while until it is there.
    let frame = 0;
    let tries = 0;
    const settle = () => { measure(); if (++tries < 90) frame = requestAnimationFrame(settle); };
    settle();
    window.addEventListener('resize', measure);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', measure); };
  }, [anchor, bottomInset]);
  const line = greeting ?? `I’ll be with you through every story: reading, creating, and everything in between. Want me to show you around?`;
  // The player holds the screen still: the page under it does not scroll while it is open.
  useEffect(() => {
    if (touring === null) return;
    const page = document.documentElement;
    const before = page.style.overflow;
    page.style.overflow = 'hidden';
    return () => { page.style.overflow = before; };
  }, [touring === null]); // eslint-disable-line react-hooks/exhaustive-deps
  const right = perch ? Math.min(perch.right, 24) : undefined;
  const below = anchor === 'bottom' && perch?.top !== undefined;
  const bottom = perch?.bottom ?? bottomInset + ABOVE_FAMILIAR;
  const position: CSSProperties = anchor === 'top'
    ? { top: 'calc(var(--workspace-header-height, 72px) + 8px)' }
    : below ? { top: perch!.top, right, maxHeight: `calc(100dvh - ${perch!.top}px - ${bottomInset + 8}px)` }
    : { bottom, right, maxHeight: `calc(100dvh - ${bottom}px - var(--workspace-header-height, 72px) - 8px)` };
  const face = (
    <span className="familiar-tip-face" aria-hidden>
      {familiar.portraitUrl && !portraitFailed
        ? <img src={familiar.portraitUrl} alt="" decoding="async" onError={() => setPortraitFailed(true)} />
        : <FamiliarHero option={familiar} active={false} className="familiar-tip-hero" />}
    </span>
  );
  const closeButton = <button type="button" className="familiar-tip-close" aria-label="Close" onClick={close} data-familiar-welcome-close><X size={18} aria-hidden /></button>;
  return createPortal(
    <FocusLock returnFocus>
      <div className="familiar-tip-dim" aria-hidden onClick={close} data-familiar-welcome-dim data-touring={touring !== null || undefined} />
      {touring === null ? (
        <div ref={card} className="familiar-tip" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={lineId}
          data-anchor={below ? 'below' : anchor} style={position} data-familiar-welcome>
          <div className="familiar-tip-head">
            {face}
            <h2 id={titleId} className="familiar-tip-title">{`I’m ${name}.`}</h2>
            {closeButton}
          </div>
          <p id={lineId} className="familiar-tip-line">{line}</p>
          <div className="familiar-tip-actions">
            {guides.length ? <button type="button" className="is-primary" onClick={() => setTouring(0)} autoFocus data-familiar-welcome-tour>Show me around</button> : null}
            <button type="button" onClick={close} autoFocus={!guides.length} data-familiar-welcome-later>Later</button>
          </div>
          <p className="familiar-tip-note">My guides are always on the Familiar page.</p>
        </div>
      ) : (
        <div ref={card} className="familiar-player" role="dialog" aria-modal="true" aria-labelledby={titleId} data-touring data-familiar-welcome>
          <FamiliarGuideView player guides={guides} at={touring} name={name} onSeen={onGuideSeen}
            onStep={by => setTouring(at => Math.min(guides.length - 1, Math.max(0, (at ?? 0) + by)))}
            head={(
              <div className="familiar-player-head">
                {face}
                <h2 id={titleId} className="familiar-player-title">{`${name} shows you around`}</h2>
                {closeButton}
              </div>
            )}
            foot={<button type="button" className="familiar-guide-next familiar-tip-done" onClick={close} data-familiar-welcome-done>Done</button>} />
        </div>
      )}
    </FocusLock>,
    document.body,
  );
}
