import { describe, expect, it } from 'vitest';
import { createPack, type FileInput } from 'seihouse-productions-package';
import { createHarnessSppSkill, inspectHarnessSpp } from '../generation/capa/sppSkills';
import { LIBRARY_SOUND_WORDS } from './libraryCatalog';
import {
  inspectSoundWordsSpp,
  LIBRARY_SOUND_WORDS_PRESET,
  loadSoundWordsPresets,
  readSoundWordsSpp,
  saveSoundWordsPreset,
} from './soundWordPacks';

const KEY = 'test-sound-words';
const PACKAGE_ID = '7a6c1b8e-3d2f-4f0a-9c1e-5b2d8e4f6a10';
const encode = (value: unknown) => new TextEncoder().encode(typeof value === 'string' ? value : JSON.stringify(value));

const soundWordsPack = async ({
  words = ['growl', 'Door_Slam', 'temple bell'] as unknown,
  version = '1.0.0',
  vocabulary = 'assets/words/cultivation.json' as unknown,
  files,
  extensions,
}: {
  words?: unknown;
  version?: string;
  vocabulary?: unknown;
  files?: FileInput[];
  extensions?: Record<string, unknown>;
} = {}) => new Uint8Array(await createPack({
  id: PACKAGE_ID,
  name: 'Cultivation Sound Words',
  description: 'Sounds for cultivation stories.',
  version,
  publisher: 'SEIHouse',
  createdAt: '2026-10-11T00:00:00.000Z',
  files: files ?? [{ path: 'assets/words/cultivation.json', mediaType: 'application/json', data: encode(words) }],
  extensions: (extensions ?? { 'seihouse.sound-words': { vocabulary } }) as never,
}));

