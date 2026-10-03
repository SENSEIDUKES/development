import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createLibraryMediaPort } from '@seihouse/library/media';
import { DevAudioPlaybackProvider } from '../../../audio/DevAudioPlayback';
import { LIBRARY_BASE_MEDIA, LIBRARY_SOUND_WORDS } from '../../../host/media/libraryCatalog';
import { InlineAudioText } from '@seihouse/sen/inline-audio';
import {
  HARNESS_GENERATION_SCHEMA_VERSION,
  HarnessGenerationController,
  createHarnessSenStory,
  type HarnessGenerationModelAdapter,
  type HarnessGenerationRequest,
  type HarnessGenerationResponse,
} from '@seihouse/sen/harness-generation';
import { buildHarnessGenerationPrompt } from '../../../server/harness-generation/prompt';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { REST_OF_CHAPTER, writtenChapterReply } from '../../../test-utils/writtenChapter';
import { acceptHarnessModelResponse } from './responseAcceptance';

/**
 * Narration plus Sound Cues, end to end, in the tiny SEN language: the writer
 * wraps the words where a sound happens and names the sound; the HARNESS strips
 * every mark, places the cue on those exact words, picks the recording, stores
 * it as a span attachment, and the Reader shows its glyph there.
 */

const media = createLibraryMediaPort({ registered: [], entitlements: [], base: LIBRARY_BASE_MEDIA });
const GOAL = { arcNumber: 1, goals: [{ id: 'arc-1-opening', text: 'Face the debt fox.', chapters: 30 }] };

const response = (rawProviderResponse: string): HarnessGenerationResponse => ({
  rawProviderResponse,
  providerReceipt: {
    provider: 'fixture', model: 'fixture', generatedAt: '2026-09-29T12:00:00.000Z',
    usage: { source: 'reported', inputTokens: 10, outputTokens: 20, totalTokens: 30 },
  },
});

const adapter = (...raws: string[]) => {
  const generate = vi.fn(async (_request: HarnessGenerationRequest) => {
    const raw = raws.length > 1 ? raws.shift()! : raws[0];
    return response(writtenChapterReply(raw));
  });
  const value: HarnessGenerationModelAdapter = {
    getServerInfo: async () => ({ provider: 'gemini', configured: true, models: [], defaultModel: 'fixture' }),
    generate,
    arcOperation: async () => response(JSON.stringify({ plan: GOAL, destinedEnding: 'Free the city from its debts.' })),
  };
  return { value, generate };
};

/** A marked reply: two good cues, one unknown sound, one mark that covers too many words, and marks leaking into every other field. */
const markedChapter = () => ({
  title: 'The [[9|Debt Fox]]',
  paragraphs: [
    'Mara held her ground as [[1|the beast roared]] across the courtyard.',
    'She [[2|drew her sword]] and waited for the rain to stop.',
    '[[3|Thunder rolled]] over the tiled roofs.',
    'The [[4|debt collectors of the eastern ward all arrived]] at once.',
  ],
  soundCues: [
    { mark: 1, sound: 'beast roar', energy: 'high' },
    { mark: '2', sound: 'Blade Drawn' },
    { mark: 3, sound: 'thunder' },
    { mark: 4, sound: 'war cry' },
  ],
  arcCompletion: { goalId: 'arc-1-opening', completed: false, evidence: '' },
  recap: 'Mara faced [[1|the beast]] in the courtyard.',
  chapterFunction: 'conflict',
  nextProgression: 'Mara [[5|trains]] with her sword.',
  nextWorldBuilding: 'The eastern ward keeps its ledgers.',
  nextConflict: 'The fox returns.',
});

const createStory = async (controller: HarnessGenerationController, language?: 'ja') => {
  await controller.hydrate();
  return controller.createStory({
    premise: 'Mara confronts a debt spirit in a rain-soaked courtyard.',
    destinedEnding: 'Free the city from its debts.',
    initialArcPlan: GOAL,
  }, language);
};

