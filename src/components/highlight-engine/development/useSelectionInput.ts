import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { wordAt, wordRanges } from '../../../narrative/words';
import { BLOCK_ATTRIBUTE, findBlockElement, passageEdges, passagePoint, type PassageSelection, type TextHighlightBlock } from '../shared/selection';

const HOLD_MS = 450;
const MOVE_TOLERANCE = 8;
const EXCLUDED = 'button, a, input, textarea, select, [contenteditable], [data-sen-selection-ignore], [aria-hidden="true"]';

interface InputOptions {
  rootRef: RefObject<HTMLDivElement | null>;
  handlesRef: RefObject<HTMLDivElement | null>;
  blocks: readonly TextHighlightBlock[];
  selection: PassageSelection | null;
  enabled: boolean;
  locale?: string;
  choose: (selection: PassageSelection | null) => void;
}

/** Mouse, touch and keyboard input for the engine's canonical offsets. No live native range is installed. */
export function useSelectionInput(options: InputOptions) {
  const latest = useRef(options);
  latest.current = options;
  const [dragging, setDragging] = useState(false);
  const { rootRef, handlesRef, enabled, blocks } = options;
  const reconcileSource = useRef<(() => void) | null>(null);
  useLayoutEffect(() => { reconcileSource.current?.(); }, [blocks]);

  useEffect(() => {
    const root = rootRef.current;
    if (!enabled || !root) return;
    const doc = root.ownerDocument;
    const win = doc.defaultView!;
    type Drag = { id: number; block: TextHighlightBlock; anchor: number; end: number; x: number; y: number;
      startX: number; startY: number; active: boolean; words: boolean; handle?: 'start' | 'end'; target: HTMLElement; offsetX: number; offsetY: number };
    let drag: Drag | null = null;
    let hold: ReturnType<typeof setTimeout> | undefined;
    let frame = 0;
    let suppressClick = false;
    let caret: { blockId: string; text: string; anchor: number; focus: number } | null = null;
    const stop = () => {
      clearTimeout(hold); hold = undefined;
      win.cancelAnimationFrame(frame); frame = 0;
      const previous = drag; drag = null;
      if (previous?.target.hasPointerCapture?.(previous.id)) previous.target.releasePointerCapture(previous.id);
      setDragging(false);
    };
    reconcileSource.current = () => {
      const dragged = drag?.block;
      const keyed = caret;
      if (dragged && !latest.current.blocks.some(block => block.id === dragged.id && block.text === dragged.text)) stop();
      if (keyed && !latest.current.blocks.some(block => block.id === keyed.blockId && block.text === keyed.text)) caret = null;
    };
    const choose = (block: TextHighlightBlock, anchor: number, focus: number) => {
      const edges = passageEdges(block.text, latest.current.locale);
      const snap = (offset: number) => edges.reduce((best, edge) => Math.abs(edge - offset) < Math.abs(best - offset) ? edge : best, 0);
      const startOffset = Math.min(snap(anchor), snap(focus));
      const endOffset = Math.max(snap(anchor), snap(focus));
      caret = { blockId: block.id, text: block.text, anchor: snap(anchor), focus: snap(focus) };
      latest.current.choose(endOffset > startOffset && block.text.slice(startOffset, endOffset).trim()
        ? { blockId: block.id, startOffset, endOffset, selectedText: block.text.slice(startOffset, endOffset) } : null);
    };
    const word = (block: TextHighlightBlock, offset: number) => wordAt(block.text, offset, latest.current.locale)
      ?? wordAt(block.text, offset - 1, latest.current.locale);
    const updateDrag = () => {
      if (!drag?.active) return;
      const blockElement = findBlockElement(root, drag.block.id);
      if (!blockElement) { stop(); return; }
      const bounds = blockElement.getBoundingClientRect();
      const y = drag.y + drag.offsetY;
      const point = passagePoint(root, Math.max(bounds.left + 1, Math.min(drag.x + drag.offsetX, bounds.right - 1)),
        Math.max(1, Math.min(y, win.innerHeight - 1)));
      const offset = y < bounds.top ? 0 : y > bounds.bottom ? drag.block.text.length
        : point?.blockId === drag.block.id ? point.offset : null;
      if (offset === null) return;
      if (drag.handle) {
        const edges = passageEdges(drag.block.text, latest.current.locale);
        const anchor = drag.anchor;
        const limit = drag.handle === 'start' ? edges.filter(edge => edge < anchor).at(-1) ?? 0
          : edges.find(edge => edge > anchor) ?? drag.block.text.length;
        choose(drag.block, drag.anchor, drag.handle === 'start' ? Math.min(offset, limit) : Math.max(offset, limit));
      } else if (drag.words) {
        const next = word(drag.block, offset);
        choose(drag.block, offset < drag.anchor ? drag.end : drag.anchor, offset < drag.anchor ? next?.start ?? offset : next?.end ?? offset);
      } else choose(drag.block, drag.anchor, offset);
    };
    const autoScroll = () => {
      frame = 0;
      if (!drag?.active) return;
      let scroller: HTMLElement | null = findBlockElement(root, drag.block.id) ?? root;
      while (scroller && !(scroller.scrollHeight > scroller.clientHeight && /auto|scroll/.test(win.getComputedStyle(scroller).overflowY))) scroller = scroller.parentElement;
      const bounds = scroller?.getBoundingClientRect();
      const top = Math.max(0, bounds?.top ?? 0);
      const bottom = Math.min(win.innerHeight, bounds?.bottom ?? win.innerHeight);
      const amount = drag.y < top + 48 ? -10 : drag.y > bottom - 48 ? 10 : 0;
      if (!amount) return;
      if (scroller) scroller.scrollTop += amount; else win.scrollBy(0, amount);
      updateDrag();
      frame = win.requestAnimationFrame(autoScroll);
    };
    const down = (event: PointerEvent) => {
      if (event.isPrimary === false) { stop(); return; }
      if (event.button !== 0) return;
      const target = event.target instanceof Element ? event.target : null;
      const handle = target?.closest<HTMLElement>('[data-sen-selection-handle]');
      const selection = latest.current.selection;
      if (handle && handlesRef.current?.contains(handle) && selection) {
        event.preventDefault(); stop(); suppressClick = true;
        const block = latest.current.blocks.find(block => block.id === selection.blockId);
        if (!block) return;
        const side = handle.dataset.senSelectionHandle as 'start' | 'end';
        drag = { id: event.pointerId, block, anchor: side === 'start' ? selection.endOffset : selection.startOffset,
          end: selection.endOffset, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY,
          active: true, words: false, handle: side, target: handle,
          offsetX: Number(handle.dataset.senSelectionX) - event.clientX, offsetY: Number(handle.dataset.senSelectionY) - event.clientY };
        handle.setPointerCapture?.(event.pointerId); setDragging(true); return;
      }
      if (!target || !root.contains(target) || target.closest(EXCLUDED)) return;
      const element = target.closest<HTMLElement>(`[${BLOCK_ATTRIBUTE}]`);
      const point = passagePoint(root, event.clientX, event.clientY);
      const block = point && latest.current.blocks.find(block => block.id === point.blockId);
      if (!element || !block) return;
      stop(); suppressClick = false;
      drag = { id: event.pointerId, block, anchor: point.offset, end: point.offset, x: event.clientX, y: event.clientY,
        startX: event.clientX, startY: event.clientY, active: false, words: false, target: element, offsetX: 0, offsetY: 0 };
      if (event.pointerType === 'touch' || event.pointerType === 'pen') {
        hold = setTimeout(() => {
          if (!drag) return;
          const found = word(block, point.offset);
          if (!found) { stop(); return; }
          drag.active = true; drag.words = true; drag.anchor = found.start; drag.end = found.end;
          suppressClick = true; element.focus({ preventScroll: true });
          choose(block, found.start, found.end);
          setDragging(true);
        }, HOLD_MS);
      } else {
        event.preventDefault(); element.focus({ preventScroll: true });
        drag.active = true;
        if (event.shiftKey && selection?.blockId === block.id) drag.anchor = caret?.blockId === block.id ? caret.anchor : selection.startOffset;
        choose(block, drag.anchor, point.offset);
        element.setPointerCapture?.(event.pointerId);
        setDragging(true);
      }
    };
    const move = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      drag.x = event.clientX; drag.y = event.clientY;
      if (!drag.active) {
        if (Math.hypot(drag.x - drag.startX, drag.y - drag.startY) > MOVE_TOLERANCE) stop();
        return;
      }
      event.preventDefault();
      suppressClick = true; updateDrag();
      if (!frame) frame = win.requestAnimationFrame(autoScroll);
    };
    const up = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      if (!drag.active) latest.current.choose(null);
      stop();
    };
    const cancel = () => stop();
    const touchMove = (event: TouchEvent) => {
      if (event.touches.length > 1) { stop(); return; }
      // Touch action is decided before a hold. Cancel movement only after the hold activates;
      // ordinary swipes and pinch zoom retain the browser's native scrolling behavior.
      if (drag?.active && event.cancelable) event.preventDefault();
    };
    const click = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target || !root.contains(target) || target.closest(EXCLUDED)) return;
      if (suppressClick) { event.preventDefault(); suppressClick = false; return; }
      if (event.detail < 2) return;
      const point = passagePoint(root, event.clientX, event.clientY);
      const block = point && latest.current.blocks.find(block => block.id === point.blockId);
      if (!block) return;
      const found = event.detail >= 3 ? { start: 0, end: block.text.length } : word(block, point.offset);
      if (found) { event.preventDefault(); choose(block, found.start, found.end); }
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { stop(); caret = null; return; }
      if (event.altKey || event.isComposing) return;
      const target = event.target instanceof Element ? event.target : null;
      const handle = target?.closest<HTMLElement>('[data-sen-selection-handle]');
      const ownedHandle = handle && handlesRef.current?.contains(handle);
      if (!ownedHandle && (!target || !root.contains(target) || target.closest(EXCLUDED))) return;
      const selection = latest.current.selection;
      const element = ownedHandle && selection ? findBlockElement(root, selection.blockId) : target?.closest<HTMLElement>(`[${BLOCK_ATTRIBUTE}]`);
      const block = latest.current.blocks.find(block => block.id === element?.getAttribute(BLOCK_ATTRIBUTE));
      if (!block) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') { event.preventDefault(); choose(block, 0, block.text.length); return; }
      if (!ownedHandle && !event.shiftKey && ['Enter', ' '].includes(event.key)) {
        const found = wordRanges(block.text, latest.current.locale)[0];
        if (found) { event.preventDefault(); choose(block, found.start, found.end); }
        return;
      }
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key) || (!ownedHandle && !event.shiftKey)) return;
      event.preventDefault();
      const rtl = element && win.getComputedStyle(element).direction === 'rtl';
      const backwards = event.key === (rtl ? 'ArrowRight' : 'ArrowLeft') || event.key === 'ArrowUp' || event.key === 'Home';
      const side = ownedHandle ? handle.dataset.senSelectionHandle : undefined;
      const current = selection?.blockId === block.id ? selection : null;
      if (current && caret?.blockId === block.id && (Math.min(caret.anchor, caret.focus) !== current.startOffset || Math.max(caret.anchor, caret.focus) !== current.endOffset)) caret = null;
      const focus = side === 'start' ? current!.startOffset : side === 'end' ? current!.endOffset
        : caret?.blockId === block.id ? caret.focus : current?.endOffset ?? 0;
      const anchor = side === 'start' ? current!.endOffset : side === 'end' ? current!.startOffset
        : caret?.blockId === block.id ? caret.anchor : current?.startOffset ?? 0;
      const edges = event.ctrlKey || event.metaKey ? [0, ...wordRanges(block.text, latest.current.locale).flatMap(word => [word.start, word.end]), block.text.length]
        : passageEdges(block.text, latest.current.locale);
      let next = event.key === 'Home' ? 0 : event.key === 'End' ? block.text.length
        : backwards ? edges.filter(edge => edge < focus).at(-1) ?? 0 : edges.find(edge => edge > focus) ?? block.text.length;
      if (side === 'start') next = Math.min(next, passageEdges(block.text, latest.current.locale).filter(edge => edge < anchor).at(-1) ?? 0);
      if (side === 'end') next = Math.max(next, passageEdges(block.text, latest.current.locale).find(edge => edge > anchor) ?? block.text.length);
      choose(block, anchor, next);
    };
    const selectStart = (event: Event) => {
      if (event.target instanceof Element && !event.target.closest('input, textarea, [contenteditable]')) event.preventDefault();
    };
    doc.addEventListener('pointerdown', down);
    doc.addEventListener('pointermove', move, { passive: false });
    doc.addEventListener('pointerup', up);
    doc.addEventListener('pointercancel', cancel);
    doc.addEventListener('touchmove', touchMove, { passive: false });
    doc.addEventListener('keydown', key);
    root.addEventListener('click', click);
    root.addEventListener('selectstart', selectStart);
    win.addEventListener('blur', cancel);
    return () => {
      stop();
      reconcileSource.current = null;
      doc.removeEventListener('pointerdown', down); doc.removeEventListener('pointermove', move); doc.removeEventListener('pointerup', up);
      doc.removeEventListener('pointercancel', cancel); doc.removeEventListener('touchmove', touchMove); doc.removeEventListener('keydown', key);
      root.removeEventListener('click', click); root.removeEventListener('selectstart', selectStart); win.removeEventListener('blur', cancel);
    };
  }, [rootRef, handlesRef, enabled]);
  return { dragging };
}
