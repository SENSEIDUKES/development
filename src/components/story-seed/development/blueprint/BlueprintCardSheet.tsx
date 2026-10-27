import { useRef, type ReactNode } from 'react';
import { Trash2 } from 'lucide-react';
import { NarrativeButton as LibraryButton } from '@seihouse/sen/presentation';
import { WorkspaceSheet } from '../../../library-shell/development/WorkspaceSheet';

/**
 * One Blueprint card's fields, opened from its row or tile. The fields are the
 * Seed's own (shared with the Seed workspaces) and save as the author types.
 * A view-only Blueprint shows them disabled, with nothing to remove.
 */
export const BlueprintCardSheet = ({ open, onOpenChange, title, readOnly = false, onRemove, removeLabel, children }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  readOnly?: boolean;
  onRemove?: () => void;
  removeLabel?: string;
  children: ReactNode;
}) => {
  const returnFocusRef = useRef<HTMLElement | null>(null);
  // Remember the row or tile that opened the sheet while it renders open, before
  // the dialog moves focus inside, so closing returns focus to it.
  if (open && !returnFocusRef.current && typeof document !== 'undefined') returnFocusRef.current = document.activeElement as HTMLElement;
  const close = () => onOpenChange(false);
  return (
    <WorkspaceSheet open={open} onOpenChange={next => { onOpenChange(next); if (!next) returnFocusRef.current = null; }}
      title={title} closeLabel={`Close ${title}`} returnFocusRef={returnFocusRef}
      footer={<div className="bp-sheet-footer">
        {!readOnly && onRemove
          ? <LibraryButton variant="ghost" size="md" fullWidth icon={Trash2} onClick={() => { onRemove(); close(); }}>{removeLabel ?? 'Remove'}</LibraryButton>
          : <span />}
        <LibraryButton variant="secondary" size="md" fullWidth onClick={close}>Done</LibraryButton>
      </div>}>
      <fieldset disabled={readOnly} className="seed-field-scope story-seed-development-surface novel-blueprint-fields m-0 min-w-0 space-y-4 border-0 p-0" data-blueprint-sheet>
        {children}
      </fieldset>
    </WorkspaceSheet>
  );
};
