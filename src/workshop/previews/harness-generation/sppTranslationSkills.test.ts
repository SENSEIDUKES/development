import { describe, expect, it } from 'vitest';
import { createPack } from 'seihouse-productions-package';
import {
  createHarnessSppSkill,
  inspectHarnessSpp,
  loadHarnessSppSkills,
  readHarnessSppGlossary,
  saveHarnessSppSkill,
} from './sppSkills';

const encoder = new TextEncoder();

/**
 * Test-only packages. Nothing here is an authored product Translation skill;
 * these fixtures only exercise the import contract.
 */
const translationPack = async (glossary: unknown, instructions = 'Render reader-facing prose in Japanese.') => {
  const bytes = await createPack({
    name: 'Test language package',
    description: 'Test-only translation package',
    files: [
      { path: 'assets/instructions.md', data: encoder.encode(instructions) },
      { path: 'assets/glossary.json', data: encoder.encode(JSON.stringify(glossary)) },
      { path: 'assets/cover.bin', data: new Uint8Array([1, 2, 3]) },
    ],
  });
  return inspectHarnessSpp(new Blob([new Uint8Array(bytes)]));
};

const validGlossary = {
  targetLanguage: 'ja',
  entries: [
    { term: 'Qi', aliases: ['spiritual energy'], translation: '気', note: 'Cultivation sense.' },
    { term: 'Dantian', translation: '丹田' },
  ],
};

const storage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
};

describe('SPP Translation skill import', () => {
  it('installs instructions, the explicitly chosen language, the glossary, and provenance', async () => {
    const content = await translationPack(validGlossary);
    const skill = createHarnessSppSkill(content, 'assets/instructions.md', 'translation', {
      targetLanguage: 'ja',
      glossaryPath: 'assets/glossary.json',
    });

    expect(skill.slot).toBe('translation');
    expect(skill.instructions).toBe('Render reader-facing prose in Japanese.');
    expect(skill.translation?.targetLanguage).toBe('ja');
    expect(skill.translation?.glossary?.entries.map(entry => entry.term)).toEqual(['Qi', 'Dantian']);
    expect(skill.source).toMatchObject({
      packageId: content.manifest.id,
      packageVersion: content.manifest.version,
      path: 'assets/instructions.md',
    });
    expect(skill.source?.sha256).toBeTruthy();
    // The resource records its own path and digest, separate from the instructions.
    expect(skill.translation?.glossary?.source).toMatchObject({ path: 'assets/glossary.json' });
    expect(skill.translation?.glossary?.source?.sha256).not.toBe(skill.source?.sha256);
  });

  it('installs a Translation skill with no glossary at all', async () => {
    const content = await translationPack(validGlossary);
    const skill = createHarnessSppSkill(content, 'assets/instructions.md', 'translation', { targetLanguage: 'ko' });

    expect(skill.translation).toEqual({ targetLanguage: 'ko' });
  });

  it('requires an explicit language and never infers one from the package', async () => {
    const content = await translationPack(validGlossary);

    expect(() => createHarnessSppSkill(content, 'assets/instructions.md', 'translation'))
      .toThrow('Choose the target language');
  });

  it('rejects a glossary whose declared language differs from the chosen one', async () => {
    const content = await translationPack(validGlossary);

    expect(() => createHarnessSppSkill(content, 'assets/instructions.md', 'translation', {
      targetLanguage: 'ko', glossaryPath: 'assets/glossary.json',
    })).toThrow('targets ja, but the skill targets ko');
  });

  it('rejects malformed glossary resources before installation', async () => {
    const duplicates = await translationPack({
      targetLanguage: 'ja',
      entries: [{ term: 'Qi', translation: '気' }, { term: 'qi', translation: '氣' }],
    });
    expect(() => readHarnessSppGlossary(duplicates, 'assets/glossary.json', 'ja')).toThrow('more than once');

    const missingValue = await translationPack({ targetLanguage: 'ja', entries: [{ term: 'Qi' }] });
    expect(() => readHarnessSppGlossary(missingValue, 'assets/glossary.json', 'ja')).toThrow('translation is required');

    const unsupported = await translationPack({ targetLanguage: 'kl', entries: [{ term: 'Qi', translation: 'x' }] });
    expect(() => readHarnessSppGlossary(unsupported, 'assets/glossary.json', 'ja')).toThrow('unsupported target language');

    const empty = await translationPack({ targetLanguage: 'ja', entries: [] });
    expect(() => readHarnessSppGlossary(empty, 'assets/glossary.json', 'ja')).toThrow('at least one entry');
  });

  it('refuses a non-JSON file as a glossary and never auto-selects one', async () => {
    const content = await translationPack(validGlossary);

    expect(() => readHarnessSppGlossary(content, 'assets/cover.bin', 'ja')).toThrow('Only JSON files');
    expect(() => readHarnessSppGlossary(content, 'assets/missing.json', 'ja')).toThrow('Select a glossary file');
    // Nothing is installed unless the host selects it.
    expect(createHarnessSppSkill(content, 'assets/instructions.md', 'translation', { targetLanguage: 'ja' })
      .translation?.glossary).toBeUndefined();
  });

  it('rejects unreadable JSON rather than installing a partial resource', async () => {
    const bytes = await createPack({
      name: 'Broken package',
      description: 'Test-only',
      files: [
        { path: 'assets/instructions.md', data: encoder.encode('Translate.') },
        { path: 'assets/glossary.json', data: encoder.encode('{ not json') },
      ],
    });
    const content = await inspectHarnessSpp(new Blob([new Uint8Array(bytes)]));

    expect(() => readHarnessSppGlossary(content, 'assets/glossary.json', 'ja')).toThrow('not readable UTF-8 JSON');
  });

  it('preserves the validated skill and its resource through an inventory reload', async () => {
    const content = await translationPack(validGlossary);
    const skill = createHarnessSppSkill(content, 'assets/instructions.md', 'translation', {
      targetLanguage: 'ja', glossaryPath: 'assets/glossary.json',
    });
    const saved = storage();
    saveHarnessSppSkill(saved, [], skill);

    const [reloaded] = loadHarnessSppSkills(saved);
    expect(reloaded).toEqual(skill);
    expect(reloaded.translation?.glossary?.entries).toHaveLength(2);
    // Only the selected text and resource are retained, never the archive.
    expect(JSON.stringify(reloaded)).not.toContain('cover.bin');
  });

  it('keeps Translation metadata off other slots at import time', async () => {
    const content = await translationPack(validGlossary);

    expect(createHarnessSppSkill(content, 'assets/instructions.md', 'style').translation).toBeUndefined();
  });
});
