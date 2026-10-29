import { describe, expect, it } from 'vitest';
import { encodeLooks, freshSettings, STORAGE_KEY, type SavedLook } from './model';
import { defaultStartingLook, loadStartingLooks, startingLooks, STARTING_LOOKS_KEY, STARTING_LOOKS_REVISION } from './starting-looks';

function memory(raw?: string) {
  const values = new Map<string, string>(raw === undefined ? [] : [[STORAGE_KEY, raw]]);
  return { values, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}

describe('owner-provided starting looks', () => {
  it('saves all five supplied looks unchanged and defaults to the supplied V2 combination', () => {
    const storage = memory();
    const { looks, warning } = loadStartingLooks(storage);
    expect(looks).toEqual(startingLooks());
    expect(looks).toHaveLength(5);
    expect(looks.at(-1)).toEqual(defaultStartingLook());
    expect(defaultStartingLook()).toMatchObject({ name: 'V2', settings: {
      selected: 'violet-card', colors: { text: '#ffffff', accent: '#c9a24a' },
      roles: { navigation: 'violet-shell', panel: 'violet-card', card: 'violet-shell', button: 'rainbow-action' },
      edits: { 'violet-shell': { blur: 40, opacity: 90 } },
    } });
    expect(looks[3].settings.edits.create).toEqual({ opacity: 12, blur: 24, borderOpacity: 20, borderColor: '#000000', tint: '#00374a', glow: 100, borderGlow: 'reader', shadow: 130, glowColor: '#000000' });
    expect(warning).toBe('');
    expect(loadStartingLooks(storage).looks).toEqual(looks);
  });
  it('updates the default while preserving conflicting browser work as a separate look', () => {
    const edited = startingLooks()[3]; edited.settings.edits.home = { opacity: 81, borderGlow: 'reader' };
    const newer: SavedLook = { id: 'newer', name: 'More recent work', settings: freshSettings() };
    const storage = memory(encodeLooks([edited, newer]));
    const { looks } = loadStartingLooks(storage);
    expect(looks).toHaveLength(7);
    expect(looks.find(l => l.name === 'V1 (previous)')?.settings).toEqual(edited.settings);
    expect(looks.find(l => l.id === 'newer')).toEqual(newer);
    expect(looks.at(-1)).toEqual(startingLooks().at(-1));
    expect(loadStartingLooks(storage).looks).toEqual(looks);
  });
  it('upgrades browsers that already included the prior export', () => {
    const old = startingLooks().slice(0, 4);
    old[3].name = 'update'; old[3].settings.colors.accent = '#6a1aff';
    const storage = memory(encodeLooks(old));
    storage.setItem(STARTING_LOOKS_KEY, 'owner-v1');
    const result = loadStartingLooks(storage);
    expect(result.looks.at(-1)).toEqual(startingLooks().at(-1));
    expect(result.looks.find(l => l.name === 'update (previous)')?.settings.colors.accent).toBe('#6a1aff');
    expect(storage.getItem(STARTING_LOOKS_KEY)).toBe(STARTING_LOOKS_REVISION);
  });
  it('does not duplicate looks previously imported with fresh IDs', () => {
    const imported = startingLooks().map((l, i) => ({ ...l, id: `imported-${i}` }));
    const storage = memory(encodeLooks(imported));
    expect(loadStartingLooks(storage).looks).toEqual(imported);
  });
  it('does not revive looks deleted after inclusion', () => {
    const storage = memory(); loadStartingLooks(storage);
    storage.setItem(STORAGE_KEY, encodeLooks([]));
    expect(loadStartingLooks(storage).looks).toEqual([]);
  });
  it('leaves malformed stored data untouched and makes exported work available in memory', () => {
    const storage = memory('{broken');
    const result = loadStartingLooks(storage);
    expect(result.looks).toEqual(startingLooks());
    expect(result.warning).toContain('left untouched');
    expect(storage.getItem(STORAGE_KEY)).toBe('{broken');
    expect(storage.getItem(STARTING_LOOKS_KEY)).toBeNull();
  });
  it('preserves combined work in memory when writes fail', () => {
    const existing: SavedLook = { id: 'newer', name: 'Local work', settings: freshSettings() };
    const storage = memory(encodeLooks([existing]));
    const result = loadStartingLooks({ ...storage, setItem() { throw new Error('quota'); } });
    expect(result.looks).toHaveLength(6);
    expect(result.looks.find(l => l.id === existing.id)).toEqual(existing);
    expect(result.warning).toContain('Export before leaving');
    expect(storage.getItem(STORAGE_KEY)).toBe(encodeLooks([existing]));
  });
  it('never evicts work from a full browser collection', () => {
    const full = Array.from({ length: 100 }, (_, i) => ({ id: `local-${i}`, name: `Local ${i}`, settings: freshSettings() }));
    const storage = memory(encodeLooks(full));
    const result = loadStartingLooks(storage);
    expect(result.looks).toEqual(full);
    expect(result.warning).toContain('not enough room');
    expect(storage.getItem(STARTING_LOOKS_KEY)).toBeNull();
  });
});
