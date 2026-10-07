// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import type { ReaderPreferenceStorage } from '@seihouse/sen/reader-runtime';
import { MENU_MUSIC_KEY, readMenuMusic, useMenuMusic, writeMenuMusic } from './menuMusic';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const memory = (): ReaderPreferenceStorage & { values: Map<string, string> } => {
  const values = new Map<string, string>();
  return { values, read: key => values.get(key) ?? null, write: (key, value) => { values.set(key, value); }, remove: key => { values.delete(key); } };
};

describe('Menu music', () => {
  it('is on for a new reader, and off only when they turned it off', () => {
    const storage = memory();
    expect(readMenuMusic(storage)).toBe(true);
    expect(readMenuMusic(undefined)).toBe(true);
    writeMenuMusic(storage, false);
    expect(storage.values.get(MENU_MUSIC_KEY)).toBe('off');
    expect(readMenuMusic(storage)).toBe(false);
    writeMenuMusic(storage, true);
    expect(readMenuMusic(storage)).toBe(true);
    // A damaged value, or a storage that throws, is on.
    storage.values.set(MENU_MUSIC_KEY, '{nonsense');
    expect(readMenuMusic(storage)).toBe(true);
    const broken: ReaderPreferenceStorage = { read: () => { throw new Error('blocked'); }, write: () => { throw new Error('blocked'); }, remove: () => undefined };
    expect(readMenuMusic(broken)).toBe(true);
    expect(() => writeMenuMusic(broken, false)).not.toThrow();
  });

  it('changes everywhere it is shown at once: the Settings switch and the header\'s note agree', () => {
    const storage = memory();
    const seen: Record<string, boolean> = {};
    let turn: (on: boolean) => void = () => undefined;
    function Shown({ name }: { name: string }) {
      const [on, setOn] = useMenuMusic(storage);
      seen[name] = on;
      if (name === 'settings') turn = setOn;
      return null;
    }
    const root = createRoot(document.createElement('div'));
    act(() => root.render(createElement('div', null, createElement(Shown, { name: 'settings' }), createElement(Shown, { name: 'header' }))));
    expect(seen).toEqual({ settings: true, header: true });
    act(() => turn(false));
    expect(seen).toEqual({ settings: false, header: false });
    expect(storage.values.get(MENU_MUSIC_KEY)).toBe('off');
    act(() => root.unmount());
  });
});
