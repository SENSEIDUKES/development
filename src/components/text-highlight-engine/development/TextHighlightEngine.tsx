import { useEffect, useLayoutEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { SEIButton } from '@seihouse/ui';
import { replacePassage, type PassageEdit, type PassageSelection, type TextHighlightBlock } from '../shared/selection';
import { usePassageSelection } from './usePassageSelection';
import type { PassageAction } from '../shared/actions';

export interface TextHighlightEngineProps {
  blocks: readonly TextHighlightBlock[];
  onBlocksChange: (blocks: TextHighlightBlock[], edit: PassageEdit) => void;
  onSelectionChange?: (selection: PassageSelection | null) => void;
  actions?: readonly PassageAction[];
  renderBlockText?: (block: TextHighlightBlock) => ReactNode;
  /** False once a host's text is fixed (for example a sealed chapter): no Edit, Delete, or Undo. Defaults to true. */
  editable?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function TextHighlightEngine({ blocks, onBlocksChange, onSelectionChange, actions = [], renderBlockText, editable = true, className = '', style }: TextHighlightEngineProps) {
  const engine = usePassageSelection(blocks, onSelectionChange);
  const { rootRef, controlsRef, editorRef, selection, sourceText, editing, actionOpen, rectangles } = engine;
  const [replacement, setReplacement] = useState('');
  const [undo, setUndo] = useState<PassageEdit | null>(null);
  const [menuPath, setMenuPath] = useState<string[]>([]);
  const [panel, setPanel] = useState<ReactNode>(null);
  const [position, setPosition] = useState({ left: 8, top: 8, maxHeight: 400, width: 320 });
  const validUndo = editable && undo && blocks.some(block => block.id === undo.after.id && block.text === undo.after.text) ? undo : null;

  useLayoutEffect(() => { if (undo && !validUndo) setUndo(null); }, [undo, validUndo]);
  useEffect(() => { if (!selection) { setMenuPath([]); setPanel(null); } }, [selection]);
  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editing || !editor || !selection) return;
    // The draft DOM is deliberately uncontrolled: React must not move the caret
    // or interrupt IME composition after each keystroke.
    editor.textContent = selection.selectedText;
    editor.focus({ preventScroll: true });
    const range = editor.ownerDocument.createRange();
    range.selectNodeContents(editor); range.collapse(false);
    const native = editor.ownerDocument.getSelection();
    native?.removeAllRanges(); native?.addRange(range);
    const lineBreak = (event: InputEvent) => {
      if (event.isComposing || !['insertParagraph', 'insertLineBreak'].includes(event.inputType)) return;
      const caret = editor.ownerDocument.getSelection();
      if (!caret?.rangeCount || !editor.contains(caret.anchorNode) || !editor.contains(caret.focusNode)) return;
      event.preventDefault();
      const insertion = caret.getRangeAt(0);
      insertion.deleteContents();
      const newline = editor.ownerDocument.createTextNode('\n');
      insertion.insertNode(newline);
      // A terminal break needs a visual caret line; BR contributes no text.
      if (editor.textContent?.endsWith('\n') && editor.lastChild?.nodeName !== 'BR') editor.append(editor.ownerDocument.createElement('br'));
      insertion.setStart(newline, 1); insertion.collapse(true);
      caret.removeAllRanges(); caret.addRange(insertion);
      setReplacement(editor.textContent ?? '');
      editor.dispatchEvent(new Event('input', { bubbles: true }));
    };
    // Avoid browser-specific paragraph wrappers / trailing placeholder newlines.
    editor.addEventListener('beforeinput', lineBreak);
    return () => editor.removeEventListener('beforeinput', lineBreak);
  }, [editing, editorRef, selection]);
  useLayoutEffect(() => {
    const viewport = window.visualViewport;
    const leftEdge = viewport?.offsetLeft ?? 0;
    const topEdge = viewport?.offsetTop ?? 0;
    const width = viewport?.width ?? window.innerWidth;
    const height = viewport?.height ?? window.innerHeight;
    const controlWidth = editing && replacement === '' ? Math.min(220, width - 16)
      : editing ? 64 : panel ? Math.min(360, width - 16) : Math.min(menuPath.length ? 120 : actions.length ? 144 : 64, width - 16);
    const controlHeight = controlsRef.current?.offsetHeight ?? 48;
    const anchor = rectangles.find(rect => rect.top + rect.height > topEdge && rect.top < topEdge + height) ?? rectangles[0];
    const below = (anchor?.top ?? topEdge) + (anchor?.height ?? 0) + 10;
    const top = anchor ? (below + controlHeight <= topEdge + height - 8 ? below : anchor.top - controlHeight - 10) : topEdge + 8;
    setPosition({
      left: Math.max(leftEdge + 8, Math.min(anchor?.left ?? leftEdge + 8, leftEdge + width - controlWidth - 8)),
      top: Math.max(topEdge + 8, Math.min(top, topEdge + height - controlHeight - 8)),
      width: controlWidth, maxHeight: Math.max(44, height - 16),
    });
  }, [rectangles, editing, replacement, controlsRef, actions.length, menuPath.length, panel]);

  const closeAction = () => { setMenuPath([]); setPanel(null); engine.clear(); };
  const menuActions = menuPath.reduce<readonly PassageAction[]>((current, id) => {
    const branch = current.find(action => action.id === id);
    return branch?.children ?? [];
  }, actions);
  const openAction = (action: PassageAction) => {
    if ('children' in action && action.children) { setMenuPath(path => [...path, action.id]); return; }
    if (!selection || !('onActivate' in action) || !action.onActivate) return;
    const content = action.onActivate(selection, closeAction);
    if (content == null) { closeAction(); return; }
    setPanel(content);
    engine.beginAction();
  };

  const commit = (operation: 'replace' | 'delete') => {
    if (!editable || !selection || (operation === 'replace' && replacement === '')) return;
    const before = blocks.find(block => block.id === selection.blockId);
    if (!before || before.text !== sourceText) { engine.clear(); return; }
    const after = replacePassage(before, selection, operation === 'delete' ? '' : replacement);
    if (!after) { engine.clear(); return; }
    const edit = { operation, selection, before, after };
    setUndo(previous => operation === 'delete' ? edit : previous?.after.id === before.id ? null : previous);
    onBlocksChange(blocks.map(block => block.id === after.id ? after : block), edit);
    engine.focusBlock();
    engine.clear();
  };
  const restore = () => {
    if (!validUndo) return;
    onBlocksChange(blocks.map(block => block.id === validUndo.before.id ? { ...block, text: validUndo.before.text } : block),
      { operation: 'undo', selection: validUndo.selection, before: validUndo.after, after: validUndo.before });
    setUndo(null);
    engine.clear();
    rootRef.current?.focus({ preventScroll: true });
  };
  const visible = rectangles.some(rect => rect.top + rect.height > (window.visualViewport?.offsetTop ?? 0)
    && rect.top < (window.visualViewport?.offsetTop ?? 0) + (window.visualViewport?.height ?? window.innerHeight));

  return <div ref={rootRef} className={`sen-text-highlight sen-text-highlight-root ${className}`} style={style} tabIndex={-1}>
    {selection && !editing && <div className="sen-text-highlight-marks" aria-hidden="true">
      {rectangles.map((rect, index) => <span key={index} style={rect} />)}
    </div>}
    {blocks.map(block => <p key={block.id} data-sen-text-block={block.id} tabIndex={-1}>
      {editing && selection?.blockId === block.id ? <>
        {block.text.slice(0, selection.startOffset)}
        <span ref={editorRef} className="sen-text-highlight-editor" contentEditable="plaintext-only" suppressContentEditableWarning
          role="textbox" aria-label="Edit selected text" aria-multiline="true"
          onInput={event => setReplacement(event.currentTarget.textContent ?? '')} />
        {block.text.slice(selection.endOffset)}
      </> : renderBlockText?.(block) ?? block.text}
    </p>)}
    {validUndo && rootRef.current && createPortal(<div className="sen-text-highlight" style={style}>
      <div className="sen-text-highlight-undo" role="status">Passage deleted. <SEIButton unstyled onClick={restore}>Undo</SEIButton></div>
    </div>, rootRef.current.ownerDocument.body)}
    {selection && rootRef.current && createPortal(<div className="sen-text-highlight" style={style}>
      {(editing || actionOpen || visible) && (editable || actions.length > 0) && <div ref={controlsRef} className="sen-text-highlight-controls" style={position}
        role="group" aria-label={editing ? 'Edit passage' : panel ? 'Passage action panel' : 'Passage actions'}>
        {editing ? <>
          <div className="sen-text-highlight-actions">
            <SEIButton unstyled disabled={replacement === ''} onClick={() => commit('replace')}>Save</SEIButton>
            {replacement === '' && <SEIButton unstyled onClick={() => commit('delete')}>Delete Passage</SEIButton>}
          </div>
        </> : panel ? <>
          <SEIButton unstyled onClick={() => setPanel(null)}>Back</SEIButton>
          {panel}
        </> : <div className="sen-text-highlight-actions sen-text-highlight-menu">
          {menuPath.length > 0 && <SEIButton unstyled onClick={() => setMenuPath(path => path.slice(0, -1))}>Back</SEIButton>}
          {menuPath.length === 0 && editable && <SEIButton unstyled onPointerDown={event => { if (event.pointerType === 'mouse') event.preventDefault(); }}
            onClick={() => { setReplacement(selection.selectedText); engine.beginEdit(); }}>Edit</SEIButton>}
          {menuActions.map(action => <SEIButton key={action.id} unstyled
            onPointerDown={event => { if (event.pointerType === 'mouse') event.preventDefault(); }}
            onClick={() => openAction(action)}>{action.label}</SEIButton>)}
        </div>}
      </div>}
    </div>, rootRef.current.ownerDocument.body)}
  </div>;
}
