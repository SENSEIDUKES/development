import { describe, expect, it } from 'vitest';
import { SEN_NOVEL_AUTHOR_SKILL } from '@seihouse/sen/harness-generation';
import { HarnessGenerationController } from '@seihouse/sen/harness-generation';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { assembleCapaPrompt, createHarnessSkillCatalog, freezeHarnessSkillLoadout, validateHarnessSkillManifest } from '@seihouse/sen/harness-generation';
import { selectTranslationGlossaryEntries, translationMatchSource, validateTranslationGlossaryResource } from '@seihouse/sen/harness-generation';
import { type HarnessGenerationResponse, type HarnessSkillManifest, type ImmediateChapterRequest, type StoryInformationPacket } from '@seihouse/sen/harness-generation';

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
  foundationRevisionId: 'hfr_test',
  foundationRevision: 1,
  storyHead: { nextChapterNumber: 1 },
  chapterNumber: 1,
  createdAt: 'a',
  currentStory: { title: 'Test', originalLanguage: 'ja', premise, corrections: [] },
  storyDirection: { hardPins: [] },
  previouslyOn: [],
  canonicalState: { characters: [], relationships: [], locations: [], factions: [], artifacts: [], abilities: [], resources: [] },
  diagnostics: { budgetSource: 'test', sections: [], omitted: [], identityAmbiguities: [], storage: { chapters: 0, events: 0, canonicalRecords: 0, activeRecords: 0, recaps: 0 } },
});

