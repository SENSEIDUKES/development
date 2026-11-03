import React, { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { Bookmark, Check, Eye, Home, ScrollText as SENBlueprintIcon } from 'lucide-react';
import { type StorySeedInput } from '@seihouse/sen/story-seed';
import type { ChapterWritingStyle, SenLanguageCode } from '@seihouse/sen/contracts';
import type { SeedUpdate } from './seedState';
import type { SeedSectionId } from './seedSections';
import { buildStorySeedDrawerSections } from './StorySeedSelector';
import { StorySeedSettings } from './StorySeedSettings';
import { WorkspaceHeader } from '../../library-shell/development/WorkspaceHeader';
import { WorkspaceShell } from '../../library-shell/development/WorkspaceShell';
import { HeaderActionButton, type HeaderAction } from '../../library-shell/development/WorkspaceHeaderActions';
import { LibraryNavigation, LibrarySectionSidebar, useLibraryWorkspace, type LibraryWorkspaceDefinition } from '../../library-shell/development/LibraryNavigation';
import { LIBRARY_EMBLEM } from '../../library-shell/development/libraryBrand';
import { WorkspaceSheet } from '../../library-shell/development/WorkspaceSheet';
import { SENStorySeedIcon } from './SENStorySeedIcon';
import { StorySeedLiveCard } from './creator/StorySeedLiveCard';
import { useDesktopNavigation } from '../../library-shell/development/workspaceMedia';
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
  /** The host's Story Settings (skills and media), shown in Settings after the Reading Mode. */
  storySettings?: ReactNode;
  /** The open Seed section; null while the Manifest step, Story Bank or Blueprint is showing. */
  activeSection: SeedSectionId | null;
  /** Host author metadata; the section navigation does not display a profile. */
  authorName?: string | null;
  onSelectSection: (id: SeedSectionId) => void;
  showStoryBank: boolean;
  helpOpen: boolean;
  isGenerating: boolean;
  savedFeedback: boolean;
  /**
   * The action row's own Manifest, for hosts mounting the chrome without the
   * creator. Create leaves it out: its Manifest lives on the creator's footer.
   */
  canManifest?: boolean;
  manifestLabel?: string;
  manifestDisabledReason?: string;
  manifestIndicator?: ReactNode;
  status: string;
  error?: string | null;
  onSaveDraft: () => void;
  onManifest?: () => void;
  /** Opens the World Blueprint from the bar and the rail; absent, Blueprint is not offered. */
  onOpenBlueprint?: () => void;
  blueprintActive?: boolean;
  /** False while the Blueprint is showing: it carries its own actions. */
  showActionRow?: boolean;
  onToggleStoryBank: () => void;
  onOpenHelp: () => void;
  onSecondaryIntent?: () => void;
  onStoryBankIntent?: () => void;
  onHelpIntent?: () => void;
  children: ReactNode;
  layout?: 'complete' | 'header' | 'mobile';
  headerSaveOnly?: boolean;
  /** Include mobile Save and Preview utilities in the existing Sections drawer. */
  mobileUtilities?: boolean;
}

/** The drawer's custom-content slot retains the existing native disabled Save action. */
function MenuSaveDraft({ savedFeedback, isGenerating, onSaveDraft }: Pick<StorySeedWorkspaceChromeProps, 'savedFeedback' | 'isGenerating' | 'onSaveDraft'>) {
  const { closeDrawer } = useLibraryWorkspace();
  return <div className="seed-menu-save"><HeaderActionButton action={{
    id: 'save', label: savedFeedback ? 'Draft saved' : 'Save Draft', icon: savedFeedback ? Check : Bookmark,
    disabled: isGenerating, onAction: () => { closeDrawer(); onSaveDraft(); },
  }} /></div>;
}

