import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { findBlockElement, isValidPassage, normalizePassageSelection, passageRange, type PassageSelection, type TextHighlightBlock } from '../shared/selection';
import { clipRectangles, watchLayout, type PassageRectangle } from './measure';

export type { PassageRectangle };

/**
 * Selection Tracker: reads the browser selection inside the engine root,
 * keeps the one canonical selection snapshot, measures its on-screen
 * rectangles, and owns clearing (Escape, outside pointer) and the first-Tab
 * jump into the Action Bar.
 */
export function useSelectionTracker(blocks: readonly TextHighlightBlock[], onSelectionChange?: (selection: PassageSelection | null) => void) {
  const rootRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLSpanElement>(null);
  const [snapshot, setSnapshot] = useState<{ selection: PassageSelection; text: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [rectangles, setRectangles] = useState<PassageRectangle[]>([]);
  const controlPointer = useRef(false);
  /** The first forward Tab moves into the Action Bar once per selection, never again until the selection changes. */
  const tabTransferred = useRef(false);
  const selection = snapshot?.selection ?? null;
  const clear = useCallback(() => {
    tabTransferred.current = false;
    const root = rootRef.current;
    const native = root?.ownerDocument.getSelection();
    if (root && native?.anchorNode && root.contains(native.anchorNode)) native.removeAllRanges();
    setSnapshot(null);
    setEditing(false);
    setActionOpen(false);
    controlPointer.current = false;
  }, []);

  useEffect(() => { onSelectionChange?.(selection); }, [selection, onSelectionChange]);
  useEffect(() => { tabTransferred.current = false; }, [selection]);

  useLayoutEffect(() => {
    if (snapshot && !blocks.some(block => block.id === snapshot.selection.blockId && block.text === snapshot.text)) clear();
  }, [blocks, snapshot, clear]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const doc = root.ownerDocument;
    const read = () => {
      if (editing || actionOpen || controlPointer.current || controlsRef.current?.contains(doc.activeElement)) return;
      const next = normalizePassageSelection(root, doc.getSelection());
      const block = next && blocks.find(candidate => candidate.id === next.blockId);
      setSnapshot(previous => {
        if (!next || !block || !isValidPassage(block, next)) return null;
        if (previous?.text === block.text && JSON.stringify(previous.selection) === JSON.stringify(next)) return previous;
        return { selection: next, text: block.text };
      });
    };
    const down = (event: PointerEvent) => {
      const target = event.target as Node;
      const preserved = target.nodeType === Node.ELEMENT_NODE
        ? (target as Element).closest('[data-sen-selection-preserve]')
        : target.parentElement?.closest('[data-sen-selection-preserve]');
      controlPointer.current = !!controlsRef.current?.contains(target) || !!preserved;
      if (!controlPointer.current && !editorRef.current?.contains(target) && (editing || actionOpen || !root.contains(target))) clear();
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && snapshot) { clear(); root.focus({ preventScroll: true }); return; }
      // The floating controls sit at the end of the document. Whatever a host
      // renders after its prose, the first Tab after a selection enters them.
      if (event.key !== 'Tab' || event.shiftKey || !snapshot || actionOpen || tabTransferred.current) return;
      const controls = controlsRef.current;
      const first = controls?.querySelector<HTMLElement>('button:not(:disabled)');
      if (!controls || !first || controls.contains(doc.activeElement)) return;
      event.preventDefault();
      tabTransferred.current = true;
      first.focus();
    };
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
  }, [blocks, editing, actionOpen, clear, snapshot]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !selection) { setRectangles([]); return; }
    const measure = () => {
      const range = editing ? null : passageRange(root, selection);
      setRectangles(clipRectangles(root, editing ? editorRef.current?.getClientRects() : range?.getClientRects()));
    };
    measure();
    return watchLayout(root, measure, [controlsRef.current]);
  }, [selection, editing, blocks]);

  const beginEdit = () => {
    if (!snapshot) return;
    setEditing(true);
    // The inline draft takes focus; the canonical selection stays unchanged.
    rootRef.current?.ownerDocument.getSelection()?.removeAllRanges();
  };
  const beginAction = () => {
    if (!snapshot) return;
    setActionOpen(true);
    rootRef.current?.ownerDocument.getSelection()?.removeAllRanges();
  };
  const focusBlock = () => {
    if (rootRef.current && selection) findBlockElement(rootRef.current, selection.blockId)?.focus({ preventScroll: true });
  };
  return { rootRef, controlsRef, editorRef, selection, sourceText: snapshot?.text, editing, actionOpen, rectangles, beginEdit, beginAction, clear, focusBlock };
}

/** Former name, kept so existing hosts keep working. */
export const usePassageSelection = useSelectionTracker;
