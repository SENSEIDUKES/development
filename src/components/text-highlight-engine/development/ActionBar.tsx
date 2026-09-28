import { useLayoutEffect, useState, type CSSProperties, type PointerEvent, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { SEIButton } from '@seihouse/ui';
import type { PassageAction } from '../shared/actions';
import type { PassageSelection } from '../shared/selection';
import type { PassageRectangle } from './useSelectionTracker';

export interface ActionBarProps {
  container: HTMLElement;
  controlsRef: RefObject<HTMLDivElement | null>;
  selection: PassageSelection;
  rectangles: readonly PassageRectangle[];
  actions: readonly PassageAction[];
  editable: boolean;
  editing: boolean;
  actionOpen: boolean;
  /** The current draft while editing: empty reveals Delete Passage. */
  replacement: string;
  style?: CSSProperties;
  onEdit: () => void;
  onCommit: (operation: 'replace' | 'delete') => void;
  /** An action leaf returned a panel: the bar keeps it open and the selection pinned. */
  onPanelOpen: () => void;
  onClose: () => void;
}

/**
 * Action Bar: the one floating bar for a selection. It shows the menu (Edit,
 * the host's nested actions, Back), an action's panel, or — while editing —
 * Save and Delete Passage. It owns its own position, touch sizing and labels.
 */
export function ActionBar({
  container, controlsRef, selection, rectangles, actions, editable, editing, actionOpen, replacement, style,
  onEdit, onCommit, onPanelOpen, onClose,
}: ActionBarProps) {
  const [menuPath, setMenuPath] = useState<string[]>([]);
  const [panel, setPanel] = useState<ReactNode>(null);
  const [position, setPosition] = useState({ left: 8, top: 8, maxHeight: 400, width: 320 });

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

  const close = () => { setMenuPath([]); setPanel(null); onClose(); };
  const menuActions = menuPath.reduce<readonly PassageAction[]>((current, id) => {
    const branch = current.find(action => action.id === id);
    return branch?.children ?? [];
  }, actions);
  const open = (action: PassageAction) => {
    if ('children' in action && action.children) { setMenuPath(path => [...path, action.id]); return; }
    if (!('onActivate' in action) || !action.onActivate) return;
    const content = action.onActivate(selection, close);
    if (content == null) { close(); return; }
    setPanel(content);
    onPanelOpen();
  };
  // Mouse presses must not collapse the text selection before the click lands.
  const keepSelection = (event: PointerEvent) => { if (event.pointerType === 'mouse') event.preventDefault(); };
  const topEdge = window.visualViewport?.offsetTop ?? 0;
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
  const visible = rectangles.some(rect => rect.top + rect.height > topEdge && rect.top < topEdge + viewportHeight);
  if (!(editing || actionOpen || visible) || !(editable || actions.length > 0)) return null;

  return createPortal(<div className="sen-text-highlight" style={style}>
    <div ref={controlsRef} className="sen-text-highlight-controls" style={position}
      role="group" aria-label={editing ? 'Edit passage' : panel ? 'Passage action panel' : 'Passage actions'}>
      {editing ? <div className="sen-text-highlight-actions">
        <SEIButton unstyled disabled={replacement === ''} onClick={() => onCommit('replace')}>Save</SEIButton>
        {replacement === '' && <SEIButton unstyled onClick={() => onCommit('delete')}>Delete Passage</SEIButton>}
      </div> : panel ? <>
        <SEIButton unstyled onClick={() => setPanel(null)}>Back</SEIButton>
        {panel}
      </> : <div className="sen-text-highlight-actions sen-text-highlight-menu">
        {menuPath.length > 0 && <SEIButton unstyled onClick={() => setMenuPath(path => path.slice(0, -1))}>Back</SEIButton>}
        {menuPath.length === 0 && editable && <SEIButton unstyled onPointerDown={keepSelection} onClick={onEdit}>Edit</SEIButton>}
        {menuActions.map(action => <SEIButton key={action.id} unstyled onPointerDown={keepSelection} onClick={() => open(action)}>{action.label}</SEIButton>)}
      </div>}
    </div>
  </div>, container);
}
