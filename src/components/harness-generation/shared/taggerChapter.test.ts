import { describe, expect, it, vi } from 'vitest';
import {
  HarnessGenerationController,
  type HarnessGenerationModelAdapter,
  deriveStoryCodex,
  notesOfTaggedChapter,
  retagChapterGap,
  type HarnessTagRequest,
} from '@seihouse/sen/harness-generation';
import type { WorldRecord } from '../../../narrative/worldRecord';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { writtenChapterReply } from '../../../test-utils/writtenChapter';

/**
 * The tagger in the chapter flow (SENSEI, 2026-10-24): the writer writes the
 * prose, and one call afterwards reads the finished chapter and writes the
 * app's tags for it, as notes in the margin. It runs before the commit, so the
 * tags travel in the one write that already saves the chapter and the Codex
 * entries its names resolve to — and a chapter is never refused for its tagging.
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
 * A tagger that answers from the chapter it was given: `tag` writes the tags
 * of the one paragraph it recognises in the inline form, and the answer is
 * the notes that put those tags on those words, as a real tagger writes them.
 */
const tagging = (tag: (paragraph: string) => string) =>
  vi.fn(async (request: HarnessTagRequest) => ({
    rawProviderResponse: JSON.stringify({ notes: notesOfTaggedChapter(request.paragraphs.map(tag)) }),
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

  it('reads the chapter with the host\'s tagger choice when there is one, and records who read it', async () => {
    // The Model Router's Chapter Tagger choice (SENSEI, 2026-10-29): a model of
    // its own and how hard it thinks. Without one, the chapter's writer tags it.
    const tagChapter = tagging(paragraph => paragraph);
    const { write, chapter, controller, storyId } = await setup({ tagChapter });
    await write();
    expect(tagChapter.mock.calls[0][0]).toMatchObject({ model: 'fixture' });
    expect(tagChapter.mock.calls[0][0].reasoningLevel).toBeUndefined();
    expect(chapter().tagging?.model).toBe('fixture');
    controller.setTagger({ model: 'cheap-model', reasoningLevel: 'high' });
    await controller.retagChapter(storyId, chapter().id);
    expect(tagChapter.mock.calls[1][0]).toMatchObject({ model: 'cheap-model', reasoningLevel: 'high' });
    expect(chapter().tagging?.model).toBe('cheap-model');
    // A level alone keeps the chapter's writer.
    controller.setTagger({ reasoningLevel: 'low' });
    await write(['He swung the rusted sword at the post.']);
    expect(tagChapter.mock.calls[2][0]).toMatchObject({ model: 'fixture', reasoningLevel: 'low' });
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

  it('unlocks a Codex card the moment a tag reaches it, and leaves it locked when the tagging failed', async () => {
    // The Codex shows a card the story has reached (SENSEI, 2026-10-22), and
    // reaching is read from tags alone: on The Nine-Fold Furnace a failed
    // tagging left 22 intact world cards locked and the Codex blank.
    const world: WorldRecord = { cards: [{ key: 'world:character:ye-chen', kind: 'character', name: 'Ye Chen', mainCharacter: true, enteredInChapter: 0, slots: {} }] };
    const spoken = `\u201cHold the gate,\u201d ${PROSE}`;
    const codexOf = (controller: HarnessGenerationController) => {
      const state = controller.snapshot();
      return deriveStoryCodex({ entries: state.codexEntries, chapters: state.chapters, world, mainCharacterName: 'Ye Chen' });
    };
    const failing = await setup({ tagChapter: vi.fn(async () => { throw new Error('the tagger is unreachable'); }) });
    await failing.write([spoken]);
    expect(failing.chapter().tagging?.status).toBe('failed');
    expect(codexOf(failing.controller).characters.map(character => character.name)).toEqual([]);

    const tagged = await setup({ tagChapter: tagging(paragraph => paragraph === spoken ? `[[@MC]] ${paragraph}` : paragraph) });
    await tagged.write([spoken]);
    expect(tagged.chapter().tagging?.status).toBe('tagged');
    expect(codexOf(tagged.controller).characters.map(character => character.name)).toEqual(['Ye Chen']);
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

  it('commits the chapter with the notes that land, and the prose as written, when a note names words the chapter does not have', async () => {
    // The tagger never holds the prose, so it cannot change it: a note that
    // points at words not in its paragraph is dropped on its own, and the
    // chapter still commits as tagged with every other note.
    const tagChapter = vi.fn(async (request: HarnessTagRequest) => ({
      rawProviderResponse: JSON.stringify({ notes: [
        { paragraph: 1, words: 'Ye Chen snatched the old blade', tag: '[[gained: MC | Old Blade]]' },
        { paragraph: 1, words: request.paragraphs[0], tag: '[[appears: MC | character]]' },
      ] }),
      providerReceipt: receipt,
    }));
    const { write, chapter } = await setup({ tagChapter });
    await write();
    expect(chapter().tagging?.status).toBe('tagged');
    expect(chapter().tagging?.warnings?.some(warning => warning.code === 'tag_note_dropped' && warning.message.includes('snatched'))).toBe(true);
    // The chapter keeps every word the writer wrote.
    expect(chapter().paragraphs[0]).toBe(PROSE);
    expect(chapter().holdingChanges).toBeUndefined();
    expect(chapter().appearances).toHaveLength(1);
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
    await controller.retagChapter(storyId, chapter().id);
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
      return { rawProviderResponse: JSON.stringify({ notes: notesOfTaggedChapter(request.paragraphs.map(paragraph => paragraph === PROSE ? `[[@MC]] ${paragraph}` : paragraph)) }), providerReceipt: receipt };
    });
    const { write, chapter, controller, storyId } = await setup({ tagChapter });
    await write([`\u201cHold.\u201d ${PROSE}`]);
    expect(chapter().tagging?.status).toBe('failed');
    fail = false;
    await controller.retagChapter(storyId, chapter().id);
    expect(chapter().tagging?.status).toBe('tagged');
  });

  it('reads an earlier chapter again, keeps what later chapters still name, and counts its notes', async () => {
    // Chapter 1 names the sword first; chapter 2 names it too. Reading chapter 1
    // again must not take the sword's entry from under chapter 2's tag.
    let tag = (paragraph: string) => paragraph === PROSE ? `[[gained: MC | Rusted Iron Sword]] ${paragraph}` : paragraph;
    const tagChapter = tagging(paragraph => tag(paragraph));
    const { write, controller, storyId } = await setup({ tagChapter });
    await write();
    tag = paragraph => paragraph === PROSE ? `[[equipped: MC | Rusted Iron Sword]] ${paragraph}` : paragraph;
    await write();
    const [first, second] = controller.snapshot().chapters.filter(entry => entry.storyId === storyId);
    const sword = second.holdingChanges![0].payload.target!.entryId;
    expect(first.holdingChanges![0].payload.target!.entryId).toBe(sword);
    expect(first.tagging?.notes).toEqual({ written: 1, placed: 1 });

    // Chapter 1 read again, and this time the tagger names nothing.
    tag = paragraph => paragraph;
    expect(controller.retagChapterGap(storyId, first.id)).toBeUndefined();
    await controller.retagChapter(storyId, first.id);
    expect(tagChapter).toHaveBeenCalledTimes(3);
    expect(tagChapter.mock.calls[2][0]).toMatchObject({ chapterId: first.id, chapterNumber: 1 });
    const after = controller.snapshot();
    const reread = after.chapters.find(entry => entry.id === first.id)!;
    expect(reread.holdingChanges).toBeUndefined();
    expect(reread.tagging).toMatchObject({ status: 'tagged', notes: { written: 0, placed: 0 } });
    // Chapter 2 still points at the sword, and the sword is still there.
    expect(after.chapters.find(entry => entry.id === second.id)!.holdingChanges![0].payload.target!.entryId).toBe(sword);
    expect(after.codexEntries.some(entry => entry.id === sword)).toBe(true);
    // A chapter this story never saved, and a chapter whose attempt is gone, are refused in words.
    expect(controller.retagChapterGap(storyId, 'hch-none')).toContain('not saved in this story');
    expect(retagChapterGap({ ...after, attempts: [] }, storyId, first.id)).toContain('no longer has the record');
  });

  it('refuses a chapter carrying work only a person could have placed', async () => {
    // The guard is read straight, so the test is about what it refuses rather
    // than about Create mode's own checks on where an attachment sits.
    const tagChapter = tagging(paragraph => paragraph);
    const { write, controller, storyId } = await setup({ tagChapter });
    await write();
    const state = controller.snapshot();
    const chapterId = state.chapters[0].id;
    expect(retagChapterGap(state, storyId, chapterId)).toBeUndefined();

    // A Sound Cue the reader placed by hand: tagging again would take it away.
    const withManualCue = {
      ...state,
      chapters: state.chapters.map(chapter => ({
        ...chapter,
        soundCues: [{ ...chapter.soundCues?.[0], payload: { origin: 'manual' } }] as never,
      })),
    };
    expect(retagChapterGap(withManualCue, storyId, chapterId)).toContain('placed yourself');

    // A name the Holdings fixer joined into an older entry: only a rewrite of
    // this chapter can take that alias back.
    const withMerge = {
      ...state,
      chapters: state.chapters.map(chapter => ({
        ...chapter,
        fixer: { checkedAt: 'now', fixes: [{ checks: [], problems: [], outcome: 'merged' as const, merged: { keptEntryId: 'e1', alias: 'the blade' } }] },
      })),
    };
    expect(retagChapterGap(withMerge, storyId, chapterId)).toContain('joined into one');
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
    const { write, chapter, controller } = await setup({ tagChapter, repository: new LosesOneWrite('prose_accepted') });
    await write();
    const attempt = () => controller.snapshot().attempts.at(-1)!;
    expect(attempt().stage).toBe('accepted_not_durable');
    expect(attempt().recoveryStage).toBe('prose_accepted');
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
