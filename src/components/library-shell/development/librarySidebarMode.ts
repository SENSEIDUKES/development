import { useSyncExternalStore } from 'react';
import type { SEISidebarMode } from '@seihouse/ui';

/**
 * The reader's Pathways sidebar preference.
 * - `automatic` (default): rests as the icon rail and opens while the pointer
 *   is at the sidebar or keyboard focus is inside it.
 * - `pinned`: always open. The star beside the profile pins and unpins.
 * - `compact`: always the icon rail.
 * Every Library page shares one preference, so pinning on Home keeps the Cave
 * pinned. The host remembers it (per device or in account settings) through
 * `LibraryDesktopNavigationProvider`; without one it lasts for the visit.
 */
export type LibrarySidebarMode = SEISidebarMode;
export const LIBRARY_SIDEBAR_MODES: readonly LibrarySidebarMode[] = ['automatic', 'pinned', 'compact'];
const listeners = new Set<() => void>();
let current: LibrarySidebarMode = 'automatic';

const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const snapshot = () => current;
export function setLibrarySidebarMode(mode: LibrarySidebarMode) {
  current = mode;
  listeners.forEach(listener => listener());
}
/** The visit-long preference used when the host supplies none. */
export function useLibrarySidebarMode(): [LibrarySidebarMode, (mode: LibrarySidebarMode) => void] {
  return [useSyncExternalStore(subscribe, snapshot, snapshot), setLibrarySidebarMode];
}
