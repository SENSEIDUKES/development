import { useCallback, useSyncExternalStore } from 'react';
import { BookOpen, Gem, House, Settings } from 'lucide-react';

/** Cave-owned routes. Query transport coexists with Workshop and host URLs. */
export const CAVE_DESTINATIONS = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'stories', label: 'Stories', icon: BookOpen },
  { id: 'relics', label: 'Relics', icon: Gem },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const;
export type CaveDestination = typeof CAVE_DESTINATIONS[number]['id'];
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
  const destination = CAVE_DESTINATIONS.find(item => item.id === segments[0])?.id;
  const child = segments.slice(1).join('/');
  const view = !destination ? 'unavailable'
    : !child ? destination
    : destination === 'home' && (child === 'dao-pillar' || child === 'status-effects') ? child
    : destination === 'settings' && child === 'switchboard' ? child
    : 'unavailable';
  return { path, destination, child, view };
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
