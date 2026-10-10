import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type PointerEvent, type ReactNode } from 'react';

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

const reducedMotion = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The sheet's two stops: the whole screen, and half of it with the chapter readable above. */
type Stop = 'full' | 'half';
/** How far down the screen the sheet's top sits at each stop, as a share of the screen's height. */
const STOP_AT: Record<Stop, number> = { full: 0, half: 0.5 };
/** A release this far down the screen, after the flick is counted, closes the sheet. */
const CLOSE_AT = 0.78;
/** How far a flick carries the sheet: its speed (px/ms) times this many milliseconds. */
const FLICK_MS = 180;
const GLIDE = 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)';

/**
 * One of the Reader's panels (Fate, Reader Settings): a tool that opens over
 * the reading without taking the chapter away. It is a non-modal dialog:
 * nothing behind it is locked, hidden or shut away, so the chapter stays
 * readable and scrollable. (The SEIHouse UI drawers are modal even when asked
 * not to be, so the Reader draws its own.)
 *
 * Below 1024px it is a sheet from the bottom with two stops: the whole screen,
 * and half of it, with the chapter readable above. It follows a drag on its
 * handle and glides to the nearest stop when let go (a flick carries it
 * further; well below half, it closes). The small circle beside the handle
 * shows the stop, half or wholly filled, and a tap on it moves between them.
 * From 1024px it is a 28rem panel at the right; the frame moves the chapter
 * over beside it. Escape and the page's own Back to reading close it. Opening
 * moves focus to its heading; closing gives focus back to what opened it.
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
  const [stop, setStop] = useState<Stop>('full');
  /** False for the first frame, so the sheet slides in from off screen. */
  const [shown, setShown] = useState(false);
  /** The finger's distance from where the drag began, while dragging. */
  const [drag, setDrag] = useState<number>();
  const dragFrom = useRef<{ y: number; samples: { y: number; t: number }[] } | undefined>(undefined);
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
    setStop('full');
    setDrag(undefined);
    setShown(false);
    const element = panel.current;
    const heading = document.getElementById(labelledBy);
    if (heading && !element?.contains(document.activeElement)) {
      if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
    // Two frames: the browser paints the sheet off screen once, then it glides in.
    let second = 0;
    const first = requestAnimationFrame(() => { second = requestAnimationFrame(() => setShown(true)); });
    const returnTo = opener.current;
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
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
    dragFrom.current = { y: event.clientY, samples: [{ y: event.clientY, t: event.timeStamp }] };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDrag(0);
  };
  const onHandleMove = (event: PointerEvent<HTMLElement>) => {
    const from = dragFrom.current;
    if (!from) return;
    from.samples = [...from.samples.filter(sample => event.timeStamp - sample.t < 100), { y: event.clientY, t: event.timeStamp }];
    // Above the top, the sheet resists: it moves a quarter as far.
    const moved = event.clientY - from.y;
    const top = STOP_AT[stop] * window.innerHeight + moved;
    setDrag(top < 0 ? moved - top * 0.75 : moved);
  };
  const onHandleUp = (event: PointerEvent<HTMLElement>) => {
    const from = dragFrom.current;
    if (!from) return;
    dragFrom.current = undefined;
    const height = window.innerHeight || 1;
    const oldest = from.samples[0];
    const speed = event.timeStamp > oldest.t ? (event.clientY - oldest.y) / (event.timeStamp - oldest.t) : 0;
    const landing = (STOP_AT[stop] * height + (event.clientY - from.y) + speed * FLICK_MS) / height;
    setDrag(undefined);
    if (landing >= CLOSE_AT) { onClose(); return; }
    setStop(landing < (STOP_AT.full + STOP_AT.half) / 2 ? 'full' : 'half');
  };

  if (!open) return null;
  const still = reducedMotion();
  const offset = !shown ? '100%' : `calc(${STOP_AT[stop] * 100}dvh + ${drag ?? 0}px)`;
  return <section ref={panel} role="dialog" aria-labelledby={labelledBy} data-testid={testId}
    data-stop={wide ? undefined : stop}
    style={{
      transform: wide ? `translateX(${shown ? '0' : '100%'})` : `translateY(${offset})`,
      transition: drag !== undefined || still ? 'none' : GLIDE,
    }}
    className={wide
      ? 'fixed inset-y-0 right-0 z-[250] flex w-[28rem] flex-col border-l border-white/10 bg-neutral-950 pt-[env(safe-area-inset-top)] text-neutral-100 shadow-2xl'
      : `fixed inset-x-0 top-0 z-[250] flex h-[100dvh] flex-col border-t border-white/10 bg-neutral-950 text-neutral-100 shadow-2xl ${stop === 'full' && drag === undefined ? 'rounded-none pt-[env(safe-area-inset-top)]' : 'rounded-t-2xl'}`}>
    {!wide && <div className="relative flex h-11 shrink-0 items-center justify-center">
      {/* Dragged to move the sheet; the circle beside it shows the stop and does the same for everyone. */}
      <div aria-hidden className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
        onPointerDown={onHandleDown} onPointerMove={onHandleMove} onPointerUp={onHandleUp} onPointerCancel={onHandleUp} />
      <span aria-hidden className="pointer-events-none h-1.5 w-12 rounded-full bg-white/30" />
      <button type="button" onClick={() => setStop(stop === 'full' ? 'half' : 'full')}
        aria-label={stop === 'full' ? 'Show the chapter' : 'Raise the panel'} title={stop === 'full' ? 'Half height' : 'Full height'}
        className="absolute right-2 top-0 inline-flex h-11 w-11 items-center justify-center">
        <span aria-hidden data-testid="reader-panel-stop"
          className={`block h-3.5 w-3.5 rounded-full border-2 border-cyan-200/80 ${stop === 'full'
            ? 'bg-cyan-200/80'
            : 'bg-[linear-gradient(to_top,rgb(165_243_252/0.8)_50%,transparent_50%)]'}`} />
      </button>
    </div>}
    {/* At half height the end of the panel would sit below the screen: the space keeps it reachable. */}
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      style={{ paddingBottom: wide ? 'env(safe-area-inset-bottom)' : `calc(${STOP_AT[stop] * 100}dvh + env(safe-area-inset-bottom))` }}>
      {children}
    </div>
  </section>;
}
