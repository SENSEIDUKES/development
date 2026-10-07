// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it } from 'vitest';
import type { ReaderPreferenceStorage } from '@seihouse/sen/reader-runtime';
import { LIBRARY_SIDEBAR_MODE_KEY, readLibrarySidebarMode, useStoredLibrarySidebarMode, type LibrarySidebarMode } from '@seihouse/library/shell';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const memory = () => {
  const values = new Map<string, string>();
  const storage: ReaderPreferenceStorage = {
    read: key => values.get(key) ?? null,
    write: (key, value) => { values.set(key, value); },
    remove: key => { values.delete(key); },
  };
  return { values, storage };
};
const refusing: ReaderPreferenceStorage = {
  read: () => { throw new Error('Storage is blocked'); },
  write: () => { throw new Error('Storage is blocked'); },
  remove: () => undefined,
};

it('reads the saved choice, and an open sidebar when there is none or it cannot be read', () => {
  const { storage } = memory();
  expect(readLibrarySidebarMode(storage)).toBe('pinned');
  storage.write(LIBRARY_SIDEBAR_MODE_KEY, 'compact');
  expect(readLibrarySidebarMode(storage)).toBe('compact');
  // The retired hover mode, or anything else, reads as open.
  storage.write(LIBRARY_SIDEBAR_MODE_KEY, 'hover');
  expect(readLibrarySidebarMode(storage)).toBe('pinned');
  expect(readLibrarySidebarMode(refusing)).toBe('pinned');
  expect(readLibrarySidebarMode()).toBe('pinned');
});

it('keeps a changed choice on the device, and for the visit when the device refuses it', async () => {
  let current: [LibrarySidebarMode, (mode: LibrarySidebarMode) => void] | undefined;
  function Host({ storage }: { storage: ReaderPreferenceStorage }) {
    current = useStoredLibrarySidebarMode(storage);
    return null;
  }
  const container = document.createElement('div');
  const root = createRoot(container);
  const { values, storage } = memory();
  await act(async () => root.render(<Host storage={storage} />));
  expect(current![0]).toBe('pinned');
  await act(async () => current![1]('compact'));
  expect(current![0]).toBe('compact');
  expect(values.get(LIBRARY_SIDEBAR_MODE_KEY)).toBe('compact');
  // A later visit opens the way the reader left it.
  await act(async () => root.unmount());
  const next = createRoot(container);
  await act(async () => next.render(<Host storage={storage} />));
  expect(current![0]).toBe('compact');
  await act(async () => next.render(<Host storage={refusing} />));
  await act(async () => current![1]('pinned'));
  expect(current![0]).toBe('pinned');
  await act(async () => next.unmount());
});
