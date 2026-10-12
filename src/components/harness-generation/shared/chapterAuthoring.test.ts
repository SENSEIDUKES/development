import { describe, expect, it, vi } from 'vitest';
import {
  HarnessGenerationController,
  type HarnessArcRequest,
  type HarnessChapterRereadRequest,
  type HarnessGenerationModelAdapter,
  type HarnessGenerationRequest,
} from '@seihouse/sen/harness-generation';
import type { ArcPlan } from '@seihouse/sen/arc-goals';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { writtenChapter } from '../../../test-utils/writtenChapter';

/**
 * Create mode saves the reader's own changes to the newest chapter: its words
 * and the effects on them. Moving on seals it, so an earlier chapter is fixed.
 */

const plan: ArcPlan = { arcNumber: 1, goals: [
  { id: 'arc-1-flood', text: 'Survive the first flood.', chapters: 3 },
  { id: 'arc-1-ending', text: 'Reopen the drowned archive to the valley.', chapters: 27 },
] };
const receipt = { provider: 'fixture', model: 'fixture', generatedAt: 'now', usage: { source: 'unavailable' as const } };
const reply = (title: string, paragraphs: string[]) => ({
  title, paragraphs, recap: `${title}: ${paragraphs[0]}`, chapterFunction: 'progression',
  nextProgression: 'Lin climbs the archive tower.', nextWorldBuilding: 'The flood reveals the old canals.', nextConflict: 'A river cult blocks the stair.',
  arcCompletion: { goalId: 'none', completed: false, evidence: '' },
});
let ids = 0;
const runtime = { now: () => '2026-10-12T12:00:00.000Z', createId: (prefix: string) => `${prefix}-${++ids}` };

const setup = async (reread?: (request: HarnessChapterRereadRequest) => Record<string, unknown> | string) => {
  const outputs: Array<Record<string, unknown>> = [];
  const rereads: HarnessChapterRereadRequest[] = [];
  const modelAdapter: HarnessGenerationModelAdapter = {
    getServerInfo: async () => ({ configured: true, provider: 'fixture', defaultModel: 'fixture', models: [] }),
    generate: vi.fn(async (_request: HarnessGenerationRequest) => ({
      rawProviderResponse: JSON.stringify(writtenChapter(outputs.shift() ?? reply('Onward', ['Lin waded on.']))), providerReceipt: receipt,
    })),
    arcOperation: async (_request: HarnessArcRequest) => ({ rawProviderResponse: '{}', providerReceipt: receipt }),
    ...(reread ? { rereadChapter: async (request: HarnessChapterRereadRequest) => {
      rereads.push(structuredClone(request));
      const answer = reread(request);
      return { rawProviderResponse: typeof answer === 'string' ? answer : JSON.stringify(answer), providerReceipt: receipt };
    } } : {}),
  };
  const repository = new InMemoryHarnessGenerationRepository();
  const controller = new HarnessGenerationController({ repository, modelAdapter, runtime });
  await controller.hydrate();
  const story = await controller.createStory({
    premise: 'An archivist races the rising river.', destinedEnding: 'Lin reopens the drowned archive to the valley.',
    initialArcPlan: plan, plannedArcCount: 1, cast: [{ name: 'Lin', role: 'Archivist', isMainCharacter: true, relationshipToMC: 'Self' }],
  });
  const write = async (next: Record<string, unknown>) => { outputs.push(next); await controller.generateNextChapter(story.id, 'fixture'); };
  const chapters = () => [...controller.snapshot().chapters].sort((left, right) => left.chapterNumber - right.chapterNumber);
  return { controller, repository, write, chapters, rereads };
};

