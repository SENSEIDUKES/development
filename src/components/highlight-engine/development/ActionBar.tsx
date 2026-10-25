import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { watchLayout } from './measure';
import { popupPosition, type PopupSide } from './popupPosition';
import { HighlightActionIcon } from './HighlightActionIcon';
import { TextSelect } from 'lucide-react';
import { SEIButton } from '@seihouse/ui';
import type { PassageAction } from '../shared/actions';
import type { PassageSelection } from '../shared/selection';
import type { ActionBarMode, PassageRectangle } from './useSelectionTracker';

/** Keep the menu beyond the engine's 44px selection handles. */
const HANDLE_CLEARANCE = 48;

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
  onSelectText?: () => void;
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
 * On touch screens its buttons stack vertically. It leaves room for the
 * engine's range handles. Remove mode is always a
 * vertical list, like a desktop context menu.
 */
export function ActionBar({
  container, controlsRef, selection, rectangles, actions, mode, removeActions, canUndo, focusControls, editable, editing, actionOpen,
  replacement, style, onSelectText, onEdit, onModeChange, onUndo, onCommit, onPanelOpen, onClose,
}: ActionBarProps) {
  const [menuPath, setMenuPath] = useState<string[]>([]);
  const [panel, setPanel] = useState<ReactNode>(null);
  const [copyStatus, setCopyStatus] = useState('');
  const [menuMode, setMenuMode] = useState(mode);
  const [position, setPosition] = useState<CSSProperties>({ visibility: 'hidden' });
  const placement = useRef<PopupSide | undefined>(undefined);
  const selecting = !!onSelectText;
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
  // A submenu in one row is as wide as its labels (Back, then each action), so no two buttons overlap.
  const submenuWidth = Math.max(150, 94 + menuActions.reduce((total, action) => total + 28 + action.label.length * 8 + (action.icon ? 30 : 0), 0));

  const rootIconWidth = (editable ? 60 : 0) + actions.filter(action => action.icon).length * 30;

  useLayoutEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const place = () => {
      const viewport = container.ownerDocument.defaultView!.visualViewport;
      const width = viewport?.width ?? window.innerWidth;
      const height = viewport?.height ?? window.innerHeight;
      const desiredWidth = selecting ? 216 : panel ? 360
        : vertical && !editing ? removing || reasons ? 216 : 168
        : stacked ? 168 : editing ? replacement === '' ? 280 : 94
        : reasons ? 320 : menuPath.length ? submenuWidth : (actions.length ? 216 : 136) + rootIconWidth;
      const controlWidth = Math.min(desiredWidth, Math.max(1, width - 24));
      // Measure at the new width, without the previous submenu's height cap.
      // Layout effects run before paint, so the first visible frame is in place.
      controls.style.width = `${controlWidth}px`;
      controls.style.maxHeight = 'none';
      const controlHeight = controls.offsetHeight || 48;
      const next = popupPosition({ rectangles, width: controlWidth, height: controlHeight,
        viewport: { left: viewport?.offsetLeft ?? 0, top: viewport?.offsetTop ?? 0, width, height },
        clearance: selecting || editing || panel ? 12 : HANDLE_CLEARANCE,
        preferred: placement.current ?? (stacked ? 'below' : 'above'),
      });
      placement.current = next.side;
      controls.dataset.placement = next.side;
      // Restore the cap immediately even if React can reuse the previous position.
      controls.style.maxHeight = `${next.maxHeight}px`;
      const { side: _side, ...geometry } = next;
      setPosition(previous => {
        const updated = { ...geometry, visibility: 'visible' as const };
        return Object.keys(updated).every(key => previous[key as keyof CSSProperties] === updated[key as keyof typeof updated]) ? previous : updated;
      });
    };
    place();
    return watchLayout(controls, place);
  }, [rectangles, editing, replacement, controlsRef, container, actions.length, menuPath.length, panel, stacked, vertical, removing, reasons, submenuWidth, copyStatus, selecting, rootIconWidth]);

  // Opened from the keyboard, focus lands on the first thing to do, as in a native menu.
  useEffect(() => {
    if (!focusControls) return;
    const controls = controlsRef.current;
    (controls?.querySelector<HTMLElement>('button:not(:disabled):not([data-back])') ?? controls?.querySelector<HTMLElement>('button:not(:disabled)'))?.focus();
  }, [focusControls, controlsRef]);

  const close = () => { setMenuPath([]); setPanel(null); onClose(); };
  const copy = async () => {
    try {
      await container.ownerDocument.defaultView!.navigator.clipboard.writeText(selection.selectedText);
      setCopyStatus('Copied');
    } catch { setCopyStatus('Could not copy. Try again.'); }
  };
  useEffect(() => { setCopyStatus(''); }, [selection.selectedText]);
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
      <span className="sen-text-highlight-action-label">{action.icon && <span aria-hidden="true" className="sen-text-highlight-action-icon">{action.icon}</span>}{action.label}</span>{reason && <span id={describedBy} className="sen-text-highlight-reason">{reason}</span>}
    </SEIButton>;
  };
  return createPortal(<div className="sen-text-highlight" style={style}>
    <div ref={controlsRef} className="sen-text-highlight-controls" style={position} data-layout={stacked || (vertical && !editing) ? 'stacked' : 'inline'}
      data-mode={mode} role="group"
      aria-label={onSelectText ? 'Text selection' : editing ? 'Edit passage' : panel ? 'Passage action panel' : removing ? 'Remove from passage' : 'Passage actions'}>
      {onSelectText ? <SEIButton unstyled className="sen-text-highlight-select" onPointerDown={keepSelection} onClick={onSelectText}>
        <TextSelect size={18} aria-hidden="true" />Select text
      </SEIButton> : editing ? <div className={`sen-text-highlight-actions${stacked ? ' sen-text-highlight-actions--stacked' : ''}`}>
        <SEIButton unstyled disabled={replacement === ''} onClick={() => onCommit('replace')}><span className="sen-text-highlight-action-label"><HighlightActionIcon name="save" />Save</span></SEIButton>
        {replacement === '' && <SEIButton unstyled onClick={() => onCommit('delete')}><span className="sen-text-highlight-action-label"><HighlightActionIcon name="delete" />Delete Passage</span></SEIButton>}
      </div> : panel ? <>
        <SEIButton unstyled data-back="" onClick={() => setPanel(null)}><span className="sen-text-highlight-action-label"><HighlightActionIcon name="back" />Back</span></SEIButton>
        {panel}
      </> : <div className={`sen-text-highlight-actions sen-text-highlight-menu${vertical ? ' sen-text-highlight-actions--stacked' : ''}`}>
        {(!top || removing) && <SEIButton unstyled data-back="" onPointerDown={keepSelection}
          onClick={() => top ? onModeChange('add') : setMenuPath(path => path.slice(0, -1))}><span className="sen-text-highlight-action-label"><HighlightActionIcon name="back" />Back</span></SEIButton>}
        {top && !removing && editable && <SEIButton unstyled onPointerDown={keepSelection} onClick={onEdit}><span className="sen-text-highlight-action-label"><HighlightActionIcon name="edit" />Edit</span></SEIButton>}
        {top && !removing && editable && <SEIButton unstyled onPointerDown={keepSelection} onClick={() => { void copy(); }}><span className="sen-text-highlight-action-label"><HighlightActionIcon name="copy" />Copy</span></SEIButton>}
        {top && removing && canUndo && <SEIButton unstyled onPointerDown={keepSelection} onClick={onUndo}><span className="sen-text-highlight-action-label"><HighlightActionIcon name="undo" />Undo</span></SEIButton>}
        {menuActions.map(item)}
        {top && removing && <SEIButton unstyled data-destructive="" onPointerDown={keepSelection} onClick={() => onCommit('delete')}><span className="sen-text-highlight-action-label"><HighlightActionIcon name="delete" />Delete Passage</span></SEIButton>}
        {/* A hold selects words; Remove stays an explicit action. */}
        {top && !removing && stacked && editable && <SEIButton unstyled onPointerDown={keepSelection} onClick={() => onModeChange('remove')}><span className="sen-text-highlight-action-label"><HighlightActionIcon name="remove" />Remove</span></SEIButton>}
      </div>}
      <p role="status" className={copyStatus ? 'px-3 py-1 text-xs' : 'sen-selection-instructions'}>{copyStatus}</p>
    </div>
  </div>, container);
}
