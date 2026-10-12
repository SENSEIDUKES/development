import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { wordAt } from '../../../narrative/words';
import {
  BLOCK_ATTRIBUTE, findBlockElement, isValidPassage, normalizePassageSelection, passageOffsetAt, passageRange,
  type PassageSelection, type TextHighlightBlock,
} from '../shared/selection';
import { clipRectangles, watchLayout, type PassageRectangle } from './measure';

export type { PassageRectangle };

/** Which face the Action Bar shows: adding to the passage, or removing from it. */
export type ActionBarMode = 'add' | 'remove';

export interface SelectionTrackerOptions {
  /** Right-click, the ContextMenu key and Shift+F10 open Remove mode; hosts pass false once text is fixed. */
  removable?: boolean;
  /** The language of the prose, for finding the word under a right-click. */
  locale?: string;
}

type CaretDocument = Document & {
  caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
  caretRangeFromPoint?: (x: number, y: number) => Range | null;
};

/** A selection's identity: its block and exact positions, however the object was built. */
const selectionKey = ({ blockId, startOffset, endOffset }: PassageSelection) => `${blockId}:${startOffset}:${endOffset}`;
/** The browser menu that follows a ContextMenu key or Shift+F10 arrives within this many milliseconds. */
const MENU_KEY_WINDOW = 800;

/**
 * Selection Tracker: reads the browser selection inside the engine root,
 * keeps the one canonical selection snapshot, measures its on-screen
 * rectangles, and owns clearing (Escape, outside pointer), the first-Tab jump
 * into the Action Bar, and the ways into Remove mode (right-click, the
 * ContextMenu key, Shift+F10).
 */
export function useSelectionTracker(
  blocks: readonly TextHighlightBlock[],
  onSelectionChange?: (selection: PassageSelection | null) => void,
  { removable = false, locale }: SelectionTrackerOptions = {},
) {
  const rootRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLSpanElement>(null);
  const [snapshot, setSnapshot] = useState<{ selection: PassageSelection; text: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [rectangles, setRectangles] = useState<PassageRectangle[]>([]);
  /** Remove mode belongs to one selection: any new selection is back in Add mode. */
  const [removeFor, setRemoveFor] = useState<{ key: string; focus: boolean } | null>(null);
  const controlPointer = useRef(false);
  /** The first forward Tab moves into the Action Bar once per selection, never again until the selection changes. */
  const tabTransferred = useRef(false);
  /** A long press is the phone's own gesture, never a right-click. */
  const lastPointerType = useRef('');
  const menuKeyAt = useRef(Number.NEGATIVE_INFINITY);
  const rectanglesRef = useRef<PassageRectangle[]>([]);
  const selection = snapshot?.selection ?? null;
  const mode: ActionBarMode = removable && selection && removeFor?.key === selectionKey(selection) ? 'remove' : 'add';
  const clear = useCallback(() => {
    tabTransferred.current = false;
    setRemoveFor(null);
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
      lastPointerType.current = event.pointerType;
      const target = event.target as Node;
      const preserved = target.nodeType === Node.ELEMENT_NODE
        ? (target as Element).closest('[data-sen-selection-preserve]')
        : target.parentElement?.closest('[data-sen-selection-preserve]');
      controlPointer.current = !!controlsRef.current?.contains(target) || !!preserved;
      if (!controlPointer.current && !editorRef.current?.contains(target) && (editing || actionOpen || !root.contains(target))) clear();
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && snapshot) { clear(); root.focus({ preventScroll: true }); return; }
      if ((event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey)) && snapshot && removable && !editing && !actionOpen) {
        event.preventDefault();
        menuKeyAt.current = performance.now();
        setRemoveFor({ key: selectionKey(snapshot.selection), focus: true });
        return;
      }
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
    /** The word under a point as a live selection, the way right-clicking a word on a Mac selects it. */
    const wordUnder = (x: number, y: number) => {
      const caretDoc = doc as CaretDocument;
      const caret = caretDoc.caretPositionFromPoint?.(x, y);
      const fallback = caret ? null : caretDoc.caretRangeFromPoint?.(x, y);
      const point = caret ? passageOffsetAt(root, caret.offsetNode, caret.offset)
        : fallback ? passageOffsetAt(root, fallback.startContainer, fallback.startOffset) : null;
      const block = point && blocks.find(candidate => candidate.id === point.blockId);
      // A pointer on a word's last letter reports the caret just after it.
      const word = block && (wordAt(block.text, point.offset, locale) ?? wordAt(block.text, point.offset - 1, locale));
      if (!block || !word) return null;
      const next = { blockId: block.id, selectedText: block.text.slice(word.start, word.end), startOffset: word.start, endOffset: word.end };
      const range = passageRange(root, next);
      if (!range) return null;
      const native = doc.getSelection();
      native?.removeAllRanges();
      native?.addRange(range);
      return { selection: next, text: block.text };
    };
    const menu = (event: MouseEvent) => {
      // The browser menu that follows the ContextMenu key: Remove mode is already open.
      if (performance.now() - menuKeyAt.current < MENU_KEY_WINDOW) { event.preventDefault(); return; }
      if (!removable || editing || actionOpen || lastPointerType.current === 'touch' || lastPointerType.current === 'pen') return;
      const target = event.target as Node;
      const element = target.nodeType === Node.ELEMENT_NODE ? target as Element : target.parentElement;
      if (!element || !root.contains(element) || !element.closest(`[${BLOCK_ATTRIBUTE}]`)) return;
      const onSelection = snapshot && rectanglesRef.current.some(rect => event.clientX >= rect.left && event.clientX <= rect.left + rect.width
        && event.clientY >= rect.top && event.clientY <= rect.top + rect.height);
      const chosen = onSelection ? snapshot : wordUnder(event.clientX, event.clientY);
      // Off any word, the browser keeps its own menu.
      if (!chosen) return;
      event.preventDefault();
      if (!onSelection) setSnapshot(chosen);
      setRemoveFor({ key: selectionKey(chosen.selection), focus: false });
    };
    doc.addEventListener('selectionchange', read);
    doc.addEventListener('pointerup', read);
    doc.addEventListener('keyup', read);
    doc.addEventListener('pointerdown', down);
    doc.addEventListener('keydown', key);
    doc.addEventListener('contextmenu', menu);
    return () => {
      doc.removeEventListener('selectionchange', read);
      doc.removeEventListener('pointerup', read);
      doc.removeEventListener('keyup', read);
      doc.removeEventListener('pointerdown', down);
      doc.removeEventListener('keydown', key);
      doc.removeEventListener('contextmenu', menu);
    };
  }, [blocks, editing, actionOpen, clear, snapshot, removable, locale]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !selection) { setRectangles([]); return; }
    const measure = () => {
      const range = editing ? null : passageRange(root, selection);
      const next = clipRectangles(root, editing ? editorRef.current?.getClientRects() : range?.getClientRects());
      rectanglesRef.current = next;
      setRectangles(next);
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
  /** Switch the bar's face for the current selection: the touch bar's Remove row, and Back. */
  const setMode = (next: ActionBarMode) => setRemoveFor(next === 'remove' && snapshot && removable ? { key: selectionKey(snapshot.selection), focus: false } : null);
  return {
    rootRef, controlsRef, editorRef, selection, sourceText: snapshot?.text, editing, actionOpen, rectangles,
    mode, focusControls: mode === 'remove' && !!removeFor?.focus, setMode, beginEdit, beginAction, clear, focusBlock,
  };
}

/** Former name, kept so existing hosts keep working. */
export const usePassageSelection = useSelectionTracker;
