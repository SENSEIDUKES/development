import { BookOpen, Gem, Keyboard, PenLine, Plus, Scroll, ScrollText, Sliders, Users, PenTool, Sword } from 'lucide-react';
import { useMainLibraryAdapter } from '../../shared/MainLibraryAdapter';
import { WorkspaceHeader } from '../WorkspaceHeader';
import type { HeaderSearchItem } from '../WorkspaceHeaderUtilities';
import { LibraryProfileIcon as SENProfileIcon } from '@seihouse/library-ui';
import { LIBRARY_EMBLEM } from '../libraryBrand';
import { DaoInsights } from './DaoInsights';
import './main-library-header.css';

/**
 * Home supplies its commands to the same header as every workspace.
 *
 * Dao Insights sits in the header's center on laptops and wider, where the
 * Pathways sidebar carries the Library identity. On phones and tablets it lives
 * in Home's own content, between the featured area and the collection tabs —
 * see `MainLibraryHomeInsights` — so the phone header keeps the full title,
 * Help and Search.
 */
export function GlobalHeader({ landmark = 'banner' }: {
  /** `'none'` when `WorkspaceShell` already provides the banner landmark. */
  landmark?: 'banner' | 'none';
} = {}) {
  const adapter = useMainLibraryAdapter(value => value);
  const activeStory = adapter.stories.find(story => story.id === adapter.activeStoryId);
  if (adapter.currentScreen === 'reader' || adapter.currentScreen === 'codex') return null;
  const home = () => { adapter.setCurrentScreen('home'); adapter.setActiveStoryId(null); };
  // Descriptions are the existing Command Hub guidance, retained verbatim.
  const items: HeaderSearchItem[] = [
    { id: 'home', label: 'Home', description: 'Return to the Light Novels homepage', icon: BookOpen, onAction: home },
    { id: 'library', label: 'Library', description: 'Browse your accumulated scroll logs', icon: BookOpen, onAction: adapter.openLibrary ?? home },
    { id: 'creator-space', label: 'Creator Space', description: 'Your worlds, Energy and creator toolkit', icon: PenLine, onAction: () => adapter.setCurrentScreen('creator-space') },
    { id: 'creator', label: 'Story Seed', description: 'Forge a new cosmic story seed', icon: Plus, onAction: () => adapter.setCurrentScreen('creator') },
    { id: 'sects', label: 'Sects', description: 'Earn rewards & shape worlds together', icon: Users, onAction: () => adapter.setCurrentScreen('sects') },
    { id: 'pricing', label: 'Tiers', description: 'Replenish your creative Qi', icon: Gem, onAction: () => adapter.setCurrentScreen('pricing') },
    { id: 'profile', label: 'Celestial Profile', description: 'Manage spirit link settings', icon: SENProfileIcon,
      title: adapter.currentUser?.email ? `Spirit Linked: ${adapter.currentUser.email}` : 'Open Celestial Tools',
      onAction: () => adapter.setCurrentScreen('profile') },
    ...(activeStory ? [
      { id: 'detail', label: 'Tome Chambers', description: `Explore ${activeStory.mcName}'s world logs`, icon: ScrollText, onAction: () => adapter.setCurrentScreen('detail') },
      { id: 'reader', label: 'Chamber Reader', description: 'Engage active chapter flow', icon: Scroll, onAction: () => adapter.setCurrentScreen('reader') },
      { id: 'codex', label: 'Living Codex', description: 'Inspect memories & relationships', icon: Sliders, onAction: () => adapter.setIsCodexSheetOpen(true) },
    ] : []),
    { id: 'shortcuts', label: 'Shortcut Spells', description: 'View keyboard system keys', icon: Keyboard, onAction: () => adapter.setIsShortcutsOpen(true) },
    { id: 'manga', label: 'Manga Studio', description: 'Visualize your chapters', icon: PenTool, disabled: true, title: 'Coming Soon', onAction: () => {} },
    { id: 'battles', label: 'Qi Battles', description: 'Test your cultivation realm', icon: Sword, disabled: true, title: 'Coming Soon', onAction: () => {} },
  ];
  // On laptops the Pathways sidebar carries the identity, so Dao Insights takes
  // the header's center — its original home. Phones keep it in Home content.
  return <WorkspaceHeader title="Celestial Library" landmark={landmark} center={<DaoInsights />}
    emblem={LIBRARY_EMBLEM}
    home={{ href: '/', label: 'Return to Home', onNavigate: home }}
    searchItems={items} />;
}
