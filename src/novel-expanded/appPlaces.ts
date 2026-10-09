import type { LibraryDestination, LibraryLocation } from '@seihouse/library/shell';
import { HOME_ROUTE, type NovelExpandedRoute } from './routes';

/**
 * The places the app has built, for every Library navigation in it (the
 * Cave's included): Home, Create and Profile, with Settings beside Profile.
 * Discover joins when its page comes to the app; until then it is left out,
 * not shown dead.
 */
export const APP_DESTINATIONS: readonly LibraryDestination[] = ['home', 'create', 'profile'];

/** Where each of the app's pages sits in the Library's navigation: a story's own page belongs to Home. */
export function appLibraryLocation(route: NovelExpandedRoute): LibraryLocation {
  switch (route.page) {
    case 'home': return { screen: 'home', collection: 'featured' };
    case 'create': return { screen: 'creator' };
    case 'story':
    case 'blueprint': return { screen: 'detail' };
    case 'read': return { screen: 'reader' };
    case 'profile': return { screen: 'profile', cave: route.cave };
  }
}

/** The app's page for a Library destination, or none for a place the app has not built. */
export function appRouteFor(location: LibraryLocation): NovelExpandedRoute | undefined {
  if (location.screen === 'home' && location.collection !== 'challenges') return HOME_ROUTE;
  if (location.screen === 'creator-space' || location.screen === 'creator') return { page: 'create' };
  if (location.screen === 'profile') return location.cave ? { page: 'profile', cave: location.cave } : { page: 'profile' };
  return undefined;
}
