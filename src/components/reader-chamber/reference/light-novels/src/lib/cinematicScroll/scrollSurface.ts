/**
 * Document scroll surface.
 *
 * The reader renders as normal document flow — every ancestor uses min-height,
 * so the *document* is the one and only vertical scroll owner. This module
 * centralizes reads/writes against `document.scrollingElement` so nothing else
 * in the cinematic-scroll system touches the DOM scroll state directly.
 */

export interface ViewportBounds {
  /** Top of the visible viewport in layout-viewport CSS pixels. */
  top: number;
  /** Height of the *visible* viewport (VisualViewport when available). */
  height: number;
  bottom: number;
}

export interface ScrollSurface {
  getElement(): HTMLElement;
  getPosition(): number;
  /** Writes are clamped to [0, maxPosition]. */
  setPosition(position: number): void;
  getMaxPosition(): number;
  getViewport(): ViewportBounds;
  subscribe(listener: () => void): () => void;
}

export function resolveScrollingElement(): HTMLElement {
  return (document.scrollingElement as HTMLElement | null) ?? document.documentElement;
}

/**
 * Visible viewport geometry. Prefers VisualViewport so mobile browser chrome
 * (URL bar, keyboard) shrinking the visible area is reflected in the bounds.
 */
export function getVisibleViewport(): ViewportBounds {
  const vv = typeof window !== 'undefined' ? window.visualViewport : null;
  if (vv) {
    return { top: vv.offsetTop, height: vv.height, bottom: vv.offsetTop + vv.height };
  }
  const height =
    typeof document !== 'undefined' ? document.documentElement.clientHeight : 0;
  return { top: 0, height, bottom: height };
}

/**
 * The focus line: where the actively narrated block should sit, measured from
 * the top of the layout viewport. One third into the *visible* reading area,
 * offset by any top occlusion (sticky header height).
 */
export function getFocusLine(topOcclusion = 0): number {
  const { top, height } = getVisibleViewport();
  const usable = Math.max(0, height - topOcclusion);
  return top + topOcclusion + usable * 0.33;
}

export function createDocumentScrollSurface(): ScrollSurface {
  const getElement = resolveScrollingElement;

  const getMaxPosition = () => {
    const el = getElement();
    return Math.max(0, el.scrollHeight - el.clientHeight);
  };

  return {
    getElement,
    getPosition: () => getElement().scrollTop,
    setPosition: (position: number) => {
      if (!Number.isFinite(position)) return;
      const clamped = Math.min(Math.max(0, position), getMaxPosition());
      getElement().scrollTop = clamped;
    },
    getMaxPosition,
    getViewport: getVisibleViewport,
    subscribe: (listener: () => void) => {
      // Document scrolling fires `scroll` on window regardless of which
      // element is the scrollingElement.
      window.addEventListener('scroll', listener, { passive: true });
      return () => window.removeEventListener('scroll', listener);
    },
  };
}
