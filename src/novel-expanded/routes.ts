import { useCallback, useEffect, useState } from 'react';

/**
 * The app's four pages, in the order a reader meets them. Each is a query on
 * the app's own address, so the deployment needs no rewrites and every page
 * survives a reload.
 *
 * - Home: `/app/`
 * - Create (Story Seed and World Blueprint): `/app/?page=create`
 * - Story View (World Info): `/app/?story=<id>`
 * - Reader: `/app/?story=<id>&read=1`
 */
export type NovelExpandedRoute =
  | { page: 'home' }
  | { page: 'create' }
  | { page: 'story'; storyId: string }
  | { page: 'read'; storyId: string };

export const HOME_ROUTE: NovelExpandedRoute = { page: 'home' };

export function parseRoute(search: string): NovelExpandedRoute {
  const query = new URLSearchParams(search);
  const storyId = query.get('story')?.trim();
  if (storyId) return query.get('read') === '1' ? { page: 'read', storyId } : { page: 'story', storyId };
  if (query.get('page') === 'create') return { page: 'create' };
  return HOME_ROUTE;
}

export function routeSearch(route: NovelExpandedRoute): string {
  switch (route.page) {
    case 'home': return '';
    case 'create': return '?page=create';
    case 'story': return `?story=${encodeURIComponent(route.storyId)}`;
    case 'read': return `?story=${encodeURIComponent(route.storyId)}&read=1`;
  }
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
    const url = `${window.location.pathname}${routeSearch(next)}`;
    if (replace) window.history.replaceState(null, '', url);
    else window.history.pushState(null, '', url);
    setRoute(next);
    // A new page starts at its top.
    window.scrollTo({ top: 0 });
  }, []);
  return [route, navigate];
}
