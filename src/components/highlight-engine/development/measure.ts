export interface PassageRectangle { left: number; top: number; width: number; height: number }

/**
 * Screen rectangles trimmed to the viewport and to every clipping ancestor of
 * `root`, so a highlight never paints outside a scrolling reader.
 */
export function clipRectangles(root: HTMLElement, rects: ArrayLike<DOMRect> | Iterable<DOMRect> | undefined | null): PassageRectangle[] {
  if (!rects) return [];
  let left = 0, top = 0, right = window.innerWidth, bottom = window.innerHeight;
  for (let parent = root.parentElement; parent; parent = parent.parentElement) {
    const style = getComputedStyle(parent);
    const bounds = parent.getBoundingClientRect();
    if (/(auto|scroll|hidden|clip)/.test(style.overflowX)) { left = Math.max(left, bounds.left); right = Math.min(right, bounds.right); }
    if (/(auto|scroll|hidden|clip)/.test(style.overflowY)) { top = Math.max(top, bounds.top); bottom = Math.min(bottom, bounds.bottom); }
  }
  return Array.from(rects).filter(rect => rect.width > 0 && rect.height > 0)
    .map(rect => ({ left: Math.max(left, rect.left), top: Math.max(top, rect.top),
      width: Math.min(right, rect.right) - Math.max(left, rect.left), height: Math.min(bottom, rect.bottom) - Math.max(top, rect.top) }))
    .filter(rect => rect.width > 0 && rect.height > 0);
}

/**
 * One rectangle per stretch of a line: the browser reports a range's text and
 * the inline elements around it separately, and drawing both would darken
 * where they overlap and notch a tint at every element edge.
 */
export function mergeLineRectangles(rects: readonly PassageRectangle[]): PassageRectangle[] {
  const merged: PassageRectangle[] = [];
  for (const rect of [...rects].sort((first, second) => first.top - second.top || first.left - second.left)) {
    const line = merged.find(candidate => Math.abs(candidate.top - rect.top) < 1 && Math.abs(candidate.height - rect.height) < 1
      && rect.left <= candidate.left + candidate.width + 1 && candidate.left <= rect.left + rect.width + 1);
    if (!line) { merged.push({ ...rect }); continue; }
    const right = Math.max(line.left + line.width, rect.left + rect.width);
    line.left = Math.min(line.left, rect.left);
    line.width = right - line.left;
  }
  return merged;
}

/**
 * Calls `onChange` at most once per frame whenever the layout could have
 * changed: typing, resizing, the on-screen keyboard, web fonts finishing, a
 * size change of `root` or any extra element and — for screen-fixed drawings
 * only — scrolling. Returns the cleanup.
 */
export function watchLayout(
  root: HTMLElement, onChange: () => void, extra: ReadonlyArray<Element | null | undefined> = [], { scroll = true }: { scroll?: boolean } = {},
): () => void {
  let frame = 0;
  const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(onChange); };
  root.addEventListener('input', schedule);
  window.addEventListener('resize', schedule);
  window.visualViewport?.addEventListener('resize', schedule);
  document.fonts?.addEventListener?.('loadingdone', schedule);
  if (scroll) {
    window.addEventListener('scroll', schedule, true);
    window.visualViewport?.addEventListener('scroll', schedule);
  }
  const observer = new ResizeObserver(schedule);
  observer.observe(root);
  for (const element of extra) if (element) observer.observe(element);
  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    root.removeEventListener('input', schedule);
    window.removeEventListener('resize', schedule);
    window.visualViewport?.removeEventListener('resize', schedule);
    document.fonts?.removeEventListener?.('loadingdone', schedule);
    if (scroll) {
      window.removeEventListener('scroll', schedule, true);
      window.visualViewport?.removeEventListener('scroll', schedule);
    }
  };
}
