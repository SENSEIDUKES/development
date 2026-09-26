import { describe, expect, it } from 'vitest';
import { handleHarnessGenerationHttp } from '../../../server/harness-generation/http';
import { SEN_NOVEL_AUTHOR_SKILL } from '@seihouse/sen/harness-generation';
import { HarnessGenerationController } from '@seihouse/sen/harness-generation';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { validateHarnessSkillManifest } from '@seihouse/sen/harness-generation';
import { validateTranslationGlossaryResource } from '@seihouse/sen/harness-generation';
import { type HarnessGenerationResponse, type HarnessSkillManifest } from '@seihouse/sen/harness-generation';

/** Test-only Translation manifest; never an installed product skill. */
const japaneseSkill = (): HarnessSkillManifest => validateHarnessSkillManifest({
  id: 'test.translation.ja',
  version: '2.1.0',
  name: 'Test Japanese Translation',
  description: 'Test-only Translation manifest.',
  slot: 'translation',
  applications: ['generation'],
  instructions: 'Render reader-facing prose in the declared target language.',
  source: { packageId: 'pkg-ja', packageVersion: '2.1.0', path: 'assets/ja.md', sha256: 'digest-ja' },
  translation: {
    targetLanguage: 'ja',
      glossary: validateTranslationGlossaryResource({
        targetLanguage: 'ja',
        source: { path: 'assets/glossary.json', sha256: 'glossary-digest-ja' },
      entries: [
        { term: 'Qi', translation: '気' },
        { term: 'Jade Slip', translation: '玉簡' },
        { term: 'Heavenly Tribulation', translation: '天劫' },
      ],
    }, 'ja'),
  },
});

const arcReply = (chapterNumber: number) => ({
  rawProviderResponse: JSON.stringify({
    plan: { arcNumber: Math.floor((chapterNumber - 1) / 100) + 1, goals: [{ id: `arc-${chapterNumber}-goal`, text: 'Carry the story through its opening arc.', chapters: 100 }] },
    destinedEnding: 'Bring the story to its true conclusion.',
  }),
  providerReceipt: { provider: 'fixture', model: 'fixture', generatedAt: new Date().toISOString(), usage: { source: 'unavailable' as const } },
});

interface Capture { systemInstruction: string; userPrompt: string }

const buildController = (options: {
  repository?: InMemoryHarnessGenerationRepository;
  skills?: HarnessSkillManifest[];
  captures?: Capture[];
  failFirstCall?: boolean;
}) => {
  let calls = 0;
  return new HarnessGenerationController({
    repository: options.repository ?? new InMemoryHarnessGenerationRepository(),
    installedSkills: [SEN_NOVEL_AUTHOR_SKILL, ...(options.skills ?? [])],
    modelAdapter: {
      getServerInfo: async () => { throw new Error('Not used'); },
      arcOperation: async request => arcReply(request.storyInformation.chapterNumber),
      generate: async request => {
        const response = await handleHarnessGenerationHttp({ method: 'POST', body: JSON.stringify(request) }, {
          environment: { GEMINI_API_KEY: 'fixture-key' },
          providerFactory: () => ({
            provider: 'gemini',
            model: request.model,
            generate: async prompt => {
              calls += 1;
              options.captures?.push({ systemInstruction: prompt.systemInstruction, userPrompt: prompt.userPrompt });
              if (options.failFirstCall && calls === 1) throw new Error('Simulated provider failure.');
              return {
                rawProviderResponse: JSON.stringify({ prose: 'The courier caught the jade token before it struck the steps.' }),
                providerReceipt: { provider: 'gemini', model: request.model, generatedAt: new Date().toISOString(), durationMs: 1, usage: { source: 'unavailable' as const } },
              };
            },
          }),
        });
        if (response.status !== 200) throw new Error('Fixture request failed.');
        return response.body as HarnessGenerationResponse;
      },
    },
  });
};

const MODEL = 'google/gemini-3.1-flash-lite';
const premise = 'A courier refines Qi and carries a Jade Slip to a mountain school.';

