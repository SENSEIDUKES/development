import { Component, createContext, lazy, Suspense, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { SEIAvatar, SEISwitch } from '@seihouse/ui';
import { SEN_LANGUAGES, normalizeSenLanguageCode, type SenLanguageCode } from '@seihouse/sen/contracts';
import { NarrativeButton, NarrativePanel } from '@seihouse/sen/presentation';
import { LibraryHelpIcon, LibraryProfileIcon, LibrarySettingsIcon } from '@seihouse/library-ui';
import { LogIn } from 'lucide-react';
import { getActiveInterfaceLanguage, setFallbackInterfaceLanguage } from '../../../library/language/interfaceTranslation';
import { WorkspaceSheet } from './WorkspaceSheet';
import { useHeaderDisclosure, type HeaderAction } from './WorkspaceHeaderActions';
import type { WorkspaceHeaderPreferences } from './WorkspaceHeaderUtilities';

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

/** The reader the Profile Portrait stands for, and where its menu leads. The host owns all of it. */
export interface WorkspaceHeaderProfile {
  name: string;
  /** A line under the name, such as the Library's cultivation rank. */
  detail?: string;
  avatarUrl?: string;
  onOpenProfile?: () => void;
  onOpenSettings?: () => void;
  /** Sign in. `note` says when it is not connected yet. */
  signIn?: { onSignIn: () => void; note?: string };
}

interface ProfileMenuState {
  profile: WorkspaceHeaderProfile;
  open: boolean;
  setOpen: (open: boolean) => void;
  /** What opened the menu (the Portrait, or the sidebar's profile card): the menu sits beside it and focus returns to it. */
  openerRef: RefObject<HTMLElement | null>;
}

const ProfileMenuContext = createContext<ProfileMenuState | null>(null);

/**
 * The reader behind every Library header's Profile Portrait, with one menu
 * state shared by every header beneath it and the laptop sidebar's profile card.
 */
export function WorkspaceHeaderProfileProvider({ profile, children }: { profile: WorkspaceHeaderProfile; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openerRef = useRef<HTMLElement | null>(null);
  const value = useMemo(() => ({ profile, open, setOpen, openerRef }), [profile, open]);
  return <ProfileMenuContext.Provider value={value}>{children}</ProfileMenuContext.Provider>;
}

/** The Library navigation's profile card (the laptop sidebar's), which opens the menu beside itself. */
const NAVIGATION_ACCOUNT = '[data-slot="navigation-account-top"], [data-slot="navigation-account"]';
const visibleCard = () => Array.from(document.querySelectorAll<HTMLElement>(NAVIGATION_ACCOUNT))
  .find(card => card.getClientRects().length > 0) ?? null;

/**
 * Opens the Profile Portrait's menu from elsewhere: by default from the Library
 * navigation's profile card, beside it. Null without a `WorkspaceHeaderProfileProvider`.
 */
export function useWorkspaceHeaderProfileMenu(): { open: (opener?: HTMLElement | null) => void } | null {
  const state = useContext(ProfileMenuContext);
  const setOpen = state?.setOpen;
  const openerRef = state?.openerRef;
  const open = useCallback((opener?: HTMLElement | null) => {
    if (!setOpen || !openerRef) return;
    const active = document.activeElement;
    openerRef.current = opener !== undefined ? opener
      : active instanceof HTMLElement && active.matches(NAVIGATION_ACCOUNT) ? active
        : visibleCard();
    setOpen(true);
  }, [setOpen, openerRef]);
  return useMemo(() => setOpen ? { open } : null, [setOpen, open]);
}

const MENU_GAP = 12;
const MENU_EDGE = 16;

/** The menu sits under what opened it, on the side of the screen it was opened from. */
function menuPosition(anchor: HTMLElement): CSSProperties {
  const rect = anchor.getBoundingClientRect();
  const top = rect.bottom + MENU_GAP;
  const position: CSSProperties = { top, maxHeight: `calc(100dvh - ${top + MENU_EDGE}px)` };
  if (rect.left + rect.width / 2 > window.innerWidth / 2) position.right = Math.max(MENU_EDGE, window.innerWidth - rect.right);
  else position.left = Math.max(MENU_EDGE, rect.left);
  return position;
}

/**
 * The Profile Portrait: the reader's picture (or initial) at the end of every
 * Library header, opening one menu for the reader. With a host profile it
 * holds their name and rank, Sign in, their profile and Settings; at every
 * header it holds the Preferences (language and menu music) and Help.
 * It is a disclosure, not a link: the profile page is one entry inside it.
 */
export function WorkspaceHeaderProfileMenu({ preferences, help }: {
  preferences?: WorkspaceHeaderPreferences;
  help?: HeaderAction;
}) {
  const shared = useContext(ProfileMenuContext);
  const profile = shared?.profile;
  const disclosure = useHeaderDisclosure(shared ? {
    open: shared.open,
    onOpenChange: open => {
      if (open) shared.openerRef.current = null;
      shared.setOpen(open);
    },
    returnFocusTo: () => shared.openerRef.current,
  } : undefined);
  const [experience, setExperience] = useState<'help' | 'help-error' | null>(null);
  const [localLanguage, setLocalLanguage] = useState<SenLanguageCode>(() =>
    normalizeSenLanguageCode(preferences?.language ?? getActiveInterfaceLanguage()),
  );
  // A failed lazy load is cached by React, so each failure gets a fresh loader
  // and the next Help press retries instead of failing forever.
  const [LibraryHelpMenu, setLibraryHelpMenu] = useState(() => lazy(loadHelpMenu));
  const [position, setPosition] = useState<CSSProperties>();

  useEffect(() => {
    if (preferences?.language) setLocalLanguage(normalizeSenLanguageCode(preferences.language));
  }, [preferences?.language]);
  useEffect(() => {
    if (disclosure.open && !preferences?.language) setLocalLanguage(getActiveInterfaceLanguage());
  }, [preferences?.language, disclosure.open]);
  useLayoutEffect(() => {
    if (!disclosure.open) return;
    const anchor = shared?.openerRef.current ?? disclosure.triggerRef.current;
    if (anchor) setPosition(menuPosition(anchor));
  }, [disclosure.open, shared?.openerRef, disclosure.triggerRef]);

  const selectedLanguage = normalizeSenLanguageCode(preferences?.language ?? localLanguage);
  const handleLanguageChange = (next: SenLanguageCode) => {
    const code = normalizeSenLanguageCode(next);
    setLocalLanguage(code);
    if (preferences?.onLanguageChange) preferences.onLanguageChange(code);
    else setFallbackInterfaceLanguage(code);
  };
  const returnFocus = () => (shared?.openerRef.current ?? disclosure.triggerRef.current)?.focus();
  // Each entry closes the menu first, so a page or dialog it opens takes focus from the opener.
  const choose = (action: () => void) => () => {
    disclosure.setOpen(false);
    returnFocus();
    action();
  };
  const openHelp = () => {
    disclosure.setOpen(false);
    returnFocus();
    if (help) help.onAction();
    else setExperience('help');
  };
  const label = 'Profile and preferences';
  // The menu is drawn inside the page's Library look (so it wears it), outside
  // the header's glass, which would otherwise hold a fixed panel inside itself.
  // It opens only after the Portrait is on the page, so the trigger is there to ask.
  const layer = disclosure.open ? disclosure.triggerRef.current?.closest<HTMLElement>('.library-look') ?? document.body : null;

  return <div className="workspace-profile" ref={disclosure.rootRef}>
    <button ref={disclosure.triggerRef} type="button" className="workspace-profile-portrait"
      aria-label={label} title={label} aria-expanded={disclosure.open} aria-controls={disclosure.id}
      onPointerEnter={help?.onIntent} onFocus={help?.onIntent}
      onClick={() => disclosure.setOpen(!disclosure.open)}>
      {profile
        ? <SEIAvatar src={profile.avatarUrl} name={profile.name} size="md" tone="accent" decorative data-no-interface-translate="" />
        : <LibraryProfileIcon aria-hidden="true" size={24} className="workspace-header-utility-icon" />}
    </button>
    {disclosure.open && layer && createPortal(<div id={disclosure.id} ref={disclosure.panelRef}
      className="workspace-profile-panel" data-testid="workspace-profile-menu" style={position}>
      <NarrativePanel padding="sm" aria-label={label}>
        {profile && <div className="workspace-profile-identity">
          <SEIAvatar src={profile.avatarUrl} name={profile.name} size="lg" tone="accent" decorative />
          <span className="workspace-profile-identity-text">
            <span className="workspace-profile-name" data-no-interface-translate="">{profile.name}</span>
            {profile.detail && <span className="workspace-profile-detail">{profile.detail}</span>}
          </span>
        </div>}
        {profile && (profile.signIn || profile.onOpenProfile || profile.onOpenSettings) && <div className="workspace-profile-actions">
          {profile.signIn && <NarrativeButton variant="ghost" onClick={choose(profile.signIn.onSignIn)}>
            <LogIn aria-hidden="true" size={18} className="workspace-header-utility-icon" />
            <span>Sign in</span>
            {profile.signIn.note && <small className="workspace-profile-note">{profile.signIn.note}</small>}
          </NarrativeButton>}
          {profile.onOpenProfile && <NarrativeButton variant="ghost" onClick={choose(profile.onOpenProfile)}>
            <LibraryProfileIcon aria-hidden="true" size={18} className="workspace-header-utility-icon" />
            <span>Your profile</span>
          </NarrativeButton>}
          {profile.onOpenSettings && <NarrativeButton variant="ghost" onClick={choose(profile.onOpenSettings)}>
            <LibrarySettingsIcon aria-hidden="true" size={18} className="workspace-header-utility-icon" />
            <span>Settings</span>
          </NarrativeButton>}
        </div>}
        <div className="workspace-profile-section">
          <label htmlFor="header-preferred-language" className="workspace-profile-label">
            Preferred Language
          </label>
          <select id="header-preferred-language" name="interfaceLanguage" className="workspace-profile-select"
            value={selectedLanguage} onChange={event => handleLanguageChange(event.target.value as SenLanguageCode)}>
            {SEN_LANGUAGES.map(option => <option key={option.code} value={option.code}>{option.label}</option>)}
          </select>
        </div>
        {preferences?.onMenuMusicChange && <div className="workspace-profile-music">
          <SEISwitch isSelected={preferences.menuMusic ?? true} onChange={preferences.onMenuMusicChange}
            size="compact" className="workspace-profile-music-switch">
            Menu music
          </SEISwitch>
        </div>}
        <div className="workspace-profile-footer">
          <NarrativeButton variant="ghost" aria-label="Help" title="Help" aria-haspopup="dialog"
            aria-expanded={help ? help.expanded : experience === 'help' || experience === 'help-error'}
            disabled={help?.disabled} onPointerEnter={help?.onIntent} onFocus={help?.onIntent} onClick={openHelp}>
            <LibraryHelpIcon aria-hidden="true" size={18} className="workspace-header-utility-icon" />
            <span>Help</span>
          </NarrativeButton>
        </div>
      </NarrativePanel>
    </div>, layer)}
    {experience === 'help' && createPortal(<HelpBoundary onError={() => { setLibraryHelpMenu(() => lazy(loadHelpMenu)); setExperience('help-error'); }}>
      <Suspense fallback={<span role="status">Loading Help…</span>}>
        <LibraryHelpMenu open onClose={() => setExperience(null)} />
      </Suspense>
    </HelpBoundary>, document.body)}
    <WorkspaceSheet open={experience === 'help-error'} onOpenChange={open => { if (!open) setExperience(null); }}
      title="Help" closeLabel="Close Help" returnFocusRef={disclosure.triggerRef}>
      <p role="alert">Help could not load. Check your connection and try again.</p>
    </WorkspaceSheet>
  </div>;
}
