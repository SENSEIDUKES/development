import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { SEIAppHeader, SEIToolbar } from '@seihouse/ui';
import { NarrativeButton as LibraryButton } from '@seihouse/sen/presentation';
import { NovelExpandedLogo } from '@library-studios/brand';
import '@library-studios/brand/styles.css';
import { ArrowLeft } from 'lucide-react';
import { HeaderActionButton, HeaderOverflow, type HeaderAction } from './WorkspaceHeaderActions';
import { useCompactHeader } from './workspaceMedia';
import { useLibraryPathways, useLibrarySoundSlot } from './LibraryNavigation';
import { WorkspaceHeaderUtilities, type HeaderSearchItem, type WorkspaceHeaderPreferences } from './WorkspaceHeaderUtilities';
import './workspace-header.css';

const HeaderAccessoryContext = createContext<ReactNode>(null);
/** Host-owned persistent actions shared across the product's page headers. */
export function WorkspaceHeaderAccessoryProvider({ accessory, children }: { accessory: ReactNode; children: ReactNode }) {
  return <HeaderAccessoryContext.Provider value={accessory}>{children}</HeaderAccessoryContext.Provider>;
}

/**
 * The host's persistent header accessory (the Library's Familiar recall), for a
 * page that draws its own bar instead of a Library header, such as the Reader.
 */
export function useWorkspaceHeaderAccessory(): ReactNode {
  return useContext(HeaderAccessoryContext);
}

const HeaderSoundContext = createContext<ReactNode>(null);
/**
 * The host's sound control (Library: `HeaderSoundControl`) for every Library
 * header beneath it, including headers a Library page draws itself, such as
 * Story Seed's. A header's own `sound` wins; `sound={null}` leaves it out.
 * Like a header's own, it floats above the bottom bar while the bar is on
 * screen (see `WorkspaceHeaderProps.sound`).
 */
export function WorkspaceHeaderSoundProvider({ sound, children }: { sound: ReactNode; children: ReactNode }) {
  return <HeaderSoundContext.Provider value={sound}>{children}</HeaderSoundContext.Provider>;
}

const HeaderCenterContext = createContext<{ center: ReactNode; centerBreakpoint?: 'lg' | 'always' } | null>(null);
/**
 * Host-owned centered header content (Library: `MainLibraryHomeInsights` / `DaoInsights`)
 * shared across the product's page headers so switching tabs never changes the header.
 */
export function WorkspaceHeaderCenterProvider({ center, centerBreakpoint = 'always', children }: {
  center: ReactNode;
  centerBreakpoint?: 'lg' | 'always';
  children: ReactNode;
}) {
  const value = useMemo(() => ({ center, centerBreakpoint }), [center, centerBreakpoint]);
  return <HeaderCenterContext.Provider value={value}>{children}</HeaderCenterContext.Provider>;
}

const HeaderPreferencesContext = createContext<WorkspaceHeaderPreferences | null>(null);
/**
 * Host-owned Preferences card state (language and menu music) shared across the
 * product's page headers.
 */
export function WorkspaceHeaderPreferencesProvider({ preferences, children }: {
  preferences: WorkspaceHeaderPreferences;
  children: ReactNode;
}) {
  return <HeaderPreferencesContext.Provider value={preferences}>{children}</HeaderPreferencesContext.Provider>;
}

export interface WorkspaceHeaderProps {
  title: string;
  /** Host-supplied identity in place of the default emblem. */
  identity?: ReactNode;
  /** @deprecated Header badges and subtitles were removed; place page subtitles in the page body below the header. */
  subtitle?: string;
  emblem?: {
    /** @deprecated The canonical `NovelExpandedLogo` renders the wordmark directly; only `alt` is read when `home` is omitted. */
    src?: string;
    alt: string;
  };
  home?: { href: string; label: string; onNavigate?: () => void };
  back?: { label: string; onNavigate: () => void };
  primaryAction?: HeaderAction;
  secondaryActions?: readonly HeaderAction[];
  overflowActions?: readonly HeaderAction[];
  /** Optional page-owned content before the Familiar and header utilities. */
  contextualItem?: ReactNode;
  help?: HeaderAction;
  preferences?: WorkspaceHeaderPreferences;
  searchItems?: readonly HeaderSearchItem[];
  status?: { label: string; tone?: 'neutral' | 'success' | 'busy' | 'error' };
  /** `'none'` when a host — `WorkspaceShell` — already provides the banner landmark. */
  landmark?: 'banner' | 'none';
  /**
   * Centered header content between the logo on the left and Familiar,
   * Preferences and Search on the right.
   */
  center?: ReactNode;
  /** Show host center content on phones too, independently of the Pathways sidebar. */
  centerBreakpoint?: "lg" | "always";
  /**
   * The host's sound control (Library: `HeaderSoundControl`), so the reader
   * can always mute. Where there is room (laptops) it sits just before
   * Preferences and Search. While a Library bottom bar is on screen (phones
   * and tablets) it floats just above the bar's right end instead, as the
   * Reader's note floats above its Listen bar. Without it the host's
   * `WorkspaceHeaderSoundProvider` supplies one.
   */
  sound?: ReactNode;
}

