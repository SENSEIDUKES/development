import { useEffect, useId, useRef, useState, type RefObject, type PointerEvent } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { Familiar, type FamiliarProps } from './Familiar';
import { familiarDisplaySize, type FamiliarActivity } from '../shared/familiar';
import { useFamiliarMobile } from './useFamiliarMobile';

type Point = { x: number; y: number };
type Bounds = { left: number; top: number; right: number; bottom: number };
export interface FamiliarCompanionProps extends Pick<FamiliarProps, 'familiar' | 'activity' | 'animation' | 'paused' | 'children'> {
  /** Omit in the product app shell. Workshop hosts constrain it to their preview. */
  boundaryRef?: RefObject<HTMLElement | null>;
  size?: number;
  minimized?: boolean;
  onMinimize?: () => void;
  /** Space occupied by a host's persistent bottom navigation. */
  bottomInset?: number;
}

const WIDTH = 104;
const MARGIN = 12;
const DOCK_HEIGHT = 48;
const DOCK_WIDTH = 104;
const clamp = (point: Point, bounds: Bounds): Point => ({
  x: Math.max(bounds.left, Math.min(bounds.right, point.x)),
  y: Math.max(bounds.top, Math.min(bounds.bottom, point.y)),
});

/** The supplied side-running rows are the only movement loops in the atlas. */
function dragAnimation(familiar: FamiliarProps['familiar'], delta: Point): string | undefined {
  if (Math.abs(delta.x) < Math.abs(delta.y) || delta.x === 0) return undefined;
  const animation = delta.x > 0 ? 'running-right' : 'running-left';
  return familiar.animations[animation] ? animation : undefined;
}

