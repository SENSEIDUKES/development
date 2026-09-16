import { describe, expect, it } from 'vitest';
import { SEN_NOVEL_AUTHOR_SKILL } from './authorSkill';
import { HarnessGenerationController } from './controller';
import { InMemoryHarnessGenerationRepository } from './repository';
import {
  assembleCapaPrompt,
  createHarnessSkillCatalog,
  freezeHarnessSkillLoadout,
  validateHarnessSkillManifest,
} from './skills';
import {
  selectTranslationGlossaryEntries,
  translationMatchSource,
  validateTranslationGlossaryResource,
} from './translationSkill';
import type {
  HarnessGenerationResponse,
  HarnessSkillManifest,
  ImmediateChapterRequest,
  StoryInformationPacket,
} from './types';

/**
 * Test-only manifests and glossary fixtures. They are never installed as real
 * product skills; Phase 2 builds the contract, not any authored language skill.
 */
const translationSkill = (overrides: Partial<HarnessSkillManifest> = {}): HarnessSkillManifest => ({
  id: 'test.translation.ja',
  version: '1.0.0',
  name: 'Test Japanese Translation',
  description: 'Test-only Translation manifest.',
  slot: 'translation',
  applications: ['generation'],
  instructions: 'Render reader-facing prose in the target language.',
  translation: { targetLanguage: 'ja' },
  ...overrides,
});

const glossary = (entries: unknown[], targetLanguage = 'ja') => ({ targetLanguage, entries });

const packet = (premise: string): StoryInformationPacket => ({
  id: 'hctx_test',
  storyId: 'hst_test',
  attemptId: 'hga_test',
  foundationRevision: { id: 'hfr_test', storyId: 'hst_test', revision: 1, createdAt: 'a', input: { premise } },
  storyHead: { nextChapterNumber: 1 },
  originalLanguage: 'ja',
  chapterNumber: 1,
  createdAt: 'a',
  committedChapters: [],
});

const request = (assignment?: string): ImmediateChapterRequest =>
  ({ chapterNumber: 1, continuation: false, ...(assignment ? { assignment } : {}) });

describe('Translation skill contract', () => {
  it('requires exactly one supported target language', () => {
    expect(validateHarnessSkillManifest(translationSkill()).translation?.targetLanguage).toBe('ja');
    expect(() => validateHarnessSkillManifest(translationSkill({ translation: undefined })))
      .toThrow('must declare its Translation metadata');
    expect(() => validateHarnessSkillManifest(translationSkill({
      translation: { targetLanguage: 'Japanese' as never },
    }))).toThrow('must declare exactly one supported target language');
  });

  it('never infers the target language from names, files, or instruction text', () => {
    const skill = validateHarnessSkillManifest(translationSkill({
      name: 'Korean Voice Pack',
      instructions: 'Translate everything into Korean.',
      source: { packageId: 'p', packageVersion: '1.0.0', path: 'assets/korean.md', sha256: 'abc' },
    }));

    // Only the declared metadata decides the language.
    expect(skill.translation?.targetLanguage).toBe('ja');
  });

  it('forbids Translation metadata on every other CAPA slot', () => {
    for (const slot of ['author', 'pacing', 'continuity', 'style', 'accessibility', 'media'] as const) {
      expect(() => validateHarnessSkillManifest(translationSkill({
        id: `test.${slot}`, slot, translation: { targetLanguage: 'ja' },
      }))).toThrow('cannot declare Translation metadata');
    }
  });

  it('accepts a skill with no glossary at all', () => {
    expect(validateHarnessSkillManifest(translationSkill()).translation?.glossary).toBeUndefined();
  });
});

