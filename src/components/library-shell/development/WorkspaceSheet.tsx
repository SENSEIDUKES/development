import type { ReactNode, RefObject } from 'react';
import { SEIDialog, SEIDialogContent, SEIDialogTitle } from '@seihouse/ui';
import { NarrativeButton, NarrativePanel } from '../../../presentation';
import { X } from 'lucide-react';
import './workspace-navigation.css';

/** Responsive host-content overlay. Canonical dialog owns modal focus, Escape and scroll lock. */
export function WorkspaceSheet({ open, onOpenChange, onOpenChangeComplete, title, closeLabel, children, footer, returnFocusRef }: {
  open: boolean; onOpenChange: (open: boolean) => void; title: string; closeLabel: string;
  onOpenChangeComplete?: (open: boolean) => void;
  children: ReactNode; footer?: ReactNode; returnFocusRef: RefObject<HTMLElement | null>;
}) {
  return <SEIDialog open={open} onOpenChange={onOpenChange} onOpenChangeComplete={onOpenChangeComplete}>
    <SEIDialogContent aria-modal="true" hideClose variant="dark" className="workspace-sheet" backdropClassName="!z-[240]"
      bodyClassName="flex min-h-0 flex-col !overflow-hidden" finalFocus={returnFocusRef}>
      <div className="flex shrink-0 items-center justify-between gap-4 pb-3">
        <SEIDialogTitle>{title}</SEIDialogTitle>
        <NarrativeButton size="icon" variant="ghost" icon={X} aria-label={closeLabel} onClick={() => onOpenChange(false)} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      {footer && <NarrativePanel variant="footer" padding="sm" className="shrink-0 mt-4">{footer}</NarrativePanel>}
    </SEIDialogContent>
  </SEIDialog>;
}
