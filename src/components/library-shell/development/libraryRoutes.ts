/** Host route values stay compatible with LibraryScreen and the Cave router. */
export interface LibraryLocation {
  screen: string;
  collection?: 'featured' | 'my-library' | 'challenges';
  cave?: string;
}
export type LibraryDestination = 'home' | 'create' | 'discover' | 'profile';
export type LibraryNavigationMode = 'standard' | 'workspace' | 'immersive';

export function libraryLocationKey(location: LibraryLocation): string {
  // Irrelevant tab state must not turn a Profile or Sect selection into a new route.
  return JSON.stringify([location.screen, location.screen === 'home' ? location.collection ?? 'featured' : null,
    location.screen === 'profile' ? location.cave ?? '/home' : null]);
}

export const LIBRARY_DESTINATIONS = [
  { id: 'home', label: 'Home', location: { screen: 'home', collection: 'featured' } },
  // Create is its own page. My Library stays a Home collection, reached from Search and the footer.
  { id: 'create', label: 'Create', location: { screen: 'creator-space' } },
  // Fate Survival is the existing discovery destination. Do not invent a Discover page.
  { id: 'discover', label: 'Discover', location: { screen: 'home', collection: 'challenges' } },
  { id: 'profile', label: 'Profile', location: { screen: 'profile', cave: '/home' } },
] as const;

export function libraryNavigationMode(screen: string): LibraryNavigationMode {
  if (screen === 'reader' || screen === 'codex') return 'immersive';
  if (screen === 'creator' || screen === 'story-seed') return 'workspace';
  return 'standard';
}

export function activeLibraryDestination(location: LibraryLocation): LibraryDestination | undefined {
  if (libraryNavigationMode(location.screen) !== 'standard') return undefined;
  if (location.screen === 'profile') return 'profile';
  if (location.screen === 'creator-space') return 'create';
  // A novel's detail opens from Home's worlds, so Home stays selected.
  if (location.screen === 'detail') return 'home';
  if (location.screen === 'challenge') return 'discover';
  if (location.screen === 'sects' || location.screen === 'pricing') return 'home';
  if (location.screen !== 'home') return undefined;
  return location.collection === 'challenges' ? 'discover' : 'home';
}

/** Navigation outline only. Unfinished destinations appear only when a host supplies an action. */
export const LIBRARY_SECTION_OUTLINE = {
  home: [
    { id: 'immortal-hub', label: 'Immortal Hub' },
    { id: 'sects', label: 'Sects' },
    { id: 'tiers', label: 'Tiers' },
    { id: 'announcements', label: 'System Announcements' },
    { id: 'community', label: 'Community' },
    { id: 'my-library', label: 'My Library' },
    { id: 'recently-read', label: 'Recently Read' },
    { id: 'bookmarks', label: 'Bookmarks' },
  ],
  create: [
    { id: 'creator-space', label: 'Creator Space' },
    { id: 'story-seed', label: 'Story Seed' },
    { id: 'seed-bank', label: 'Seed Bank' },
  ],
  discover: [
    { id: 'recommended', label: 'Recommended Novels' },
    { id: 'featured-novels', label: 'Featured Novels' },
    { id: 'fate-survival', label: 'Fate Survival Challenges' },
    { id: 'novel-search', label: 'Novel discovery/search' },
  ],
  // Seed Bank is the Cave's Stories screen, so Profile lists it beside the Cave.
  profile: [{ id: 'cultivator-cave', label: 'Cultivator Cave' }, { id: 'seed-bank', label: 'Seed Bank' }],
} as const;
export type LibrarySectionId = typeof LIBRARY_SECTION_OUTLINE[LibraryDestination][number]['id'];
export type LibrarySectionActions = Partial<Record<LibrarySectionId, () => void>>;

export function librarySectionItems(destination: LibraryDestination, actions: LibrarySectionActions) {
  return LIBRARY_SECTION_OUTLINE[destination].flatMap(item => {
    const onSelect = actions[item.id];
    return onSelect ? [{ ...item, onSelect }] : [];
  });
}