/**
 * Library-branded workspace chrome. A thin adapter over the canonical
 * `SEIAppHeader`: it owns no layout, height, stickiness, safe areas or focus
 * behavior of its own, only the Library logo identity and the action composition
 * (`Logo | Insights | Familiar | Preferences | Search`) that goes into the
 * canonical slots. Page titles live on the page itself below the header.
 */
export function WorkspaceHeader({ title, emblem, home, back, primaryAction,
  secondaryActions = [], overflowActions = [], contextualItem, help, preferences, searchItems = [],
  status, landmark = 'banner', center, centerBreakpoint = 'lg', sound, identity }: WorkspaceHeaderProps) {
  const compact = useCompactHeader();
  const pathways = useLibraryPathways();
  const hostCenter = useContext(HeaderCenterContext);
  const resolvedCenter = center === undefined ? hostCenter?.center : center;
  const resolvedCenterBreakpoint = center === undefined && hostCenter?.centerBreakpoint ? hostCenter.centerBreakpoint : centerBreakpoint;
  const showCenter = (resolvedCenterBreakpoint === 'always' || pathways) && resolvedCenter != null && resolvedCenter !== false;
  const accessory = useContext(HeaderAccessoryContext);
  const hostSound = useContext(HeaderSoundContext);
  const soundControl = sound === undefined ? hostSound : sound;
  const hostPreferences = useContext(HeaderPreferencesContext);
  const resolvedPreferences = preferences ?? hostPreferences ?? undefined;
  // Phones and tablets: the note floats above the bottom bar, not in the header.
  const soundPlace = useLibrarySoundSlot();
  const commands = [...secondaryActions, ...(primaryAction ? [primaryAction] : []), ...overflowActions];
  const searchCommands = [...searchItems, ...commands.filter(action => !searchItems.some(item => item.id === action.id))];
  return <>
  <SEIAppHeader
    landmark={landmark}
    aria-label={landmark === 'banner' ? `${title} workspace header` : undefined}
    className="workspace-header"
    innerClassName="workspace-header-inner"
    identityClassName="workspace-header-identity"
    actionsClassName="workspace-header-actions"
    branding={back && <LibraryButton variant="ghost" size="icon" icon={ArrowLeft}
      aria-label={back.label} onClick={back.onNavigate} />}
    center={showCenter ? <div className="workspace-header-center" data-header-center>{resolvedCenter}</div> : undefined}
    centerBreakpoint={resolvedCenterBreakpoint}
    // Clear the utility's translation variable as well as its visual transform.
    // Production CSS lowers `translate: none` to `transform: translate(0, 0)`,
    // which leaves the separate desktop -50% translate active on phones.
    centerClassName={resolvedCenterBreakpoint === 'always' ? 'max-[641px]:translate-x-0' : undefined}
    appName={identity ?? <div className="workspace-header-badge novel-expanded-header-identity">
      {home ? <a className="workspace-header-logo novel-expanded-emblem group/emblem" href={home.href} aria-label={home.label}
        onClick={event => {
          if (home.onNavigate && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
            event.preventDefault();
            home.onNavigate();
          }
        }}>
        <NovelExpandedLogo className="workspace-header-logo-art novel-expanded-emblem-art" alt="" />
      </a> : <span className="workspace-header-logo novel-expanded-emblem">
        <NovelExpandedLogo className="workspace-header-logo-art novel-expanded-emblem-art" alt={emblem?.alt ?? 'NovelExpanded'} />
      </span>}
    </div>}
    actions={<>
      {contextualItem != null && contextualItem !== false && contextualItem !== '' && <div className="workspace-header-context">{contextualItem}</div>}
      {accessory}
      {!soundPlace.floating && soundControl}
      <WorkspaceHeaderUtilities items={searchCommands} help={help} preferences={resolvedPreferences} />
    </>}
  />
  {soundPlace.slot && soundControl != null && soundControl !== false && createPortal(soundControl, soundPlace.slot)}
  {(status || commands.length > 0) && <SEIToolbar aria-label={`${title} actions`} rovingFocus={false}
    className="workspace-header-toolbar" start={
      status && <p role="status" className="workspace-header-status" data-tone={status.tone ?? 'neutral'} title={status.label}>
        <span aria-hidden="true" /><span className="workspace-header-status-label">{status.label}</span>
      </p>
    } end={<div className="workspace-header-command-area">
        <div className="workspace-secondary-actions">{secondaryActions.map(action => <HeaderActionButton key={action.id} action={action} />)}</div>
        {primaryAction && <div className="workspace-primary-action"><HeaderActionButton action={primaryAction} primary /></div>}
        <HeaderOverflow actions={compact ? [...secondaryActions, ...overflowActions] : overflowActions} />
      </div>} />}
  </>;
}
