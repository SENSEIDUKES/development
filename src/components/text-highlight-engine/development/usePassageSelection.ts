import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { findBlockElement, isValidPassage, normalizePassageSelection, passageRange, type PassageSelection, type TextHighlightBlock } from '../shared/selection';

export interface PassageRectangle { left: number; top: number; width: number; height: number }

export function usePassageSelection(blocks: readonly TextHighlightBlock[], onSelectionChange?: (selection: PassageSelection | null) => void) {
  const rootRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const [snapshot, setSnapshot] = useState<{ selection: PassageSelection; text: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [rectangles, setRectangles] = useState<PassageRectangle[]>([]);
  const controlPointer = useRef(false);
  const selection = snapshot?.selection ?? null;
  const clear = useCallback(() => {
    const root = rootRef.current;
    const native = root?.ownerDocument.getSelection();
    if (root && native?.anchorNode && root.contains(native.anchorNode)) native.removeAllRanges();
    setSnapshot(null);
    setEditing(false);
    controlPointer.current = false;
  }, []);

  useEffect(() => { onSelectionChange?.(selection); }, [selection, onSelectionChange]);

  useLayoutEffect(() => {
    if (snapshot && !blocks.some(block => block.id === snapshot.selection.blockId && block.text === snapshot.text)) clear();
  }, [blocks, snapshot, clear]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const doc = root.ownerDocument;
    const read = () => {
      if (editing || controlPointer.current || controlsRef.current?.contains(doc.activeElement)) return;
      const next = normalizePassageSelection(root, doc.getSelection());
      const block = next && blocks.find(candidate => candidate.id === next.blockId);
      setSnapshot(previous => {
        if (!next || !block || !isValidPassage(block, next)) return null;
        if (previous?.text === block.text && JSON.stringify(previous.selection) === JSON.stringify(next)) return previous;
        return { selection: next, text: block.text };
      });
    };
    const down = (event: PointerEvent) => {
      controlPointer.current = !!controlsRef.current?.contains(event.target as Node);
      if (!controlPointer.current && (editing || !root.contains(event.target as Node))) clear();
    };
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape' && snapshot) { clear(); root.focus({ preventScroll: true }); } };
    doc.addEventListener('selectionchange', read);
    doc.addEventListener('pointerup', read);
    doc.addEventListener('keyup', read);
    doc.addEventListener('pointerdown', down);
    doc.addEventListener('keydown', key);
    return () => {
      doc.removeEventListener('selectionchange', read);
      doc.removeEventListener('pointerup', read);
      doc.removeEventListener('keyup', read);
      doc.removeEventListener('pointerdown', down);
      doc.removeEventListener('keydown', key);
    };
  }, [blocks, editing, clear, snapshot]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !selection) { setRectangles([]); return; }
    let frame = 0;
    const measure = () => {
      const range = passageRange(root, selection);
      let left = 0, top = 0, right = window.innerWidth, bottom = window.innerHeight;
      for (let parent = root.parentElement; parent; parent = parent.parentElement) {
        const style = getComputedStyle(parent);
        const bounds = parent.getBoundingClientRect();
        if (/(auto|scroll|hidden|clip)/.test(style.overflowX)) { left = Math.max(left, bounds.left); right = Math.min(right, bounds.right); }
        if (/(auto|scroll|hidden|clip)/.test(style.overflowY)) { top = Math.max(top, bounds.top); bottom = Math.min(bottom, bounds.bottom); }
      }
      setRectangles(range ? Array.from(range.getClientRects()).filter(rect => rect.width > 0 && rect.height > 0)
        .map(rect => ({ left: Math.max(left, rect.left), top: Math.max(top, rect.top),
          width: Math.min(right, rect.right) - Math.max(left, rect.left), height: Math.min(bottom, rect.bottom) - Math.max(top, rect.top) }))
        .filter(rect => rect.width > 0 && rect.height > 0) : []);
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    measure();
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('scroll', schedule);
    const observer = new ResizeObserver(schedule);
    observer.observe(root);
    if (controlsRef.current) observer.observe(controlsRef.current);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('scroll', schedule);
    };
  }, [selection, editing, blocks]);

  const beginEdit = () => {
    if (!snapshot) return;
    setEditing(true);
    // Retained rectangles replace the native tint while the textarea has focus.
    rootRef.current?.ownerDocument.getSelection()?.removeAllRanges();
  };
  const focusBlock = () => {
    if (rootRef.current && selection) findBlockElement(rootRef.current, selection.blockId)?.focus({ preventScroll: true });
  };
  return { rootRef, controlsRef, selection, sourceText: snapshot?.text, editing, rectangles, beginEdit, clear, focusBlock };
}
