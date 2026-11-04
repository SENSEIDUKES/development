import { describe, expect, it, vi } from 'vitest';
import { HarnessGenerationController, notesOfTaggedChapter, retagChapterGap, type HarnessGenerationModelAdapter, type HarnessTagRequest } from '@seihouse/sen/harness-generation';
import { createLibraryMediaPort } from '@seihouse/library/media';
import { LIBRARY_BASE_MEDIA } from '../../../host/media/libraryCatalog';
import { createReplayTagger } from '../../../test-utils/replayTagger';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { writtenChapter } from '../../../test-utils/writtenChapter';
import { buildHarnessTagPrompt } from '../../../server/harness-generation/tagger';

/**
 * Tag media again (SENSEI, 2026-11-04: "maybe you only want to have it retag
 * a specific thing"): the chapter's sound read again on its own. Only its
 * Sound Cues and its soundscape and atmosphere change; every name, holding,
 * appearance and Codex entry stays exactly as the full read placed it.
 */

const GOAL = { arcNumber: 1, goals: [{ id: 'arc-1-name', text: 'Reclaim her name.', chapters: 30 }] };
const receipt = { provider: 'gemini' as const, model: 'test-model', generatedAt: '2026-11-04T12:00:00.000Z', usage: { source: 'unavailable' as const } };
const PARAGRAPHS = [
  '[[gained: MC | Bell Key]] Mara found the bell key under the drowned gate.',
  'Mara froze as [[sound: beast roar | the beast roared | high]] beyond the seawall. Nothing answered it.',
];
const reply = JSON.stringify(writtenChapter({
  title: 'Low Tide', paragraphs: PARAGRAPHS,
  arcCompletion: { goalId: 'arc-1-name', completed: false, evidence: '' },
  recap: 'Low Tide.', chapterFunction: 'progression',
  nextProgression: 'Mara climbs the bell tower.', nextWorldBuilding: 'The keeper explains the drowned law.', nextConflict: 'The tide wardens seize the causeway.',
}));

const setup = async () => {
  const { tagChapter, teach } = createReplayTagger(receipt);
  const adapter: HarnessGenerationModelAdapter = {
    getServerInfo: async () => ({ provider: 'gemini', configured: true, models: [{ id: 'test-model', label: 'Test' }], defaultModel: 'test-model' }),
    generate: vi.fn(async () => ({ rawProviderResponse: teach(reply), providerReceipt: receipt })),
    tagChapter,
    arcOperation: async () => ({ rawProviderResponse: '{}', providerReceipt: receipt }),
  };
  const controller = new HarnessGenerationController({
    repository: new InMemoryHarnessGenerationRepository(), modelAdapter: adapter,
    media: createLibraryMediaPort({ registered: [], entitlements: [], base: LIBRARY_BASE_MEDIA }),
  });
  await controller.hydrate();
  const story = await controller.createStory({ premise: 'A courier returns to the drowned city that erased her name.', destinedEnding: 'Mara reclaims her name.', initialArcPlan: GOAL });
  await controller.generateNextChapter(story.id, 'test-model');
  const chapter = () => controller.snapshot().chapters.find(entry => entry.storyId === story.id)!;
  return { controller, adapter, storyId: story.id, chapter };
};

describe('Tag media again', () => {
  it('reads the sound alone and replaces only the chapter\'s cues and soundtrack', async () => {
    const { controller, adapter, storyId, chapter } = await setup();
    const before = chapter();
    const codexBefore = controller.snapshot().codexEntries;
    expect(before.soundCues!.map(cue => cue.anchor.selectedText)).toEqual(['the beast roared']);
    expect(before.holdingChanges).toHaveLength(1);
    expect(controller.retagChapterGap(storyId, before.id, 'media')).toBeUndefined();

    // The media read answers with a cue on other words, and a holding it was never asked for.
    const requests: HarnessTagRequest[] = [];
    adapter.tagChapter = vi.fn(async (request: HarnessTagRequest) => {
      requests.push(request);
      const prose = request.paragraphs;
      const notes = notesOfTaggedChapter([
        `[[gained: MC | Sea Glass]] ${prose[0]}`,
        prose[1].replace('beyond the seawall', 'beyond [[sound: beast roar | the seawall | low]]'),
      ]);
      return { rawProviderResponse: JSON.stringify({ notes }), providerReceipt: receipt };
    });
    await controller.retagChapter(storyId, before.id, { focus: 'media' });

    // The tagger was asked for media alone: no names, no holdings, focus said.
    expect(requests).toHaveLength(1);
    expect(requests[0].focus).toBe('media');
    expect(requests[0].subjects).toEqual([]);
    expect(requests[0].holdings).toBeUndefined();
    const prompt = buildHarnessTagPrompt(requests[0]);
    expect(prompt.userPrompt).not.toContain('WHO AND WHAT THE STORY ALREADY HAS');
    expect(prompt.userPrompt).not.toContain('WHAT EACH CHARACTER HAD');
    expect(buildHarnessTagPrompt({ ...requests[0], focus: undefined }).systemInstruction.length).toBeGreaterThan(prompt.systemInstruction.length);

    const after = chapter();
    // The sound changed; nothing else did.
    expect(after.soundCues!.map(cue => cue.anchor.selectedText)).toEqual(['the seawall']);
    expect(after.holdingChanges).toEqual(before.holdingChanges);
    expect(after.speakers).toEqual(before.speakers);
    expect(after.appearances).toEqual(before.appearances);
    expect(after.paragraphs).toEqual(before.paragraphs);
    expect(controller.snapshot().codexEntries).toEqual(codexBefore);
    // The record keeps the full read and says when the media was read again.
    expect(after.tagging!.at).toBe(before.tagging!.at);
    expect(after.tagging!.media).toMatchObject({ model: 'test-model', notes: { written: 2, placed: 2 } });
  });

  it('changes nothing when the media read fails, and says why', async () => {
    const { controller, adapter, storyId, chapter } = await setup();
    const before = chapter();
    adapter.tagChapter = vi.fn(async () => { throw new Error('the tagger is unreachable'); });
    await expect(controller.retagChapter(storyId, before.id, { focus: 'media' })).rejects.toThrow('the tagger is unreachable');
    expect(chapter()).toEqual(before);
  });

  it('is offered only on a chapter read in full, and only where it has sound equipped', async () => {
    const { controller, storyId, chapter } = await setup();
    const state = controller.snapshot();
    const id = chapter().id;
    const untagged = { ...state, chapters: state.chapters.map(entry => entry.id === id ? { ...entry, tagging: undefined } : entry) };
    expect(retagChapterGap(untagged, storyId, id, 'media')).toContain('Tag all of Chapter 1 first');
    const silent = { ...state, chapters: state.chapters.map(entry => entry.id === id ? { ...entry, mediaLoadout: { ...entry.mediaLoadout, sounds: [], soundCues: [], soundscapes: [], atmospheres: [] } } : entry) };
    expect(retagChapterGap(silent, storyId, id, 'media')).toContain('no media to tag');
  });
});