describe('Create mode: authoring the newest chapter', () => {
  it('saves the newest chapter\'s changed words and the effects on them, and keeps them', async () => {
    const run = await setup();
    await run.write(reply('The Flood', ['Lin tied the rope to the rail.', 'The water rose.']));
    const [chapter] = run.chapters();
    const holdings = chapter.holdingChanges ?? [];
    // A change after every effect's words leaves them where they are.
    const paragraphs = chapter.paragraphs.map((paragraph, index) => index === 1 ? 'The black water rose to the stair.' : paragraph);
    await run.controller.authorChapter(chapter.id, { paragraphs, soundCues: chapter.soundCues, speakers: chapter.speakers, holdingChanges: holdings });
    const [saved] = run.chapters();
    expect(saved.paragraphs).toEqual(paragraphs);
    expect(saved.prose).toBe(paragraphs.join('\n\n'));
    expect(saved.metrics.wordCount).toBe(chapter.metrics.wordCount + 4);
    expect(saved.holdingChanges ?? []).toEqual(holdings);
    // It is kept: the repository holds the change.
    expect(run.repository.snapshot().chapters.find(entry => entry.id === chapter.id)!.paragraphs[1]).toBe('The black water rose to the stair.');
  });

  it('refuses a change that would lose a paragraph, empty one, or leave an effect off its words', async () => {
    const run = await setup();
    await run.write(reply('The Flood', ['Lin tied the rope to the rail.', 'The water rose.']));
    const [chapter] = run.chapters();
    const changed = (at: number, text: string) => chapter.paragraphs.map((paragraph, index) => index === at ? text : paragraph);
    await expect(run.controller.authorChapter(chapter.id, { paragraphs: chapter.paragraphs.slice(1) })).rejects.toThrow('keeps its paragraphs');
    await expect(run.controller.authorChapter(chapter.id, { paragraphs: changed(1, '  ') })).rejects.toThrow('needs some words');
    const cue = { id: 'cue-1', kind: 'sound-cue', anchor: { level: 'span', blockId: 'c1-p1', startOffset: 0, endOffset: 3, selectedText: 'Lin' },
      payload: { origin: 'manual', sound: 'rope', cue: { publicUrl: 'https://example.test/rope.ogg', provenance: { packageId: 'p', version: '1.0.0' }, category: 'foley' } } };
    await expect(run.controller.authorChapter(chapter.id, {
      paragraphs: changed(0, 'Mara tied the rope to the rail.'), soundCues: [cue as never],
    })).rejects.toThrow('must sit on its words');
    expect(run.chapters()[0].paragraphs).toEqual(chapter.paragraphs);
  });

  it('marks a changed chapter for its reread, keeps effects off their words waiting until the seal, then lets them go', async () => {
    const run = await setup();
    await run.write(reply('The Flood', ['Lin tied the rope to the rail.', 'The water rose.']));
    const [chapter] = run.chapters();
    expect(chapter.authoring).toBeUndefined();
    const waiting = { id: 'cue-w', kind: 'sound-cue', anchor: { level: 'span', blockId: 'c1-p1', startOffset: 4, endOffset: 8, selectedText: 'tied', detached: true },
      payload: { origin: 'manual', sound: 'rope', cue: { publicUrl: 'https://example.test/rope.ogg', provenance: { packageId: 'p', version: '1.0.0' }, category: 'foley' } } };
    await run.controller.authorChapter(chapter.id, {
      paragraphs: chapter.paragraphs.map((paragraph, index) => index === 0 ? 'Lin knotted the rope to the rail.' : paragraph),
      soundCues: chapter.soundCues, speakers: chapter.speakers, holdingChanges: chapter.holdingChanges, waiting: [waiting as never],
    });
    expect(run.chapters()[0].authoring).toEqual({ editedAt: '2026-10-12T12:00:00.000Z', waiting: [waiting] });
    // Writing the next chapter seals this one: what still waits is let go. This host cannot reread, so the
    // chapter is kept as the reader left it, the reason is kept, and the story goes on.
    await run.write(reply('The Bridge', ['Lin crossed the rope bridge.']));
    expect(run.chapters()[0].authoring).toEqual({ editedAt: '2026-10-12T12:00:00.000Z',
      reread: { at: '2026-10-12T12:00:00.000Z', model: 'fixture', error: 'This host cannot reread a chapter, so it was kept as the reader left it.' } });
    expect(run.chapters()[0].paragraphs[0]).toBe('Lin knotted the rope to the rail.');
    expect(run.chapters()[1].authoring).toBeUndefined();
  });

  it('seals a chapter once the story moves on from it', async () => {
    const run = await setup();
    await run.write(reply('The Flood', ['Lin tied the rope to the rail.']));
    await run.write(reply('The Bridge', ['Lin crossed the rope bridge.']));
    const [first, second] = run.chapters();
    await expect(run.controller.authorChapter(first.id, { paragraphs: first.paragraphs })).rejects.toThrow('Chapter 1 is sealed');
    const paragraphs = second.paragraphs.map((paragraph, index) => index === 0 ? 'Lin crossed the swaying bridge.' : paragraph);
    await run.controller.authorChapter(second.id, { paragraphs, soundCues: second.soundCues, speakers: second.speakers, holdingChanges: second.holdingChanges });
    expect(run.chapters()[1].paragraphs[0]).toBe('Lin crossed the swaying bridge.');
  });
});