const storage = () => {
  const values = new Map<string, string>();
  return { values, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
};

describe('Sound Words packages', () => {
  it('reads the word list the package names, in one spelling, with where it came from', async () => {
    const preset = await inspectSoundWordsSpp(await soundWordsPack());
    expect(preset).toMatchObject({
      id: `spp:${PACKAGE_ID}`,
      version: '1.0.0',
      name: 'Cultivation Sound Words',
      description: 'Sounds for cultivation stories.',
      words: ['growl', 'door slam', 'temple bell'],
      source: { packageId: PACKAGE_ID, packageVersion: '1.0.0', path: 'assets/words/cultivation.json' },
    });
    expect(preset.source!.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it('holds a package to 30 unique plain words and a JSON list it names', async () => {
    const thirty = LIBRARY_SOUND_WORDS.map(sound => sound.word);
    expect(thirty).toHaveLength(30);
    expect((await inspectSoundWordsSpp(await soundWordsPack({ words: thirty }))).words).toEqual(thirty);
    await expect(inspectSoundWordsSpp(await soundWordsPack({ words: [...thirty, 'door slam'] }))).rejects.toThrow('at most 30 words');
    await expect(inspectSoundWordsSpp(await soundWordsPack({ words: ['growl', 'Growl'] }))).rejects.toThrow('listed twice');
    await expect(inspectSoundWordsSpp(await soundWordsPack({ words: ['a very long four words'] }))).rejects.toThrow('one to three lowercase English words');
    await expect(inspectSoundWordsSpp(await soundWordsPack({ words: [{ word: 'growl', example: 'a low growl' }] }))).rejects.toThrow('one to three lowercase English words');
    await expect(inspectSoundWordsSpp(await soundWordsPack({ words: { growl: true } }))).rejects.toThrow('list of words');
    await expect(inspectSoundWordsSpp(await soundWordsPack({ files: [{ path: 'assets/words/cultivation.json', mediaType: 'application/json', data: encode('not json') }] }))).rejects.toThrow('not readable JSON');
    await expect(inspectSoundWordsSpp(await soundWordsPack({ files: [{ path: 'assets/words/cultivation.json', mediaType: 'text/plain', data: encode(['growl']) }] }))).rejects.toThrow('must be a JSON file');
    await expect(inspectSoundWordsSpp(await soundWordsPack({ vocabulary: 'assets/words/missing.json' }))).rejects.toThrow('does not contain');
    await expect(inspectSoundWordsSpp(await soundWordsPack({ vocabulary: 3 }))).rejects.toThrow('does not name the file');
  });

  it('refuses a damaged file, a package that is not Sound Words, and one that is a CAPA skill too', async () => {
    await expect(inspectSoundWordsSpp(new Uint8Array([80, 75, 3, 4, 0, 1, 2]))).rejects.toThrow();
    const bytes = await soundWordsPack();
    await expect(inspectSoundWordsSpp(bytes.slice(0, bytes.length - 40))).rejects.toThrow();
    await expect(inspectSoundWordsSpp(await soundWordsPack({ extensions: {} }))).rejects.toThrow('not a Sound Words package');
    await expect(inspectSoundWordsSpp(await soundWordsPack({ extensions: {
      'seihouse.sound-words': { vocabulary: 'assets/words/cultivation.json' }, 'seihouse.capa': { slot: 'style' },
    } }))).rejects.toThrow('words only');
  });

  it('is never installed as a CAPA skill', async () => {
    const content = await inspectHarnessSpp(await soundWordsPack({ files: [
      { path: 'assets/words/cultivation.json', mediaType: 'application/json', data: encode(['growl']) },
      { path: 'assets/notes.txt', mediaType: 'text/plain', data: encode('Write grandly.') },
    ] }));
    expect(readSoundWordsSpp(content).words).toEqual(['growl']);
    expect(() => createHarnessSppSkill(content, 'assets/notes.txt', 'style')).toThrow('is a Sound Words package');
  });

  it('installs each package version once: its words never change under a story', async () => {
    const saved = storage();
    const first = await inspectSoundWordsSpp(await soundWordsPack());
    let installed = saveSoundWordsPreset(saved, KEY, [], first);
    expect(loadSoundWordsPresets(saved, KEY)).toEqual([first]);
    // The same version again changes nothing.
    installed = saveSoundWordsPreset(saved, KEY, installed, await inspectSoundWordsSpp(await soundWordsPack()));
    expect(installed).toEqual([first]);
    // The same version with other words is refused.
    const altered = await inspectSoundWordsSpp(await soundWordsPack({ words: ['growl'] }));
    expect(() => saveSoundWordsPreset(saved, KEY, installed, altered)).toThrow('already installed with different words');
    // A new version installs beside it.
    const second = await inspectSoundWordsSpp(await soundWordsPack({ words: ['growl'], version: '1.1.0' }));
    installed = saveSoundWordsPreset(saved, KEY, installed, second);
    expect(loadSoundWordsPresets(saved, KEY).map(preset => [preset.version, preset.words])).toEqual([['1.0.0', first.words], ['1.1.0', ['growl']]]);
  });

  it('reads a damaged inventory as none, never as broken words', () => {
    const saved = storage();
    saved.setItem(KEY, '{not json');
    expect(loadSoundWordsPresets(saved, KEY)).toEqual([]);
    saved.setItem(KEY, JSON.stringify([{ id: 'spp:x', version: '1.0.0', name: 'X', words: ['growl', 'growl'], source: { packageId: 'x', packageVersion: '1.0.0', path: 'w.json', sha256: 'a' } }]));
    expect(loadSoundWordsPresets(saved, KEY)).toEqual([]);
  });

  it('starts the Library\'s preset from its 30 words, with the three renamed', () => {
    expect(LIBRARY_SOUND_WORDS_PRESET.words).toHaveLength(30);
    expect(LIBRARY_SOUND_WORDS_PRESET.words).toEqual(expect.arrayContaining(['growl', 'screech', 'unsheathe']));
    expect(LIBRARY_SOUND_WORDS_PRESET.words).not.toEqual(expect.arrayContaining(['beast growl']));
    expect(LIBRARY_SOUND_WORDS_PRESET.words).not.toContain('creature screech');
    expect(LIBRARY_SOUND_WORDS_PRESET.words).not.toContain('blade drawn');
  });
});
