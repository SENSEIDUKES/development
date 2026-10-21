import type { CSSProperties, RefObject } from 'react';
import { createPortal } from 'react-dom';
import type { PassageSelection } from '../shared/selection';

/** The engine's range edges: 44px touch targets, also adjustable with keyboard arrows. */
export function SelectionHandles({ container, handlesRef, points, selection, length, style }: {
  container: HTMLElement;
  handlesRef: RefObject<HTMLDivElement | null>;
  points: { start: { left: number; top: number } | null; end: { left: number; top: number } | null };
  selection: PassageSelection;
  length: number;
  style?: CSSProperties;
}) {
  const viewport = container.ownerDocument.defaultView!.visualViewport;
  const left = viewport?.offsetLeft ?? 0;
  const top = viewport?.offsetTop ?? 0;
  const width = viewport?.width ?? container.ownerDocument.defaultView!.innerWidth;
  const height = viewport?.height ?? container.ownerDocument.defaultView!.innerHeight;
  return createPortal(<div className="sen-text-highlight" style={style}>
    <div ref={handlesRef} className="sen-selection-handles" data-sen-selection-preserve>
      {(['start', 'end'] as const).map(side => {
        const point = points[side];
        if (!point || point.top < top || point.top > top + height - 44) return null;
        return <button key={side} type="button" role="slider" aria-label={`Selection ${side}`} aria-orientation="horizontal"
          aria-valuemin={side === 'start' ? 0 : selection.startOffset + 1} aria-valuemax={side === 'start' ? selection.endOffset - 1 : length}
          aria-valuenow={side === 'start' ? selection.startOffset : selection.endOffset} aria-valuetext={selection.selectedText}
          data-sen-selection-handle={side} data-sen-selection-x={point.left} data-sen-selection-y={point.top - 6} className="sen-selection-handle"
          style={{ left: Math.max(left, Math.min(point.left - 22, left + width - 44)), top: point.top }} />;
      })}
    </div>
  </div>, container);
}
