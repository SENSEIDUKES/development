import type { PassageRectangle } from './measure';

export type PopupSide = 'above' | 'below' | 'docked';

/** Position against visible prose, retaining the chosen side as submenu contents change. */
export function popupPosition({ rectangles, viewport, width, height, clearance, preferred }: {
  rectangles: readonly PassageRectangle[];
  viewport: PassageRectangle;
  width: number;
  height: number;
  clearance: number;
  preferred?: PopupSide;
}) {
  const margin = 12;
  const leftEdge = viewport.left + margin;
  const topEdge = viewport.top + margin;
  const rightEdge = viewport.left + viewport.width - margin;
  const bottomEdge = viewport.top + viewport.height - margin;
  width = Math.min(width, Math.max(1, rightEdge - leftEdge));
  const visible = rectangles.filter(rect => rect.top < bottomEdge && rect.top + rect.height > topEdge);
  const first = visible[0];
  const last = visible.at(-1);
  const selectionTop = Math.min(...visible.map(rect => rect.top));
  const selectionBottom = Math.max(...visible.map(rect => rect.top + rect.height));
  const room = {
    above: Math.max(0, selectionTop - clearance - topEdge),
    below: Math.max(0, bottomEdge - selectionBottom - clearance),
  };
  const minimum = Math.min(height, 104);
  let side: PopupSide = 'docked';
  if (visible.length) {
    if (preferred && preferred !== 'docked' && room[preferred] >= height) side = preferred;
    else if (room.above >= height) side = 'above';
    else if (room.below >= height) side = 'below';
    else if (preferred && preferred !== 'docked' && room[preferred] >= minimum) side = preferred;
    else if (Math.max(room.above, room.below) >= minimum) side = room.above >= room.below ? 'above' : 'below';
  }
  // A selection can fill the entire screen. Keep its actions reachable in a small
  // bottom tray rather than dropping a full-height menu over the selected passage.
  const maxHeight = side === 'docked' ? Math.max(1, Math.min(height, viewport.height * .4, bottomEdge - topEdge)) : room[side];
  const actualHeight = Math.min(height, maxHeight);
  const anchor = side === 'above' ? first : last;
  const center = side === 'docked' || !anchor ? viewport.left + viewport.width / 2 : anchor.left + anchor.width / 2;
  return {
    side, width, maxHeight,
    left: Math.max(leftEdge, Math.min(center - width / 2, rightEdge - width)),
    top: side === 'above' ? selectionTop - clearance - actualHeight
      : side === 'below' ? selectionBottom + clearance : bottomEdge - actualHeight,
  };
}
