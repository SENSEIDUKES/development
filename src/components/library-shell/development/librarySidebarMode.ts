import { useCallback, useState, useSyncExternalStore } from 'react';
import type { SEISidebarMode } from '@seihouse/ui';
import type { ReaderPreferenceStorage } from '@seihouse/sen/reader-runtime';

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

/** The preference's key in a host's device preferences (`ReaderPreferenceStorage`). */
export const LIBRARY_SIDEBAR_MODE_KEY = 'library-sidebar-mode';

/** The reader's saved choice: open (`pinned`) when there is none or it cannot be read. */
export function readLibrarySidebarMode(storage?: ReaderPreferenceStorage): LibrarySidebarMode {
  try {
    const saved = storage?.read(LIBRARY_SIDEBAR_MODE_KEY);
    return LIBRARY_SIDEBAR_MODES.includes(saved as LibrarySidebarMode) ? saved as LibrarySidebarMode : 'pinned';
  } catch {
    return 'pinned';
  }
}

/**
 * The Pathways sidebar choice kept in the host's device preferences, for
 * `LibraryDesktopNavigationProvider`'s `sidebarMode` and `onSidebarModeChange`:
 * a sidebar the reader minimized stays minimized on their next visit.
 */
export function useStoredLibrarySidebarMode(storage?: ReaderPreferenceStorage): [LibrarySidebarMode, (mode: LibrarySidebarMode) => void] {
  const [mode, setMode] = useState(() => readLibrarySidebarMode(storage));
  const change = useCallback((next: LibrarySidebarMode) => {
    setMode(next);
    try {
      storage?.write(LIBRARY_SIDEBAR_MODE_KEY, next);
    } catch {
      // The choice still holds for this visit.
    }
  }, [storage]);
  return [mode, change];
}
