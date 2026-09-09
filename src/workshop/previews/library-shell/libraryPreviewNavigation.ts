import type { LibraryLocation } from '../../../components/library-shell/development/libraryRoutes';

/** Workshop route transport only. Production supplies its existing router callback. */
export function libraryPreviewUrl(location: LibraryLocation) {
  const current = new URL(window.location.href);
  const url = new URL('/library-shell.html', current);
  for (const key of ['safeArea', 'motion']) {
    const value = current.searchParams.get(key);
    if (value) url.searchParams.set(key, value);
  }
  url.searchParams.set('variant', 'development');
  url.searchParams.set('source', location.screen === 'profile' ? 'cultivator-cave' : location.screen === 'creator' ? 'story-seed' : 'main-library');
  url.searchParams.set('state', location.screen === 'profile' ? 'developed-cultivator' : location.screen === 'creator' ? 'filled-intake' : 'linked');
  url.searchParams.set('screen', location.screen);
  if (location.collection) url.searchParams.set('collection', location.collection);
  if (location.cave) url.searchParams.set('cave', location.cave);
  return url;
}
export function navigateLibraryPreview(location: LibraryLocation) {
  window.location.assign(libraryPreviewUrl(location).href);
}
