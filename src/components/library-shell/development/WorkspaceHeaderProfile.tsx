import { Component, createContext, lazy, Suspense, useContext, useEffect, useLayoutEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { SEISwitch } from '@seihouse/ui';
import { SEN_LANGUAGES, normalizeSenLanguageCode, type SenLanguageCode } from '@seihouse/sen/contracts';
import { LibraryHelpIcon, LibraryProfileIcon, LibrarySettingsIcon } from '@seihouse/library-ui';
import { Languages, LogIn, Music } from 'lucide-react';
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

const ProfileMenuContext = createContext<WorkspaceHeaderProfile | null>(null);

/** The reader behind every Library header's Profile Portrait beneath it. */
export function WorkspaceHeaderProfileProvider({ profile, children }: { profile: WorkspaceHeaderProfile; children: ReactNode }) {
  return <ProfileMenuContext.Provider value={profile}>{children}</ProfileMenuContext.Provider>;
}

/**
 * The reader's picture filling the circle, or, without one (or when it cannot
 * load), the Profile figure the bottom navigation uses.
 */
function ProfilePicture({ src, size }: { src?: string; size: number }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [src]);
  return src && !failed
    ? <img className="workspace-profile-photo" src={src} alt="" decoding="async" onError={() => setFailed(true)} />
    : <LibraryProfileIcon aria-hidden="true" size={size} className="workspace-profile-figure" />;
}

const MENU_GAP = 12;
const MENU_EDGE = 16;

/** The menu sits under the Portrait, aligned to its right edge. */
function menuPosition(anchor: HTMLElement): CSSProperties {
  const rect = anchor.getBoundingClientRect();
  const top = rect.bottom + MENU_GAP;
  return { top, maxHeight: `calc(100dvh - ${top + MENU_EDGE}px)`, right: Math.max(MENU_EDGE, window.innerWidth - rect.right) };
}

/**
 * The Profile Portrait: the reader's picture (or the Profile figure) at the end of every
 * Library header, opening one menu for the reader. With a host profile it
 * holds their name and rank, Sign in, their profile and Settings; at every
 * header it holds the Preferences (language and menu music) and Help.
 * It is a disclosure, not a link: the profile page is one entry inside it.
 */
export function WorkspaceHeaderProfileMenu({ preferences, help }: {
  preferences?: WorkspaceHeaderPreferences;
  help?: HeaderAction;
}) {
  const profile = useContext(ProfileMenuContext);
  const disclosure = useHeaderDisclosure();
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
    if (disclosure.triggerRef.current) setPosition(menuPosition(disclosure.triggerRef.current));
  }, [disclosure.open, disclosure.triggerRef]);

  const selectedLanguage = normalizeSenLanguageCode(preferences?.language ?? localLanguage);
  const handleLanguageChange = (next: SenLanguageCode) => {
    const code = normalizeSenLanguageCode(next);
    setLocalLanguage(code);
    if (preferences?.onLanguageChange) preferences.onLanguageChange(code);
    else setFallbackInterfaceLanguage(code);
  };
  const returnFocus = () => disclosure.triggerRef.current?.focus();
  // Each entry closes the menu first, so a page or dialog it opens takes focus from the Portrait.
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
      <ProfilePicture src={profile?.avatarUrl} size={22} />
    </button>
    {disclosure.open && layer && createPortal(<div id={disclosure.id} ref={disclosure.panelRef}
      className="workspace-profile-panel" data-testid="workspace-profile-menu" style={position}>
      <div role="group" aria-label={label} className="workspace-profile-sheet">
        {profile && <div className="workspace-profile-identity">
          <span className="workspace-profile-badge" aria-hidden="true"><ProfilePicture src={profile.avatarUrl} size={22} /></span>
          <span className="workspace-profile-identity-text">
            <span className="workspace-profile-name" data-no-interface-translate="">{profile.name}</span>
            {profile.detail && <span className="workspace-profile-detail">{profile.detail}</span>}
          </span>
        </div>}
        {profile && (profile.signIn || profile.onOpenProfile || profile.onOpenSettings) && <div className="workspace-profile-group">
          {profile.signIn && <button type="button" className="workspace-profile-row" onClick={choose(profile.signIn.onSignIn)}>
            <LogIn aria-hidden="true" size={18} className="workspace-profile-row-icon" />
            <span className="workspace-profile-row-label">Sign in</span>
            {profile.signIn.note && <small className="workspace-profile-note">{profile.signIn.note}</small>}
          </button>}
          {profile.onOpenProfile && <button type="button" className="workspace-profile-row" onClick={choose(profile.onOpenProfile)}>
            <LibraryProfileIcon aria-hidden="true" size={18} className="workspace-profile-row-icon" />
            <span className="workspace-profile-row-label">Your profile</span>
          </button>}
          {profile.onOpenSettings && <button type="button" className="workspace-profile-row" onClick={choose(profile.onOpenSettings)}>
            <LibrarySettingsIcon aria-hidden="true" size={18} className="workspace-profile-row-icon" />
            <span className="workspace-profile-row-label">Settings</span>
          </button>}
        </div>}
        <div className="workspace-profile-group">
          <div className="workspace-profile-row workspace-profile-setting">
            <Languages aria-hidden="true" size={18} className="workspace-profile-row-icon" />
            <label htmlFor="header-preferred-language" className="workspace-profile-row-label">Language</label>
            <select id="header-preferred-language" name="interfaceLanguage" className="workspace-profile-select"
              value={selectedLanguage} onChange={event => handleLanguageChange(event.target.value as SenLanguageCode)}>
              {SEN_LANGUAGES.map(option => <option key={option.code} value={option.code}>{option.label}</option>)}
            </select>
          </div>
          {preferences?.onMenuMusicChange && <div className="workspace-profile-row workspace-profile-setting">
            <Music aria-hidden="true" size={18} className="workspace-profile-row-icon" />
            <SEISwitch isSelected={preferences.menuMusic ?? true} onChange={preferences.onMenuMusicChange}
              size="compact" className="workspace-profile-music-switch">
              Menu music
            </SEISwitch>
          </div>}
        </div>
        <div className="workspace-profile-group">
          <button type="button" className="workspace-profile-row" aria-label="Help" title="Help" aria-haspopup="dialog"
            aria-expanded={help ? help.expanded : experience === 'help' || experience === 'help-error'}
            disabled={help?.disabled} onPointerEnter={help?.onIntent} onFocus={help?.onIntent} onClick={openHelp}>
            <LibraryHelpIcon aria-hidden="true" size={18} className="workspace-profile-row-icon" />
            <span className="workspace-profile-row-label">Help</span>
          </button>
        </div>
      </div>
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
