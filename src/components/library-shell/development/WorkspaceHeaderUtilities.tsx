import { Component, lazy, Suspense, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { SEN_LANGUAGES, normalizeSenLanguageCode, type SenLanguageCode } from '@seihouse/sen/contracts';
import { NarrativeButton, NarrativePanel, NarrativeTextBox } from '@seihouse/sen/presentation';
import { LibraryHelpIcon as SENHelpIcon, LibrarySearchIcon as SENSearchIcon, LibrarySettingsIcon as SENSettingsIcon } from '@seihouse/library-ui';
import { getActiveInterfaceLanguage, setFallbackInterfaceLanguage } from '../../../library/language/interfaceTranslation';
import { WorkspaceSheet } from './WorkspaceSheet';
import { useHeaderDisclosure, type HeaderAction } from './WorkspaceHeaderActions';

const loadHelpMenu = () => import('../../story-seed/development/StorySeedHelpMenu')
  .then(module => ({ default: module.LibraryHelpMenu }));

/**
 * Help loads on demand. If its code cannot be fetched — a dropped connection,
 * or a page left open across a deploy — the failure stays inside Help instead
 * of unmounting the host page.
 */
class HelpBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export interface HeaderSearchItem extends HeaderAction {
  description?: string;
}

export interface WorkspaceHeaderPreferences {
  language?: SenLanguageCode;
  onLanguageChange?: (language: SenLanguageCode) => void;
}

/**
 * Host destinations, compact Preferences (Preferred Language + Help), and Search.
 *
 * Preferences and Search are two separate, always-visible controls at every width.
 * Neither is ever folded into an overflow menu: each keeps its own 44px target
 * on the narrowest phone.
 */
export function WorkspaceHeaderUtilities({ items, help, preferences }: {
  items: readonly HeaderSearchItem[];
  help?: HeaderAction;
  preferences?: WorkspaceHeaderPreferences;
}) {
  const [experience, setExperience] = useState<'help' | 'help-error' | 'search' | null>(null);
  const [query, setQuery] = useState('');
  const [localLanguage, setLocalLanguage] = useState<SenLanguageCode>(() =>
    normalizeSenLanguageCode(preferences?.language ?? getActiveInterfaceLanguage()),
  );
  // A failed lazy load is cached by React, so each failure gets a fresh loader
  // and the next Help press retries instead of failing forever.
  const [LibraryHelpMenu, setLibraryHelpMenu] = useState(() => lazy(loadHelpMenu));
  const preferencesDisclosure = useHeaderDisclosure();
  const searchRef = useRef<HTMLButtonElement>(null);
  const pendingAction = useRef<(() => void) | null>(null);
  const dispatchTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => { window.clearTimeout(dispatchTimer.current); }, []);
  useEffect(() => {
    if (preferences?.language) {
      setLocalLanguage(normalizeSenLanguageCode(preferences.language));
    }
  }, [preferences?.language]);
  useEffect(() => {
    if (preferencesDisclosure.open && !preferences?.language) {
      setLocalLanguage(getActiveInterfaceLanguage());
    }
  }, [preferences?.language, preferencesDisclosure.open]);

  const selectedLanguage = normalizeSenLanguageCode(preferences?.language ?? localLanguage);
  const handleLanguageChange = (next: SenLanguageCode) => {
    const code = normalizeSenLanguageCode(next);
    setLocalLanguage(code);
    if (preferences?.onLanguageChange) {
      preferences.onLanguageChange(code);
    } else {
      setFallbackInterfaceLanguage(code);
    }
  };

  const searchId = useId();
  const needle = query.trim().toLocaleLowerCase();
  const results = items.filter(item => `${item.label} ${item.description ?? ''}`.toLocaleLowerCase().includes(needle));
  const openSearch = () => {
    preferencesDisclosure.setOpen(false);
    setQuery('');
    setExperience('search');
  };
  const openHelp = () => {
    preferencesDisclosure.setOpen(false);
    preferencesDisclosure.triggerRef.current?.focus();
    if (help) {
      help.onAction();
    } else {
      setExperience('help');
    }
  };

  return <>
    <div className="workspace-header-utilities">
      <div className="workspace-preferences" ref={preferencesDisclosure.rootRef}>
        <NarrativeButton
          ref={preferencesDisclosure.triggerRef}
          variant="ghost"
          size="icon"
          aria-label="Preferences"
          title="Preferences"
          aria-expanded={preferencesDisclosure.open}
          aria-controls={preferencesDisclosure.id}
          onPointerEnter={help?.onIntent}
          onFocus={help?.onIntent}
          onClick={() => preferencesDisclosure.setOpen(!preferencesDisclosure.open)}
        >
          <SENSettingsIcon aria-hidden="true" size={24} className="workspace-header-utility-icon workspace-preferences-emblem" />
        </NarrativeButton>
        {preferencesDisclosure.open && (
          <div
            id={preferencesDisclosure.id}
            ref={preferencesDisclosure.panelRef}
            className="workspace-preferences-panel"
            data-testid="workspace-preferences-card"
          >
            <NarrativePanel padding="sm" aria-label="Preferences">
              <div className="workspace-preferences-section">
                <label htmlFor="header-preferred-language" className="workspace-preferences-label">
                  Preferred Language
                </label>
                <select
                  id="header-preferred-language"
                  name="interfaceLanguage"
                  className="workspace-preferences-select"
                  value={selectedLanguage}
                  onChange={event => handleLanguageChange(event.target.value as SenLanguageCode)}
                >
                  {SEN_LANGUAGES.map(option => (
                    <option key={option.code} value={option.code}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="workspace-preferences-footer">
                <NarrativeButton
                  variant="ghost"
                  aria-label="Help"
                  title="Help"
                  aria-haspopup="dialog"
                  aria-expanded={help ? help.expanded : experience === 'help' || experience === 'help-error'}
                  disabled={help?.disabled}
                  onPointerEnter={help?.onIntent}
                  onFocus={help?.onIntent}
                  onClick={openHelp}
                >
                  <SENHelpIcon aria-hidden="true" size={18} className="workspace-header-utility-icon workspace-help-emblem" />
                  <span>Help</span>
                </NarrativeButton>
              </div>
            </NarrativePanel>
          </div>
        )}
      </div>
      <NarrativeButton ref={searchRef} variant="ghost" aria-label="Search" title="Search"
        className="workspace-search-trigger" aria-haspopup="dialog" aria-expanded={experience === 'search'}
        onClick={openSearch}>
        <SENSearchIcon aria-hidden="true" size={24} className="workspace-header-utility-icon workspace-search-emblem" />
        <span className="workspace-search-label">Search</span>
      </NarrativeButton>
    </div>
    {experience === 'help' && createPortal(<HelpBoundary onError={() => { setLibraryHelpMenu(() => lazy(loadHelpMenu)); setExperience('help-error'); }}>
      <Suspense fallback={<span role="status">Loading Help…</span>}>
        <LibraryHelpMenu open onClose={() => setExperience(null)} />
      </Suspense>
    </HelpBoundary>, document.body)}
    <WorkspaceSheet open={experience === 'help-error'} onOpenChange={open => { if (!open) setExperience(null); }}
      title="Help" closeLabel="Close Help" returnFocusRef={preferencesDisclosure.triggerRef}>
      <p role="alert">Help could not load. Check your connection and try again.</p>
    </WorkspaceSheet>
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
          aria-label={item.ariaLabel ?? item.label} aria-pressed={item.pressed} title={item.title} data-no-interface-translate-attrs={item.id.startsWith('story-') ? '' : undefined}
          onPointerEnter={item.onIntent} onFocus={item.onIntent} onClick={() => {
            // Let the modal release focus before a host opens its own dialog or navigates.
            pendingAction.current = item.onAction;
            setExperience(null);
          }}>
          <span><span data-no-interface-translate={item.id.startsWith('story-') ? '' : undefined}>{item.label}</span>{item.description && <small>{item.description}</small>}</span>
        </NarrativeButton>
      </li>)}</ul>
    </WorkspaceSheet>
  </>;
}
