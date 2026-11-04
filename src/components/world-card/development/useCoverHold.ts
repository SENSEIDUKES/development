import { useEffect, useRef, type MouseEvent, type PointerEvent } from 'react';

/** How long a finger (or the mouse button) rests on a cover before it counts as a hold. */
export const COVER_HOLD_MS = 500;
/** How far a resting finger may drift before the touch counts as a scroll instead. */
const HOLD_SLOP_PX = 10;

/**
 * A press and hold on a card's cover: a tap still opens the world, a hold does something else
 * (the cards open the story's information). The long press a phone offers on its own (a
 * context menu) counts as the same hold, and the tap that ends a hold never also opens the world.
 */
export function useCoverHold(onHold: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const start = useRef<{ x: number; y: number } | null>(null);
  const held = useRef(false);
  const onHoldRef = useRef(onHold);
  onHoldRef.current = onHold;
  const cancel = () => { clearTimeout(timer.current); start.current = null; };
  const hold = () => {
    if (held.current) return;
    held.current = true;
    cancel();
    onHoldRef.current();
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  return {
    onPointerDown: (event: PointerEvent) => {
      if (event.button !== 0) return;
      held.current = false;
      start.current = { x: event.clientX, y: event.clientY };
      clearTimeout(timer.current);
      timer.current = setTimeout(hold, COVER_HOLD_MS);
    },
    onPointerMove: (event: PointerEvent) => {
      const from = start.current;
      if (from && Math.hypot(event.clientX - from.x, event.clientY - from.y) > HOLD_SLOP_PX) cancel();
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onPointerLeave: cancel,
    onContextMenu: (event: MouseEvent) => { event.preventDefault(); hold(); },
    /** The click that ends a hold is the hold's, not a tap. */
    onClickCapture: (event: MouseEvent) => {
      if (!held.current) return;
      held.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
  };
}
