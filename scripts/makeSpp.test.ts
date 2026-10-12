import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { makeSpp, readSoundWords } from './makeSpp.mjs';
import { inspectSoundWordsSpp, LIBRARY_SOUND_WORDS_PRESET } from '../src/host/media/soundWordPacks';
import { createHarnessSppSkill, inspectHarnessSpp } from '../src/host/generation/capa/sppSkills';

const made: string[] = [];
const workspace = () => {
  const root = mkdtempSync(join(tmpdir(), 'make-spp-'));
  made.push(root);
  return root;
};
afterEach(() => { for (const root of made.splice(0)) rmSync(root, { recursive: true, force: true }); });

describe('making a .spp from a folder', () => {
  it('makes a Sound Words package from a folder with only words.txt, which the app installs', async () => {
    const root = workspace();
    const folder = join(root, 'Cultivation Sounds');
    mkdirSync(folder);
    writeFileSync(join(folder, 'words.txt'), '# Notes are skipped\r\ntemple bell\r\nSword_Hum\r\n\r\nqi surge # a note after a word\r\n');
    const result = await makeSpp(folder);
    expect(result.path).toBe(join(root, 'Cultivation Sounds v1.0.0.spp'));
    const preset = await inspectSoundWordsSpp(readFileSync(result.path));
    expect(preset).toMatchObject({ name: 'Cultivation Sounds', version: '1.0.0', words: ['temple bell', 'sword hum', 'qi surge'] });
    // The new id is kept for later versions.
    const config = JSON.parse(readFileSync(join(folder, 'spp.json'), 'utf8'));
    expect(config).toMatchObject({ name: 'Cultivation Sounds', version: '1.0.0', kind: 'sound-words' });
    expect(preset.source?.packageId).toBe(config.id);
  });

  it('never makes a version twice: the next build is the next patch, the same package', async () => {
    const root = workspace();
    const folder = join(root, 'Pack');
    mkdirSync(folder);
    writeFileSync(join(folder, 'words.txt'), 'growl\n');
    const first = await makeSpp(folder);
    writeFileSync(join(folder, 'words.txt'), 'growl\nroar\n');
    const second = await makeSpp(folder);
    expect([first.version, second.version, second.previousVersion]).toEqual(['1.0.0', '1.0.1', '1.0.0']);
    const [a, b] = await Promise.all([first.path, second.path].map(path => inspectSoundWordsSpp(readFileSync(path))));
    expect(a.id).toBe(b.id);
    expect(b.words).toEqual(['growl', 'roar']);
    expect(JSON.parse(readFileSync(join(folder, 'spp.json'), 'utf8')).version).toBe('1.0.1');
  });

  it('lists every word problem with its line, and makes nothing', async () => {
    expect(readSoundWords('growl\nRoar!\ngrowl\na very long four words\n').problems).toEqual([
      'line 2: "Roar!" must be one to three plain English words, at most 24 letters',
      'line 3: "growl" is listed twice',
      'line 4: "a very long four words" must be one to three plain English words, at most 24 letters',
    ]);
    expect(readSoundWords(Array.from({ length: 31 }, (_, index) => `sound ${String.fromCharCode(97 + (index % 26))}${index >= 26 ? 'x' : ''}`).join('\n')).problems)
      .toEqual(['31 words: a Sound Words list holds at most 30']);
    const root = workspace();
    const folder = join(root, 'Broken');
    mkdirSync(folder);
    writeFileSync(join(folder, 'words.txt'), 'growl\ngrowl\n');
    await expect(makeSpp(folder)).rejects.toThrow('listed twice');
  });

  it('makes a CAPA skill package that installs into its slot', async () => {
    const root = workspace();
    const folder = join(root, 'Grand Style');
    mkdirSync(join(folder, 'notes'), { recursive: true });
    writeFileSync(join(folder, 'spp.json'), JSON.stringify({ name: 'Grand Style', kind: 'capa', slot: 'style', version: '2.0.0' }));
    writeFileSync(join(folder, 'style.md'), 'Write with grandeur.');
    writeFileSync(join(folder, 'notes', 'why.txt'), 'Kept with the package.');
    const content = await inspectHarnessSpp(readFileSync((await makeSpp(folder)).path));
    expect(content.manifest.files.map(file => file.path)).toEqual(['assets/notes/why.txt', 'assets/style.md']);
    expect(createHarnessSppSkill(content, 'assets/style.md', 'style')).toMatchObject({ slot: 'style', version: '2.0.0', instructions: 'Write with grandeur.' });
    await expect(makeSpp(join(root, 'missing'))).rejects.toThrow('is not a folder');
  });

  it('keeps the Library template package matching the Library\'s own preset', async () => {
    const template = new URL('../templates/spp/Library Sound Words v1.0.0.spp', import.meta.url);
    const preset = await inspectSoundWordsSpp(readFileSync(template));
    expect(preset).toMatchObject({ name: 'Library Sound Words', version: '1.0.0', words: LIBRARY_SOUND_WORDS_PRESET.words });
  });
});
