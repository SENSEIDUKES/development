import { describe, expect, it } from 'vitest';
import {
  HarnessGenerationController,
  SEN_READING_MODE_SKILLS,
  migrateHarnessWorkspaceState,
  readHarnessWorkspaceState,
  validateHarnessSkillManifest,
  type HarnessGenerationModelAdapter,
  type HarnessGenerationRequest,
  type HarnessSkillManifest,
  type StoryFoundationInput,
} from '@seihouse/sen/harness-generation';
import type { ArcPlan } from '@seihouse/sen/arc-goals';
import type { ChapterWritingStyle, SenLanguageCode } from '@seihouse/sen/contracts';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { buildHarnessGenerationPrompt } from '../../../server/harness-generation/prompt';

/**
 * Story Settings → HARNESS capabilities. The owner chooses a Story Language and
 * a Reading Mode (and, in the Story Seed, a Fate mode); the HARNESS resolves the
 * managed Translation, Accessibility and Fate skills from them and freezes the
 * result into each chapter attempt. Nobody equips those slots by hand.
 */

/** Test-only writing package; never an installed product skill. */
const japaneseWriting = (overrides: Partial<HarnessSkillManifest> = {}) => validateHarnessSkillManifest({
  id: 'test.writing.ja',
  version: '1.0.0',
  name: 'Test Japanese Writing',
  description: 'Test-only Japanese writing package.',
  slot: 'translation',
  applications: ['generation'],
  instructions: 'Write reader-facing prose in natural Japanese.',
  translation: { targetLanguage: 'ja' },
  ...overrides,
});

const plan: ArcPlan = { arcNumber: 1, goals: [{ id: 'arc-1-gate', text: 'Reach the mountain gate.', chapters: 100 }] };
const receipt = { provider: 'fixture', model: 'fixture', generatedAt: 'now', usage: { source: 'unavailable' as const } };
const reply = (text: string) => JSON.stringify({
  paragraphs: [text], recap: `Recap: ${text}`, chapterFunction: 'progression',
  nextProgression: 'Mei climbs.', nextWorldBuilding: 'The gate hums.', nextConflict: 'A guard waits.',
  arcCompletion: { goalId: 'none', completed: false, evidence: '' },
});

const setup = async (options: {
  language?: SenLanguageCode;
  readingMode?: ChapterWritingStyle;
  skills?: HarnessSkillManifest[];
  foundation?: Partial<StoryFoundationInput>;
} = {}) => {
  const requests: HarnessGenerationRequest[] = [];
  const outputs: Array<string | Error> = [];
  const modelAdapter: HarnessGenerationModelAdapter = {
    getServerInfo: async () => ({ configured: true, provider: 'fixture', defaultModel: 'fixture', models: [] }),
    generate: async request => {
      requests.push(structuredClone(request));
      const next = outputs.shift() ?? reply('Mei climbed toward the gate.');
      if (next instanceof Error) throw next;
      return { rawProviderResponse: next, providerReceipt: receipt };
    },
    arcOperation: async () => ({ rawProviderResponse: '{}', providerReceipt: receipt }),
  };
  const repository = new InMemoryHarnessGenerationRepository();
  const controller = new HarnessGenerationController({ repository, modelAdapter, installedSkills: options.skills ?? [] });
  await controller.hydrate();
  const story = await controller.createStory(
    { premise: 'A courier climbs to a mountain school.', destinedEnding: 'Mei opens the school gate.', arcRoadmap: [plan], plannedArcCount: 1, ...options.foundation },
    options.language ?? 'en',
    undefined,
    options.readingMode ? { chapterWritingStyle: options.readingMode } : {},
  );
  return { controller, repository, story, requests, outputs };
};

/** Which skill each slot carried in a request, by slot. */
const slotsOf = (request: HarnessGenerationRequest) =>
  Object.fromEntries(request.capaPrompt.skills.map(skill => [skill.slot, skill.id]));