const request = (readerDirection?: string): ImmediateChapterRequest =>
  ({ chapterNumber: 1, continuation: false, chapterScale: { minWords: 1_800, maxWords: 2_500 },
    ...(readerDirection ? { direction: { id: 'hdir-test', forChapter: 1, choice: { kind: 'reader', text: readerDirection }, chosenAt: 'a' } } : {}) });

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
    for (const slot of ['author', 'pacing', 'continuity', 'style', 'accessibility'] as const) {
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
    ]), 'ja')).toThrow('collides');
  });

  it('rejects normalized collisions across canonical terms and aliases', () => {
    expect(() => validateTranslationGlossaryResource(glossary([
      { term: 'Qi', aliases: ['Spiritual Energy'], translation: '気' },
      { term: ' spiritual energy ', translation: '霊力' },
    ]), 'ja')).toThrow('collides');

    expect(() => validateTranslationGlossaryResource(glossary([
      { term: 'Qi', aliases: ['energy'], translation: '気' },
      { term: 'Dantian', aliases: ['ENERGY'], translation: '丹田' },
    ]), 'ja')).toThrow('collides');
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

  it('never matches a Latin term inside an unrelated word', () => {
    // "qi" is a substring of "equipped" and "Qigong"; neither is the term.
    const source = translationMatchSource(
      packet('Qigong drills open the Dantian once the courier is equipped.'),
      request(),
    );
    const selected = selectTranslationGlossaryEntries(resource, source);

    expect(selected.map(entry => entry.term)).toEqual(['Dantian']);
  });

  it('still matches a term written in a script without word separators', () => {
    // Japanese runs together, so a boundary test can never succeed there; the
    // loose pass exists for exactly this case and ranks after phrase matches.
    const unsegmented = validateTranslationGlossaryResource(glossary([
      { term: 'Heavenly Tribulation', aliases: ['天劫'], translation: '天劫' },
      { term: 'Dantian', translation: '丹田' },
    ]), 'ja');
    const source = translationMatchSource(packet('丹田を鍛えれば天劫が訪れる。'), request());

    expect(selectTranslationGlossaryEntries(unsegmented, source).map(entry => entry.term))
      .toEqual(['Heavenly Tribulation']);
  });

  it('selects nothing when the chapter never touches the glossary', () => {
    const source = translationMatchSource(packet('Two farmers argue about a fence.'), request());

    expect(selectTranslationGlossaryEntries(resource, source)).toEqual([]);
  });

  it('never matches machine-facing packet keys or identifiers', () => {
    const machineTerms = validateTranslationGlossaryResource(glossary([
      { term: 'storyId', translation: 'wrong' },
      { term: 'hctx_test', translation: 'wrong' },
      { term: 'chapterNumber', translation: 'wrong' },
    ]), 'ja');

    expect(selectTranslationGlossaryEntries(
      machineTerms,
      translationMatchSource(packet('Two farmers argue about a fence.'), request()),
    )).toEqual([]);
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
      glossary: validateTranslationGlossaryResource({ ...glossary([
        { term: 'Qi', translation: '気' },
        { term: 'Heavenly Tribulation', translation: '天劫' },
      ]), source: { path: 'assets/glossary.json', sha256: 'glossary-digest' } }, 'ja'),
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
    expect(prompt.translationGlossary?.source).toEqual({ path: 'assets/glossary.json', sha256: 'glossary-digest' });
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

  it('assembles an English chapter with an empty Translation slot and no official requirements', () => {
    const prompt = assembleCapaPrompt({ skills: [SEN_NOVEL_AUTHOR_SKILL], capturedAt: 'a', originalLanguage: 'en' });

    expect(prompt.text).not.toContain('HARNESS OFFICIAL OUTPUT REQUIREMENTS');
    expect(prompt.translationGlossary).toBeUndefined();
  });
});

describe('the Translation package follows the Story Language', () => {
  const japanese = validateHarnessSkillManifest(translationSkill());
  const korean = validateHarnessSkillManifest(translationSkill({
    id: 'test.translation.ko', name: 'Test Korean Translation', translation: { targetLanguage: 'ko' },
  }));
  const author = { id: SEN_NOVEL_AUTHOR_SKILL.id, version: SEN_NOVEL_AUTHOR_SKILL.version };

  const controllerWith = async (skills: HarnessSkillManifest[] = [japanese, korean]) => {
    const controller = new HarnessGenerationController({
      repository: new InMemoryHarnessGenerationRepository(),
      installedSkills: skills,
      modelAdapter: {
        getServerInfo: async () => ({ provider: 'gemini' as const, configured: false, models: [], defaultModel: 'm' }),
        generate: async (): Promise<HarnessGenerationResponse> => { throw new Error('not used'); },
      },
    });
    await controller.hydrate();
    return controller;
  };
  const translationFor = (skills: HarnessSkillManifest[], language: 'en' | 'ja' | 'ko') => {
    const story = { ...baseStory, originalLanguage: language };
    return freezeHarnessSkillLoadout(story, createHarnessSkillCatalog([SEN_NOVEL_AUTHOR_SKILL, ...skills]), 'a')
      .skills.find(skill => skill.slot === 'translation')?.id;
  };
  const baseStory = {
    id: 'hst', title: 'T', originalLanguage: 'ja' as const, createdAt: 'a', updatedAt: 'a',
    activeFoundationRevisionId: 'hfr', foundationRevisionIds: ['hfr'], head: { nextChapterNumber: 1 },
    skillLoadout: { author },
  };

  it('is never equipped by hand, at creation or afterwards', async () => {
    const controller = await controllerWith();
    const story = await controller.createStory({ premise: 'A courier crosses the sea.' }, 'ja');

    await expect(controller.setSkillSlot(story.id, 'translation', japanese))
      .rejects.toThrow("follows the story's Story Language");
    await expect(controller.createStory({ premise: 'Another crossing.' }, 'ja', { author, translation: japanese }))
      .rejects.toThrow("follows the story's Story Language");
  });

  it('loads the installed package for the story language, and nothing for English', () => {
    expect(translationFor([japanese, korean], 'ja')).toBe(japanese.id);
    expect(translationFor([japanese, korean], 'ko')).toBe(korean.id);
    expect(translationFor([japanese, korean], 'en')).toBeUndefined();
  });

  it('ignores whatever an older story saved in the slot', () => {
    const story = { ...baseStory, skillLoadout: { author, translation: { id: korean.id, version: korean.version } } };
    const skills = freezeHarnessSkillLoadout(story, createHarnessSkillCatalog([SEN_NOVEL_AUTHOR_SKILL, japanese, korean]), 'a').skills;
    expect(skills.find(skill => skill.slot === 'translation')?.id).toBe(japanese.id);
  });

  it('never writes chapters with a package that only translates for readers', () => {
    const readerOnly = validateHarnessSkillManifest(translationSkill({ id: 'test.reader.ja', applications: ['reader'] }));
    expect(translationFor([readerOnly], 'ja')).toBeUndefined();
  });

  it('loads the newest version of one package', () => {
    const newer = validateHarnessSkillManifest(translationSkill({ version: '1.2.0', instructions: 'Newer Japanese guidance.' }));
    expect(freezeHarnessSkillLoadout(baseStory, createHarnessSkillCatalog([SEN_NOVEL_AUTHOR_SKILL, japanese, newer]), 'a')
      .skills.find(skill => skill.slot === 'translation')?.version).toBe('1.2.0');
  });

  it('never chooses between competing packages for the same language', () => {
    const rival = validateHarnessSkillManifest(translationSkill({ id: 'test.translation.ja.rival', name: 'Rival Japanese' }));
    expect(() => freezeHarnessSkillLoadout(baseStory, createHarnessSkillCatalog([SEN_NOVEL_AUTHOR_SKILL, japanese, rival]), 'a'))
      .toThrow('More than one Japanese (日本語) writing package is installed');
  });
});
