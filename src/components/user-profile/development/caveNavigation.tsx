import { useCallback, useSyncExternalStore } from 'react';
import type { SENNavigationIconName } from '../../library-shell/development/SENNavigationIcon';
import { SENExitIcon, SENSettingsIcon } from '../../library-shell/development/SENGlobalIcon';

/** Cave-owned routes. Query transport coexists with Workshop and host URLs. */
export const CAVE_DESTINATIONS = [
  { id: 'home', label: 'Home', icon: 'home' satisfies SENNavigationIconName },
  { id: 'stories', label: 'Stories', icon: 'scroll' satisfies SENNavigationIconName },
  { id: 'relics', label: 'Relics', icon: 'relic' satisfies SENNavigationIconName },
  { id: 'settings', label: 'Settings', icon: SENSettingsIcon },
] as const;
export type CaveDestination = typeof CAVE_DESTINATIONS[number]['id'];

/**
 * The public view is the same Cave with a narrower door. It keeps Home,
 * Stories and Relics, and replaces Settings — a private surface — with Exit.
 * Exit is an action rather than a destination, so it carries no route of its
 * own; the workspace decides where leaving lands.
 */
export const CAVE_PUBLIC_DESTINATIONS = [
  { id: 'home', label: 'Home', icon: 'home' satisfies SENNavigationIconName },
  { id: 'stories', label: 'Stories', icon: 'scroll' satisfies SENNavigationIconName },
  { id: 'relics', label: 'Relics', icon: 'relic' satisfies SENNavigationIconName },
] as const;
export type CavePublicDestination = typeof CAVE_PUBLIC_DESTINATIONS[number]['id'];
export const CAVE_EXIT_ICON = SENExitIcon;

/** Who the current path is rendered for. */
export type CaveAudience = 'private' | 'public';

/** The path prefix that switches the Cave into the public view. */
export const CAVE_PUBLIC_PREFIX = '/public';

/** The route for one public destination. */
export type CreatorDestination = CavePublicDestination | 'worlds' | 'storefront';
export const publicCavePath = (destination: CreatorDestination = 'home', creatorId?: string) =>
  creatorId ? `${CAVE_PUBLIC_PREFIX}/creators/${encodeURIComponent(creatorId)}/${destination}`
    : `${CAVE_PUBLIC_PREFIX}/${destination}`;

/** Real link URLs use the same query transport as the existing Cave router. */
export function caveHref(path: string) {
  const url = new URL(window.location.href);
  url.searchParams.set('cave', path);
  return `${url.pathname}${url.search}${url.hash}`;
}

const navigationEvent = 'cave-navigation';
const subscribe = (notify: () => void) => {
  window.addEventListener('popstate', notify);
  window.addEventListener(navigationEvent, notify);
  return () => {
    window.removeEventListener('popstate', notify);
    window.removeEventListener(navigationEvent, notify);
  };
};
const snapshot = () => new URLSearchParams(window.location.search).get('cave') || '/home';

export function resolveCaveRoute(path: string) {
  const segments = path.split('/').filter(Boolean);
  const audience: CaveAudience = segments[0] === 'public' ? 'public' : 'private';
  const scoped = audience === 'public' && segments[1] === 'creators';
  let creatorId: string | undefined;
  try { creatorId = scoped ? decodeURIComponent(segments[2] ?? '') : undefined; } catch { /* Invalid identity stays unavailable. */ }
  const routed = audience === 'public' ? segments.slice(scoped ? 3 : 1) : segments;
  const destination = (audience === 'public' ? CAVE_PUBLIC_DESTINATIONS : CAVE_DESTINATIONS)
    .find(item => item.id === routed[0])?.id;
  const child = routed.slice(1).join('/');
  // The public view exposes no child pages: every private child route reads
  // private state, so it stays unavailable rather than falling through.
  const creatorView = scoped && creatorId && routed.length === 1 && (routed[0] === 'worlds' || routed[0] === 'storefront') ? routed[0] : undefined;
  const view = scoped && !creatorId ? 'unavailable' : creatorView ?? (!destination ? 'unavailable'
    : audience === 'public' ? (child ? 'unavailable' : destination)
    : !child ? destination
    : destination === 'home' && (child === 'dao-pillar' || child === 'status-effects' || child === 'inbox' || child === 'store') ? child
    : destination === 'settings' && (child === 'switchboard' || child === 'redeem-code') ? child
    : 'unavailable');
  return { path, audience, destination, child, view, creatorId };
}

export function useCaveRoute() {
  const path = useSyncExternalStore(subscribe, snapshot, () => '/home');
  const navigate = useCallback((next: string, replace = false) => {
    if (snapshot() === next) return;
    const url = new URL(window.location.href);
    url.searchParams.set('cave', next);
    window.history[replace ? 'replaceState' : 'pushState'](window.history.state, '', url);
    window.dispatchEvent(new Event(navigationEvent));
  }, []);
  return { ...resolveCaveRoute(path), navigate };
}