describe('The reread at the seal of a changed chapter', () => {
  const keeper = '"Hold the rail," Elder Qin said.';
  it('rereads a changed chapter once, before the next chapter, and puts its speakers, holdings and recap back on the kept words', async () => {
    const run = await setup(request => ({
      paragraphs: request.paragraphs.map(paragraph => paragraph === keeper ? `[[@Elder Qin]] ${paragraph}`
        : paragraph.startsWith('Lin knotted') ? `[[gained: MC | Rope Coil]] ${paragraph}` : paragraph),
      recap: 'Lin knots the rope and Elder Qin steadies her.',
      mainCharacterHoldings: ['Rope Coil'],
    }));
    await run.write(reply('The Flood', ['Lin tied the rope to the rail.', keeper]));
    const [chapter] = run.chapters();
    const paragraphs = chapter.paragraphs.map((paragraph, index) => index === 0 ? 'Lin knotted the rope to the rail.' : paragraph);
    await run.controller.authorChapter(chapter.id, { paragraphs });
    expect(run.chapters()[0].speakers).toBeUndefined();

    await run.write(reply('The Bridge', ['Lin crossed the rope bridge.']));
    // One reread, of the chapter as the reader left it, with the tags it was written with.
    expect(run.rereads).toHaveLength(1);
    expect(run.rereads[0]).toMatchObject({ operation: 'reread-chapter', chapterId: chapter.id, chapterNumber: 1, model: 'fixture', mainCharacter: 'Lin', paragraphs });
    const [reread, next] = run.chapters();
    expect(reread.paragraphs).toEqual(paragraphs);
    expect(reread.speakers?.map(speaker => [speaker.payload.speaker, speaker.anchor.blockId])).toEqual([['Elder Qin', 'c1-p2']]);
    expect(reread.holdingChanges?.map(change => [change.payload.verb, change.payload.target?.name, change.anchor.blockId])).toEqual([['gained', 'Rope Coil', 'c1-p1']]);
    expect(reread.closingHoldings).toEqual(['Rope Coil']);
    expect(reread.recap).toMatchObject({ text: 'Lin knots the rope and Elder Qin steadies her.', source: 'model' });
    expect(reread.authoring?.reread).toMatchObject({ model: 'fixture', providerReceipt: receipt });
    expect(reread.authoring?.reread?.error).toBeUndefined();
    expect(next.chapterNumber).toBe(2);

    // A chapter that was only read is never reread.
    await run.write(reply('The Tower', ['Lin climbed the tower.']));
    expect(run.rereads).toHaveLength(1);
  });

  it('a paragraph that came back with other words keeps its tags; a reply it cannot use keeps the chapter and never holds the story', async () => {
    const changedWords = await setup(request => ({
      paragraphs: request.paragraphs.map(paragraph => paragraph === keeper ? `[[@Lin]] "Hold on," Elder Qin said.` : paragraph),
      recap: 'Lin ties the rope.',
    }));
    await changedWords.write(reply('The Flood', ['Lin tied the rope to the rail.', keeper]));
    const [first] = changedWords.chapters();
    const speakers = first.speakers;
    await changedWords.controller.authorChapter(first.id, {
      paragraphs: first.paragraphs.map((paragraph, index) => index === 0 ? 'Lin knotted the rope.' : paragraph), speakers, holdingChanges: first.holdingChanges,
    });
    await changedWords.write(reply('The Bridge', ['Lin crossed the rope bridge.']));
    expect(changedWords.chapters()[0].speakers).toEqual(speakers);
    expect(changedWords.chapters()[0].authoring?.reread?.warnings).toEqual(['1 paragraph came back with different words, so it keeps the tags it had']);

    const unusable = await setup(() => ({ paragraphs: ['Only one.'], recap: 'Nothing.' }));
    await unusable.write(reply('The Flood', ['Lin tied the rope to the rail.', 'The water rose.']));
    const [chapter] = unusable.chapters();
    const paragraphs = chapter.paragraphs.map((paragraph, index) => index === 1 ? 'The black water rose.' : paragraph);
    await unusable.controller.authorChapter(chapter.id, { paragraphs });
    await unusable.write(reply('The Bridge', ['Lin crossed the rope bridge.']));
    expect(unusable.chapters()).toHaveLength(2);
    expect(unusable.chapters()[0].paragraphs).toEqual(paragraphs);
    expect(unusable.chapters()[0].recap?.text).toBe(chapter.recap?.text);
    expect(unusable.chapters()[0].authoring?.reread?.error).toBe(`The reread returned 1 paragraphs; the chapter has ${paragraphs.length}.`);
  });
});
