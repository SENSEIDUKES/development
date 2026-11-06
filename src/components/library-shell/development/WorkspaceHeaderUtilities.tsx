import { useEffect, useId, useRef, useState } from 'react';
import { NarrativeButton, NarrativeTextBox } from '@seihouse/sen/presentation';
import { LibrarySearchIcon as SENSearchIcon } from '@seihouse/library-ui';
import type { SenLanguageCode } from '@seihouse/sen/contracts';
import { WorkspaceSheet } from './WorkspaceSheet';
import type { HeaderAction } from './WorkspaceHeaderActions';

export interface HeaderSearchItem extends HeaderAction {
  description?: string;
}

export interface WorkspaceHeaderPreferences {
  language?: SenLanguageCode;
  onLanguageChange?: (language: SenLanguageCode) => void;
  menuMusic?: boolean;
  onMenuMusicChange?: (enabled: boolean) => void;
}

/**
 * Search: a wide field-style trigger right after the logo, filling the space
 * before the Familiar and the Profile Portrait, that opens the Search sheet of
 * host destinations and actions. It opens on a tap or click (and Enter or
 * Space), never on focus, so moving past it with the keyboard opens nothing.
 */
export function WorkspaceHeaderSearch({ items }: { items: readonly HeaderSearchItem[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLButtonElement>(null);
  const pendingAction = useRef<(() => void) | null>(null);
  const dispatchTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => { window.clearTimeout(dispatchTimer.current); }, []);

  const searchId = useId();
  const needle = query.trim().toLocaleLowerCase();
  const results = items.filter(item => `${item.label} ${item.description ?? ''}`.toLocaleLowerCase().includes(needle));
  const openSearch = () => {
    setQuery('');
    setOpen(true);
  };

  return <>
    <div className="workspace-search">
      <button ref={searchRef} type="button" className="workspace-search-field" aria-label="Search for stories"
        aria-haspopup="dialog" aria-expanded={open} onClick={openSearch}>
        <SENSearchIcon aria-hidden="true" size={20} className="workspace-search-emblem" />
        <span className="workspace-search-placeholder">Search for stories</span>
      </button>
    </div>
    <WorkspaceSheet open={open} onOpenChange={setOpen}
      onOpenChangeComplete={open => {
        if (!open && pendingAction.current) {
          const action = pendingAction.current;
          pendingAction.current = null;
          // Release the dialog's final focus restoration before the destination focuses its heading.
          dispatchTimer.current = window.setTimeout(action, 0);
        }
      }} title="Search" closeLabel="Close Search" returnFocusRef={searchRef}>
      <div role="search">
        <label htmlFor={searchId} className="workspace-search-field-label">Search destinations and actions</label>
        <NarrativeTextBox id={searchId} type="search" autoFocus value={query}
          onChange={setQuery} />
      </div>
      <p role="status" className="workspace-search-count">{results.length ? `${results.length} ${results.length === 1 ? 'result' : 'results'}` : 'No results'}</p>
      <ul className="workspace-search-results">{results.map(item => <li key={item.id}>
        <NarrativeButton variant="ghost" icon={item.icon} disabled={item.disabled || item.loading}
          aria-label={item.ariaLabel ?? item.label} aria-pressed={item.pressed} title={item.title} data-no-interface-translate-attrs={item.id.startsWith('story-') ? '' : undefined}
          onPointerEnter={item.onIntent} onFocus={item.onIntent} onClick={() => {
            // Let the modal release focus before a host opens its own dialog or navigates.
            pendingAction.current = item.onAction;
            setOpen(false);
          }}>
          <span><span data-no-interface-translate={item.id.startsWith('story-') ? '' : undefined}>{item.label}</span>{item.description && <small>{item.description}</small>}</span>
        </NarrativeButton>
      </li>)}</ul>
    </WorkspaceSheet>
  </>;
}
