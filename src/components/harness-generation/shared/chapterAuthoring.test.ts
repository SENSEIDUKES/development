import { describe, expect, it, vi } from 'vitest';
import {
  HarnessGenerationController,
  type HarnessArcRequest,
  type HarnessGenerationModelAdapter,
  type HarnessGenerationRequest,
} from '@seihouse/sen/harness-generation';
import type { ArcPlan } from '@seihouse/sen/arc-goals';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { writtenChapter } from '../../../test-utils/writtenChapter';
import { harnessParagraphBlockId } from './chapterBody';

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

const setup = async () => {
  const outputs: Array<Record<string, unknown>> = [];
  const modelAdapter: HarnessGenerationModelAdapter = {
    getServerInfo: async () => ({ configured: true, provider: 'fixture', defaultModel: 'fixture', models: [] }),
    generate: vi.fn(async (_request: HarnessGenerationRequest) => ({
      rawProviderResponse: JSON.stringify(writtenChapter(outputs.shift() ?? reply('Onward', ['Lin waded on.']))), providerReceipt: receipt,
    })),
    arcOperation: async (_request: HarnessArcRequest) => ({ rawProviderResponse: '{}', providerReceipt: receipt }),
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
  return { controller, repository, write, chapters };
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
    // Writing the next chapter seals this one: what still waits is let go, and the mark stays for the reread.
    await run.write(reply('The Bridge', ['Lin crossed the rope bridge.']));
    expect(run.chapters()[0].authoring).toEqual({ editedAt: '2026-10-12T12:00:00.000Z' });
    expect(run.chapters()[1].authoring).toBeUndefined();
  });

  it('keeps the reader\'s opening soundscape and atmosphere, and one change of each partway through, on its word', async () => {
    const run = await setup();
    await run.write(reply('The Flood', ['Lin tied the rope to the rail.', 'The water rose over the stair.']));
    const [chapter] = run.chapters();
    const index = chapter.paragraphs.findIndex(paragraph => paragraph.includes('water rose'));
    const blockId = harnessParagraphBlockId(chapter.chapterNumber, index);
    const word = (text: string) => {
      const at = chapter.paragraphs[index].indexOf(text);
      return { level: 'span' as const, blockId, startOffset: at, endOffset: at + text.length, selectedText: text };
    };
    const music = { id: 'music', kind: 'soundscape-change' as const, anchor: word('water'), payload: { pieceId: 'war-1' } };
    const air = { id: 'air', kind: 'atmosphere-change' as const, anchor: word('stair'), payload: { atmosphereId: 'storm' } };
    const base = { paragraphs: chapter.paragraphs, soundCues: chapter.soundCues, speakers: chapter.speakers, holdingChanges: chapter.holdingChanges };
    await run.controller.authorChapter(chapter.id, { ...base, openingSound: { soundscape: { pieceId: 'calm-1' } }, soundtrackChanges: [music, air] });
    const [saved] = run.chapters();
    expect(saved.openingSound).toEqual({ soundscape: { pieceId: 'calm-1' } });
    expect(saved.soundtrackChanges).toEqual([music, air]);
    // Two of each kind, the opening included: a second change of music is refused.
    await expect(run.controller.authorChapter(chapter.id, { ...base, soundtrackChanges: [music, { ...music, id: 'again', anchor: word('stair') }] }))
      .rejects.toThrow('changes its music at most once after its opening');
    // A change keeps to its word like every other effect.
    await expect(run.controller.authorChapter(chapter.id, { ...base, soundtrackChanges: [{ ...music, anchor: { ...music.anchor, selectedText: 'fire' } }] }))
      .rejects.toThrow('must sit on its words');
    // Choosing the writer's opening again clears the reader's.
    await run.controller.authorChapter(chapter.id, base);
    expect(run.chapters()[0].openingSound).toBeUndefined();
    expect(run.chapters()[0].soundtrackChanges).toBeUndefined();
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