describe('Translation package resolved from the Story Language through a real generation attempt', () => {
  it('freezes the resolved package, its provenance, and the selected reference onto the attempt', async () => {
    const repository = new InMemoryHarnessGenerationRepository();
    const skill = japaneseSkill();
    const controller = buildController({ repository, skills: [skill] });
    await controller.hydrate();
    const story = await controller.createStory({ premise }, 'ja');

    await controller.generateNextChapter(story.id, MODEL);

    const [attempt] = repository.snapshot().attempts;
    const frozen = attempt.capaPrompt.skills.find(entry => entry.slot === 'translation');
    expect(frozen).toMatchObject({
      version: '2.1.0',
      targetLanguage: 'ja',
      source: { packageId: 'pkg-ja', packageVersion: '2.1.0', path: 'assets/ja.md', sha256: 'digest-ja' },
    });
    expect(attempt.capaPrompt.translationGlossary).toMatchObject({
      skillId: skill.id, skillVersion: '2.1.0', targetLanguage: 'ja', availableEntryCount: 3,
      source: { path: 'assets/glossary.json', sha256: 'glossary-digest-ja' },
    });
    expect(attempt.capaPrompt.translationGlossary?.entries.map(entry => entry.term)).toEqual(['Qi', 'Jade Slip']);
  });

  it('sends only the relevant entries to the provider and never the whole glossary', async () => {
    const captures: Capture[] = [];
    const skill = japaneseSkill();
    const controller = buildController({ skills: [skill], captures });
    await controller.hydrate();
    const story = await controller.createStory({ premise }, 'ja');

    await controller.generateNextChapter(story.id, MODEL);

    const [capture] = captures;
    expect(capture.systemInstruction).toContain('TRANSLATION GLOSSARY REFERENCE (ja)');
    expect(capture.systemInstruction).toContain('気');
    expect(capture.systemInstruction).toContain('玉簡');
    // The untouched entry stays installed and never reaches the model.
    expect(capture.systemInstruction).not.toContain('天劫');
    expect(capture.userPrompt).not.toContain('天劫');
    // The reference belongs to the CAPA Prompt, not the Story Information Packet.
    expect(capture.userPrompt).not.toContain('TRANSLATION GLOSSARY REFERENCE');
  });

  it('replays a retried request with the same selected reference', async () => {
    const repository = new InMemoryHarnessGenerationRepository();
    const skill = japaneseSkill();
    const controller = buildController({ repository, skills: [skill], failFirstCall: true });
    await controller.hydrate();
    const story = await controller.createStory({ premise }, 'ja');

    await controller.generateNextChapter(story.id, MODEL);
    const failed = repository.snapshot().attempts.at(-1)!;
    expect(failed.stage).toBe('generation_failed');

    await controller.retryModelRequest(failed.id);

    const attempts = repository.snapshot().attempts;
    const retried = attempts.at(-1)!;
    expect(retried.id).not.toBe(failed.id);
    expect(retried.capaPrompt.translationGlossary).toEqual(failed.capaPrompt.translationGlossary);
    // The abandoned attempt keeps its own frozen copy for replay.
    expect(attempts.find(attempt => attempt.id === failed.id)?.capaPrompt.translationGlossary?.entries)
      .toEqual(failed.capaPrompt.translationGlossary?.entries);
  });

  it('writes a Japanese story with no writing package installed, stating its Story Language', async () => {
    const repository = new InMemoryHarnessGenerationRepository();
    const captures: Capture[] = [];
    const controller = buildController({ repository, captures });
    await controller.hydrate();
    const story = await controller.createStory({ premise }, 'ja');

    await controller.generateNextChapter(story.id, MODEL);

    const snapshot = repository.snapshot();
    expect(snapshot.chapters).toHaveLength(1);
    expect(snapshot.stories[0].originalLanguage).toBe('ja');
    const [attempt] = snapshot.attempts;
    expect(attempt.capaPrompt.skills.some(skill => skill.slot === 'translation')).toBe(false);
    expect(attempt.capaPrompt.translationGlossary).toBeUndefined();
    // Only the minimum HARNESS-owned language requirement travels.
    expect(attempt.capaPrompt.text).toContain('Write all reader-facing chapter content in Japanese (日本語), this story\'s Original Language (ja).');
    expect(attempt.capaPrompt.text).not.toMatch(/Translation instructions|Accessibility/);
    expect(captures[0].systemInstruction).toContain('this story\'s Original Language (ja)');
  });

  it('keeps a glossary-free Translation skill working as plain instructions', async () => {
    const captures: Capture[] = [];
    const skill = validateHarnessSkillManifest({
      ...japaneseSkill(), id: 'test.translation.ja.plain', translation: { targetLanguage: 'ja' },
    });
    const controller = buildController({ skills: [skill], captures });
    await controller.hydrate();
    const story = await controller.createStory({ premise }, 'ja');

    await controller.generateNextChapter(story.id, MODEL);

    expect(captures[0].systemInstruction).toContain('Render reader-facing prose in the declared target language.');
    expect(captures[0].systemInstruction).not.toContain('TRANSLATION GLOSSARY REFERENCE');
  });
});
