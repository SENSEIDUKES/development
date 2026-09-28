import { useLayoutEffect, type RefObject } from 'react';

/**
 * Inline Editor: the plain-text draft that replaces only the selected words
 * inside their paragraph. The draft DOM is deliberately uncontrolled so React
 * never moves the caret or interrupts IME composition after a keystroke.
 */
export function InlineEditor({ editorRef, initialText, onInput }: {
  editorRef: RefObject<HTMLSpanElement | null>;
  initialText: string;
  onInput: (text: string) => void;
}) {
  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.textContent = initialText;
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
      onInput(editor.textContent ?? '');
      editor.dispatchEvent(new Event('input', { bubbles: true }));
    };
    // Avoid browser-specific paragraph wrappers / trailing placeholder newlines.
    editor.addEventListener('beforeinput', lineBreak);
    return () => editor.removeEventListener('beforeinput', lineBreak);
    // The draft starts once from the selected words; later input stays in the DOM.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorRef, initialText]);

  return <span ref={editorRef} className="sen-text-highlight-editor" contentEditable="plaintext-only" suppressContentEditableWarning
    role="textbox" aria-label="Edit selected text" aria-multiline="true"
    onInput={event => onInput(event.currentTarget.textContent ?? '')} />;
}
