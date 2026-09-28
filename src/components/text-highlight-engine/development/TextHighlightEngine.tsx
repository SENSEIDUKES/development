import { useLayoutEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { replacePassage, type PassageEdit, type PassageSelection, type TextHighlightBlock } from '../shared/selection';
import type { PassageAction } from '../shared/actions';
import type { TextHighlightOverlay } from '../shared/overlay';
import { useSelectionTracker } from './useSelectionTracker';
import { SelectionHighlight } from './SelectionHighlight';
import { InlineEditor } from './InlineEditor';
import { ActionBar } from './ActionBar';
import { UndoNotice } from './UndoNotice';
import { OverlayLayer } from './OverlayLayer';

export interface TextHighlightEngineProps {
  blocks: readonly TextHighlightBlock[];
  onBlocksChange: (blocks: TextHighlightBlock[], edit: PassageEdit) => void;
  onSelectionChange?: (selection: PassageSelection | null) => void;
  actions?: readonly PassageAction[];
  renderBlockText?: (block: TextHighlightBlock) => ReactNode;
  /** False once a host's text is fixed (for example a sealed chapter): no Edit, Delete, or Undo. Defaults to true. */
  editable?: boolean;
  /** Tinted ranges and numbered chips drawn over the prose (for example a Cues overlay). Absent means no overlay work at all. */
  overlay?: TextHighlightOverlay;
  className?: string;
  style?: CSSProperties;
}

/**
 * Text Highlight Engine: puts the named parts together over the host's
 * paragraphs — Selection Tracker, Selection Highlight, Inline Editor, Action
 * Bar, Undo Notice and Overlay Layer — and owns the edit and undo records it
 * reports.
 */
export function TextHighlightEngine({ blocks, onBlocksChange, onSelectionChange, actions = [], renderBlockText, editable = true, overlay, className = '', style }: TextHighlightEngineProps) {
  const tracker = useSelectionTracker(blocks, onSelectionChange);
  const { rootRef, controlsRef, editorRef, selection, sourceText, editing, actionOpen, rectangles, clear } = tracker;
  const [replacement, setReplacement] = useState('');
  const [undo, setUndo] = useState<PassageEdit | null>(null);
  const validUndo = editable && undo && blocks.some(block => block.id === undo.after.id && block.text === undo.after.text) ? undo : null;

  useLayoutEffect(() => { if (undo && !validUndo) setUndo(null); }, [undo, validUndo]);
  // Text that becomes fixed mid-edit cannot keep an unsaveable draft open.
  useLayoutEffect(() => { if (!editable && editing) clear(); }, [editable, editing, clear]);

  const commit = (operation: 'replace' | 'delete') => {
    if (!editable || !selection || (operation === 'replace' && replacement === '')) return;
    const before = blocks.find(block => block.id === selection.blockId);
    if (!before || before.text !== sourceText) { clear(); return; }
    const after = replacePassage(before, selection, operation === 'delete' ? '' : replacement);
    if (!after) { clear(); return; }
    const edit = { operation, selection, before, after };
    setUndo(previous => operation === 'delete' ? edit : previous?.after.id === before.id ? null : previous);
    onBlocksChange(blocks.map(block => block.id === after.id ? after : block), edit);
    tracker.focusBlock();
    clear();
  };
  const restore = () => {
    if (!validUndo) return;
    onBlocksChange(blocks.map(block => block.id === validUndo.before.id ? { ...block, text: validUndo.before.text } : block),
      { operation: 'undo', selection: validUndo.selection, before: validUndo.after, after: validUndo.before });
    setUndo(null);
    clear();
    rootRef.current?.focus({ preventScroll: true });
  };
  const container = rootRef.current?.ownerDocument.body;

  return <div ref={rootRef} className={`sen-text-highlight sen-text-highlight-root ${className}`} style={style} tabIndex={-1}>
    <OverlayLayer overlay={overlay} blocks={blocks} />
    {selection && !editing && <SelectionHighlight rectangles={rectangles} />}
    {blocks.map(block => <p key={block.id} data-sen-text-block={block.id} tabIndex={-1}>
      {editing && selection?.blockId === block.id ? <>
        {block.text.slice(0, selection.startOffset)}
        <InlineEditor editorRef={editorRef} initialText={selection.selectedText} onInput={setReplacement} />
        {block.text.slice(selection.endOffset)}
      </> : renderBlockText?.(block) ?? block.text}
    </p>)}
    {validUndo && container && <UndoNotice container={container} style={style} onUndo={restore} />}
    {selection && container && <ActionBar container={container} controlsRef={controlsRef} selection={selection} rectangles={rectangles}
      actions={actions} editable={editable} editing={editing} actionOpen={actionOpen} replacement={replacement} style={style}
      onEdit={() => { setReplacement(selection.selectedText); tracker.beginEdit(); }}
      onCommit={commit} onPanelOpen={tracker.beginAction} onClose={clear} />}
  </div>;
}
