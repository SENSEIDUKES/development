import { useSyncExternalStore } from 'react';
import type { SEISidebarMode } from '@seihouse/ui';

/**
 * The reader's Pathways sidebar preference. The Library's sidebar is
 * deliberate: it never opens on hover or focus.
 * - `pinned` (default): open, labels showing.
 * - `compact`: the icon rail. Double tap/click anywhere in the rail switches
 *   between the two; a keyboard-focus-only control offers the same action.
 * Every Library page shares one preference, so minimizing on Home keeps the
 * Cave minimized. The host remembers it (per device or in account settings) through
 * `LibraryDesktopNavigationProvider`; without one it lasts for the visit.
 */
export type LibrarySidebarMode = SEISidebarMode;
export const LIBRARY_SIDEBAR_MODES: readonly LibrarySidebarMode[] = ['pinned', 'compact'];
const listeners = new Set<() => void>();
let current: LibrarySidebarMode = 'pinned';

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
