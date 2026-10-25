import { describe, expect, it, vi } from 'vitest';
import {
  HarnessGenerationController,
  type HarnessGenerationModelAdapter,
  type HarnessTagRequest,
} from '@seihouse/sen/harness-generation';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { writtenChapterReply } from '../../../test-utils/writtenChapter';

/**
 * The tagger in the chapter flow (SENSEI, 2026-10-24): the writer writes the
 * prose, and one call afterwards reads the finished chapter and writes the
 * app's tags into it. It runs before the commit, so the tags travel in the one
 * write that already saves the chapter and the Codex entries its names resolve
 * to — and a chapter is never refused for its tagging.
 */

const GOAL = { arcNumber: 1, goals: [{ id: 'arc-1-armory', text: 'Survive the armory trial.', chapters: 30 }] };
const receipt = { provider: 'fixture', model: 'fixture', generatedAt: '2026-10-25T12:00:00.000Z', usage: { source: 'reported' as const, inputTokens: 420, outputTokens: 60 } };

const PROSE = 'Ye Chen lifted the old blade from the rack.';
const reply = (paragraphs: string[]) => JSON.stringify({
  title: 'The Armory', paragraphs,
  arcCompletion: { goalId: 'arc-1-armory', completed: false, evidence: '' },
  recap: 'Ye Chen trains.', chapterFunction: 'progression',
  nextProgression: 'Ye Chen trains.', nextWorldBuilding: 'The armory\'s past.', nextConflict: 'A rival arrives.',
});

let ids = 0;
const runtime = { now: () => '2026-10-25T12:00:00.000Z', createId: (prefix: string) => `${prefix}-${++ids}` };

/**
 * A tagger that answers from the chapter it was given, so its paragraph count
 * always matches however long the test chapter is. `tag` rewrites the one
 * paragraph it recognises; `spoil` stands for a tagger that changed the prose.
 */
const tagging = (tag: (paragraph: string) => string) =>
  vi.fn(async (request: HarnessTagRequest) => ({
    rawProviderResponse: JSON.stringify({ paragraphs: request.paragraphs.map(tag) }),
    providerReceipt: receipt,
  }));

const setup = async ({ tagChapter }: { tagChapter?: NonNullable<HarnessGenerationModelAdapter['tagChapter']> } = {}) => {
  const generate = vi.fn<HarnessGenerationModelAdapter['generate']>();
  const controller = new HarnessGenerationController({
    repository: new InMemoryHarnessGenerationRepository(), runtime,
    modelAdapter: {
      getServerInfo: async () => ({ provider: 'gemini', configured: true, models: [], defaultModel: 'fixture' }),
      generate,
      arcOperation: async () => ({ rawProviderResponse: '{}', providerReceipt: receipt }),
      ...(tagChapter ? { tagChapter } : {}),
    },
  });
  await controller.hydrate();
  const story = await controller.createStory({
    premise: 'Ye Chen survives the armory trial.', destinedEnding: 'Ye Chen masters the armory.', initialArcPlan: GOAL,
    cast: [{ name: 'Ye Chen', role: 'Main character', isMainCharacter: true, relationshipToMC: 'Self' }],
  });
  const write = async (paragraphs: string[] = [PROSE]) => {
    generate.mockResolvedValueOnce({ rawProviderResponse: writtenChapterReply(reply(paragraphs)), providerReceipt: receipt });
    await controller.generateNextChapter(story.id, 'fixture');
  };
  const chapter = () => controller.snapshot().chapters.at(-1)!;
  return { controller, storyId: story.id, write, chapter };
};

describe('tagging a chapter as it is written', () => {
  it('commits the tagger\'s tags with the chapter, resolved to Codex entries', async () => {
    const tagChapter = tagging(paragraph => paragraph === PROSE
      ? `[[gained: MC | Rusted Iron Sword]] [[@MC]] ${paragraph}`
      : paragraph);
    const { write, chapter, controller } = await setup({ tagChapter });
    await write();
    expect(tagChapter).toHaveBeenCalledTimes(1);
    const committed = chapter();
    expect(committed.tagging?.status).toBe('tagged');
    expect(committed.holdingChanges).toHaveLength(1);
    // The name the tag wrote resolved to a Codex entry in the same write.
    const entryId = committed.holdingChanges![0].payload.target?.entryId;
    expect(entryId).toBeDefined();
    expect(controller.snapshot().codexEntries.find(entry => entry.id === entryId)?.name).toBe('Rusted Iron Sword');
    // And the prose is exactly what the writer wrote.
    expect(committed.paragraphs[0]).toBe(PROSE);
  });

  it('tells the tagger what each character had going into the chapter', async () => {
    const tagChapter = tagging(paragraph => paragraph === PROSE
      ? `[[gained: MC | Rusted Iron Sword]] ${paragraph}`
      : paragraph);
    const { write } = await setup({ tagChapter });
    await write();
    await write(['He swung the rusted sword at the post.']);
    const second = tagChapter.mock.calls[1][0];
    // The sword the first chapter recorded is already his, so the tagger can
    // see it is not something he gained again.
    expect(JSON.stringify(second.holdings)).toContain('Rusted Iron Sword');
    expect(second.subjects.map(subject => subject.name)).toContain('Rusted Iron Sword');
    // Nothing of how the story got here travels.
    expect(JSON.stringify(second)).not.toContain('Destined Ending');
  });

  it('commits the chapter with no record at all when the host has no tagger', async () => {
    const { write, chapter } = await setup();
    await write();
    expect(chapter().tagging).toBeUndefined();
    expect(chapter().paragraphs[0]).toBe(PROSE);
  });

  it('commits the chapter when the tagger throws, and says why', async () => {
    const tagChapter = vi.fn(async () => { throw new Error('the tagger is unreachable'); });
    const { write, chapter } = await setup({ tagChapter });
    await write();
    expect(chapter().tagging).toMatchObject({ status: 'failed' });
    expect(chapter().tagging?.problem).toContain('unreachable');
    expect(chapter().paragraphs[0]).toBe(PROSE);
    expect(chapter().holdingChanges).toBeUndefined();
  });

  it('commits the chapter untagged when the tagger changed a word of it', async () => {
    const tagChapter = tagging(paragraph => paragraph === PROSE
      ? '[[@MC]] Ye Chen snatched the old blade from the rack.'
      : paragraph);
    const { write, chapter } = await setup({ tagChapter });
    await write();
    expect(chapter().tagging?.status).toBe('failed');
    expect(chapter().tagging?.problem).toContain('not the tagger\'s to change');
    // The chapter keeps every word the writer wrote.
    expect(chapter().paragraphs[0]).toBe(PROSE);
    expect(chapter().speakers).toBeUndefined();
  });

  it('keeps the attempt\'s own record of the call, receipt included', async () => {
    const tagChapter = tagging(paragraph => paragraph);
    const { write, controller } = await setup({ tagChapter });
    await write();
    const attempt = controller.snapshot().attempts.at(-1)!;
    expect(attempt.stage).toBe('committed');
    expect(attempt.taggedAt).toBe('2026-10-25T12:00:00.000Z');
    expect(attempt.tagging?.providerReceipt).toMatchObject({ provider: 'fixture' });
  });
});
