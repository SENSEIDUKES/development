import type { ReactNode } from 'react';
import type { LibraryNavigationDrawerProfile } from '@seihouse/library-ui';
import { LibraryNavigation, useLibraryDesktopNavigation } from './LibraryNavigation';
import { activeLibraryDestination, libraryLocationKey, librarySectionItems, type LibraryLocation, type LibrarySectionActions } from './libraryRoutes';

/** Existing LibraryScreen tabs and host screens, with optional existing section actions. */
export function MainLibraryNavigation({ location, onNavigate, sectionActions, profile, children }: {
  location: LibraryLocation;
  onNavigate: (location: LibraryLocation) => void;
  sectionActions?: LibrarySectionActions;
  /** The reader at the top of the laptop Pathways sidebar. */
  profile?: LibraryNavigationDrawerProfile;
  children: ReactNode;
}) {
  const destination = activeLibraryDestination(location) ?? 'home';
  // The Pathways sidebar nests only real sub-pages (the Cave's). Home, Create
  // and Discover sections are already on the page, in the header menu and in
  // the footer, so repeating them would crowd the four pathways off a laptop.
  const pathwaysSidebar = useLibraryDesktopNavigation() === 'sidebar';
  const navigate = (target: LibraryLocation) => { if (libraryLocationKey(location) !== libraryLocationKey(target)) onNavigate(target); };
  const actions: LibrarySectionActions = {
    'immortal-hub': () => navigate({ screen: 'home', collection: 'featured' }),
    'creator-space': () => navigate({ screen: 'creator-space' }),
    'story-seed': () => navigate({ screen: 'creator' }),
    sects: () => navigate({ screen: 'sects' }),
    tiers: () => navigate({ screen: 'pricing' }),
    // The existing Cave Stories screen already owns the account's stored seeds.
    'seed-bank': () => navigate({ screen: 'profile', cave: '/stories' }),
    'my-library': () => navigate({ screen: 'home', collection: 'my-library' }),
    'fate-survival': () => navigate({ screen: 'home', collection: 'challenges' }),
    'cultivator-cave': () => navigate({ screen: 'profile', cave: '/home' }),
    ...sectionActions,
  };
  const activeId = location.screen === 'detail' || location.screen === 'challenge' ? undefined
    : location.screen === 'sects' ? 'sects' : location.screen === 'pricing' ? 'tiers'
    // Seed Bank is the Cave's Stories screen, a sibling of the Cave home.
    : location.screen === 'profile' && location.cave?.startsWith('/stories') ? 'seed-bank'
    : location.screen === 'home' && location.collection === 'my-library' ? 'my-library'
    : destination === 'home' ? 'immortal-hub' : destination === 'create' ? 'creator-space'
    : destination === 'discover' ? 'fate-survival' : 'cultivator-cave';
  return <LibraryNavigation location={location} onNavigate={onNavigate} profile={profile} sectionMenu={pathwaysSidebar ? undefined : {
    label: `${destination === 'home' ? 'Home' : destination === 'create' ? 'Create' : destination === 'discover' ? 'Discover' : 'Profile'} sections`,
    sections: [{ id: destination, items: librarySectionItems(destination, actions).map(item => ({ ...item, active: item.id === activeId })) }],
  }}>{children}</LibraryNavigation>;
}
