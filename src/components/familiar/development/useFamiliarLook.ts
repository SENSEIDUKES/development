import { useEffect, useState, type RefObject } from 'react';

/** Codex v2's sixteen still poses run clockwise from up, in 22.5 degree steps. */
export function familiarLookAnimation(rect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>, x: number, y: number): string | undefined {
  const dx = x - (rect.left + rect.width / 2);
  const dy = y - (rect.top + rect.height / 2);
  if (Math.hypot(dx, dy) <= 1) return undefined;
  const angle = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
  const direction = (Math.round(angle / 22.5) % 16) * 22.5;
  return `look-${String(direction).padStart(direction % 1 ? 5 : 3, '0')}`;
}

/** Mouse-only page attention. No polling, global desktop tracking, or touch hover. */
export function useFamiliarLook(element: RefObject<HTMLElement | null>, boundary: RefObject<HTMLElement | null> | undefined, disabled: boolean) {
  const [animation, setAnimation] = useState<string>();
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const clear = () => setAnimation(undefined);
    clear();
    if (disabled) return;
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || motion.matches || document.hidden) { clear(); return; }
      const area = boundary?.current?.getBoundingClientRect();
      if (boundary && (!area || event.clientX < area.left || event.clientX > area.right || event.clientY < area.top || event.clientY > area.bottom)) { clear(); return; }
      const sprite = element.current?.querySelector('.familiar-sprite');
      if (!sprite) { clear(); return; }
      setAnimation(familiarLookAnimation(sprite.getBoundingClientRect(), event.clientX, event.clientY));
    };
    const exit = (event: PointerEvent) => { if (!event.relatedTarget) clear(); };
    const touch = (event: PointerEvent) => { if (event.pointerType !== 'mouse') clear(); };
    document.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerout', exit);
    document.addEventListener('pointerdown', touch, { passive: true });
    document.addEventListener('visibilitychange', clear);
    window.addEventListener('blur', clear);
    // Clear stale coordinates when the page or preview moves beneath the mouse.
    window.addEventListener('scroll', clear, true);
    window.addEventListener('resize', clear);
    motion.addEventListener('change', clear);
    return () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerout', exit);
      document.removeEventListener('pointerdown', touch);
      document.removeEventListener('visibilitychange', clear);
      window.removeEventListener('blur', clear);
      window.removeEventListener('scroll', clear, true);
      window.removeEventListener('resize', clear);
      motion.removeEventListener('change', clear);
    };
  }, [element, boundary, disabled]);
  return disabled ? undefined : animation;
}
