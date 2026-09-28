import { useCallback, useState, type ReactNode } from 'react';
import { LIBRARY_SIDEBAR_MODES, LibraryDesktopNavigationProvider, type LibraryDesktopNavigation, type LibrarySidebarMode } from '@seihouse/library/shell';

const STORAGE_KEY = 'seihouse.library.sidebarMode';
const read = (): LibrarySidebarMode => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return LIBRARY_SIDEBAR_MODES.includes(stored as LibrarySidebarMode) ? stored as LibrarySidebarMode : 'automatic';
  } catch {
    return 'automatic';
  }
};

/** The Workshop host remembers the Pathways sidebar choice on this device. */
export function StoredLibraryDesktopNavigation({ value, children }: { value: LibraryDesktopNavigation; children: ReactNode }) {
  const [sidebarMode, setSidebarMode] = useState(read);
  const change = useCallback((mode: LibrarySidebarMode) => {
    setSidebarMode(mode);
    try { window.localStorage.setItem(STORAGE_KEY, mode); } catch { /* The choice still holds for this visit. */ }
  }, []);
  return <LibraryDesktopNavigationProvider value={value} sidebarMode={sidebarMode} onSidebarModeChange={change}>{children}</LibraryDesktopNavigationProvider>;
}
