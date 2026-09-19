import { createElement } from 'react';
import { LIBRARY_BASE_MEDIA } from '../../../host/media/libraryCatalog';
import { createLibraryMediaPort } from '@seihouse/library/media';

const media = createLibraryMediaPort({ registered: [], entitlements: [], base: LIBRARY_BASE_MEDIA });
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { DevAudioPlaybackProvider } from '../../../audio/DevAudioPlayback';
import { InlineAudioText } from '@seihouse/sen/reader-chamber';
import { SystemBlock } from '@seihouse/sen/cards';
import { type SystemEvent } from '@seihouse/sen/cards';
import { HarnessGenerationController } from '@seihouse/sen/harness-generation';
import { acceptHarnessModelResponse } from './responseAcceptance';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { createHarnessSenStory } from '@seihouse/sen/harness-generation';
import { HARNESS_GENERATION_SCHEMA_VERSION } from '@seihouse/sen/harness-generation';
import { type HarnessGenerationModelAdapter, type HarnessGenerationRequest, type HarnessGenerationResponse } from '@seihouse/sen/harness-generation';

const response = (rawProviderResponse: string): HarnessGenerationResponse => ({
  rawProviderResponse,
  providerReceipt: {
    provider: 'fixture',
    model: 'fixture',
    generatedAt: '2026-09-15T12:00:00.000Z',
    usage: { source: 'reported', inputTokens: 10, outputTokens: 20, totalTokens: 30 },
  },
});

const prose = [
  'Mara held her ground as the fox growled once.',
  '“Not today,” Mara said.',
  '[Qi rose to twelve.]',
  'A weathered notice hung on the courtyard gate.',
  'The oath settled into the timeline like a scar.',
].join('\n\n');

/** One reply exercising every semantic signal family, with model-owned identity and asset fields to ignore. */
const mediaChapter = () => ({
  id: 'model-chapter-id',
  title: 'The Debt Fox',
  prose,
  dialogue: [{ anchorText: '“Not today,” Mara said.', speaker: 'Mara', delivery: 'spoken', voiceId: 'model-voice' }],
  manifestations: [{ anchorText: 'Mara held her ground', name: 'Mara', type: 'character', mention: 'reveal' }],
  systemPanels: [
    { anchorText: '[Qi rose to twelve.]', presentation: 'mechanical', meaning: 'progression', title: 'Breakthrough Achieved', entries: [{ label: 'Qi', value: '12' }] },
    { anchorText: 'A weathered notice hung on the courtyard gate.', presentation: 'world_notice', meaning: 'warning', title: 'Courtyard Notice', body: 'Debts are collected at dusk.', entries: [{ label: 'Posted by', value: 'The Fox' }] },
    { anchorText: 'The oath settled into the timeline like a scar.', presentation: 'fate', title: 'Fate Settles', outcome: 'FATE SCARRED', body: 'The oath leaves a scar.', entries: [{ label: 'Cost', value: 'Lost trust' }] },
  ],
  soundscapes: [{ anchorText: 'Mara held her ground', mood: 'tension', region: 'chinese', tags: ['rain', 'courtyard', 'steady-rain'], intensity: 0.7, trackId: 'MODEL_TRACK', customUrl: 'https://untrusted.example/model.mp3' }],
  soundCues: [
    { anchorText: 'the fox growled', category: 'beasts', variation: 'growl', tags: ['tiger', 'close'], entityName: 'Vermilion Debt Fox', entityType: 'creature' },
    { anchorText: 'the fox growled', category: 'beasts', variation: 'growl', tags: ['tiger'], cueUrl: 'https://untrusted.example/model.mp3' },
  ],
  creatureEvents: [{ anchorText: 'the fox growled', type: 'reveal', name: 'Vermilion Debt Fox', size: 'large', bodyType: 'mammal', threatTier: 'mythic', signatureSound: 'growl' }],
  arcCompletion: { goalId: 'arc-1-opening', completed: false, evidence: '' },
});

const adapter = (raw: string): HarnessGenerationModelAdapter => ({
  getServerInfo: async () => ({ provider: 'gemini', configured: true, models: [], defaultModel: 'fixture' }),
  generate: vi.fn(async (_request: HarnessGenerationRequest) => response(raw)),
  arcOperation: async () => response(JSON.stringify({
    plan: { arcNumber: 1, goals: [{ id: 'arc-1-opening', text: 'Face the debt fox.', chapters: 100 }] },
    destinedEnding: 'Free the city from its debts.',
  })),
});

