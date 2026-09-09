import React, { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { Bookmark, Check, CircleHelp, List, Settings, Sparkles, Sprout, Vault } from 'lucide-react';
import type { StorySeedInput } from '../shared/storySeedSchema';
import type { SeedUpdate } from './seedState';
import type { SeedSectionId } from './seedSections';
import { buildStorySeedDrawerSections, storySeedDrawerProfile } from './StorySeedSelector';
import { StorySeedSettings } from './StorySeedSettings';
import { WorkspaceHeader } from '../../library-shell/development/WorkspaceHeader';
import { WorkspaceShell } from '../../library-shell/development/WorkspaceShell';
import { HeaderActionButton, type HeaderAction } from '../../library-shell/development/WorkspaceHeaderActions';
import { WorkspaceNavigation, WorkspaceBottomControls, WorkspaceSidebar, useWorkspaceNavigation } from '../../library-shell/development/WorkspaceNavigation';
import { WorkspaceSheet } from '../../library-shell/development/WorkspaceSheet';
import './story-seed.css';

interface StorySeedWorkspaceChromeProps {
  seed: StorySeedInput;
  updateSeed: (update: SeedUpdate) => void;
  activeSection: SeedSectionId;
  equippedTitle?: string | null;
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
 * here. Settings and Story Bank are part of the workspace's own navigation —
 * the desktop rail, the mobile drawer, the bottom controls and Search — rather
 * than a second row of header commands.
 */
export function StorySeedWorkspaceChrome(props: StorySeedWorkspaceChromeProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsReturnFocusRef = useRef<HTMLElement | null>(null);
  const openSettings = useCallback(() => {
    settingsReturnFocusRef.current = document.activeElement as HTMLElement;
    setSettingsOpen(true);
  }, []);
  const { onToggleStoryBank, showStoryBank } = props;
  const definition = useMemo(() => ({
    label: 'Story Seed sections', closeLabel: 'Close sections',
    profile: storySeedDrawerProfile(props.equippedTitle),
    sections: [
      ...buildStorySeedDrawerSections(props.seed, props.activeSection, props.onSelectSection),
      {
        id: 'workspace',
        label: 'Workspace',
        icon: <Settings size={14} aria-hidden="true" className="text-neutral-400" />,
        items: [
          { id: 'story-bank', label: 'Story Bank', icon: <Vault size={16} aria-hidden="true" className="text-neutral-400" />,
            active: showStoryBank, onSelect: onToggleStoryBank },
          { id: 'settings', label: 'Settings', icon: <Settings size={16} aria-hidden="true" className="text-neutral-400" />,
            onSelect: openSettings },
        ],
      },
    ],
  }), [props.seed, props.activeSection, props.equippedTitle, props.onSelectSection, showStoryBank, onToggleStoryBank, openSettings]);
  return <WorkspaceNavigation definition={definition}>
    <StorySeedChromeContent {...props} settingsOpen={settingsOpen} setSettingsOpen={setSettingsOpen}
      openSettings={openSettings} settingsReturnFocusRef={settingsReturnFocusRef} />
  </WorkspaceNavigation>;
}

interface StorySeedChromeContentProps extends StorySeedWorkspaceChromeProps {
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  openSettings: () => void;
  settingsReturnFocusRef: React.RefObject<HTMLElement | null>;
}

function StorySeedChromeContent(props: StorySeedChromeContentProps) {
  const { settingsOpen, setSettingsOpen, settingsReturnFocusRef } = props;
  const navigation = useWorkspaceNavigation();
  const openSettings = () => { navigation.closeDrawer(); props.openSettings(); };
  const save: HeaderAction = { id: 'save', label: props.savedFeedback ? 'Saved' : 'Save Draft',
    icon: props.savedFeedback ? Check : Bookmark, disabled: props.isGenerating, onAction: props.onSaveDraft };
  const manifest: HeaderAction = { id: 'manifest', label: props.manifestLabel, icon: Sparkles,
    disabled: !props.canManifest, loading: props.isGenerating, loadingIndicator: props.manifestIndicator,
    ariaLabel: props.manifestDisabledReason ? `${props.manifestLabel} — ${props.manifestDisabledReason}` : undefined,
    title: props.manifestDisabledReason, kind: 'creation', onAction: props.onManifest };
  const settings: HeaderAction = { id: 'settings', label: 'Settings', icon: Settings,
    expanded: settingsOpen, hasPopup: 'dialog', onAction: openSettings };
  const bank: HeaderAction = { id: 'story-bank', label: 'Story Bank', icon: Vault, pressed: props.showStoryBank,
    onIntent: props.onStoryBankIntent ?? props.onSecondaryIntent, onAction: props.onToggleStoryBank };
  const help: HeaderAction = { id: 'help', label: 'Help', icon: CircleHelp,
    expanded: props.helpOpen, hasPopup: 'dialog',
    onIntent: props.onHelpIntent ?? props.onSecondaryIntent, onAction: props.onOpenHelp };
  // Save Draft and Manifest belong to the page, not to a second header. The
  // shared header keeps only the Library identity, Help and Search, so it
  // supplies no primary action, no secondary actions and no status — that
  // toolbar row is what read as a duplicate header above the form.
  const header = <WorkspaceHeader title="Story Seed" subtitle="Grow Your Universe"
    landmark={props.layout === 'complete' || props.layout === undefined ? 'none' : 'banner'}
    emblem={{ src: '/favicon.jpg', alt: 'Celestial Library' }} home={{ href: '/', label: 'Return to Workshop home' }}
    help={help}
    // Settings and Story Bank are navigation items now, so Search reaches them
    // through the same definition that drives the rail and the drawer.
    searchItems={navigation.definition.sections.flatMap(section => section.items.map(item => ({
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
  const bottomControls = <WorkspaceBottomControls label="Story Seed navigation" items={[
    { id: 'sections', label: 'Sections', icon: <List size={20} />, active: navigation.drawerOpen,
      onSelect: () => { setSettingsOpen(false); navigation.openDrawer(); } },
    { id: bank.id, label: bank.label, icon: <Sprout size={20} />, active: props.showStoryBank,
      onSelect: () => { setSettingsOpen(false); bank.onAction(); } },
    { id: help.id, label: help.label, icon: <CircleHelp size={20} />, active: props.helpOpen,
      onSelect: () => { setSettingsOpen(false); help.onAction(); } },
    { id: settings.id, label: settings.label, icon: <Settings size={20} />, active: settingsOpen, onSelect: openSettings },
    ...(props.canManifest && !props.showStoryBank ? [{ id: manifest.id, label: 'Manifest', icon: <Sparkles size={20} />,
      onSelect: () => { setSettingsOpen(false); manifest.onAction(); } }] : []),
  ]} />;
  const settingsSheet = <WorkspaceSheet open={settingsOpen} onOpenChange={setSettingsOpen} title="Story Seed settings" closeLabel="Close settings"
    returnFocusRef={settingsReturnFocusRef}
    footer={<HeaderActionButton action={save} primary />}>
    <StorySeedSettings seed={props.seed} updateSeed={props.updateSeed} />
  </WorkspaceSheet>;
  // The compatibility layouts render one slot each and add no shell of their own.
  // The header slot carries the page action row with it, so a host mounting only
  // the header keeps Save Draft, Manifest and the status it had before.
  if (props.layout === 'header') return <>{header}{actionRow}{settingsSheet}</>;
  if (props.layout === 'mobile') return <>{bottomControls}{settingsSheet}</>;
  return <>
    <WorkspaceShell header={header} sidebar={<WorkspaceSidebar />} sidebarLabel="Story Seed sections">
      {actionRow}
      {props.children}
      {bottomControls}
    </WorkspaceShell>
    {settingsSheet}
  </>;
}
