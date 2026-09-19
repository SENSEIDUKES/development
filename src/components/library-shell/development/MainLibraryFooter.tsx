import type { MainLibraryAdapter } from '../shared/MainLibraryAdapter';
import { normalizeSenLanguageCode } from '@seihouse/sen/contracts';
import { LibraryFooter, type LibraryFooterAction, type LibraryFooterGroup, type LibraryFooterSocialLink } from './LibraryFooter';
import { libraryNavigationMode, type LibraryLocation } from './libraryRoutes';

export interface MainLibraryFooterProps {
  adapter: MainLibraryAdapter;
  location: LibraryLocation;
  /** The existing router callback shared with the global navigation. */
  onNavigate: (location: LibraryLocation) => void;
  /** Opens the existing Library Help menu. */
  onOpenHelp: () => void;
  /** Host-configured channels; none are hardcoded here. */
  social: readonly LibraryFooterSocialLink[];
  /** Host-configured Terms, Privacy and Cookies destinations. */
  legal: readonly LibraryFooterAction[];
}

/**
 * Adapts the existing Main Library destinations — the same ones header Search
 * and the global strip use — into the platform footer. Immersive routes never
 * carry the footer, matching the global navigation's exclusions.
 */
export function MainLibraryFooter({ adapter, location, onNavigate, onOpenHelp, social, legal }: MainLibraryFooterProps) {
  if (libraryNavigationMode(location.screen) === 'immersive') return null;
  const go = (target: LibraryLocation) => () => onNavigate(target);
  const groups: LibraryFooterGroup[] = [
    { id: 'explore', label: 'Explore', items: [
      { id: 'immortal-hub', label: 'Immortal Hub', onSelect: go({ screen: 'home', collection: 'featured' }) },
      { id: 'my-library', label: 'My Library', onSelect: go({ screen: 'home', collection: 'my-library' }) },
      { id: 'fate-survival', label: 'Fate Survival Challenges', onSelect: go({ screen: 'home', collection: 'challenges' }) },
      { id: 'sects', label: 'Sects', onSelect: go({ screen: 'sects' }) },
      { id: 'tiers', label: 'Tiers', onSelect: go({ screen: 'pricing' }) },
    ] },
    { id: 'seihouse', label: 'SEIHouse', items: [
      { id: 'story-seed', label: 'Story Seed', onSelect: go({ screen: 'creator' }) },
      { id: 'cultivator-cave', label: 'Cultivator Cave', onSelect: go({ screen: 'profile', cave: '/home' }) },
      // The existing Cave Stories screen already owns the account's stored seeds.
      { id: 'seed-bank', label: 'Seed Bank', onSelect: go({ screen: 'profile', cave: '/stories' }) },
      { id: 'relics', label: 'Relics', onSelect: go({ screen: 'profile', cave: '/relics' }) },
    ] },
    { id: 'support', label: 'Support', items: [
      { id: 'help', label: 'Library Help', onSelect: onOpenHelp },
      { id: 'shortcuts', label: 'Shortcut Spells', onSelect: () => adapter.setIsShortcutsOpen(true) },
      { id: 'settings', label: 'Settings', onSelect: go({ screen: 'profile', cave: '/settings' }) },
    ] },
  ];
  // The Interface Language belongs to the account; its confirmation and revert
  // safeguard live in the Cave's Language setting, so the footer opens that
  // control instead of adding a second save path.
  const language = adapter.userProfile ? {
    code: normalizeSenLanguageCode(adapter.userProfile.interfaceLanguage),
    onOpenSettings: go({ screen: 'profile', cave: '/settings' }),
  } : undefined;
  return <LibraryFooter groups={groups} social={social} legal={legal} language={language}
    emblem={{ src: '/library-shell/celestial-library.jpg', alt: 'Celestial Library Logo' }} />;
}
