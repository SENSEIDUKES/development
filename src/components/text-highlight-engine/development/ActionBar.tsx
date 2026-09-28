import { useEffect, useId, useLayoutEffect, useState, type CSSProperties, type PointerEvent, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { SEIButton } from '@seihouse/ui';
import type { PassageAction } from '../shared/actions';
import type { PassageSelection } from '../shared/selection';
import type { ActionBarMode, PassageRectangle } from './useSelectionTracker';

/** Space left for the phone's own selection menu, which draws just above or below the selected words. */
export const NATIVE_MENU_CLEARANCE = 72;

const COARSE_POINTER = '(pointer: coarse)';
const coarsePointer = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(COARSE_POINTER).matches;

/** Touch screens (phones, tablets) get the stacked bar; it follows the device if its main input changes. */
function useCoarsePointer() {
  const [coarse, setCoarse] = useState(coarsePointer);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia(COARSE_POINTER);
    const change = () => setCoarse(query.matches);
    query.addEventListener?.('change', change);
    return () => query.removeEventListener?.('change', change);
  }, []);
  return coarse;
}

export interface ActionBarProps {
  container: HTMLElement;
  controlsRef: RefObject<HTMLDivElement | null>;
  selection: PassageSelection;
  rectangles: readonly PassageRectangle[];
  actions: readonly PassageAction[];
  /** Add (the host's actions) or Remove (Undo, the host's removals, Delete Passage). */
  mode: ActionBarMode;
  removeActions: readonly PassageAction[];
  /** An explicit deletion can still be undone. */
  canUndo: boolean;
  /** Remove mode was opened from the keyboard: focus moves into the bar, as with a native menu. */
  focusControls: boolean;
  editable: boolean;
  editing: boolean;
  actionOpen: boolean;
  /** The current draft while editing: empty reveals Delete Passage. */
  replacement: string;
  style?: CSSProperties;
  onEdit: () => void;
  onModeChange: (mode: ActionBarMode) => void;
  onUndo: () => void;
  onCommit: (operation: 'replace' | 'delete') => void;
  /** An action leaf returned a panel: the bar keeps it open and the selection pinned. */
  onPanelOpen: () => void;
  onClose: () => void;
}

/**
 * Action Bar: the one floating bar for a selection, with two faces. Add shows
 * Edit and the host's nested actions; Remove (right-click, the ContextMenu
 * key, or the touch bar's Remove row) shows Undo, the host's removals and
 * Delete Passage. Either can open an action's panel, and while editing it
 * shows Save and Delete Passage. It owns its own position, touch sizing and
 * labels; an action a host marks unavailable stays visible, dimmed, with its
 * reason.
 *
 * On touch screens its buttons stack vertically, and while the phone's own
 * selection menu can be showing it keeps a clearance band around the
 * selection, so the two never cover each other. Remove mode is always a
 * vertical list, like a desktop context menu.
 */
