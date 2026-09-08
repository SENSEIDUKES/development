import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Bookmark, Check, CircleHelp, List, Settings, Sparkles, Sprout, Vault } from 'lucide-react';
import type { StorySeedInput } from '../shared/storySeedSchema';
import type { SeedUpdate } from './seedState';
import type { SeedSectionId } from './seedSections';
import { buildStorySeedDrawerSections, storySeedDrawerProfile } from './StorySeedSelector';
import { StorySeedSettings } from './StorySeedSettings';
import { WorkspaceHeader } from '../../library-shell/development/WorkspaceHeader';
import { HeaderActionButton, type HeaderAction } from '../../library-shell/development/HeaderFoundation';
import { WorkspaceNavigation, WorkspaceBottomControls, useWorkspaceNavigation } from '../../library-shell/development/WorkspaceNavigation';
import { WorkspaceSheet } from '../../library-shell/development/WorkspaceSheet';

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

/** Feature adapter: all Story Seed labels, eligibility and schema knowledge stay here. */
export function StorySeedWorkspaceChrome(props: StorySeedWorkspaceChromeProps) {
  const definition = useMemo(() => ({
    label: 'Story Seed sections', closeLabel: 'Close sections',
    profile: storySeedDrawerProfile(props.equippedTitle),
    sections: buildStorySeedDrawerSections(props.seed, props.activeSection, props.onSelectSection),
  }), [props.seed, props.activeSection, props.equippedTitle, props.onSelectSection]);
  return <WorkspaceNavigation definition={definition}><StorySeedChromeContent {...props} /></WorkspaceNavigation>;
}

function StorySeedChromeContent(props: StorySeedWorkspaceChromeProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsReturnFocusRef = useRef<HTMLElement | null>(null);
  const navigation = useWorkspaceNavigation();
  const openSettings = () => {
    settingsReturnFocusRef.current = document.activeElement as HTMLElement;
    navigation.closeDrawer();
    setSettingsOpen(true);
  };
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
    onIntent: props.onHelpIntent ?? props.onSecondaryIntent, onAction: props.onOpenHelp };
  return <>
    {props.layout !== 'mobile' && <WorkspaceHeader title="Story Seed" subtitle="Grow Your Universe"
      emblem={{ src: '/favicon.jpg', alt: 'Celestial Library' }} home={{ href: '/', label: 'Return to Workshop home' }}
      primaryAction={props.showStoryBank || props.headerSaveOnly ? save : manifest}
      secondaryActions={props.showStoryBank || props.headerSaveOnly ? [settings, bank] : [save, settings, bank]} overflowActions={[help]}
      status={{ label: props.error || props.status, tone: props.error ? 'error' : props.isGenerating ? 'busy' : props.savedFeedback ? 'success' : 'neutral' }} />}
    {props.children}
    {props.layout !== 'header' && <WorkspaceBottomControls label="Story Seed navigation" items={[
      { id: 'sections', label: 'Sections', icon: <List size={20} />, active: navigation.drawerOpen,
        onSelect: () => { setSettingsOpen(false); navigation.openDrawer(); } },
      { id: bank.id, label: bank.label, icon: <Sprout size={20} />, active: props.showStoryBank,
        onSelect: () => { setSettingsOpen(false); bank.onAction(); } },
      { id: help.id, label: help.label, icon: <CircleHelp size={20} />, active: props.helpOpen,
        onSelect: () => { setSettingsOpen(false); help.onAction(); } },
      { id: settings.id, label: settings.label, icon: <Settings size={20} />, active: settingsOpen, onSelect: openSettings },
      ...(props.canManifest && !props.showStoryBank ? [{ id: manifest.id, label: 'Manifest', icon: <Sparkles size={20} />,
        onSelect: () => { setSettingsOpen(false); manifest.onAction(); } }] : []),
    ]} />}
    <WorkspaceSheet open={settingsOpen} onOpenChange={setSettingsOpen} title="Story Seed settings" closeLabel="Close settings"
      returnFocusRef={settingsReturnFocusRef}
      footer={<HeaderActionButton action={save} primary />}>
      <StorySeedSettings seed={props.seed} updateSeed={props.updateSeed} />
    </WorkspaceSheet>
  </>;
}