describe('Translation glossary validation', () => {
  it('accepts a well-formed resource and normalizes its entries', () => {
    const resource = validateTranslationGlossaryResource(glossary([
      { term: 'Qi', aliases: ['qi energy', 'qi energy'], translation: '気', note: 'Keep the cultivation sense.' },
      { term: 'Dantian', translation: '丹田' },
    ]), 'ja');

    expect(resource.entries).toHaveLength(2);
    expect(resource.entries[0].aliases).toEqual(['qi energy']);
    expect(resource.entries[1]).toEqual({ term: 'Dantian', translation: '丹田' });
  });

  it('rejects a resource that targets a different language than the skill', () => {
    expect(() => validateTranslationGlossaryResource(glossary([{ term: 'Qi', translation: '기' }], 'ko'), 'ja'))
      .toThrow('targets ko, but the skill targets ja');
  });

  it('rejects unsupported language codes', () => {
    expect(() => validateTranslationGlossaryResource(glossary([{ term: 'Qi', translation: 'x' }], 'kl'), 'kl' as never))
      .toThrow('unsupported target language');
  });

  it('rejects duplicate canonical terms', () => {
    expect(() => validateTranslationGlossaryResource(glossary([
      { term: 'Qi', translation: '気' },
      { term: 'qi', translation: '氣' },
    ]), 'ja')).toThrow('more than once');
  });

  it('rejects malformed entries and missing required values', () => {
    expect(() => validateTranslationGlossaryResource(glossary([{ term: 'Qi' }]), 'ja')).toThrow('translation is required');
    expect(() => validateTranslationGlossaryResource(glossary([{ translation: '気' }]), 'ja')).toThrow('term is required');
    expect(() => validateTranslationGlossaryResource(glossary([{ term: 'Qi', translation: '気', aliases: 'qi' }]), 'ja'))
      .toThrow('invalid aliases');
    expect(() => validateTranslationGlossaryResource(glossary(['Qi']), 'ja')).toThrow('must be an object');
    expect(() => validateTranslationGlossaryResource(glossary([]), 'ja')).toThrow('at least one entry');
    expect(() => validateTranslationGlossaryResource('not json', 'ja')).toThrow('must be a JSON object');
  });

  it('rejects a glossary carried by a skill whose language disagrees', () => {
    expect(() => validateHarnessSkillManifest(translationSkill({
      translation: { targetLanguage: 'ja', glossary: glossary([{ term: 'Qi', translation: '기' }], 'ko') as never },
    }))).toThrow('targets ko, but the skill targets ja');
  });
});

describe('glossary selection against the frozen generation inputs', () => {
  const resource = validateTranslationGlossaryResource(glossary([
    { term: 'Qi', aliases: ['spiritual energy'], translation: '気' },
    { term: 'Dantian', translation: '丹田' },
    { term: 'Heavenly Tribulation', translation: '天劫' },
    { term: 'Jade Slip', translation: '玉簡' },
  ]), 'ja');

  it('selects only entries the story information or chapter request mentions', () => {
    const source = translationMatchSource(packet('A courier refines Qi beneath the sect gate.'), request('Reach the Jade Slip.'));
    const selected = selectTranslationGlossaryEntries(resource, source);

    expect(selected.map(entry => entry.term)).toEqual(['Qi', 'Jade Slip']);
  });

  it('matches declared aliases as well as canonical terms', () => {
    const source = translationMatchSource(packet('The spiritual energy thins near the peak.'), request());

    expect(selectTranslationGlossaryEntries(resource, source).map(entry => entry.term)).toEqual(['Qi']);
  });

  it('prefers complete phrase matches over partial substring matches', () => {
    // "Qi" appears only inside "Qigong"; "Dantian" appears as a whole phrase.
    const source = translationMatchSource(packet('Qigong drills open the Dantian.'), request());
    const selected = selectTranslationGlossaryEntries(resource, source);

    expect(selected.map(entry => entry.term)).toEqual(['Dantian', 'Qi']);
  });

  it('selects nothing when the chapter never touches the glossary', () => {
    const source = translationMatchSource(packet('Two farmers argue about a fence.'), request());

    expect(selectTranslationGlossaryEntries(resource, source)).toEqual([]);
  });
});

