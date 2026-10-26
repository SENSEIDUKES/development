import { describe, expect, it } from 'vitest';
import { baseOpacity, decodeLooks, encodeLooks, freshSettings, materialStyle, readLooks, shadowLayers, writeLooks, type MeasuredMaterial, type SavedLook } from './model';

const glass: MeasuredMaterial = {
  backgroundColor: 'rgba(0, 0, 0, 0)',
  backgroundImage: 'linear-gradient(165deg, rgba(10, 18, 32, 0.38), rgba(3, 6, 12, 0.46))',
  borderColor: 'rgba(148, 196, 255, 0.22)', borderWidth: '1px', color: 'rgb(250, 250, 250)',
  boxShadow: 'rgba(0, 0, 0, 0.45) 0px 18px 60px, rgba(180, 220, 255, 0.12) 0px 1px 0px inset',
  backdropFilter: 'blur(12px) saturate(1.5)',
};
const look = (): SavedLook => ({ id: 'one', name: 'Midnight', settings: freshSettings() });

describe('material experiments', () => {
  it('leaves untouched components entirely in charge of their presentation', () => {
    expect(materialStyle(glass, {})).toEqual({});
    expect(materialStyle(undefined, { blur: 15 })).toEqual({});
  });
  it('retains gradient structure and relative transparency when recoloring', () => {
    expect(baseOpacity(glass)).toBe(.46);
    const style = materialStyle(glass, { tint: '#ffffff', opacity: 23 });
    expect(style.backgroundImage).toBe('linear-gradient(165deg, rgba(255, 255, 255, 0.19), rgba(255, 255, 255, 0.23))');
    expect(style.backgroundColor).toBe('rgba(255, 255, 255, 0)');
    expect(style.boxShadow).toBeUndefined();
  });
  it('updates blur without throwing away saturation', () => {
    expect(materialStyle(glass, { blur: 0 }).backdropFilter).toBe('blur(0px) saturate(1.5)');
  });
  it('isolates shadow strength from colored highlights', () => {
    expect(shadowLayers(glass.boxShadow)).toHaveLength(2);
    const style = materialStyle(glass, { shadow: 0 });
    expect(style.boxShadow).toContain('rgba(0, 0, 0, 0)');
    expect(style.boxShadow).toContain('rgba(180, 220, 255, 0.12)');
  });
  it('can add a glow to a flat material', () => {
    expect(materialStyle({ ...glass, boxShadow: 'none' }, { glow: 100, glowColor: '#ff0000' }).boxShadow).toBe('0 0 32px rgba(255, 0, 0, 0.25)');
  });
});

describe('portable saved looks', () => {
  it('round-trips combinations and edits without mutating their settings', () => {
    const saved = look(); saved.settings.edits.signin = { tint: '#112233', blur: 8, opacity: 65 };
    saved.settings.roles.panel = 'signin';
    expect(decodeLooks(encodeLooks([saved]))).toEqual([saved]);
  });
  it('accepts Reader glass without changing existing saved-look exports', () => {
    const existing = look();
    const reader = look();
    reader.id = 'reader-look';
    reader.settings.selected = 'reader';
    reader.settings.roles.panel = 'reader';
    reader.settings.edits.reader = { tint: '#203a4a', opacity: 90, blur: 0 };
    expect(decodeLooks(encodeLooks([existing, reader]))).toEqual([existing, reader]);
  });
  it.each([
    '{broken',
    JSON.stringify({ format: 'palette-materials', version: 2, looks: [] }),
    encodeLooks([{ ...look(), name: ' ' }]),
    encodeLooks([look(), look()]),
  ])('rejects malformed, incompatible or ambiguous imports', raw => {
    expect(() => decodeLooks(raw)).toThrow();
  });
  it('rejects unsupported materials, arbitrary CSS and out-of-range settings', () => {
    for (const edit of [{ tint: 'url(https://example.com)' }, { blur: -1 }, { opacity: 101 }, { position: 'fixed' }]) {
      const raw = JSON.parse(encodeLooks([look()])); raw.looks[0].settings.edits.home = edit;
      expect(() => decodeLooks(JSON.stringify(raw))).toThrow();
    }
    const raw = JSON.parse(encodeLooks([look()])); raw.looks[0].settings.roles.panel = 'unknown';
    expect(() => decodeLooks(JSON.stringify(raw))).toThrow();
  });
  it('rejects oversized files and collections', () => {
    expect(() => decodeLooks(' '.repeat(1_000_001))).toThrow('too large');
    expect(() => decodeLooks(encodeLooks(Array.from({ length: 101 }, (_, i) => ({ ...look(), id: `${i}` }))))).toThrow();
  });
  it('reloads from its own storage key and reports unavailable storage', () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    expect(readLooks(storage)).toEqual([]);
    writeLooks(storage, [look()]);
    expect(readLooks(storage)).toEqual([look()]);
    expect([...values.keys()]).toEqual(['workshop.palette-materials.looks.v1']);
    expect(() => writeLooks({ setItem() { throw new Error('quota'); } }, [look()])).toThrow('quota');
    expect(() => readLooks({ getItem() { throw new Error('unavailable'); } })).toThrow('unavailable');
  });
});
