import { describe, expect, it, vi } from 'vitest';
import {
  HarnessGenerationController,
  type HarnessGenerationModelAdapter,
  retagChapterGap,
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

/** A device whose disk loses exactly one write: the first to save this stage. */
class LosesOneWrite extends InMemoryHarnessGenerationRepository {
  private lost = false;
  constructor(private readonly stage: string) { super(); }
  override async save(state: Parameters<InMemoryHarnessGenerationRepository['save']>[0]) {
    if (!this.lost && state.attempts.some(attempt => attempt.stage === this.stage)) {
      this.lost = true;
      throw new Error(`Simulated local write failure at the ${this.stage} checkpoint.`);
    }
    await super.save(state);
  }
}

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

const setup = async ({ tagChapter, repository = new InMemoryHarnessGenerationRepository() }: {
  tagChapter?: NonNullable<HarnessGenerationModelAdapter['tagChapter']>;
  repository?: InMemoryHarnessGenerationRepository;
} = {}) => {
  const generate = vi.fn<HarnessGenerationModelAdapter['generate']>();
  const controller = new HarnessGenerationController({
    repository, runtime,
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

  it('saves a tagged line under the main character\'s own name, as theirs', async () => {
    // The tagger writes [[@MC]] for the main character, as every tag does. Read
    // Aloud picks the Protagonist voice from `protagonist`, so a tagged line
    // that is not marked theirs is read in the wrong voice.
    const spoken = `\u201cHold the gate,\u201d ${PROSE}`;
    const tagChapter = tagging(paragraph => paragraph === spoken ? `[[@MC]] ${paragraph}` : paragraph);
    const { write, chapter } = await setup({ tagChapter });
    await write([spoken]);
    const speaker = chapter().speakers?.[0];
    expect(speaker?.payload.speaker).toBe('Ye Chen');
    expect(speaker?.payload.protagonist).toBe(true);
  });

  it('keeps the appearances list of a tagged chapter even when it is empty', async () => {
    // An empty list and no list mean different things: no list means the
    // chapter was never asked, which is what turns off the check for someone
    // speaking before they have appeared.
    const tagChapter = tagging(paragraph => paragraph);
    const { write, chapter } = await setup({ tagChapter });
    await write();
    expect(chapter().tagging?.status).toBe('tagged');
    expect(chapter().appearances).toEqual([]);
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

  it('reads the newest chapter again and replaces the tags it had', async () => {
    let gained = 'Rusted Iron Sword';
    const tagChapter = tagging(paragraph => paragraph === PROSE ? `[[gained: MC | ${gained}]] ${paragraph}` : paragraph);
    const { write, chapter, controller, storyId } = await setup({ tagChapter });
    await write();
    const first = chapter().holdingChanges![0].payload.target?.entryId;
    expect(controller.snapshot().codexEntries.map(entry => entry.name)).toContain('Rusted Iron Sword');
    // Read again, this time the tagger names it differently.
    gained = 'Old Iron Blade';
    await controller.retagLatestChapter(storyId);
    expect(tagChapter).toHaveBeenCalledTimes(2);
    const after = chapter();
    expect(after.holdingChanges).toHaveLength(1);
    expect(after.holdingChanges![0].payload.target?.entryId).not.toBe(first);
    const names = controller.snapshot().codexEntries.filter(entry => entry.storyId === storyId).map(entry => entry.name);
    // The entry the old tags brought in is gone, not left behind as a stranger.
    expect(names).toContain('Old Iron Blade');
    expect(names).not.toContain('Rusted Iron Sword');
    expect(after.paragraphs[0]).toBe(PROSE);
  });

  it('recovers a chapter whose tagging failed', async () => {
    let fail = true;
    const tagChapter = vi.fn(async (request: HarnessTagRequest) => {
      if (fail) throw new Error('the tagger is unreachable');
      return { rawProviderResponse: JSON.stringify({ paragraphs: request.paragraphs.map(paragraph => paragraph === PROSE ? `[[@MC]] ${paragraph}` : paragraph) }), providerReceipt: receipt };
    });
    const { write, chapter, controller, storyId } = await setup({ tagChapter });
    await write([`\u201cHold.\u201d ${PROSE}`]);
    expect(chapter().tagging?.status).toBe('failed');
    fail = false;
    await controller.retagLatestChapter(storyId);
    expect(chapter().tagging?.status).toBe('tagged');
  });

  it('refuses a chapter carrying work only a person could have placed', async () => {
    // The guard is read straight, so the test is about what it refuses rather
    // than about Create mode's own checks on where an attachment sits.
    const tagChapter = tagging(paragraph => paragraph);
    const { write, controller, storyId } = await setup({ tagChapter });
    await write();
    const state = controller.snapshot();
    expect(retagChapterGap(state, storyId)).toBeUndefined();

    // A Sound Cue the reader placed by hand: tagging again would take it away.
    const withManualCue = {
      ...state,
      chapters: state.chapters.map(chapter => ({
        ...chapter,
        soundCues: [{ ...chapter.soundCues?.[0], payload: { origin: 'manual' } }] as never,
      })),
    };
    expect(retagChapterGap(withManualCue, storyId)).toContain('placed yourself');

    // A name the Holdings fixer joined into an older entry: only a rewrite of
    // this chapter can take that alias back.
    const withMerge = {
      ...state,
      chapters: state.chapters.map(chapter => ({
        ...chapter,
        fixer: { checkedAt: 'now', fixes: [{ checks: [], problems: [], outcome: 'merged' as const, merged: { keptEntryId: 'e1', alias: 'the blade' } }] },
      })),
    };
    expect(retagChapterGap(withMerge, storyId)).toContain('joined into one');
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

  // The two checkpoints either side of tagging, when the device fails to save
  // one and the reader asks the chapter to carry on.
  it('tags the chapter when the write before tagging is the one that failed', async () => {
    const tagChapter = tagging(paragraph => paragraph === PROSE
      ? `[[gained: MC | Rusted Iron Sword]] ${paragraph}`
      : paragraph);
    const { write, chapter, controller } = await setup({ tagChapter, repository: new LosesOneWrite('events_preserved') });
    await write();
    const attempt = () => controller.snapshot().attempts.at(-1)!;
    expect(attempt().stage).toBe('accepted_not_durable');
    expect(attempt().recoveryStage).toBe('events_preserved');
    // Tagging comes after this checkpoint, so it has not happened yet.
    expect(tagChapter).not.toHaveBeenCalled();
    expect(controller.snapshot().chapters).toHaveLength(0);

    await controller.retryAppropriateStage(attempt().id);
    expect(tagChapter).toHaveBeenCalledTimes(1);
    expect(chapter().tagging?.status).toBe('tagged');
    expect(chapter().holdingChanges).toHaveLength(1);
  });

  it('commits a chapter already read without asking the tagger twice', async () => {
    const tagChapter = tagging(paragraph => paragraph === PROSE
      ? `[[gained: MC | Rusted Iron Sword]] ${paragraph}`
      : paragraph);
    const { write, chapter, controller } = await setup({ tagChapter, repository: new LosesOneWrite('tagged') });
    await write();
    const attempt = () => controller.snapshot().attempts.at(-1)!;
    expect(attempt().stage).toBe('accepted_not_durable');
    expect(attempt().recoveryStage).toBe('tagged');
    expect(tagChapter).toHaveBeenCalledTimes(1);

    await controller.retryAppropriateStage(attempt().id);
    // The tagger's own answer was still in memory, so the retry saves it and
    // commits rather than spending a second call on a chapter already read.
    expect(tagChapter).toHaveBeenCalledTimes(1);
    expect(chapter().tagging?.status).toBe('tagged');
    expect(chapter().holdingChanges).toHaveLength(1);
  });
});
