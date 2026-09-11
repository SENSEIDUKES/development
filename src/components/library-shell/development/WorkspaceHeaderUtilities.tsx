import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NarrativeButton, NarrativeTextBox } from '../../../presentation';
import { WorkspaceSheet } from './WorkspaceSheet';
import { type HeaderAction } from './WorkspaceHeaderActions';

const LibraryHelpMenu = lazy(() => import('../../story-seed/development/StorySeedHelpMenu')
  .then(module => ({ default: module.LibraryHelpMenu })));

export interface HeaderSearchItem extends HeaderAction {
  description?: string;
}

/**
 * Host destinations and original guidance; no routing, story store or remote search.
 *
 * Help and Search are two separate, always-visible controls at every width.
 * Neither is ever folded into an overflow menu: they are the header's only two
 * utilities, and each keeps its own 44px target on the narrowest phone. The
 * badge gives up horizontal space instead — its title wraps rather than
 * ellipsizing — so full titles stay readable beside both controls. Their
 * official SEN artwork is applied as a CSS mask so it follows the active
 * Library foreground color.
 */
export function WorkspaceHeaderUtilities({ items, help }: {
  items: readonly HeaderSearchItem[];
  help?: HeaderAction;
}) {
  const [experience, setExperience] = useState<'help' | 'search' | null>(null);
  const [query, setQuery] = useState('');
  const helpRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLButtonElement>(null);
  const pendingAction = useRef<(() => void) | null>(null);
  const dispatchTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => { window.clearTimeout(dispatchTimer.current); }, []);
  const searchId = useId();
  const needle = query.trim().toLocaleLowerCase();
  const results = items.filter(item => `${item.label} ${item.description ?? ''}`.toLocaleLowerCase().includes(needle));
  const openSearch = () => { setQuery(''); setExperience('search'); };
  return <>
    <div className="workspace-header-utilities">
    <NarrativeButton ref={helpRef} variant="ghost" size="icon" aria-label="Help" title="Help"
      aria-haspopup="dialog" aria-expanded={help ? help.expanded : experience === 'help'}
      onPointerEnter={help?.onIntent} onFocus={help?.onIntent} disabled={help?.disabled}
      onClick={() => help ? help.onAction() : setExperience('help')}>
      <span aria-hidden="true" className="workspace-header-utility-icon workspace-help-emblem" />
    </NarrativeButton>
    <NarrativeButton ref={searchRef} variant="ghost" aria-label="Search" title="Search"
      className="workspace-search-trigger" aria-haspopup="dialog" aria-expanded={experience === 'search'}
      onClick={openSearch}>
      <span aria-hidden="true" className="workspace-header-utility-icon workspace-search-emblem" />
      <span className="workspace-search-label">Search</span>
    </NarrativeButton>
    </div>
    {experience === 'help' && createPortal(<Suspense fallback={<span role="status">Loading Help…</span>}>
      <LibraryHelpMenu open onClose={() => setExperience(null)} />
    </Suspense>, document.body)}
    <WorkspaceSheet open={experience === 'search'} onOpenChange={open => {
      if (!open) setExperience(current => current === 'search' ? null : current);
    }}
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
          aria-label={item.ariaLabel ?? item.label} aria-pressed={item.pressed} title={item.title}
          onPointerEnter={item.onIntent} onFocus={item.onIntent} onClick={() => {
            // Let the modal release focus before a host opens its own dialog or navigates.
            pendingAction.current = item.onAction;
            setExperience(null);
          }}>
          <span><span>{item.label}</span>{item.description && <small>{item.description}</small>}</span>
        </NarrativeButton>
      </li>)}</ul>
    </WorkspaceSheet>
  </>;
}
