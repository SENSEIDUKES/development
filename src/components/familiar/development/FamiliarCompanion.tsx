import { useEffect, useId, useRef, useState, type RefObject, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { Familiar, type FamiliarProps } from './Familiar';
import { normalizeFamiliarSize } from '../shared/familiar';

type Point = { x: number; y: number };
type Bounds = { left: number; top: number; right: number; bottom: number };
export interface FamiliarCompanionProps extends Pick<FamiliarProps, 'familiar' | 'animation' | 'paused' | 'children'> {
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

/** One instance belongs in the host app shell, beneath its account/Energy providers. */
export function FamiliarCompanion({ boundaryRef, size, minimized = false, onMinimize, bottomInset = 0, children, ...props }: FamiliarCompanionProps) {
  const scale = normalizeFamiliarSize(size);
  const ratio = props.familiar.cellHeight / props.familiar.cellWidth;
  const [width, setWidth] = useState(WIDTH * scale);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [position, setPosition] = useState<Point | null>(null);
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const gesture = useRef<{ id: number; start: Point; origin: Point; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const instructions = useId();
  const element = useRef<HTMLDivElement>(null);
  const wasMinimized = useRef(false);
  useEffect(() => {
    if (!minimized && wasMinimized.current) element.current?.querySelector('button')?.focus({ preventScroll: true });
    if (minimized) setOpen(false);
    wasMinimized.current = minimized;
  }, [minimized]);

  useEffect(() => {
    const update = () => {
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
        setBounds(null);
        setOpen(false);
        return;
      }
      setWidth(nextWidth);
      const extraWidth = Math.max(0, DOCK_WIDTH - nextWidth) / 2;
      const next = { left: visible.left + MARGIN + extraWidth, top: visible.top + MARGIN,
        right: visible.right - nextWidth - MARGIN - extraWidth, bottom: visible.bottom - nextWidth * ratio - DOCK_HEIGHT - MARGIN };
      setBounds(next);
      setPosition(previous => clamp(previous ?? { x: next.right, y: next.bottom - (bottomInset ? 0 : 72) }, next));
    };
    update();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    if (boundaryRef?.current) observer?.observe(boundaryRef.current);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
    };
  }, [boundaryRef, scale, ratio, bottomInset]);

  /** Release the active pointer and prevent a drag from opening the Energy panel. */
  function finish(event: PointerEvent<HTMLButtonElement>, cancelled = false) {
    if (gesture.current?.id !== event.pointerId) return;
    suppressClick.current = cancelled || gesture.current.moved;
    gesture.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  if (minimized || !bounds || !position) return null;
  return createPortal(<div ref={element} className="familiar-companion" data-dragging={dragging || undefined}
    style={{ left: position.x, top: position.y, width }}>
    <span id={instructions} className="familiar-sr-only">Drag to move. Use arrow keys to move when focused. Press Enter for Familiar actions.</span>
    <Familiar {...props} open={open} onOpenChange={setOpen} onMinimize={onMinimize} dragging={dragging} triggerProps={{
      'aria-describedby': instructions,
      onPointerDown: event => {
        if (event.button !== 0 || event.isPrimary === false || gesture.current) return;
        suppressClick.current = false;
        gesture.current = { id: event.pointerId, start: { x: event.clientX, y: event.clientY }, origin: position, moved: false };
        event.currentTarget.setPointerCapture?.(event.pointerId);
      },
      onPointerMove: event => {
        const active = gesture.current;
        if (!active || event.pointerId !== active.id) return;
        const dx = event.clientX - active.start.x;
        const dy = event.clientY - active.start.y;
        if (!active.moved && Math.hypot(dx, dy) < 6) return;
        active.moved = true;
        setDragging(true);
        setOpen(false);
        setPosition(clamp({ x: active.origin.x + dx, y: active.origin.y + dy }, bounds));
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
      },
    }}>
      {children}
    </Familiar>
  </div>, document.body);
}
