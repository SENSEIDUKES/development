import React, { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { Bookmark, Check } from 'lucide-react';
import { type StorySeedInput } from '@seihouse/sen/story-seed';
import type { ChapterWritingStyle, SenLanguageCode } from '@seihouse/sen/contracts';
import type { SeedUpdate } from './seedState';
import type { SeedSectionId } from './seedSections';
import { buildStorySeedDrawerSections, storySeedDrawerProfile } from './StorySeedSelector';
import { StorySeedSettings } from './StorySeedSettings';
import { WorkspaceHeader } from '../../library-shell/development/WorkspaceHeader';
import { WorkspaceShell } from '../../library-shell/development/WorkspaceShell';
import { HeaderActionButton, type HeaderAction } from '../../library-shell/development/WorkspaceHeaderActions';
import { LibraryNavigation, LibrarySectionSidebar, type LibraryWorkspaceDefinition } from '../../library-shell/development/LibraryNavigation';
import { LIBRARY_EMBLEM } from '../../library-shell/development/libraryBrand';
import { WorkspaceSheet } from '../../library-shell/development/WorkspaceSheet';
import { SENStorySeedIcon } from './SENStorySeedIcon';
import { LibraryBankIcon as SENBankIcon, LibraryHelpIcon as SENHelpIcon, LibraryManifestingIcon as SENManifestingIcon, LibrarySettingsIcon as SENSettingsIcon } from '@seihouse/library-ui';
import './story-seed.css';

interface StorySeedWorkspaceChromeProps {
  /** Host-owned explicit main hub navigation; never browser history. */
  onNavigateHome: () => void;
  seed: StorySeedInput;
  updateSeed: (update: SeedUpdate) => void;
  /** The seed's Story Language, edited in Settings. It lives beside the seed, owned by the creation workspace. */
  storyLanguage?: { value: SenLanguageCode; onChange: (language: SenLanguageCode) => void };
  /** Reported when the author picks a Reading Mode in Settings. */
  onReadingModeChange?: (mode: ChapterWritingStyle) => void;
  activeSection: SeedSectionId;
  /** Who the drawer says is creating; omitted or null reads as a guest author. */
  authorName?: string | null;
  onSelectSection: (id: SeedSectionId) => void;
  showStoryBank: boolean;
  helpOpen: boolean;
  isGenerating: boolean;
  savedFeedback: boolean;
  canManifest: boolean;
  manifestLabel: string;
  manifestDisabledReason?: string;
  manifestIndicator?: ReactNode;
  status: string;
  error?: string | null;
  onSaveDraft: () => void;
  onManifest: () => void;
  onToggleStoryBank: () => void;
  onOpenHelp: () => void;
  onSecondaryIntent?: () => void;
  onStoryBankIntent?: () => void;
  onHelpIntent?: () => void;
  children: ReactNode;
  layout?: 'complete' | 'header' | 'mobile';
  headerSaveOnly?: boolean;
}

/**
 * Feature adapter: all Story Seed labels, eligibility and schema knowledge stay
 * here. Story Seed runs in the Library Shell's workspace mode: it describes its
 * sections and tools, and the shell draws the Sections drawer, the desktop rail
 * and the bottom task bar (Sections, Story Bank, Settings, Back). Settings and
 * Story Bank are navigation, reachable from the rail, the drawer, the bar and
 * Search, rather than a second row of header commands.
 */
export function StorySeedWorkspaceChrome(props: StorySeedWorkspaceChromeProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsReturnFocusRef = useRef<HTMLElement | null>(null);
  const openSettings = useCallback(() => {
    settingsReturnFocusRef.current = document.activeElement as HTMLElement;
    setSettingsOpen(true);
  }, []);
  const { onToggleStoryBank, showStoryBank, onNavigateHome } = props;
  const workspace = useMemo<LibraryWorkspaceDefinition>(() => ({
    label: 'Story Seed sections', closeLabel: 'Close sections', barLabel: 'Story Seed navigation',
    profile: storySeedDrawerProfile(props.authorName),
    sections: [
      ...buildStorySeedDrawerSections(props.seed, props.activeSection, props.onSelectSection),
      {
        id: 'workspace',
        label: 'Workspace',
        icon: <SENSettingsIcon size={14} aria-hidden="true" className="text-neutral-400" />,
        items: [
          { id: 'story-bank', label: 'Story Bank', icon: <SENStorySeedIcon name="bank" size={16} aria-hidden="true" className="text-neutral-400" />,
            active: showStoryBank, onSelect: onToggleStoryBank },
          { id: 'settings', label: 'Settings', icon: <SENSettingsIcon size={16} aria-hidden="true" className="text-neutral-400" />,
            onSelect: openSettings },
        ],
      },
    ],
    tools: [
      { id: 'story-bank', label: 'Story Bank', icon: <SENStorySeedIcon name="bank" size={20} aria-hidden="true" />,
        active: showStoryBank, onSelect: () => { setSettingsOpen(false); onToggleStoryBank(); } },
      { id: 'settings', label: 'Settings', icon: <SENSettingsIcon size={20} />, active: settingsOpen, onSelect: openSettings },
    ],
    back: { onBack: () => { setSettingsOpen(false); onNavigateHome(); } },
  }), [props.seed, props.activeSection, props.authorName, props.onSelectSection, showStoryBank, onToggleStoryBank, openSettings, settingsOpen, onNavigateHome]);
  const content = <StorySeedChromeContent {...props} workspace={workspace} settingsOpen={settingsOpen} setSettingsOpen={setSettingsOpen}
    settingsReturnFocusRef={settingsReturnFocusRef} />;
  // A host mounting only the standalone header gets no task bar or drawer.
  return props.layout === 'header' ? content : <LibraryNavigation mode="workspace" workspace={workspace}>{content}</LibraryNavigation>;
}

interface StorySeedChromeContentProps extends StorySeedWorkspaceChromeProps {
  workspace: LibraryWorkspaceDefinition;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  settingsReturnFocusRef: React.RefObject<HTMLElement | null>;
}

function StorySeedChromeContent(props: StorySeedChromeContentProps) {
  const { settingsOpen, setSettingsOpen, settingsReturnFocusRef } = props;
  const save: HeaderAction = { id: 'save', label: props.savedFeedback ? 'Saved' : 'Save Draft',
    icon: props.savedFeedback ? Check : Bookmark, disabled: props.isGenerating, onAction: props.onSaveDraft };
  const manifest: HeaderAction = { id: 'manifest', label: props.manifestLabel, icon: SENManifestingIcon,
    disabled: !props.canManifest, loading: props.isGenerating, loadingIndicator: props.manifestIndicator,
    ariaLabel: props.manifestDisabledReason ? `${props.manifestLabel} — ${props.manifestDisabledReason}` : undefined,
    title: props.manifestDisabledReason, kind: 'creation', onAction: props.onManifest };
  const help: HeaderAction = { id: 'help', label: 'Help', icon: SENHelpIcon,
    expanded: props.helpOpen, hasPopup: 'dialog',
    onIntent: props.onHelpIntent ?? props.onSecondaryIntent, onAction: props.onOpenHelp };
  // Save Draft and Manifest belong to the page, not to a second header. The
  // shared header keeps only the Library identity, Help and Search, so it
  // supplies no primary action, no secondary actions and no status — that
  // toolbar row is what read as a duplicate header above the form. Like every
  // Library page, the emblem is the Celestial Library's and returns to Library
  // Home through the host.
  const header = <WorkspaceHeader title="Story Seed" subtitle="Grow Your Universe"
    landmark={props.layout === 'header' ? 'banner' : 'none'}
    emblem={LIBRARY_EMBLEM} home={{ href: '/', label: 'Return to Library', onNavigate: props.onNavigateHome }}
    help={help}
    // Settings and Story Bank are navigation items, so Search reaches them
    // through the same definition that drives the rail and the drawer.
    searchItems={props.workspace.sections.flatMap(section => section.items.map(item => ({
      id: item.id, label: item.label, pressed: item.active,
      onAction: () => item.onSelect?.(item.id),
    })))} />;
  const manifestAvailable = !props.showStoryBank && !props.headerSaveOnly;
  /**
   * The page's own action row: Save Draft, Manifest and the small save and
   * generation status, sitting at the top of Story Seed's content above the
   * form. It is content, not chrome — no banner landmark, no sticky row, no
   * surface of its own — so it can never read as a second header. Every
   * callback, eligibility rule, disabled reason, loading indicator and saved
   * feedback is the same one the header toolbar carried.
   */
  const actionRow = <div className="story-seed-action-row" data-story-seed-action-row>
    <p role="status" className="story-seed-action-status"
      data-tone={props.error ? 'error' : props.isGenerating ? 'busy' : props.savedFeedback ? 'success' : 'neutral'}
      title={props.error || props.status}>
      <span aria-hidden="true" /><span className="story-seed-action-status-label">{props.error || props.status}</span>
    </p>
    <div className="story-seed-action-controls">
      <HeaderActionButton action={save} />
      {manifestAvailable && <HeaderActionButton action={manifest} primary />}
    </div>
  </div>;
  const settingsSheet = <WorkspaceSheet open={settingsOpen} onOpenChange={setSettingsOpen} title="Story Seed settings" closeLabel="Close settings"
    returnFocusRef={settingsReturnFocusRef}
    footer={<HeaderActionButton action={save} primary />}>
    <StorySeedSettings seed={props.seed} updateSeed={props.updateSeed} storyLanguage={props.storyLanguage} onReadingModeChange={props.onReadingModeChange} />
  </WorkspaceSheet>;
  // The compatibility layouts render one slot each and add no shell of their own.
  // The header slot carries the page action row with it, so a host mounting only
  // the header keeps Save Draft, Manifest and the status it had before; the
  // mobile slot is the workspace's task bar and drawer alone.
  if (props.layout === 'header') return <>{header}{actionRow}{settingsSheet}</>;
  if (props.layout === 'mobile') return settingsSheet;
  return <>
    <WorkspaceShell header={header} sidebar={<LibrarySectionSidebar />} sidebarLabel="Story Seed sections">
      {actionRow}
      {props.children}
    </WorkspaceShell>
    {settingsSheet}
  </>;
}
