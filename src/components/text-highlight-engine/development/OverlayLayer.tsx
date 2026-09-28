import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { passageRange, type TextHighlightBlock } from '../shared/selection';
import type { OverlayPin, TextHighlightOverlay } from '../shared/overlay';
import { watchLayout, type PassageRectangle } from './measure';

interface PlacedMark { id: string; tone: string; rects: PassageRectangle[] }
interface PlacedPin { id: string; label: string; placement: OverlayPin['placement']; top: number; left?: number; width?: number }

/** Raised numbers are set 10px on a 10px line, so their box is known before they are drawn. */
const RAISED_HEIGHT = 10;
/** Tabular digits are a little over half an em wide; an estimate is enough to keep numbers apart. */
const raisedWidth = (label: string) => label.length * 6.5;
/** Margin numbers are set 11px on a 12px line, with their baseline about 10px down. */
const MARGIN_BASELINE = 10;
/** Where a line's baseline sits within its glyph box, for common text faces. */
const BASELINE_RATIO = 0.8;
/** The gap kept between two raised numbers that would otherwise touch. */
const RAISED_GAP = 3;

/**
 * Overlay Layer: draws a host's overlay with the prose without covering a
 * word. Tints sit behind the text; numbers use the white space around it —
 * the start margin beside a line, or the line spacing just above a
 * character. It is decorative and hidden from assistive technology; taps pass
 * through to the text, and it does no work while no overlay is set.
 *
 * Drawings are placed on the page beside the words, not on the screen, so
 * they scroll natively with the text: scrolling costs no measuring at all.
 */
export function OverlayLayer({ overlay, blocks }: {
  overlay?: TextHighlightOverlay;
  blocks: readonly TextHighlightBlock[];
}) {
  const [marks, setMarks] = useState<PlacedMark[]>([]);
  const [pins, setPins] = useState<PlacedPin[]>([]);
  // Keyed by content, not identity: a host rebuilding the same overlay each render causes no work.
  const signature = useMemo(() => JSON.stringify(overlay ?? null), [overlay]);
  const latest = useRef(overlay);
  latest.current = overlay;
  // The layer's own element is attached before this effect runs; the engine
  // root is its parent (a parent's ref is not attached yet at that point).
  const layerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = layerRef.current?.parentElement;
    const overlay = latest.current;
    if (!root || !overlay) { setMarks([]); setPins([]); return; }
    const measure = () => {
      const origin = root.getBoundingClientRect();
      const local = (rects: ArrayLike<DOMRect> | undefined): PassageRectangle[] => Array.from(rects ?? [])
        .filter(rect => rect.width > 0 && rect.height > 0)
        .map(rect => ({ left: rect.left - origin.left, top: rect.top - origin.top, width: rect.width, height: rect.height }));
      const placedMarks: PlacedMark[] = [];
      for (const mark of overlay.marks ?? []) {
        const rects = local(passageRange(root, mark.selection)?.getClientRects());
        if (rects.length) placedMarks.push({ id: mark.id, tone: mark.tone, rects });
      }
      const placedPins: PlacedPin[] = [];
      const raised: Array<PlacedPin & { left: number; width: number }> = [];
      for (const pin of overlay.pins ?? []) {
        const text = blocks.find(candidate => candidate.id === pin.blockId)?.text;
        if (!text) continue;
        const start = Math.min(pin.offset, text.length - 1);
        const range = passageRange(root, { blockId: pin.blockId, startOffset: start, endOffset: start + 1, selectedText: text.slice(start, start + 1) });
        const rect = local(range?.getClientRects())[0];
        if (!rect) continue;
        if (pin.placement === 'margin') {
          // Level with the line's baseline; the stylesheet sets it just outside the text's start edge.
          placedPins.push({ id: pin.id, label: pin.label, placement: 'margin', top: rect.top + rect.height * BASELINE_RATIO - MARGIN_BASELINE });
          continue;
        }
        const width = raisedWidth(pin.label);
        // Ends where the character's glyph box begins, and stays on screen: the page never scrolls sideways.
        const entry = { id: pin.id, label: pin.label, placement: 'raised' as const, top: rect.top - RAISED_HEIGHT, width,
          left: Math.max(4 - origin.left, Math.min(rect.left, window.innerWidth - origin.left - width - 4)) };
        raised.push(entry);
        placedPins.push(entry);
      }
      // Sentences that start closer together than a number is wide never stack their numbers: the later one moves along.
      raised.sort((first, second) => first.top - second.top || first.left - second.left);
      raised.forEach((pin, index) => {
        const previous = raised[index - 1];
        if (previous && Math.abs(pin.top - previous.top) < 1) pin.left = Math.max(pin.left, previous.left + previous.width + RAISED_GAP);
      });
      setMarks(placedMarks);
      setPins(placedPins);
    };
    measure();
    return watchLayout(root, measure, [], { scroll: false });
  }, [signature, blocks]);

  if (!overlay) return null;
  return <>
    <div ref={layerRef} className="sen-text-highlight-overlay" aria-hidden="true">
      {marks.flatMap(mark => mark.rects.map((rect, index) =>
        <span key={`${mark.id}:${index}`} className="sen-overlay-mark" data-overlay-id={mark.id} style={{ ...rect, background: mark.tone }} />))}
    </div>
    <div className="sen-text-highlight-overlay sen-text-highlight-overlay--pins" aria-hidden="true">
      {pins.map(pin => <span key={pin.id} className="sen-overlay-pin" data-placement={pin.placement} data-overlay-id={pin.id}
        style={pin.placement === 'margin' ? { top: pin.top } : { top: pin.top, left: pin.left }}>{pin.label}</span>)}
    </div>
  </>;
}
