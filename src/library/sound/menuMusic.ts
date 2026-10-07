import { useCallback, useSyncExternalStore } from 'react';
import type { ReaderPreferenceStorage } from '@seihouse/sen/reader-runtime';

/** The device preference's key in the host's `ReaderPreferenceStorage`. */
export const MENU_MUSIC_KEY = 'menu-music';

/** Whether the reader wants music on the menus (Home, Create, World Info). On unless they turned it off. */
export function readMenuMusic(storage?: ReaderPreferenceStorage): boolean {
  try {
    return storage?.read(MENU_MUSIC_KEY) !== 'off';
  } catch {
    return true;
  }
}

const listeners = new Set<() => void>();

/** Saves the choice on the device and tells every part of the page that shows it. */
export function writeMenuMusic(storage: ReaderPreferenceStorage | undefined, on: boolean): void {
  try {
    storage?.write(MENU_MUSIC_KEY, on ? 'on' : 'off');
  } catch {
    // The choice lasts for this visit only where the page keeps it.
  }
  listeners.forEach(listener => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

/**
 * The reader's Menu music setting, kept on the device: Profile Settings'
 * switch and the header's music note read the same value and change together.
 */
export function useMenuMusic(storage?: ReaderPreferenceStorage): [boolean, (on: boolean) => void] {
  const enabled = useSyncExternalStore(subscribe, () => readMenuMusic(storage), () => true);
  const setEnabled = useCallback((on: boolean) => writeMenuMusic(storage, on), [storage]);
  return [enabled, setEnabled];
}