/** One instance belongs in the host app shell, beneath its account/Energy providers. */
export function FamiliarCompanion({ boundaryRef, size, minimized = false, onMinimize, bottomInset = 0, children, ...props }: FamiliarCompanionProps) {
  const mobile = useFamiliarMobile();
  const scale = familiarDisplaySize(size, mobile);
  const ratio = props.familiar.cellHeight / props.familiar.cellWidth;
  const [width, setWidth] = useState(WIDTH * scale);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [position, setPosition] = useState<Point | null>(null);
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [movementAnimation, setMovementAnimation] = useState<string>();
  const gesture = useRef<{ id: number; start: Point; last: Point; origin: Point; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const instructions = useId();
  const element = useRef<HTMLDivElement>(null);
  const wasMinimized = useRef(false);
  const pendingPosition = useRef<Point | null>(null);
  const dragFrame = useRef<number | null>(null);
  const liveBounds = useRef<Bounds | null>(null);
  const movementTimeout = useRef<number | null>(null);
  const movementAnimationRef = useRef<string | undefined>(undefined);
  function applyMovementAnimation(animation: string | undefined, immediate = false) {
    if (movementAnimationRef.current === animation) return;
    movementAnimationRef.current = animation;
    if (immediate) flushSync(() => setMovementAnimation(animation));
    else setMovementAnimation(animation);
  }
  /** Coalesce pointer samples to one position update per display frame. */
  function flushPosition() {
    if (dragFrame.current !== null) cancelAnimationFrame(dragFrame.current);
    dragFrame.current = null;
    if (pendingPosition.current && liveBounds.current) setPosition(clamp(pendingPosition.current, liveBounds.current));
    pendingPosition.current = null;
  }
  useEffect(() => () => {
    if (dragFrame.current !== null) cancelAnimationFrame(dragFrame.current);
    dragFrame.current = null;
    pendingPosition.current = null;
    gesture.current = null;
    if (movementTimeout.current !== null) window.clearTimeout(movementTimeout.current);
    movementTimeout.current = null;
    movementAnimationRef.current = undefined;
    setMovementAnimation(undefined);
  }, [minimized]);
  useEffect(() => {
    if (!minimized && wasMinimized.current) element.current?.querySelector('button')?.focus({ preventScroll: true });
    if (minimized) { setOpen(false); setDragging(false); }
    wasMinimized.current = minimized;
  }, [minimized]);

  useEffect(() => {
    if (minimized) return;
    let layoutFrame: number | null = null;
    const update = () => {
      layoutFrame = null;
      const viewport = window.visualViewport;
      const left = viewport?.offsetLeft ?? 0;
      const top = viewport?.offsetTop ?? 0;
      const right = left + (viewport?.width ?? window.innerWidth);
      const bottom = top + (viewport?.height ?? window.innerHeight);
      const rect = boundaryRef?.current?.getBoundingClientRect();
      const visible = { left: Math.max(left, rect?.left ?? left), top: Math.max(top, rect?.top ?? top),
        right: Math.min(right, rect?.right ?? right), bottom: Math.min(bottom - bottomInset, rect?.bottom ?? bottom) };
      const nextWidth = Math.min(WIDTH * scale, visible.right - visible.left - MARGIN * 2, (visible.bottom - visible.top - MARGIN * 2 - DOCK_HEIGHT) / ratio);
      if ((boundaryRef && !rect) || nextWidth < 44 || visible.right - visible.left < DOCK_WIDTH + MARGIN * 2) {
        liveBounds.current = null;
        setBounds(null);
        setOpen(false);
        return;
      }
      setWidth(nextWidth);
      const extraWidth = Math.max(0, DOCK_WIDTH - nextWidth) / 2;
      const next = { left: visible.left + MARGIN + extraWidth, top: visible.top + MARGIN,
        right: visible.right - nextWidth - MARGIN - extraWidth, bottom: visible.bottom - nextWidth * ratio - DOCK_HEIGHT - MARGIN };
      liveBounds.current = next;
      setBounds(previous => previous && previous.left === next.left && previous.top === next.top && previous.right === next.right && previous.bottom === next.bottom ? previous : next);
      setPosition(previous => {
        const point = clamp(previous ?? { x: next.right, y: next.bottom - (bottomInset ? 0 : 72) }, next);
        return previous?.x === point.x && previous.y === point.y ? previous : point;
      });
    };
    const schedule = () => { if (layoutFrame === null) layoutFrame = requestAnimationFrame(update); };
    update();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    if (boundaryRef?.current) observer?.observe(boundaryRef.current);
    window.addEventListener('resize', schedule);
    if (boundaryRef) window.addEventListener('scroll', schedule, { capture: true, passive: true });
    window.visualViewport?.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('scroll', schedule);
    return () => {
      observer?.disconnect();
      if (layoutFrame !== null) cancelAnimationFrame(layoutFrame);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
      window.visualViewport?.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('scroll', schedule);
    };
  }, [boundaryRef, scale, ratio, bottomInset, minimized]);

  /** Release the active pointer and prevent a drag from opening the Energy panel. */
  function finish(event: PointerEvent<HTMLButtonElement>, cancelled = false) {
    if (gesture.current?.id !== event.pointerId) return;
    flushPosition();
    suppressClick.current = cancelled || gesture.current.moved;
    gesture.current = null;
    setDragging(false);
    applyMovementAnimation(undefined);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  if (minimized || !bounds || !position) return null;
  return createPortal(<div ref={element} className="familiar-companion" data-dragging={dragging || undefined}
    style={{ left: 0, top: 0, transform: `translate(${position.x}px, ${position.y}px)`, width }}>
    <span id={instructions} className="familiar-sr-only">Drag to move. Use arrow keys to move when focused. Press Enter for Familiar actions.</span>
    <Familiar {...props} animation={movementAnimation ?? props.animation} open={open} onOpenChange={setOpen} onMinimize={onMinimize} dragging={dragging} triggerProps={{
      'aria-describedby': instructions,
      onPointerDown: event => {
        if (event.button !== 0 || event.isPrimary === false || gesture.current) return;
        suppressClick.current = false;
        const point = { x: event.clientX, y: event.clientY };
        gesture.current = { id: event.pointerId, start: point, last: point, origin: position, moved: false };
        event.currentTarget.setPointerCapture?.(event.pointerId);
      },
      onPointerMove: event => {
        const active = gesture.current;
        if (!active || event.pointerId !== active.id) return;
        const current = { x: event.clientX, y: event.clientY };
        const dx = current.x - active.start.x;
        const dy = current.y - active.start.y;
        if (!active.moved && Math.hypot(dx, dy) < 6) return;
        const movement = { x: current.x - active.last.x, y: current.y - active.last.y };
        active.last = current;
        active.moved = true;
        setDragging(true);
        setOpen(false);
        if (movementTimeout.current !== null) {
          window.clearTimeout(movementTimeout.current);
          movementTimeout.current = null;
        }
        const animation = dragAnimation(props.familiar, movement);
        if (animation) applyMovementAnimation(animation, true);
        pendingPosition.current = { x: active.origin.x + dx, y: active.origin.y + dy };
        if (dragFrame.current === null) dragFrame.current = requestAnimationFrame(flushPosition);
      },
      onPointerUp: event => finish(event),
      onPointerCancel: event => finish(event, true),
      onLostPointerCapture: event => finish(event, true),
      onClickCapture: event => {
        if (suppressClick.current && event.detail !== 0) {
          event.preventDefault();
          event.stopPropagation();
        }
        suppressClick.current = false;
      },
      onKeyDown: event => {
        const movement: Record<string, Point> = { ArrowLeft: { x: -16, y: 0 }, ArrowRight: { x: 16, y: 0 }, ArrowUp: { x: 0, y: -16 }, ArrowDown: { x: 0, y: 16 } };
        const delta = movement[event.key];
        if (!delta) return;
        event.preventDefault();
        setOpen(false);
        setPosition(clamp({ x: position.x + delta.x, y: position.y + delta.y }, bounds));
        if (movementTimeout.current !== null) window.clearTimeout(movementTimeout.current);
        applyMovementAnimation(dragAnimation(props.familiar, delta));
        movementTimeout.current = window.setTimeout(() => {
          movementTimeout.current = null;
          applyMovementAnimation(undefined);
        }, 280);
      },
    }}>
      {children}
    </Familiar>
  </div>, document.body);
}
