import { useCallback, useEffect, useState } from 'react';

/**
 * The app's pages: the four of its spine, in the order a reader meets them,
 * and the reader's Profile. Each is a query on the app's own address, so the
 * deployment needs no rewrites and every page survives a reload.
 *
 * - Home: `/app/`
 * - Create (Story Seed and World Blueprint): `/app/?page=create`
 * - Story View (World Info): `/app/?story=<id>`
 * - Reader: `/app/?story=<id>&read=1`
 * - A story's Blueprint: `/app/?story=<id>&blueprint=1`
 * - Profile (the Cultivator Cave): `/app/?page=profile`, with the Cave's own
 *   page in `cave` (Settings: `&cave=/settings`). The Cave moves between its
 *   pages itself, through that one parameter.
 */
export type NovelExpandedRoute =
  | { page: 'home' }
  | { page: 'create' }
  | { page: 'story'; storyId: string }
  | { page: 'read'; storyId: string }
  | { page: 'blueprint'; storyId: string }
  | { page: 'profile'; cave?: string };

export const HOME_ROUTE: NovelExpandedRoute = { page: 'home' };

export function parseRoute(search: string): NovelExpandedRoute {
  const query = new URLSearchParams(search);
  const storyId = query.get('story')?.trim();
  if (storyId) return query.get('read') === '1' ? { page: 'read', storyId }
    : query.get('blueprint') === '1' ? { page: 'blueprint', storyId } : { page: 'story', storyId };
  if (query.get('page') === 'create') return { page: 'create' };
  if (query.get('page') === 'profile') {
    const cave = query.get('cave')?.trim();
    return cave ? { page: 'profile', cave } : { page: 'profile' };
  }
  return HOME_ROUTE;
}

export function routeSearch(route: NovelExpandedRoute): string {
  switch (route.page) {
    case 'home': return '';
    case 'create': return '?page=create';
    case 'story': return `?story=${encodeURIComponent(route.storyId)}`;
    case 'read': return `?story=${encodeURIComponent(route.storyId)}&read=1`;
    case 'blueprint': return `?story=${encodeURIComponent(route.storyId)}&blueprint=1`;
    case 'profile': return `?${new URLSearchParams(route.cave ? { page: 'profile', cave: route.cave } : { page: 'profile' })}`;
  }
}

/** The page's address on this deployment, for real links (`/app/` and its queries). */
export function routeHref(route: NovelExpandedRoute): string {
  return `${window.location.pathname}${routeSearch(route)}`;
}

export type Navigate = (route: NovelExpandedRoute, options?: { replace?: boolean }) => void;

/**
 * The page in the address bar. Moving inside the app adds a history entry, so
 * the browser's Back and Forward walk the same pages; `replace` swaps the
 * current entry instead (a started story replaces Create, so Back goes Home).
 */
export function useAppRoute(): [NovelExpandedRoute, Navigate] {
  const [route, setRoute] = useState(() => parseRoute(window.location.search));
  useEffect(() => {
    const follow = () => setRoute(parseRoute(window.location.search));
    window.addEventListener('popstate', follow);
    return () => window.removeEventListener('popstate', follow);
  }, []);
  const navigate = useCallback<Navigate>((next, { replace = false } = {}) => {
    const url = routeHref(next);
    if (replace) window.history.replaceState(null, '', url);
    else window.history.pushState(null, '', url);
    setRoute(next);
    // A new page starts at its top.
    window.scrollTo({ top: 0 });
  }, []);
  return [route, navigate];
}
