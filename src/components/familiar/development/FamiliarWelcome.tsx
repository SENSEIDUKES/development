import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import FocusLock from 'react-focus-lock';
import { X } from 'lucide-react';
import type { FamiliarOption } from '../shared/familiar';
import { FamiliarHero } from './FamiliarHero';
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
  /** It has guides to show: the greeting offers Show me around. */
  hasGuides?: boolean;
  /** Show me around: the greeting closes and the Familiar's card opens on its guides. */
  onTour?: () => void;
  /**
   * Where the Familiar is: floating (the card rises above it, or drops below
   * it where there is more room), or waiting in the header (the card drops
   * below the header). Found on the page when not given.
   */
  anchor?: 'bottom' | 'top';
  /** Space kept clear at the bottom (the navigation), when anchored there. */
  bottomInset?: number;
  /** The reader is done: Later, Close, Escape or a tap outside. Nothing navigates. */
  onClose: () => void;
}

/** The floating Familiar's own height above its inset, so the card rises clear of it. */
const ABOVE_FAMILIAR = 176;
/**
 * The Familiar's greeting, once, for a reader who has not met it: a tip
 * rather than a page. The screen dims a little and the card pops up beside the
 * Familiar. Show me around closes it and opens the Familiar's own card on its
 * guides (`onTour`), where they play with the microphone under them. Later (or
 * Close, Escape, a tap outside) closes it and the reader carries on where they
 * were. It never takes them anywhere.
 */
export function FamiliarWelcome({ familiar, name = familiar.name, greeting, hasGuides = false, onTour, anchor: anchorProp, bottomInset = 0, onClose }: FamiliarWelcomeProps) {
  // Floating, the card perches by the Familiar; with no floating Familiar, it waits in the header.
  const [anchor] = useState<'bottom' | 'top'>(() => anchorProp ?? (typeof document !== 'undefined' && document.querySelector('.familiar-companion') ? 'bottom' : 'top'));
  const titleId = useId();
  const lineId = useId();
  const [portraitFailed, setPortraitFailed] = useState(false);
  const card = useRef<HTMLDivElement>(null);
  const voice = useFamiliarReadAloud();
  const close = () => { if (voice?.speaking) voice.stop(); onClose(); };
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  });

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
      <div className="familiar-tip-dim" aria-hidden onClick={close} data-familiar-welcome-dim />
      <div ref={card} className="familiar-tip" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={lineId}
        data-anchor={below ? 'below' : anchor} style={position} data-familiar-welcome>
        <div className="familiar-tip-head">
          {face}
          <h2 id={titleId} className="familiar-tip-title">{`I’m ${name}.`}</h2>
          {closeButton}
        </div>
        <p id={lineId} className="familiar-tip-line">{line}</p>
        <div className="familiar-tip-actions">
          {hasGuides && onTour ? <button type="button" className="is-primary" onClick={onTour} autoFocus data-familiar-welcome-tour>Show me around</button> : null}
          <button type="button" onClick={close} autoFocus={!(hasGuides && onTour)} data-familiar-welcome-later>Later</button>
        </div>
        <p className="familiar-tip-note">My guides are always on the Familiar page.</p>
      </div>
    </FocusLock>,
    document.body,
  );
}