const providerText = (request: HarnessGenerationRequest) => {
  const prompt = buildHarnessGenerationPrompt(request);
  return `${prompt.systemInstruction}\n${prompt.userPrompt}`;
};
const AUTHOR = 'seihouse.sen-novel-author';
const FATE = 'seihouse.sen-fate-survival';

describe('1. English + Standard', () => {
  it('loads no Translation or Accessibility skill and sends none of their text', async () => {
    const run = await setup();
    await run.controller.generateNextChapter(run.story.id, 'fixture');

    const [request] = run.requests;
    expect(slotsOf(request)).toEqual({ author: AUTHOR });
    const text = providerText(request);
    expect(text).not.toContain('HARNESS OFFICIAL OUTPUT REQUIREMENTS');
    expect(text).not.toMatch(/Accessibility|Translation|Original Language \(/);
    expect(run.repository.snapshot().chapters).toHaveLength(1);
  });
});

describe('2. Japanese + Standard', () => {
  it('resolves the installed Japanese writing package automatically and leaves Accessibility inactive', async () => {
    const run = await setup({ language: 'ja', skills: [japaneseWriting()] });
    await run.controller.generateNextChapter(run.story.id, 'fixture');

    const [request] = run.requests;
    expect(slotsOf(request)).toEqual({ author: AUTHOR, translation: 'test.writing.ja' });
    expect(request.capaPrompt.skills.find(skill => skill.slot === 'translation')?.targetLanguage).toBe('ja');
    const text = providerText(request);
    expect(text).toContain('CAPA SKILL [Translation] — Test Japanese Writing v1.0.0');
    expect(text).toContain('The Translation instructions are mandatory for all reader-facing chapter content.');
    expect(text).toContain('Write all reader-facing chapter content in Japanese (日本語), this story\'s Original Language (ja).');
    expect(text).not.toContain('Accessibility');
  });
});

describe('3. English + Clear Reading', () => {
  it('loads the Clear Reading skill automatically and leaves Translation inactive', async () => {
    const run = await setup({ readingMode: 'Clear Reading' });
    await run.controller.generateNextChapter(run.story.id, 'fixture');

    const [request] = run.requests;
    expect(slotsOf(request)).toEqual({ author: AUTHOR, accessibility: SEN_READING_MODE_SKILLS['Clear Reading'].id });
    const text = providerText(request);
    expect(text).toContain('CAPA SKILL [Accessibility] — SEN Clear Reading v1.0.0');
    expect(text).toContain(SEN_READING_MODE_SKILLS['Clear Reading'].instructions);
    expect(text).toContain('The Accessibility instructions are mandatory for all reader-facing chapter content.');
    expect(text).not.toMatch(/Translation|Original Language \(/);
  });
});

describe('4. Japanese + Easy Read + Fate Survival', () => {
  it('resolves Fate, Translation and Accessibility from three settings and freezes all three into one attempt', async () => {
    const run = await setup({ language: 'ja', readingMode: 'Easy Read', skills: [japaneseWriting()], foundation: { fateSurvival: { enabled: true } } });
    await run.controller.chooseChapterDirection(run.story.id, { kind: 'reader', text: 'Mei bribes the gate guard.' });
    await run.controller.generateNextChapter(run.story.id, 'fixture');

    const [request] = run.requests;
    // Each managed slot answers to its own setting, in CAPA Schema order, in the same chapter call.
    expect(request.capaPrompt.skills.map(skill => [skill.slot, skill.id])).toEqual([
      ['author', AUTHOR],
      ['fate', FATE],
      ['accessibility', SEN_READING_MODE_SKILLS['Easy Read'].id],
      ['translation', 'test.writing.ja'],
    ]);
    const [attempt] = run.repository.snapshot().attempts;
    expect(attempt.capaPrompt).toEqual(request.capaPrompt);
    expect(providerText(request)).toContain('The Accessibility and Translation instructions are mandatory');

    // Changing one setting moves only its own slot on the next chapter.
    await run.controller.setChapterWritingStyle(run.story.id, 'Literal Reading');
    await run.controller.chooseChapterDirection(run.story.id, { kind: 'reader', text: 'Mei climbs the wall instead.' });
    await run.controller.generateNextChapter(run.story.id, 'fixture');
    expect(slotsOf(run.requests[1])).toEqual({
      author: AUTHOR, fate: FATE, accessibility: SEN_READING_MODE_SKILLS['Literal Reading'].id, translation: 'test.writing.ja',
    });
    // The committed chapter keeps what it was written with.
    expect(run.repository.snapshot().attempts[0].capaPrompt.skills.find(skill => skill.slot === 'accessibility')?.id)
      .toBe(SEN_READING_MODE_SKILLS['Easy Read'].id);
  });
});

describe('5. No matching Translation package', () => {
  it('still writes the chapter, keeping the Story Language explicit', async () => {
    const run = await setup({ language: 'ja' });
    await run.controller.generateNextChapter(run.story.id, 'fixture');

    const snapshot = run.repository.snapshot();
    expect(snapshot.chapters).toHaveLength(1);
    expect(snapshot.stories[0].originalLanguage).toBe('ja');
    const [request] = run.requests;
    expect(slotsOf(request)).toEqual({ author: AUTHOR });
    expect(request.storyInformation.currentStory.originalLanguage).toBe('ja');
    const text = providerText(request);
    // Only the minimum HARNESS-owned language requirement travels.
    expect(text).toContain('Write all reader-facing chapter content in Japanese (日本語), this story\'s Original Language (ja).');
    expect(text).not.toMatch(/Translation instructions|Accessibility/);
  });

  it('never chooses between competing packages: the chapter waits with a clear message', async () => {
    const run = await setup({ language: 'ja', skills: [japaneseWriting(), japaneseWriting({ id: 'test.writing.ja.rival', name: 'Rival' })] });
    await expect(run.controller.generateNextChapter(run.story.id, 'fixture'))
      .rejects.toThrow('More than one Japanese (日本語) writing package is installed');
    expect(run.requests).toHaveLength(0);
  });
});

describe('6. Retry after a setting or package change', () => {
  it('resends the frozen request when nothing changed', async () => {
    const run = await setup({ readingMode: 'Clear Reading' });
    run.outputs.push(new Error('Simulated provider failure.'));
    await run.controller.generateNextChapter(run.story.id, 'fixture');
    const failed = run.repository.snapshot().attempts[0];
    expect(failed.stage).toBe('generation_failed');

    await run.controller.retryModelRequest(failed.id);
    expect(run.requests[1].capaPrompt).toEqual(failed.capaPrompt);
  });

  it('rebuilds instead of resending a stale CAPA Prompt when the Reading Mode changed', async () => {
    const run = await setup();
    run.outputs.push(new Error('Simulated provider failure.'));
    await run.controller.generateNextChapter(run.story.id, 'fixture');
    const failed = run.repository.snapshot().attempts[0];
    expect(slotsOf(run.requests[0])).toEqual({ author: AUTHOR });

    await run.controller.setChapterWritingStyle(run.story.id, 'Easy Read');
    await run.controller.retryModelRequest(failed.id);

    expect(slotsOf(run.requests[1])).toEqual({ author: AUTHOR, accessibility: SEN_READING_MODE_SKILLS['Easy Read'].id });
    expect(run.repository.snapshot().chapters).toHaveLength(1);
    // The abandoned attempt keeps its own frozen copy.
    expect(run.repository.snapshot().attempts.find(attempt => attempt.id === failed.id)?.capaPrompt).toEqual(failed.capaPrompt);
  });

  it('rebuilds when the Translation package resolution changed', async () => {
    const run = await setup({ language: 'ja' });
    run.outputs.push(new Error('Simulated provider failure.'));
    await run.controller.generateNextChapter(run.story.id, 'fixture');
    const failed = run.repository.snapshot().attempts[0];

    run.controller.setInstalledSkills([japaneseWriting()]);
    await run.controller.retryModelRequest(failed.id);

    expect(slotsOf(run.requests[1])).toEqual({ author: AUTHOR, translation: 'test.writing.ja' });
  });
});

describe('7. Story-owned values', () => {
  it('stores each story\'s own Reading Mode, Standard by default, and changes only the story asked', async () => {
    const run = await setup({ readingMode: 'Easy Read' });
    const plain = await run.controller.createStory({ premise: 'A second story.' });
    expect(run.controller.snapshot().stories.map(story => story.chapterWritingStyle)).toEqual(['Easy Read', 'Standard']);

    await run.controller.setChapterWritingStyle(plain.id, 'Literal Reading');
    expect(run.controller.snapshot().stories.map(story => story.chapterWritingStyle)).toEqual(['Easy Read', 'Literal Reading']);
  });

  it('refuses a Reading Mode change while a chapter request is still open', async () => {
    const run = await setup();
    const saved = run.controller.snapshot();
    saved.attempts.push({ ...structuredClone(saved.attempts[0] ?? {}), id: 'hga-open', storyId: run.story.id, stage: 'provider_outcome_unknown' } as never);
    const blocked = new HarnessGenerationController({ repository: new InMemoryHarnessGenerationRepository(saved), modelAdapter: {
      getServerInfo: async () => { throw new Error('unused'); }, generate: async () => { throw new Error('unused'); },
    } });
    await blocked.hydrate();
    await expect(blocked.setChapterWritingStyle(run.story.id, 'Easy Read')).rejects.toThrow('before changing the Reading Mode');
  });
});

describe('8. Migration from schema 20', () => {
  it('removes hand-saved Translation and Accessibility references and reads a missing Reading Mode as Standard', async () => {
    const run = await setup({ language: 'ja', skills: [japaneseWriting()] });
    await run.controller.generateNextChapter(run.story.id, 'fixture');
    const current = run.repository.snapshot();
    const frozenPrompt = structuredClone(current.attempts[0].capaPrompt);
    const stored = structuredClone(current) as unknown as { schemaVersion: number; stories: Array<Record<string, unknown>> };
    stored.schemaVersion = 20;
    delete stored.stories[0].chapterWritingStyle;
    stored.stories[0].skillLoadout = {
      author: { id: AUTHOR, version: '1.0.0' },
      translation: { id: 'test.writing.ja', version: '1.0.0' },
      accessibility: { id: 'workshop.dyslexic-readability', version: '0.1.0' },
    };

    const migrated = migrateHarnessWorkspaceState(stored)!;
    expect(migrated.schemaVersion).toBe(21);
    expect(migrated.stories[0].skillLoadout).toEqual({ author: { id: AUTHOR, version: '1.0.0' } });
    expect(migrated.stories[0].chapterWritingStyle).toBeUndefined();
    // Frozen attempts and committed chapters are untouched.
    expect(migrated.attempts[0].capaPrompt).toEqual(frozenPrompt);
    expect(migrated.chapters).toEqual(current.chapters);
    expect(readHarnessWorkspaceState(stored).stories[0].skillLoadout).toEqual({ author: { id: AUTHOR, version: '1.0.0' } });

    // The upgraded story writes its next chapter in Standard with its language's package.
    const reloaded = new HarnessGenerationController({
      repository: new InMemoryHarnessGenerationRepository(migrated),
      installedSkills: [japaneseWriting()],
      modelAdapter: {
        getServerInfo: async () => { throw new Error('unused'); },
        generate: async request => { run.requests.push(structuredClone(request)); return { rawProviderResponse: reply('Mei rested.'), providerReceipt: receipt }; },
        arcOperation: async () => ({ rawProviderResponse: '{}', providerReceipt: receipt }),
      },
    });
    await reloaded.hydrate();
    await reloaded.generateNextChapter(run.story.id, 'fixture');
    expect(slotsOf(run.requests.at(-1)!)).toEqual({ author: AUTHOR, translation: 'test.writing.ja' });
  });
});
