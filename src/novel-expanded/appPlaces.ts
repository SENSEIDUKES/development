import type { LibraryDestination, LibraryLocation } from '@seihouse/library/shell';
import { HOME_ROUTE, type NovelExpandedRoute } from './routes';

/**
 * The places the app has built, for every Library navigation in it (the
 * Cave's included): Home, Create, Discover and Profile, with Settings beside
 * Profile.
 */
export const APP_DESTINATIONS: readonly LibraryDestination[] = ['home', 'create', 'discover', 'profile'];

/** Where each of the app's pages sits in the Library's navigation: a story's own page belongs to Home. */
export function appLibraryLocation(route: NovelExpandedRoute): LibraryLocation {
  switch (route.page) {
    case 'home': return { screen: 'home', collection: 'featured' };
    // The Library's own Discover location, so re-selecting Discover on Discover is no move.
    case 'discover': return { screen: 'home', collection: 'challenges' };
    // The Creator Space is the Library's Create destination; Story Seed is its own workspace.
    case 'create': return route.seedId || route.newSeed ? { screen: 'creator' } : { screen: 'creator-space' };
    case 'story':
    case 'blueprint':
    case 'chapter': return { screen: 'detail' };
    case 'read': return { screen: 'reader' };
    case 'profile': return { screen: 'profile', cave: route.cave };
  }
}

/** The app's page for a Library destination, or none for a place the app has not built. */
export function appRouteFor(location: LibraryLocation): NovelExpandedRoute | undefined {
  // The Library's Discover destination still names Fate Survival's old collection.
  if (location.screen === 'home' && location.collection === 'challenges') return { page: 'discover' };
  if (location.screen === 'home') return HOME_ROUTE;
  if (location.screen === 'creator-space' || location.screen === 'creator') return { page: 'create' };
  if (location.screen === 'profile') return location.cave ? { page: 'profile', cave: location.cave } : { page: 'profile' };
  return undefined;
}
