import { useCallback, useEffect, useState } from 'react';
import type { CreatorToolkitFilter } from '@seihouse/library/creator-space';
import type { DiscoverMedium } from '@seihouse/library/discover';

const TOOLKIT_FILTERS: ReadonlySet<string> = new Set<CreatorToolkitFilter>(['all', 'style', 'soundscape', 'cue', 'atmosphere']);
const isToolkitFilter = (value: string | null): value is CreatorToolkitFilter => Boolean(value && TOOLKIT_FILTERS.has(value));

/**
 * The app's pages: the four of its spine, in the order a reader meets them,
 * and the reader's Profile. Each is a query on the app's own address, so the
 * deployment needs no rewrites and every page survives a reload.
 *
 * - Home: `/app/`
 * - Discover: `/app/?page=discover`
 * - Create: `/app/?page=create` is the Creator Space, the reader's worlds and
 *   the way to start a new one; `&plugins=all|<kind>` opens Creator Plugins;
 *   `&seed=new` opens Story Seed (and its World Blueprint) for a new story,
 *   `&seed=<id>` a saved Story Seed (a Sparks spark begun from Home)
 * - A world as its author sees it (Blueprint, Chapters, Codex, Assets), opened
 *   from Your worlds in Create: `/app/?page=create&world=<id>`, with
 *   `&chapter=<n>` for a chapter opened from its Chapters
 * - Story View (World Info): `/app/?story=<id>`
 * - Reader: `/app/?story=<id>&read=1`
 * - A story's Blueprint: `/app/?story=<id>&blueprint=1`
 * - Profile (the Cultivator Cave): `/app/?page=profile`, with the Cave's own
 *   page in `cave` (Settings: `&cave=/settings`). The Cave moves between its
 *   pages itself, through that one parameter.
 */
export type NovelExpandedRoute =
  | { page: 'home' }
  | { page: 'discover'; section?: 'creators' | 'codex'; medium?: DiscoverMedium; lore?: string; query?: string; category?: string }
  | { page: 'create'; seedId?: string; newSeed?: boolean; plugins?: CreatorToolkitFilter; pluginPack?: string }
  /** A world as its author sees it in Create: its Blueprint, Chapters, Codex and Assets; a chapter opened from Chapters. */
  | { page: 'world'; storyId: string; chapterNumber?: number }
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
  if (query.get('page') === 'discover') {
    const lore = query.get('lore')?.trim();
    const section = query.get('section');
    const medium = query.get('medium');
    const base: Extract<NovelExpandedRoute, { page: 'discover' }> = { page: 'discover', ...((medium === 'novel' || medium === 'manga' || medium === 'game' || medium === 'video') ? { medium } : {}) };
    return lore ? { ...base, lore, ...(query.get('q') ? { query: query.get('q')! } : {}), ...(query.get('category') ? { category: query.get('category')! } : {}) }
      : section === 'creators' || section === 'codex' ? { ...base, section } : base;
  }
  if (query.get('page') === 'create') {
    const worldId = query.get('world')?.trim();
    if (worldId) {
      const chapterNumber = Number(query.get('chapter'));
      return Number.isInteger(chapterNumber) && chapterNumber > 0 ? { page: 'world', storyId: worldId, chapterNumber } : { page: 'world', storyId: worldId };
    }
    const seedId = query.get('seed')?.trim();
    if (seedId === 'new') return { page: 'create', newSeed: true };
    if (seedId) return { page: 'create', seedId };
    const plugins = query.get('plugins')?.trim() ?? null;
    if (isToolkitFilter(plugins)) {
      const pluginPack = query.get('pack')?.trim();
      return pluginPack ? { page: 'create', plugins, pluginPack } : { page: 'create', plugins };
    }
    return { page: 'create' };
  }
  if (query.get('page') === 'profile') {
    const cave = query.get('cave')?.trim();
    return cave ? { page: 'profile', cave } : { page: 'profile' };
  }
  return HOME_ROUTE;
}

export function routeSearch(route: NovelExpandedRoute): string {
  switch (route.page) {
    case 'home': return '';
    case 'discover': return `?${new URLSearchParams({ page: 'discover', ...(route.lore ? { lore: route.lore, ...(route.query ? { q: route.query } : {}), ...(route.category ? { category: route.category } : {}) } : route.section ? { section: route.section } : {}), ...(route.medium ? { medium: route.medium } : {}) })}`;
    case 'create': return route.seedId ? `?${new URLSearchParams({ page: 'create', seed: route.seedId })}`
      : route.newSeed ? '?page=create&seed=new'
      : route.plugins ? `?${new URLSearchParams({ page: 'create', plugins: route.plugins, ...(route.pluginPack ? { pack: route.pluginPack } : {}) })}`
      : '?page=create';
    case 'world': return `?${new URLSearchParams({ page: 'create', world: route.storyId, ...(route.chapterNumber ? { chapter: String(route.chapterNumber) } : {}) })}`;
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

export type Navigate = (route: NovelExpandedRoute, options?: { replace?: boolean; scroll?: boolean }) => void;

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
  const navigate = useCallback<Navigate>((next, { replace = false, scroll = true } = {}) => {
    const url = routeHref(next);
    if (replace) window.history.replaceState(null, '', url);
    else window.history.pushState(null, '', url);
    setRoute(next);
    // A new page starts at its top.
    if (scroll) window.scrollTo({ top: 0 });
  }, []);
  return [route, navigate];
}
