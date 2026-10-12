import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { SEIButton } from '@seihouse/ui';

/** Undo Notice: the "Passage deleted · Undo" message shown after an explicit deletion. */
export function UndoNotice({ container, style, onUndo }: { container: HTMLElement; style?: CSSProperties; onUndo: () => void }) {
  return createPortal(<div className="sen-text-highlight" style={style}>
    <div className="sen-text-highlight-undo" role="status">Passage deleted. <SEIButton unstyled onClick={onUndo}>Undo</SEIButton></div>
  </div>, container);
}
