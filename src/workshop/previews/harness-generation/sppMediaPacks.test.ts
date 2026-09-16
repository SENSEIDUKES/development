import { describe, expect, it } from 'vitest';
import { createPack } from 'seihouse-productions-package';
import { inspectHarnessSpp, SPP_SKILL_STORAGE_KEY } from './sppSkills';
import {
  loadHarnessSppMediaPacks,
  readHarnessSppMediaPack,
  saveHarnessSppMediaPack,
  SPP_MEDIA_PACK_STORAGE_KEY,
} from './sppMediaPacks';

const packJson = () => JSON.stringify({
  id: 'test.spp.soundscapes', version: '1.0.0', type: 'soundscape',
  displayName: 'SPP Test Soundscapes', description: 'A data-only fixture.',
  entries: [{ id: 'SPP_TEST', mood: 'quiet-test', moods: ['quiet-test'], tags: ['quiet'], url: 'https://fixtures.r2.dev/quiet.mp3', isPremium: false }],
});

const storage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
};

describe('SPP Media Pack host intake', () => {
  it('uses explicit validated JSON selection and a separate inventory from HARNESS skills', async () => {
    const archive = await createPack({ name: 'Media fixture', description: 'Test', files: [
      { path: 'assets/catalog.json', data: new TextEncoder().encode(packJson()) },
      { path: 'assets/readme.md', data: new TextEncoder().encode('Not a catalog.') },
    ] });
    const content = await inspectHarnessSpp(archive);
    const pack = readHarnessSppMediaPack(content, 'assets/catalog.json');
    const saved = storage();
    saveHarnessSppMediaPack(saved, [], pack);
    expect(SPP_MEDIA_PACK_STORAGE_KEY).not.toBe(SPP_SKILL_STORAGE_KEY);
    expect(loadHarnessSppMediaPacks(saved)).toMatchObject([{ id: pack.id, type: 'soundscape' }]);
    expect(saved.getItem(SPP_SKILL_STORAGE_KEY)).toBeNull();
    expect(() => readHarnessSppMediaPack(content, 'assets/readme.md')).toThrow('JSON');
    expect(() => readHarnessSppMediaPack(content, 'missing.json')).toThrow('Select a catalog');
  });
});
