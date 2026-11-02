import { useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type RefObject } from 'react';

type Point = { x: number; y: number };
type Bounds = { left: number; top: number; right: number; bottom: number };
const MARGIN = 16;
const clamp = (point: Point, bounds: Bounds): Point => ({
  x: Math.max(bounds.left, Math.min(bounds.right, point.x)),
  y: Math.max(bounds.top, Math.min(bounds.bottom, point.y)),
});

/** Keep the reader's placement for this visit, including across closing the card. */
export function useFamiliarPanelDrag(panel: RefObject<HTMLDivElement | null>, open: boolean, bottomInset: number) {
  const [position, setPosition] = useState<Point | null>(null);
  const [dragging, setDragging] = useState(false);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const gesture = useRef<{ id: number; start: Point; origin: Point } | null>(null);

  const readBounds = (rect = panel.current!.getBoundingClientRect()): Bounds => {
    const view = window.visualViewport;
    const left = (view?.offsetLeft ?? 0) + MARGIN;
    const top = (view?.offsetTop ?? 0) + MARGIN;
    return {
      left, top,
      right: left + (view?.width ?? window.innerWidth) - MARGIN * 2 - rect.width,
      bottom: top + (view?.height ?? window.innerHeight) - MARGIN - bottomInset - rect.height,
    };
  };

  useLayoutEffect(() => {
    if (!open) { gesture.current = null; setDragging(false); return; }
    const element = panel.current!;
    const update = () => {
      if (!element.isConnected) return;
      const view = window.visualViewport;
      const width = view?.width ?? window.innerWidth;
      const height = view?.height ?? window.innerHeight;
      // Capture geometry now: React can replay this updater after the card closes.
      const rect = element.getBoundingClientRect();
      const bounds = readBounds(rect);
      setViewport(previous => previous.width === width && previous.height === height ? previous : { width, height });
      setPosition(previous => {
        const next = clamp(previous ?? { x: rect.left, y: rect.top }, bounds);
        return previous?.x === next.x && previous.y === next.y ? previous : next;
      });
    };
    update();
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(update);
    observer?.observe(element);
    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    return () => {
      gesture.current = null;
      observer?.disconnect();
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
    };
  }, [open, bottomInset, panel]);

  const finish = (event: PointerEvent<HTMLDivElement>) => {
    if (gesture.current?.id !== event.pointerId) return;
    gesture.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    if (!delta) return;
    event.preventDefault();
    const rect = panel.current!.getBoundingClientRect();
    const step = event.shiftKey ? 40 : 10;
    setPosition(clamp({ x: rect.left + delta[0] * step, y: rect.top + delta[1] * step }, readBounds(rect)));
  };

  const style: CSSProperties = {
    ...(position ? { left: position.x, top: position.y, insetInlineEnd: 'auto', bottom: 'auto' } : {}),
    ...(viewport.width ? { maxWidth: Math.max(0, viewport.width - MARGIN * 2), maxHeight: Math.max(0, Math.min(viewport.height * .7, viewport.height - bottomInset - MARGIN)) } : {}),
  };
  return { style, dragging, onKeyDown, headerProps: {
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
      if (gesture.current || event.button !== 0 || event.isPrimary === false) return;
      const control = (event.target as HTMLElement).closest('button');
      if (control && !control.classList.contains('familiar-helper-drag-handle')) return;
      const rect = panel.current!.getBoundingClientRect();
      gesture.current = { id: event.pointerId, start: { x: event.clientX, y: event.clientY }, origin: { x: rect.left, y: rect.top } };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
      const active = gesture.current;
      if (!active || active.id !== event.pointerId) return;
      const dx = event.clientX - active.start.x;
      const dy = event.clientY - active.start.y;
      if (Math.hypot(dx, dy) < 4) return;
      setDragging(true);
      setPosition(clamp({ x: active.origin.x + dx, y: active.origin.y + dy }, readBounds()));
    },
    onPointerUp: finish, onPointerCancel: finish, onLostPointerCapture: finish,
  } };
}
