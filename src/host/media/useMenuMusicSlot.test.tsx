// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { createPack } from 'seihouse-productions-package';
import { webcrypto } from 'node:crypto';
import { createRegisteredMediaPackCatalog } from '@seihouse/library/media';
import { MenuMusicSlot } from '../../library/sound/MenuMusicSlot';
import { createMemoryDeviceMediaPackStore, DeviceMediaUrls } from './deviceMediaPacks';
import { useDeviceMediaPacks } from './useDeviceMediaPacks';
import { useMenuMusicSlot } from './useMenuMusicSlot';
import { createLocalReaderPreferenceStorage } from '../reader/readerPreferenceStorage';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(() => { localStorage.clear(); vi.unstubAllGlobals(); });

it('equips only after a successful SPP save, keeps the prior selection after failures, and restores songs on remount', async () => {
  vi.stubGlobal('crypto', webcrypto);
  const encode = (data: unknown) => new Uint8Array(new TextEncoder().encode(JSON.stringify(data)));
  const bytes = await createPack({ name: 'My themes', description: '',
    extensions: { 'seihouse.media-pack': { type: 'soundscape', catalog: 'assets/music.json' } },
    files: [{ path: 'assets/music.json', mediaType: 'application/json', data: encode({ pieces: [
      { label: 'English', mood: 'ambient', url: 'https://media.example.org/english.mp3' },
      { label: 'Urdu', mood: 'adventure', url: 'https://media.example.org/urdu.mp3' },
    ] }) }],
  });
  const file = new File([], 'themes.spp');
  Object.defineProperties(file, { size: { value: bytes.length }, arrayBuffer: { value: async () => bytes.buffer } });
  const store = createMemoryDeviceMediaPackStore();
  const storage = createLocalReaderPreferenceStorage('test-menu.');
  storage.write('menu-music', 'off');
  const urls = new DeviceMediaUrls();
  let current: ReturnType<typeof useMenuMusicSlot>;
  let device: ReturnType<typeof useDeviceMediaPacks>;
  let importSettled = Promise.resolve();
  function Host() {
    device = useDeviceMediaPacks(store, urls);
    current = useMenuMusicSlot(storage, device);
    return <MenuMusicSlot {...current.slot} onImport={item => (importSettled = current.slot.onImport(item))} />;
  }
  const container = document.createElement('div');
  document.body.append(container);
  let root = createRoot(container);
  try {
    await act(async () => root.render(<Host />));
    const upload = async (item: File) => {
      const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
      Object.defineProperty(input, 'files', { value: [item], configurable: true });
      await act(async () => {
        input.dispatchEvent(new Event('change', { bubbles: true }));
        await importSettled.catch(() => undefined);
      });
    };
    await upload(file);
    expect(container.querySelector('[role="alert"]')?.textContent).toBeUndefined();
    const selected = storage.read('menu-music-pack');
    expect(selected).toMatch(/^spp\..+@1\.0\.0$/);
    expect(current!.pieces?.map(piece => piece.label)).toEqual(['English', 'Urdu']);
    expect(device!.packs).toHaveLength(0);
    expect(device!.entitlements).toHaveLength(0);
    expect(storage.read('menu-music')).toBe('off');
    expect(container.querySelector('select')?.value).toBe(selected);
    const savedCount = (await store.loadAll()).length;

    const badFile = new File([], 'bad.spp');
    Object.defineProperty(badFile, 'arrayBuffer', { value: async () => new ArrayBuffer(0) });
    await upload(badFile);
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(storage.read('menu-music-pack')).toBe(selected);
    expect(current!.pieces).toHaveLength(2);
    expect((await store.loadAll()).length).toBe(savedCount);

    const save = store.save;
    store.save = async () => { throw new Error('Device full'); };
    const otherBytes = await createPack({ name: 'Other themes', description: '', files: [{ path: 'assets/a.mp3', mediaType: 'audio/mpeg', data: new Uint8Array([73, 68, 51]) }] });
    const otherFile = new File([], 'other.spp');
    Object.defineProperties(otherFile, { size: { value: otherBytes.length }, arrayBuffer: { value: async () => otherBytes.buffer } });
    await upload(otherFile);
    expect(container.querySelector('[role="alert"]')?.textContent).toBe('Device full');
    expect(storage.read('menu-music-pack')).toBe(selected);
    store.save = save;

    act(() => root.unmount());
    root = createRoot(container);
    await act(async () => root.render(<Host />));
    expect(current!.slot.selectedKey).toBe(selected);
    expect(device!.packs).toHaveLength(0);
    expect(current!.pieces?.map(piece => piece.label)).toEqual(['English', 'Urdu']);
    expect(container.querySelector('select')?.value).toBe(selected);
    await act(async () => current!.slot.onChange(''));
    expect(current!.pieces).toBeUndefined();
    expect(storage.read('menu-music-pack')).toBe('');

    // Two menu packs can share a recording without entering the story registry.
    const duplicateBytes = await createPack({ name: 'Another menu', description: '',
      extensions: { 'seihouse.media-pack': { type: 'soundscape', catalog: 'assets/music.json' } },
      files: [{ path: 'assets/music.json', mediaType: 'application/json', data: encode({ pieces: [
        { mood: 'menu', url: 'https://media.example.org/english.mp3' },
      ] }) }],
    });
    const duplicateFile = new File([], 'another.spp');
    Object.defineProperties(duplicateFile, { size: { value: duplicateBytes.length }, arrayBuffer: { value: async () => duplicateBytes.buffer } });
    await upload(duplicateFile);
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(device!.menuMusicPacks).toHaveLength(2);
    expect(createRegisteredMediaPackCatalog(device!.packs).size).toBe(0);
    // Explicitly importing an existing menu pack for a story promotes only that pack.
    await act(async () => { await device!.importPack(file); });
    expect(createRegisteredMediaPackCatalog(device!.packs).size).toBe(1);
    expect(device!.menuMusicPacks).toHaveLength(2);
    await act(async () => { await device!.importPack(file, 'menu-music'); });
    expect(device!.packs).toHaveLength(1);
  } finally { act(() => root.unmount()); container.remove(); }
});
