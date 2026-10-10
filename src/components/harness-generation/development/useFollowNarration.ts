import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { passageRange, type PassageSelection } from '@seihouse/sen/text-highlight-engine';

/** What the voice is reading: one sentence of a paragraph, or the chapter title. */
export type NarrationHighlight = PassageSelection | 'title';

/** After the reader scrolls on their own, the page waits this long before following the voice again. */
const FOLLOW_PAUSE_MS = 4_000;
/** A followed sentence settles this far down the visible area. */
const FOLLOW_POSITION = 0.3;

const highlightKey = (highlight?: NarrationHighlight) =>
  !highlight ? '' : highlight === 'title' ? 'title' : `${highlight.blockId}:${highlight.startOffset}-${highlight.endOffset}`;

/** The element whose scrolling moves the chapter: its nearest scrolling parent, or the page. */
const scrollerFor = (element: HTMLElement): HTMLElement | undefined => {
  for (let node = element.parentElement; node && node !== document.body; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) return node;
  }
  return undefined;
};

const prefersReducedMotion = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Keeps the sentence being read in view. The page moves only when that
 * sentence has left the visible area, and never while the reader is
 * scrolling on their own (wheel, touch or keys, never our own scrolling):
 * then `offscreen` turns true, so the player can offer a way back.
 */
export function useFollowNarration({ article, highlight, active, player, header }: {
  article: RefObject<HTMLElement | null>;
  highlight?: NarrationHighlight;
  /** Read Aloud is playing or paused. */
  active: boolean;
  /** The player bar, which covers the bottom of the visible area. */
  player: RefObject<HTMLElement | null>;
  /** The Reader's top bar, which stays over the top of the visible area. */
  header?: RefObject<HTMLElement | null>;
}): { offscreen: boolean; backToNarration: () => void } {
  const [offscreen, setOffscreen] = useState(false);
  const manualAt = useRef(0);
  const latest = useRef(highlight);
  latest.current = highlight;
  const key = highlightKey(highlight);

  /** The sentence's box and the visible area it is measured against, in the same coordinates. */
  const measure = useCallback(() => {
    const root = article.current;
    const current = latest.current;
    if (!root || !current) return undefined;
    const target = current === 'title' ? root.querySelector<HTMLElement>('[data-read-aloud-title]') : passageRange(root, current);
    if (!target || typeof target.getBoundingClientRect !== 'function') return undefined;
    const rect = target.getBoundingClientRect();
    const scroller = scrollerFor(root);
    const area = scroller?.getBoundingClientRect() ?? { top: 0, bottom: window.innerHeight };
    const covered = player.current?.getBoundingClientRect().height ?? 0;
    const bar = header?.current?.getBoundingClientRect?.();
    return { rect, scroller, top: Math.max(area.top, bar?.bottom ?? area.top), bottom: area.bottom - covered };
  }, [article, player, header]);

  const bringIntoView = useCallback(() => {
    const placed = measure();
    if (!placed) return;
    const delta = placed.rect.top - (placed.top + (placed.bottom - placed.top) * FOLLOW_POSITION);
    const behavior: ScrollBehavior = prefersReducedMotion() ? 'auto' : 'smooth';
    if (placed.scroller) placed.scroller.scrollBy?.({ top: delta, behavior });
    else window.scrollBy?.({ top: delta, behavior });
  }, [measure]);

  const isVisible = useCallback(() => {
    const placed = measure();
    return !placed || (placed.rect.top >= placed.top && placed.rect.bottom <= placed.bottom);
  }, [measure]);

  // The reader's own scrolling, never ours.
  useEffect(() => {
    if (!active) return undefined;
    const mark = () => { manualAt.current = Date.now(); };
    const onKey = (event: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) mark();
    };
    window.addEventListener('wheel', mark, { passive: true });
    window.addEventListener('touchmove', mark, { passive: true });
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('wheel', mark);
      window.removeEventListener('touchmove', mark);
      window.removeEventListener('keydown', onKey);
    };
  }, [active]);

  // Each new sentence: follow it if it left the visible area, unless the reader is scrolling.
  useEffect(() => {
    if (!active || !key) { setOffscreen(false); return; }
    if (isVisible()) { setOffscreen(false); return; }
    if (Date.now() - manualAt.current < FOLLOW_PAUSE_MS) { setOffscreen(true); return; }
    bringIntoView();
    setOffscreen(false);
  }, [active, key, isVisible, bringIntoView]);

  // Scrolling back to the sentence (or away from it) updates the way back.
  useEffect(() => {
    if (!active || !key) return undefined;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setOffscreen(!isVisible()));
    };
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll, { capture: true });
    };
  }, [active, key, isVisible]);

  const backToNarration = useCallback(() => {
    manualAt.current = 0;
    bringIntoView();
    setOffscreen(false);
  }, [bringIntoView]);

  return { offscreen, backToNarration };
}