/**
 * Feature adapter: all Story Seed labels, eligibility and schema knowledge stay
 * here. Story Seed runs in the Library Shell's workspace mode: it describes its
 * sections and tools, and the shell draws the Sections drawer, the desktop rail
 * and the mobile task bar. The creator keeps Back/Next inside its form;
 * standalone hosts retain the shell's tool bar. Secondary actions stay in the
 * existing drawer, desktop rail and Search.
 */
export function StorySeedWorkspaceChrome(props: StorySeedWorkspaceChromeProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const desktop = useDesktopNavigation();
  const settingsReturnFocusRef = useRef<HTMLElement | null>(null);
  const rememberFocus = useCallback(() => {
    settingsReturnFocusRef.current = (!desktop && props.mobileUtilities && document.querySelector<HTMLElement>('.library-workspace-navigation button')) || document.activeElement as HTMLElement;
  }, [desktop, props.mobileUtilities]);
  const openSettings = useCallback(() => {
    rememberFocus();
    setPreviewOpen(false);
    setSettingsOpen(true);
  }, [rememberFocus]);
  const openPreview = useCallback(() => { rememberFocus(); setSettingsOpen(false); setPreviewOpen(true); }, [rememberFocus]);
  const mobileMenu = Boolean(props.mobileUtilities) && !desktop;
  const { onToggleStoryBank, showStoryBank, onNavigateHome, onOpenBlueprint, blueprintActive = false } = props;
  const workspace = useMemo<LibraryWorkspaceDefinition>(() => ({
    label: 'Story Seed sections', closeLabel: 'Close sections', barLabel: 'Story Seed navigation',
    sections: buildStorySeedDrawerSections(props.seed, props.activeSection, props.onSelectSection),
    footer: {
      divider: true,
      content: mobileMenu ? <MenuSaveDraft savedFeedback={props.savedFeedback} isGenerating={props.isGenerating} onSaveDraft={props.onSaveDraft} /> : undefined,
      items: [
        { id: 'story-preview', label: 'Story Preview', icon: <Eye size={16} aria-hidden="true" />, onSelect: openPreview },
        { id: 'story-bank', label: 'Story Bank', icon: <SENStorySeedIcon name="bank" size={16} aria-hidden="true" className="text-neutral-400" />,
          active: showStoryBank, onSelect: onToggleStoryBank },
        ...(onOpenBlueprint ? [{ id: 'blueprint', label: 'Blueprint', icon: <SENBlueprintIcon size={16} aria-hidden="true" className="text-neutral-400" />,
          active: blueprintActive, onSelect: onOpenBlueprint }] : []),
        { id: 'settings', label: 'Settings', icon: <SENSettingsIcon size={16} aria-hidden="true" className="text-neutral-400" />,
          onSelect: openSettings },
        ...(mobileMenu ? [{ id: 'home', label: 'Home', icon: <Home size={16} aria-hidden="true" />, onSelect: onNavigateHome }] : []),
      ],
    },
    tools: [
      { id: 'story-bank', label: 'Story Bank', icon: <SENStorySeedIcon name="bank" size={20} aria-hidden="true" />,
        active: showStoryBank, onSelect: () => { setSettingsOpen(false); onToggleStoryBank(); } },
      ...(onOpenBlueprint ? [{ id: 'blueprint', label: 'Blueprint', icon: <SENBlueprintIcon size={20} aria-hidden="true" />,
        active: blueprintActive, onSelect: () => { setSettingsOpen(false); onOpenBlueprint(); } }] : []),
      { id: 'settings', label: 'Settings', icon: <SENSettingsIcon size={20} />, active: settingsOpen, onSelect: openSettings },
    ],
    back: { onBack: () => { setSettingsOpen(false); onNavigateHome(); } },
    // Keep Library navigation visible; step actions belong to the form.
    sectionsOnPhoneBar: true,

  }), [props.seed, props.activeSection, props.onSelectSection, showStoryBank, onToggleStoryBank, onOpenBlueprint, blueprintActive, openSettings, settingsOpen, onNavigateHome,
    mobileMenu, props.mobileUtilities, props.savedFeedback, props.isGenerating, props.onSaveDraft, openPreview]);
  const content = <StorySeedChromeContent {...props} workspace={workspace} settingsOpen={settingsOpen} setSettingsOpen={setSettingsOpen}
    settingsReturnFocusRef={settingsReturnFocusRef} />;
  // A host mounting only the standalone header gets no task bar or drawer.
  const preview = <WorkspaceSheet open={previewOpen} onOpenChange={setPreviewOpen} title="Story preview" closeLabel="Close story preview" returnFocusRef={settingsReturnFocusRef}>
    <StorySeedLiveCard seed={props.seed} variant="full" />
  </WorkspaceSheet>;
  return props.layout === 'header' ? <>{content}{preview}</> : <LibraryNavigation mode="workspace" workspace={workspace}>
    {content}{preview}
    {mobileMenu && props.savedFeedback && <p className="seed-save-feedback" role="status">Draft saved</p>}
  </LibraryNavigation>;
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
  const manifest: HeaderAction = { id: 'manifest', label: props.manifestLabel ?? 'Manifest', icon: SENManifestingIcon,
    disabled: !props.canManifest, loading: props.isGenerating, loadingIndicator: props.manifestIndicator,
    ariaLabel: props.manifestDisabledReason ? `${props.manifestLabel} — ${props.manifestDisabledReason}` : undefined,
    title: props.manifestDisabledReason, kind: 'creation', onAction: () => props.onManifest?.() };
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
    searchItems={[...props.workspace.sections.flatMap(section => section.items), ...(props.workspace.footer?.items ?? [])].map(item => ({
      id: item.id, label: item.label, pressed: item.active,
      onAction: () => item.onSelect?.(item.id),
    }))} />;
  const manifestAvailable = Boolean(props.onManifest) && !props.showStoryBank && !props.headerSaveOnly;
  // One compact content row holds the page name, status and existing actions.
  // The standalone header slot keeps its action-only contract.
  const actionRow = <div className="story-seed-action-row" data-story-seed-action-row>
    <div className="story-seed-page-heading" data-story-seed-page-heading data-page-heading>
      {props.layout !== 'header' && <h1 className="story-seed-page-title font-display font-bold" data-page-title>Story Seed</h1>}
      <p role="status" className="story-seed-action-status"
        data-tone={props.error ? 'error' : props.isGenerating ? 'busy' : props.savedFeedback ? 'success' : 'neutral'}
        title={props.error || props.status}>
        <span aria-hidden="true" /><span className="story-seed-action-status-label">{props.error || props.status}</span>
      </p>
    </div>
    <div className="story-seed-action-controls">
      <HeaderActionButton action={save} />
      {manifestAvailable && <HeaderActionButton action={manifest} primary />}
    </div>
  </div>;
  const settingsSheet = <WorkspaceSheet open={settingsOpen} onOpenChange={setSettingsOpen} title="Story Seed settings" closeLabel="Close settings"
    returnFocusRef={settingsReturnFocusRef}
    footer={<HeaderActionButton action={save} primary />}>
    <StorySeedSettings seed={props.seed} updateSeed={props.updateSeed} storyLanguage={props.storyLanguage} onReadingModeChange={props.onReadingModeChange}>
      {props.storySettings}
    </StorySeedSettings>
  </WorkspaceSheet>;
  // The compatibility layouts render one slot each and add no shell of their own.
  // The header slot carries the page action row with it, so a host mounting only
  // the header keeps Save Draft, Manifest and the status it had before; the
  // mobile slot is the workspace's task bar and drawer alone.
  if (props.layout === 'header') return <>{header}{actionRow}{settingsSheet}</>;
  if (props.layout === 'mobile') return settingsSheet;
  return <>
    <WorkspaceShell header={header} sidebar={<LibrarySectionSidebar />} sidebarLabel="Story Seed sections">
      {props.showActionRow !== false && actionRow}
      {props.children}
    </WorkspaceShell>
    {settingsSheet}
  </>;
}
