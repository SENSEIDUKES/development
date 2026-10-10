import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type PointerEvent, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ChevronDown, ChevronUp } from 'lucide-react';

/** From this width a panel sits beside the chapter; below it, it rises from the bottom. */
const WIDE_READER = '(min-width: 1024px)';
const media = () => (typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(WIDE_READER) : undefined);
const subscribe = (change: () => void) => {
  const query = media();
  query?.addEventListener?.('change', change);
  return () => query?.removeEventListener?.('change', change);
};

/** True on screens wide enough for a panel beside the chapter (laptops and up). */
export function useWideReader(): boolean {
  return useSyncExternalStore(subscribe, () => Boolean(media()?.matches), () => false);
}

/** How far the handle is dragged before the sheet changes height (or closes, from half height). */
const DRAG_STEP = 72;

/**
 * One of the Reader's panels (Fate, Holdings, and the Codex later): a tool
 * that opens over the reading without taking the chapter away. The chapter
 * stays on the page, visible, scrollable and reachable, so the reader can
 * look back at what they just read while they use it. It is a non-modal
 * dialog: nothing behind it is locked, hidden or shut away. (The SEIHouse UI
 * drawers are modal even when asked not to be, so the Reader draws its own.)
 *
 * Below 1024px it is a sheet from the bottom with two heights: full, and half
 * with the chapter readable above it. Its button or a drag on its handle moves
 * between them; dragging down from half height closes it. From 1024px it is a
 * panel at the right, 28rem wide; the frame moves the chapter over beside it.
 * Escape and the page's own Back to reading close it. Opening moves focus to
 * its heading; closing gives focus back to what opened it.
 */
export function ReaderPanel({ open, onClose, labelledBy, testId, children }: {
  open: boolean;
  onClose: () => void;
  /** The id of the panel's heading, which names it. */
  labelledBy: string;
  testId?: string;
  children: ReactNode;
}) {
  const wide = useWideReader();
  const still = useReducedMotion();
  const [peeking, setPeeking] = useState(false);
  const [drag, setDrag] = useState(0);
  const dragStart = useRef<number | undefined>(undefined);
  const panel = useRef<HTMLElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  // What had focus as the panel opened, read before its contents can move focus themselves.
  const opener = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);
  if (open && !wasOpen.current) opener.current = typeof document !== 'undefined' && document.activeElement instanceof HTMLElement ? document.activeElement : null;
  wasOpen.current = open;

  // Opening names the panel by focusing its heading, unless its contents already took focus
  // (Fate's direction box). Closing gives focus back to the opener, unless the reader has
  // already moved on (to another panel).
  useLayoutEffect(() => {
    if (!open) return undefined;
    setPeeking(false);
    const element = panel.current;
    const heading = document.getElementById(labelledBy);
    if (heading && !element?.contains(document.activeElement)) {
      if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
    const returnTo = opener.current;
    return () => {
      const active = document.activeElement;
      const lost = !active || active === document.body || Boolean(element?.contains(active));
      if (lost && returnTo?.isConnected) returnTo.focus({ preventScroll: true });
    };
  }, [open, labelledBy]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !event.defaultPrevented) close.current(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const onHandleDown = (event: PointerEvent<HTMLElement>) => {
    dragStart.current = event.clientY;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const onHandleMove = (event: PointerEvent<HTMLElement>) => {
    if (dragStart.current !== undefined) setDrag(Math.max(peeking ? -DRAG_STEP * 2 : 0, event.clientY - dragStart.current));
  };
  const onHandleUp = () => {
    if (dragStart.current === undefined) return;
    dragStart.current = undefined;
    if (drag > DRAG_STEP) { if (peeking) onClose(); else setPeeking(true); }
    else if (drag < -DRAG_STEP) setPeeking(false);
    setDrag(0);
  };

  if (!open) return null;
  // It slides in; it closes at once, so the chapter is back the moment the reader asks.
  return <motion.section key={labelledBy} ref={panel} role="dialog" aria-labelledby={labelledBy} data-testid={testId}
    data-peeking={!wide && peeking ? '' : undefined}
    initial={wide ? { x: '100%' } : { y: '100%' }} animate={{ x: 0, y: 0 }} transition={still ? { duration: 0 } : { duration: 0.22, ease: 'easeOut' }}
    style={wide ? undefined : { height: peeking ? '50dvh' : '92dvh', translate: drag ? `0 ${drag}px` : undefined }}
    className={wide
      ? 'fixed inset-y-0 right-0 z-40 flex w-[28rem] flex-col border-l border-white/10 bg-neutral-950 pt-[env(safe-area-inset-top)] text-neutral-100 shadow-2xl'
      : `fixed inset-x-0 bottom-0 z-40 flex flex-col rounded-t-2xl border-t border-white/10 bg-neutral-950 text-neutral-100 shadow-2xl ${drag || still ? '' : 'transition-[height] duration-200'}`}>
    {!wide && <div className="flex items-center gap-2 px-3 pt-1">
      {/* The handle is for dragging; the button beside it does the same for everyone. */}
      <div aria-hidden className="flex h-8 flex-1 cursor-grab touch-none items-center justify-center"
        onPointerDown={onHandleDown} onPointerMove={onHandleMove} onPointerUp={onHandleUp} onPointerCancel={onHandleUp}>
        <span className="h-1.5 w-12 rounded-full bg-white/25" />
      </div>
      <button type="button" onClick={() => setPeeking(value => !value)}
        className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs text-neutral-300 hover:text-white">
        {peeking ? <ChevronUp className="h-4 w-4" aria-hidden /> : <ChevronDown className="h-4 w-4" aria-hidden />}
        {peeking ? 'Raise' : 'Show the chapter'}
      </button>
    </div>}
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">{children}</div>
  </motion.section>;
}
