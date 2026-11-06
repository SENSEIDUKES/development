import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
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
 * Search: a field-style trigger right after the logo, growing into the space
 * before the Familiar and the Profile Portrait up to a comfortable width (it
 * does not stretch across a large screen), that opens the Search sheet of
 * host destinations and actions. Its words are shown whole or not at all: where
 * they do not fit beside the magnifier they step aside, never cut off or "…". It opens on a tap or click (and Enter or
 * Space), never on focus, so moving past it with the keyboard opens nothing.
 */
export function WorkspaceHeaderSearch({ items }: { items: readonly HeaderSearchItem[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLButtonElement>(null);
  const pendingAction = useRef<(() => void) | null>(null);
  const dispatchTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => { window.clearTimeout(dispatchTimer.current); }, []);

  // The words show on one or two lines, or not at all: more than two lines would be cut
  // off by the field, so then only the magnifier shows. Measured again whenever the field
  // resizes or the words change (an interface language swaps them in place).
  const placeholderRef = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const field = searchRef.current;
    const words = placeholderRef.current;
    if (!field || !words) return;
    const measure = () => {
      delete field.dataset.labelHidden;
      const lineHeight = parseFloat(getComputedStyle(words).lineHeight);
      if (lineHeight > 0 && words.getBoundingClientRect().height > lineHeight * 2 + 1) field.dataset.labelHidden = '';
    };
    measure();
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    resize?.observe(field);
    const mutation = typeof MutationObserver === 'undefined' ? null : new MutationObserver(measure);
    mutation?.observe(words, { childList: true, characterData: true, subtree: true });
    return () => { resize?.disconnect(); mutation?.disconnect(); };
  }, []);

  const searchId = useId();
  const needle = query.trim().toLocaleLowerCase();
  const results = items.filter(item => `${item.label} ${item.description ?? ''}`.toLocaleLowerCase().includes(needle));
  const openSearch = () => {
    setQuery('');
    setOpen(true);
  };

  return <>
    <div className="workspace-search">
      <button ref={searchRef} type="button" className="workspace-search-field" aria-label="Search for worlds"
        aria-haspopup="dialog" aria-expanded={open} onClick={openSearch}>
        <span className="workspace-search-line">
          <SENSearchIcon aria-hidden="true" size={20} className="workspace-search-emblem" />
          <span ref={placeholderRef} className="workspace-search-placeholder">Search for worlds</span>
        </span>
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