describe('HARNESS canonical structured chapter and media path', () => {
  it('drops malformed optional signals and model-owned asset fields without sacrificing the authoritative prose', () => {
    const accepted = acceptHarnessModelResponse(JSON.stringify({
      paragraphs: ['The clean chapter prose survives.'],
      soundscapes: [{ anchorText: 'prose survives', mood: 7, trackId: 'MODEL_TRACK', customUrl: 'https://untrusted.example/model.mp3' }],
      manifestations: 'not-an-array',
      soundCues: [{ anchorText: 'prose survives', category: 'beasts', variation: 'asset://growl' }],
    }), 3);

    expect(accepted.accepted).toBe(true);
    if (!accepted.accepted) throw new Error(accepted.reason);
    expect(accepted.draft.prose).toBe('The clean chapter prose survives.');
    expect(accepted.draft.blocks).toEqual([{ id: 'c3-p1', type: 'paragraph', text: 'The clean chapter prose survives.' }]);
    expect(accepted.draft.audioMoments).toBeUndefined();
    expect(accepted.draft.soundscapes).toBeUndefined();
    expect(accepted.warnings.filter(warning => warning.code === 'optional_chapter_structure_omitted').length).toBeGreaterThanOrEqual(3);
    expect(JSON.stringify(accepted.draft)).not.toMatch(/MODEL_TRACK|untrusted|asset:\/\//);
  });

  it('retains System Panel prose but omits incomplete panels from accepted Reader blocks', () => {
    const accepted = acceptHarnessModelResponse(JSON.stringify({
      paragraphs: [
        'The incomplete breakthrough remains readable.',
        'The incomplete mechanical display remains readable.',
        'The incomplete notice remains readable.',
        'The incomplete fate result remains readable.',
        'The complete narrative panel remains structured.',
        'The complete fate panel remains structured.',
      ],
      systemPanels: [
        { anchorText: 'The incomplete breakthrough remains readable.', title: 'Breakthrough' },
        { anchorText: 'The incomplete mechanical display remains readable.', title: 'Status', presentation: 'mechanical', meaning: 'progression' },
        { anchorText: 'The incomplete notice remains readable.', title: 'Notice', presentation: 'world_notice', meaning: 'warning', entries: [] },
        { anchorText: 'The incomplete fate result remains readable.', title: 'Fate Settles', presentation: 'fate' },
        { anchorText: 'The complete narrative panel remains structured.', title: 'Scan', presentation: 'narrative', meaning: 'friendly_scan' },
        { anchorText: 'The complete fate panel remains structured.', title: 'Fate Settles', presentation: 'fate', outcome: 'FATE SCARRED', body: 'The oath leaves a scar.', entries: [{ label: 'Cost', value: 'Lost trust' }] },
      ],
    }), 3);

    expect(accepted.accepted).toBe(true);
    if (!accepted.accepted) throw new Error(accepted.reason);
    expect(accepted.draft.prose).toContain('The incomplete mechanical display remains readable.');
    expect(accepted.draft.blocks).toHaveLength(6);
    expect(accepted.draft.blocks?.slice(0, 4).every(block => !block.system)).toBe(true);
    expect(accepted.draft.blocks?.[4].system).toMatchObject({
      kind: 'system_prompt', promptType: 'friendly_scan', presentation: 'narrative',
    });
    expect(accepted.draft.blocks?.[5].system).toMatchObject({
      kind: 'fate_system_prompt', fateResult: { outcome: 'FATE SCARRED', timelineScar: 'The oath leaves a scar.', permanentCosts: ['Cost: Lost trust'] },
    });
    expect(accepted.warnings).toContainEqual(expect.objectContaining({
      code: 'optional_chapter_structure_omitted',
      message: expect.stringContaining('System Panel'),
    }));
  });

  it('commits, reloads, and adapts every signal family into HARNESS-built blocks and resolved media', async () => {
    const repository = new InMemoryHarnessGenerationRepository();
    const raw = JSON.stringify(mediaChapter());
    const controller = new HarnessGenerationController({ repository, media, modelAdapter: adapter(raw) });
    await controller.hydrate();
    const story = await controller.createStory({
      premise: 'Mara confronts a debt spirit in a rain-soaked courtyard.',
      destinedEnding: 'Free the city from its debts.',
      cast: [{ name: 'Mara', role: 'Courier', relationshipToMC: 'Self', isMainCharacter: true }],
      initialArcPlan: { arcNumber: 1, goals: [{ id: 'arc-1-opening', text: 'Face the debt fox.', chapters: 100 }] },
    });

    await controller.generateNextChapter(story.id, 'fixture');
    const committed = controller.snapshot();
    expect(committed.schemaVersion).toBe(HARNESS_GENERATION_SCHEMA_VERSION);
    expect(committed.attempts[0].rawProviderResponse).toBe(raw);
    expect(committed.attempts[0].warnings.some(warning => warning.code === 'ignored_model_identity')).toBe(true);
    expect(committed.chapters[0].prose).toBe(prose);
    expect(committed.chapters[0].blocks?.map(block => block.id)).toEqual(['c1-p1', 'c1-p2', 'c1-p3', 'c1-p4', 'c1-p5']);
    expect(committed.chapters[0].blocks?.map(block => block.text).join('\n\n')).toBe(prose);
    expect(committed.chapters[0].blocks?.[0].metadata).toMatchObject({
      atmosphereCategory: 'rain',
      atmosphereTags: ['rain', 'courtyard', 'steady-rain'],
      music: { mood: 'tension', region: 'chinese', intensity: 0.7 },
      entities: [
        { name: 'Mara', type: 'character', mention: 'reveal' },
        { name: 'Vermilion Debt Fox', type: 'creature', mention: 'reveal' },
      ],
      beastEvent: { type: 'reveal', profile: { size: 'large', bodyType: 'mammal', threatTier: 'mythic', signatureSound: 'growl' } },
    });
    expect(committed.chapters[0].blocks?.[0].metadata?.audioMoments).toBeUndefined();
    expect(committed.chapters[0].blocks?.[1]).toMatchObject({
      type: 'dialogue',
      metadata: { mode: 'dialogue', speakerName: 'Mara', speakerRole: 'main_character', emotion: 'spoken' },
    });
    expect(committed.chapters[0].blocks?.[2].system).toEqual({
      kind: 'system_prompt', presentation: 'mechanical', promptType: 'progression', title: 'Breakthrough Achieved',
      rows: [{ label: 'Qi', value: '12' }], status: { stats: [{ label: 'Qi', value: '12' }] },
    });
    expect(committed.chapters[0].blocks?.[3].system).toMatchObject({
      kind: 'system_prompt', presentation: 'world_notice', promptType: 'warning', title: 'Courtyard Notice',
      worldNotice: { entries: [{ title: 'Courtyard Notice', body: 'Debts are collected at dusk.', details: [{ label: 'Posted by', value: 'The Fox' }] }] },
    });
    expect(committed.chapters[0].blocks?.[4].system).toMatchObject({
      kind: 'fate_system_prompt', title: 'Fate Settles', fateResult: { outcome: 'FATE SCARRED', timelineScar: 'The oath leaves a scar.', permanentCosts: ['Cost: Lost trust'] },
    });
    expect(JSON.stringify(committed.chapters[0])).not.toMatch(/MODEL_TRACK|untrusted|model-voice|model-chapter-id/);
    expect(committed.chapters[0].audioMoments).toEqual([
      expect.objectContaining({
        blockId: 'c1-p1',
        triggerPhrase: 'the fox growled',
        sourceCategory: 'beasts',
        relatedEntity: { name: 'Vermilion Debt Fox', type: 'creature' },
        cue: expect.objectContaining({ publicUrl: expect.stringContaining('/Beasts/Growl/'), provenance: { catalogId: 'library-default-cues', version: '1' } }),
      }),
    ]);
    expect(committed.chapters[0].soundscapes).toEqual([
      expect.objectContaining({ blockId: 'c1-p1', intent: expect.objectContaining({ mood: 'tension', region: 'chinese' }) }),
    ]);

    const reloaded = new HarnessGenerationController({ repository, media, modelAdapter: adapter('{}') });
    await reloaded.hydrate();
    const readerStory = createHarnessSenStory(reloaded.snapshot(), story.id);
    const readerChapter = readerStory.arcs[0].chapters[0];
    expect(readerChapter.generatedContent).toBe(prose);
    expect(readerChapter.blocks).toEqual(committed.chapters[0].blocks);
    expect(readerChapter.audioMoments).toEqual(committed.chapters[0].audioMoments);
    expect(readerChapter.soundscapes).toEqual(committed.chapters[0].soundscapes);
    expect(readerChapter.blocks?.filter(block => Boolean(block.system)).map(block => block.system?.title)).toEqual([
      'Breakthrough Achieved', 'Courtyard Notice', 'Fate Settles',
    ]);
    expect(readerChapter.blocks?.[1].metadata).toMatchObject({ mode: 'dialogue', speakerName: 'Mara', speakerRole: 'main_character' });

    for (const block of readerChapter.blocks!.filter(candidate => candidate.system)) {
      const markup = renderToStaticMarkup(createElement(SystemBlock, { content: block.text, system: block.system as SystemEvent }));
      expect(markup).toContain(block.system!.kind === 'fate_system_prompt' ? 'FATE SCARRED' : block.system!.title);
    }

    const cueMarkup = renderToStaticMarkup(createElement(
      DevAudioPlaybackProvider,
      null,
      createElement(InlineAudioText, {
        moments: readerChapter.audioMoments!,
        text: readerChapter.blocks![0].text,
        renderText: (text: string) => text,
      }),
    ));
    expect(cueMarkup).toContain('data-action-type="world-cue"');
    expect(cueMarkup).toContain('Play World Cue for the fox growled');
  });

  it('keeps a body-only chapter on the normal generation and Reader path', async () => {
    const repository = new InMemoryHarnessGenerationRepository();
    const raw = JSON.stringify({ paragraphs: ['Mara crossed the quiet courtyard.'], arcCompletion: { goalId: 'arc-1-opening', completed: false, evidence: '' } });
    const controller = new HarnessGenerationController({ repository, media, modelAdapter: adapter(raw) });
    await controller.hydrate();
    const story = await controller.createStory({ premise: 'Mara crosses a quiet city.', destinedEnding: 'Reach home.', initialArcPlan: { arcNumber: 1, goals: [{ id: 'arc-1-opening', text: 'Reach home.', chapters: 100 }] } });
    await controller.generateNextChapter(story.id, 'fixture');

    expect(controller.snapshot().attempts[0].stage).toBe('committed');
    const chapter = createHarnessSenStory(controller.snapshot(), story.id).arcs[0].chapters[0];
    expect(chapter.generatedContent).toBe('Mara crossed the quiet courtyard.');
    expect(chapter.blocks).toEqual([{ id: 'c1-p1', type: 'paragraph', text: 'Mara crossed the quiet courtyard.' }]);
    expect(chapter.audioMoments).toBeUndefined();
    expect(chapter.soundscapes).toBeUndefined();
  });

  it('retries a structured chapter commit checkpoint without another provider call or metadata loss', async () => {
    class FailStructuredCommitRepository extends InMemoryHarnessGenerationRepository {
      failed = false;

      override async save(state: Awaited<ReturnType<InMemoryHarnessGenerationRepository['load']>>) {
        if (!this.failed && state.chapters.length === 1) {
          this.failed = true;
          throw new Error('Simulated structured commit failure.');
        }
        await super.save(state);
      }
    }

    const repository = new FailStructuredCommitRepository();
    const model = adapter(JSON.stringify(mediaChapter()));
    const controller = new HarnessGenerationController({ repository, media, modelAdapter: model });
    await controller.hydrate();
    const story = await controller.createStory({ premise: 'Mara faces the debt fox.', destinedEnding: 'Return home.', initialArcPlan: { arcNumber: 1, goals: [{ id: 'arc-1-opening', text: 'Face the debt fox.', chapters: 100 }] } });
    await controller.generateNextChapter(story.id, 'fixture');
    expect(controller.snapshot().attempts[0]).toMatchObject({ stage: 'accepted_not_durable', recoveryStage: 'committed' });
    expect(controller.snapshot().attempts[0].acceptedDraft?.blocks?.[0].metadata?.entities?.[0].mention).toBe('reveal');

    const reloaded = new HarnessGenerationController({ repository, media, modelAdapter: model });
    await reloaded.hydrate();
    await reloaded.retryAppropriateStage(reloaded.snapshot().attempts[0].id);
    expect(model.generate).toHaveBeenCalledTimes(1);
    expect(reloaded.snapshot().chapters[0].blocks?.[0].metadata?.entities?.[0].mention).toBe('reveal');
    expect(reloaded.snapshot().chapters[0].audioMoments).toHaveLength(1);
    expect(reloaded.snapshot().chapters[0].soundscapes).toHaveLength(1);
  });
});