describe('HARNESS Sound Cues through marks', () => {
  it('asks for sound words only through the CAPA Sound Cues slot and the response schema', async () => {
    const provider = adapter(JSON.stringify(markedChapter()));
    const controller = new HarnessGenerationController({ repository: new InMemoryHarnessGenerationRepository(), media, modelAdapter: provider.value });
    const story = await createStory(controller);
    await controller.generateNextChapter(story.id, 'fixture');

    const request = provider.generate.mock.calls[0][0];
    expect(request.capaPrompt.soundVocabulary).toEqual(LIBRARY_SOUND_WORDS);
    expect(request.capaPrompt.text).toContain('The examples below show how to do it.');
    expect(request.capaPrompt.text).toContain('[[n|drew his sword]] → blade drawn');
    const { responseJsonSchema, systemInstruction } = buildHarnessGenerationPrompt(request);
    const soundCues = (responseJsonSchema.properties as unknown as Record<string, { items?: { properties: { sound: { enum: string[] } } } }>).soundCues;
    expect(Object.keys(responseJsonSchema.properties).slice(0, 4)).toEqual(['title', 'plan', 'paragraphs', 'soundCues']);
    expect(soundCues.items?.properties.sound.enum).toEqual(LIBRARY_SOUND_WORDS.map(sound => sound.word));
    // Recordings, URLs and catalogs never enter the call.
    expect(JSON.stringify(request)).not.toMatch(/https:|library-default-cues|\.mp3/);
    expect(systemInstruction).not.toMatch(/dialogue|manifestations|systemPanels|creatureEvents/);
    // Speakers is its own kind, taught by its own skill: never the retired dialogue contract.
    expect(systemInstruction).toContain('CAPA SKILL [Speakers] — SEN Speakers');
  });

  it('places cues on the marked words, strips every mark, explains what it set aside, and survives reload into the Reader', async () => {
    const repository = new InMemoryHarnessGenerationRepository();
    const raw = JSON.stringify(markedChapter());
    const controller = new HarnessGenerationController({ repository, media, modelAdapter: adapter(raw).value });
    const story = await createStory(controller);
    await controller.generateNextChapter(story.id, 'fixture');

    const state = controller.snapshot();
    expect(state.schemaVersion).toBe(HARNESS_GENERATION_SCHEMA_VERSION);
    const chapter = state.chapters[0];
    expect(chapter.title).toBe('The Debt Fox');
    expect(chapter.paragraphs).toEqual([
      'Mara held her ground as the beast roared across the courtyard.',
      'She drew her sword and waited for the rain to stop.',
      'Thunder rolled over the tiled roofs.',
      'The debt collectors of the eastern ward all arrived at once.',
      REST_OF_CHAPTER,
    ]);
    // Nothing a reader, memory or the next chapter sees carries a mark.
    expect(JSON.stringify(state.chapters)).not.toContain('[[');
    expect(JSON.stringify(state.stories)).not.toContain('[[');
    expect(chapter.soundCues?.map(cue => [cue.id, cue.anchor.selectedText, cue.payload.sound, cue.payload.energy])).toEqual([
      ['sound-cue:c1-p1:24-40', 'the beast roared', 'beast roar', 'high'],
      ['sound-cue:c1-p2:4-18', 'drew her sword', 'blade drawn', undefined],
    ]);
    expect(chapter.soundCues?.every(cue => cue.payload.cue.provenance.catalogId === 'library-default-cues')).toBe(true);
    const warnings = state.attempts[0].warnings.filter(warning => warning.code === 'sound_cue_set_aside').map(warning => warning.message);
    expect(warnings).toEqual([
      'Sound Cue 3 "thunder" is not one of this story\'s sound words; it was set aside.',
      'Sound Cue 4 "war cry" covers more than 5 words ("debt collectors of the eastern ward all arrived"); it was set aside.',
    ]);

    const reloaded = new HarnessGenerationController({ repository, media, modelAdapter: adapter('{}').value });
    await reloaded.hydrate();
    const readerChapter = createHarnessSenStory(reloaded.snapshot(), story.id).arcs[0].chapters[0];
    expect(readerChapter.soundCues).toEqual(chapter.soundCues);
    const markup = renderToStaticMarkup(createElement(DevAudioPlaybackProvider, null, createElement(InlineAudioText, {
      cues: readerChapter.soundCues!.filter(cue => cue.anchor.blockId === readerChapter.blocks![0].id),
      text: readerChapter.blocks![0].text,
      renderText: (text: string) => text,
    })));
    expect(markup).toContain('data-action-type="world-cue"');
    expect(markup).toContain('data-cue-annotation="the beast roared"');
    expect(markup).toContain('Play beast roar for the beast roared');
  });

  it('places the same cues on every re-acceptance, replay and commit retry, with no second model call', async () => {
    const raw = JSON.stringify(markedChapter());
    const options = { media: LIBRARY_BASE_MEDIA, soundVocabulary: LIBRARY_SOUND_WORDS };
    expect(acceptHarnessModelResponse(raw, 1, options)).toEqual(acceptHarnessModelResponse(raw, 1, options));

    class FailFirstCommit extends InMemoryHarnessGenerationRepository {
      failed = false;
      override async save(state: Awaited<ReturnType<InMemoryHarnessGenerationRepository['load']>>) {
        if (!this.failed && state.chapters.length === 1) { this.failed = true; throw new Error('Simulated commit failure.'); }
        await super.save(state);
      }
    }
    const repository = new FailFirstCommit();
    const provider = adapter(raw);
    const controller = new HarnessGenerationController({ repository, media, modelAdapter: provider.value });
    const story = await createStory(controller);
    await controller.generateNextChapter(story.id, 'fixture');
    expect(controller.snapshot().attempts[0]).toMatchObject({ stage: 'accepted_not_durable', recoveryStage: 'committed' });
    const placed = controller.snapshot().attempts[0].acceptedDraft?.soundCues;
    expect(placed).toHaveLength(2);

    const reloaded = new HarnessGenerationController({ repository, media, modelAdapter: provider.value });
    await reloaded.hydrate();
    await reloaded.retryAppropriateStage(reloaded.snapshot().attempts[0].id);
    expect(provider.generate).toHaveBeenCalledTimes(1);
    expect(reloaded.snapshot().chapters[0].soundCues).toEqual(placed);
    const replayed = await reloaded.replayStory(story.id);
    expect(replayed.chapters[0].soundCues).toEqual(placed);
  });

  it('places a cue in a Japanese story, keeping the marked words in the story language', async () => {
    const raw = JSON.stringify({
      paragraphs: ['雨の中、林は[[1|剣を抜いた]]。', '獣が[[2|吠えた]]。'],
      soundCues: [{ mark: 1, sound: 'blade drawn', energy: 'medium' }, { mark: 2, sound: 'beast roar' }],
      arcCompletion: { goalId: 'arc-1-opening', completed: false, evidence: '' },
    });
    const controller = new HarnessGenerationController({ repository: new InMemoryHarnessGenerationRepository(), media, modelAdapter: adapter(raw).value });
    const story = await createStory(controller, 'ja');
    await controller.generateNextChapter(story.id, 'fixture');

    const chapter = controller.snapshot().chapters[0];
    expect(chapter.paragraphs).toEqual(['雨の中、林は剣を抜いた。', '獣が吠えた。', REST_OF_CHAPTER]);
    expect(chapter.soundCues?.map(cue => [cue.anchor.blockId, cue.anchor.selectedText, cue.payload.sound])).toEqual([
      ['c1-p1', '剣を抜いた', 'blade drawn'],
      ['c1-p2', '吠えた', 'beast roar'],
    ]);
  });

  it('asks for no Sound Cues when the story has no sound words, and places none', async () => {
    const provider = adapter(JSON.stringify(markedChapter()));
    const controller = new HarnessGenerationController({ repository: new InMemoryHarnessGenerationRepository(), modelAdapter: provider.value });
    const story = await createStory(controller);
    await controller.generateNextChapter(story.id, 'fixture');

    const request = provider.generate.mock.calls[0][0];
    expect(request.capaPrompt.soundVocabulary ?? []).toEqual([]);
    expect(request.capaPrompt.text).not.toContain('Sound Cues');
    expect(buildHarnessGenerationPrompt(request).responseJsonSchema.properties).not.toHaveProperty('soundCues');

    const state = controller.snapshot();
    expect(state.chapters[0].soundCues).toBeUndefined();
    expect(state.chapters[0].paragraphs[0]).toBe('Mara held her ground as the beast roared across the courtyard.');
    expect(state.attempts[0].warnings.some(warning => warning.code === 'sound_cue_set_aside')).toBe(true);
  });
});
