import { useCallback, useSyncExternalStore } from 'react';
import { BookOpen, Gem, House, LogOut, Settings } from 'lucide-react';

/** Cave-owned routes. Query transport coexists with Workshop and host URLs. */
export const CAVE_DESTINATIONS = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'stories', label: 'Stories', icon: BookOpen },
  { id: 'relics', label: 'Relics', icon: Gem },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const;
export type CaveDestination = typeof CAVE_DESTINATIONS[number]['id'];

/**
 * The public view is the same Cave with a narrower door. It keeps Home,
 * Stories and Relics, and replaces Settings — a private surface — with Exit.
 * Exit is an action rather than a destination, so it carries no route of its
 * own; the workspace decides where leaving lands.
 */
export const CAVE_PUBLIC_DESTINATIONS = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'stories', label: 'Stories', icon: BookOpen },
  { id: 'relics', label: 'Relics', icon: Gem },
] as const;
export type CavePublicDestination = typeof CAVE_PUBLIC_DESTINATIONS[number]['id'];
export const CAVE_EXIT_ICON = LogOut;

/** Who the current path is rendered for. */
export type CaveAudience = 'private' | 'public';

/** The path prefix that switches the Cave into the public view. */
export const CAVE_PUBLIC_PREFIX = '/public';

/** The route for one public destination. */
export const publicCavePath = (destination: CavePublicDestination = 'home') =>
  `${CAVE_PUBLIC_PREFIX}/${destination}`;

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
  const routed = audience === 'public' ? segments.slice(1) : segments;
  const destination = (audience === 'public' ? CAVE_PUBLIC_DESTINATIONS : CAVE_DESTINATIONS)
    .find(item => item.id === routed[0])?.id;
  const child = routed.slice(1).join('/');
  // The public view exposes no child pages: every private child route reads
  // private state, so it stays unavailable rather than falling through.
  const view = !destination ? 'unavailable'
    : audience === 'public' ? (child ? 'unavailable' : destination)
    : !child ? destination
    : destination === 'home' && (child === 'dao-pillar' || child === 'status-effects' || child === 'inbox' || child === 'store') ? child
    : destination === 'settings' && (child === 'switchboard' || child === 'redeem-code') ? child
    : 'unavailable';
  return { path, audience, destination, child, view };
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
