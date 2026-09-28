import type { PassageRectangle } from './useSelectionTracker';

/**
 * Selection Highlight: the tinted marks drawn over the selected words.
 * Decorative only; the canonical selection lives in the Selection Tracker.
 */
export function SelectionHighlight({ rectangles }: { rectangles: readonly PassageRectangle[] }) {
  return <div className="sen-text-highlight-marks" aria-hidden="true">
    {rectangles.map((rect, index) => <span key={index} style={rect} />)}
  </div>;
}