describe('CAPA Prompt delivery', () => {
  const loadout = (skill: HarnessSkillManifest) => ({
    skills: [SEN_NOVEL_AUTHOR_SKILL, validateHarnessSkillManifest(skill)],
    capturedAt: '2026-09-15T00:00:00.000Z',
  });

  const withGlossary = translationSkill({
    translation: {
      targetLanguage: 'ja',
      glossary: validateTranslationGlossaryResource(glossary([
        { term: 'Qi', translation: '気' },
        { term: 'Heavenly Tribulation', translation: '天劫' },
      ]), 'ja'),
    },
  });

  it('places the selected reference inside the Translation section only', () => {
    const prompt = assembleCapaPrompt(loadout(withGlossary), {
      storyInformation: packet('A courier refines Qi at the gate.'),
      immediateChapterRequest: request(),
    });

    const translationIndex = prompt.text.indexOf('CAPA SKILL [Translation]');
    const glossaryIndex = prompt.text.indexOf('TRANSLATION GLOSSARY REFERENCE');
    const requirementsIndex = prompt.text.indexOf('HARNESS OFFICIAL OUTPUT REQUIREMENTS');

    expect(translationIndex).toBeGreaterThan(-1);
    expect(glossaryIndex).toBeGreaterThan(translationIndex);
    expect(glossaryIndex).toBeLessThan(requirementsIndex);
  });

  it('never carries the complete resource into the prompt', () => {
    const prompt = assembleCapaPrompt(loadout(withGlossary), {
      storyInformation: packet('A courier refines Qi at the gate.'),
      immediateChapterRequest: request(),
    });

    expect(prompt.text).toContain('気');
    // The untouched entry stays in the installed resource, out of the prompt.
    expect(prompt.text).not.toContain('天劫');
    expect(prompt.translationGlossary?.entries.map(entry => entry.term)).toEqual(['Qi']);
    expect(prompt.translationGlossary?.availableEntryCount).toBe(2);
  });

  it('counts the selected reference toward the CAPA Prompt budget', () => {
    const inputs = {
      storyInformation: packet('A courier refines Qi at the gate.'),
      immediateChapterRequest: request(),
    };
    const withoutGlossary = assembleCapaPrompt(loadout(translationSkill()), inputs);
    const withSelection = assembleCapaPrompt(loadout(withGlossary), inputs);

    expect(withSelection.estimatedTokens).toBeGreaterThan(withoutGlossary.estimatedTokens);
  });

  it('records the target language as frozen provenance', () => {
    const prompt = assembleCapaPrompt(loadout(withGlossary), {
      storyInformation: packet('A courier refines Qi at the gate.'),
      immediateChapterRequest: request(),
    });

    expect(prompt.skills.find(skill => skill.slot === 'translation')).toMatchObject({
      version: '1.0.0', targetLanguage: 'ja',
    });
  });

  it('assembles normally when the Translation slot is empty', () => {
    const prompt = assembleCapaPrompt({ skills: [SEN_NOVEL_AUTHOR_SKILL], capturedAt: 'a' });

    expect(prompt.text).toContain('HARNESS OFFICIAL OUTPUT REQUIREMENTS');
    expect(prompt.translationGlossary).toBeUndefined();
  });
});

describe('equipping a Translation skill on a story', () => {
  const japanese = validateHarnessSkillManifest(translationSkill());
  const korean = validateHarnessSkillManifest(translationSkill({
    id: 'test.translation.ko', name: 'Test Korean Translation', translation: { targetLanguage: 'ko' },
  }));

  const controllerWith = async (repository = new InMemoryHarnessGenerationRepository()) => {
    const controller = new HarnessGenerationController({
      repository,
      installedSkills: [japanese, korean],
      modelAdapter: {
        getServerInfo: async () => ({ provider: 'gemini' as const, configured: false, models: [], defaultModel: 'm' }),
        generate: async (): Promise<HarnessGenerationResponse> => { throw new Error('not used'); },
      },
    });
    await controller.hydrate();
    return controller;
  };

  it('rejects a skill whose target language is not the story Original Language', async () => {
    const controller = await controllerWith();
    const story = await controller.createStory({ premise: 'A courier crosses the sea.' }, 'ja');

    await expect(controller.setSkillSlot(story.id, 'translation', korean))
      .rejects.toThrow("this story's Original Language is ja");
  });

  it('accepts a matching skill and keeps it through reload', async () => {
    const repository = new InMemoryHarnessGenerationRepository();
    const controller = await controllerWith(repository);
    const story = await controller.createStory({ premise: 'A courier crosses the sea.' }, 'ja');
    await controller.setSkillSlot(story.id, 'translation', japanese);

    const reloaded = await controllerWith(repository);
    expect(reloaded.snapshot().stories[0].skillLoadout?.translation)
      .toMatchObject({ id: japanese.id, version: japanese.version });
  });

  it('rechecks compatibility before every generation attempt', async () => {
    const controller = await controllerWith();
    const story = await controller.createStory({ premise: 'A courier crosses the sea.' }, 'ja');
    await controller.setSkillSlot(story.id, 'translation', japanese);

    // A story reloaded against a host whose skill now targets another language
    // must not reach the provider.
    const drifted = { ...controller.snapshot().stories[0], originalLanguage: 'ko' as const };
    expect(() => freezeHarnessSkillLoadout(
      drifted,
      createHarnessSkillCatalog([SEN_NOVEL_AUTHOR_SKILL, japanese]),
      'a',
    )).toThrow("this story's Original Language is ko");
  });
});
