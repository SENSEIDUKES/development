import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { passageRange, type TextHighlightBlock } from '../shared/selection';
import type { TextHighlightOverlay } from '../shared/overlay';
import { watchLayout, type PassageRectangle } from './measure';

interface PlacedMark { id: string; tone: string; label?: string; rects: PassageRectangle[] }
interface PlacedChip { id: string; label: string; left: number; top: number; kind: 'mark' | 'pin' }

const CHIP_HEIGHT = 16;
/** Chips use a fixed-width face, so their width is known before they are drawn. */
const chipWidth = (label: string) => label.length * 6.2 + 10;

/**
 * Overlay Layer: draws a host's overlay — tinted ranges and numbered chips —
 * over the prose. It is decorative and hidden from assistive technology;
 * taps pass through to the text, and it does no work while no overlay is set.
 *
 * Drawings are placed on the page beside the words, not on the screen, so
 * they scroll natively with the text: scrolling costs no measuring at all.
 */
export function OverlayLayer({ overlay, blocks }: {
  overlay?: TextHighlightOverlay;
  blocks: readonly TextHighlightBlock[];
}) {
  const [marks, setMarks] = useState<PlacedMark[]>([]);
  const [chips, setChips] = useState<PlacedChip[]>([]);
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
    if (!root || !overlay) { setMarks([]); setChips([]); return; }
    const measure = () => {
      const origin = root.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const local = (rects: ArrayLike<DOMRect> | undefined): PassageRectangle[] => Array.from(rects ?? [])
        .filter(rect => rect.width > 0 && rect.height > 0)
        .map(rect => ({ left: rect.left - origin.left, top: rect.top - origin.top, width: rect.width, height: rect.height }));
      // Chips stay fully on screen horizontally; the page never scrolls sideways.
      const placeChip = (id: string, label: string, screenLeft: number, top: number, kind: PlacedChip['kind']): PlacedChip => ({
        id, label, kind, top,
        left: Math.max(4, Math.min(screenLeft, viewportWidth - chipWidth(label) - 4)) - origin.left,
      });
      const placedMarks: PlacedMark[] = [];
      const placedChips: PlacedChip[] = [];
      for (const mark of overlay.marks ?? []) {
        const rects = local(passageRange(root, mark.selection)?.getClientRects());
        if (!rects.length) continue;
        placedMarks.push({ id: mark.id, tone: mark.tone, label: mark.label, rects });
        if (mark.label) placedChips.push(placeChip(`${mark.id}:label`, mark.label, rects[0].left + origin.left, rects[0].top - CHIP_HEIGHT - 2, 'mark'));
      }
      for (const pin of overlay.pins ?? []) {
        const text = blocks.find(candidate => candidate.id === pin.blockId)?.text;
        if (!text) continue;
        const start = Math.min(pin.offset, text.length - 1);
        const range = passageRange(root, { blockId: pin.blockId, startOffset: start, endOffset: start + 1, selectedText: text.slice(start, start + 1) });
        const rect = local(range?.getClientRects())[0];
        if (!rect) continue;
        placedChips.push(placeChip(pin.id, pin.label, rect.left + origin.left - (pin.placement === 'raised' ? 2 : 0),
          pin.placement === 'above' ? rect.top - CHIP_HEIGHT - 4 : rect.top - CHIP_HEIGHT * 0.55, 'pin'));
      }
      setMarks(placedMarks);
      setChips(placedChips);
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
    <div className="sen-text-highlight-overlay sen-text-highlight-overlay--chips" aria-hidden="true">
      {chips.map(chip => <span key={chip.id} className={chip.kind === 'pin' ? 'sen-overlay-pin' : 'sen-overlay-label'}
        data-overlay-id={chip.id} style={{ left: chip.left, top: chip.top }}>{chip.label}</span>)}
    </div>
  </>;
}