export function ActionBar({
  container, controlsRef, selection, rectangles, actions, mode, removeActions, canUndo, focusControls, editable, editing, actionOpen,
  replacement, style, onEdit, onModeChange, onUndo, onCommit, onPanelOpen, onClose,
}: ActionBarProps) {
  const [menuPath, setMenuPath] = useState<string[]>([]);
  const [panel, setPanel] = useState<ReactNode>(null);
  const [menuMode, setMenuMode] = useState(mode);
  const [position, setPosition] = useState({ left: 8, top: 8, maxHeight: 400, width: 320 });
  const stacked = useCoarsePointer();
  const reasonId = useId();
  const removing = mode === 'remove';
  // A new face starts at its own top level.
  if (menuMode !== mode) { setMenuMode(mode); setMenuPath([]); setPanel(null); }
  const menuActions = menuPath.reduce<readonly PassageAction[]>((current, id) => {
    const branch = current.find(action => action.id === id);
    return branch?.children ?? [];
  }, removing ? removeActions : actions);
  const vertical = stacked || removing;
  const reasons = menuActions.some(action => action.unavailable?.(selection));

  useLayoutEffect(() => {
    const viewport = window.visualViewport;
    const leftEdge = viewport?.offsetLeft ?? 0;
    const topEdge = viewport?.offsetTop ?? 0;
    const width = viewport?.width ?? window.innerWidth;
    const height = viewport?.height ?? window.innerHeight;
    const controlWidth = panel ? Math.min(360, width - 16)
      : vertical && !editing ? Math.min(removing || reasons ? 216 : 168, width - 16)
      : stacked ? Math.min(168, width - 16)
      : editing && replacement === '' ? Math.min(220, width - 16)
      : editing ? 64 : Math.min(reasons ? 264 : menuPath.length ? 120 : actions.length ? 144 : 64, width - 16);
    const controlHeight = controlsRef.current?.offsetHeight ?? 48;
    const anchor = rectangles.find(rect => rect.top + rect.height > topEdge && rect.top < topEdge + height) ?? rectangles[0];
    let top: number;
    if (stacked && !editing && !panel && rectangles.length) {
      // The live native selection brings the phone's own menu: leave its band clear.
      const selectionTop = Math.min(...rectangles.map(rect => rect.top));
      const selectionBottom = Math.max(...rectangles.map(rect => rect.top + rect.height));
      const below = selectionBottom + NATIVE_MENU_CLEARANCE;
      const above = selectionTop - NATIVE_MENU_CLEARANCE - controlHeight;
      const lowest = topEdge + height - 8;
      top = below + controlHeight <= lowest ? below
        : above >= topEdge + 8 ? above
        : lowest - selectionBottom >= selectionTop - topEdge ? below : above;
    } else {
      const below = (anchor?.top ?? topEdge) + (anchor?.height ?? 0) + 10;
      top = anchor ? (below + controlHeight <= topEdge + height - 8 ? below : anchor.top - controlHeight - 10) : topEdge + 8;
    }
    setPosition({
      left: Math.max(leftEdge + 8, Math.min(anchor?.left ?? leftEdge + 8, leftEdge + width - controlWidth - 8)),
      top: Math.max(topEdge + 8, Math.min(top, topEdge + height - controlHeight - 8)),
      width: controlWidth, maxHeight: Math.max(44, height - 16),
    });
  }, [rectangles, editing, replacement, controlsRef, actions.length, menuPath.length, panel, stacked, vertical, removing, reasons]);

  // Opened from the keyboard, focus lands on the first thing to do, as in a native menu.
  useEffect(() => {
    if (!focusControls) return;
    const controls = controlsRef.current;
    (controls?.querySelector<HTMLElement>('button:not(:disabled):not([data-back])') ?? controls?.querySelector<HTMLElement>('button:not(:disabled)'))?.focus();
  }, [focusControls, controlsRef]);

  const close = () => { setMenuPath([]); setPanel(null); onClose(); };
  const open = (action: PassageAction) => {
    if (action.unavailable?.(selection)) return;
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

  const top = menuPath.length === 0;
  const item = (action: PassageAction) => {
    const reason = action.unavailable?.(selection);
    const describedBy = `${reasonId}-${action.id}`;
    return <SEIButton key={action.id} unstyled disabled={!!reason} data-unavailable={reason ? '' : undefined} data-destructive={removing ? '' : undefined}
      aria-label={reason ? action.label : undefined} aria-describedby={reason ? describedBy : undefined}
      onPointerDown={keepSelection} onClick={() => open(action)}>
      {action.label}{reason && <span id={describedBy} className="sen-text-highlight-reason">{reason}</span>}
    </SEIButton>;
  };
  return createPortal(<div className="sen-text-highlight" style={style}>
    <div ref={controlsRef} className="sen-text-highlight-controls" style={position} data-layout={stacked || (vertical && !editing) ? 'stacked' : 'inline'}
      data-mode={mode} role="group"
      aria-label={editing ? 'Edit passage' : panel ? 'Passage action panel' : removing ? 'Remove from passage' : 'Passage actions'}>
      {editing ? <div className={`sen-text-highlight-actions${stacked ? ' sen-text-highlight-actions--stacked' : ''}`}>
        <SEIButton unstyled disabled={replacement === ''} onClick={() => onCommit('replace')}>Save</SEIButton>
        {replacement === '' && <SEIButton unstyled onClick={() => onCommit('delete')}>Delete Passage</SEIButton>}
      </div> : panel ? <>
        <SEIButton unstyled data-back="" onClick={() => setPanel(null)}>Back</SEIButton>
        {panel}
      </> : <div className={`sen-text-highlight-actions sen-text-highlight-menu${vertical ? ' sen-text-highlight-actions--stacked' : ''}`}>
        {(!top || removing) && <SEIButton unstyled data-back="" onPointerDown={keepSelection}
          onClick={() => top ? onModeChange('add') : setMenuPath(path => path.slice(0, -1))}>Back</SEIButton>}
        {top && !removing && editable && <SEIButton unstyled onPointerDown={keepSelection} onClick={onEdit}>Edit</SEIButton>}
        {top && removing && canUndo && <SEIButton unstyled onPointerDown={keepSelection} onClick={onUndo}>Undo</SEIButton>}
        {menuActions.map(item)}
        {top && removing && <SEIButton unstyled data-destructive="" onPointerDown={keepSelection} onClick={() => onCommit('delete')}>Delete Passage</SEIButton>}
        {/* Long-press belongs to the phone, so touch reaches Remove mode from the bar itself. */}
        {top && !removing && stacked && editable && <SEIButton unstyled onPointerDown={keepSelection} onClick={() => onModeChange('remove')}>Remove</SEIButton>}
      </div>}
    </div>
  </div>, container);
}
