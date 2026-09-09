import { BookOpen, Cloud, Gem, Keyboard, Plus, Scroll, ScrollText, Sliders, Users, PenTool, Sword } from 'lucide-react';
import { useMainLibraryAdapter } from '../../shared/MainLibraryAdapter';
import { WorkspaceHeader } from '../WorkspaceHeader';
import type { HeaderSearchItem } from '../WorkspaceHeaderUtilities';
import { DaoInsights } from './DaoInsights';
import './main-library-header.css';

/** Home supplies content and commands to the same header as every workspace. */
export function GlobalHeader() {
  const adapter = useMainLibraryAdapter(value => value);
  const activeStory = adapter.stories.find(story => story.id === adapter.activeStoryId);
  if (adapter.currentScreen === 'reader' || adapter.currentScreen === 'codex') return null;
  const home = () => { adapter.setCurrentScreen('home'); adapter.setActiveStoryId(null); };
  // Descriptions are the existing Command Hub guidance, retained verbatim.
  const items: HeaderSearchItem[] = [
    { id: 'home', label: 'Library', description: 'Browse your accumulated scroll logs', icon: BookOpen, onAction: home },
    { id: 'creator', label: 'Story Seed', description: 'Forge a new cosmic story seed', icon: Plus, onAction: () => adapter.setCurrentScreen('creator') },
    { id: 'sects', label: 'Sects', description: 'Earn rewards & shape worlds together', icon: Users, onAction: () => adapter.setCurrentScreen('sects') },
    { id: 'pricing', label: 'Tiers', description: 'Replenish your creative Qi', icon: Gem, onAction: () => adapter.setCurrentScreen('pricing') },
    { id: 'profile', label: 'Celestial Profile', description: 'Manage spirit link settings', icon: Cloud,
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
  return <WorkspaceHeader title="Celestial Library"
    emblem={{ src: '/library-shell/celestial-library.jpg', alt: 'Celestial Library Logo' }}
    home={{ href: '/', label: 'Return to Home', onNavigate: home }}
    contextualItem={adapter.currentScreen === 'home' ? <DaoInsights /> : undefined}
    searchItems={items} />;
}
