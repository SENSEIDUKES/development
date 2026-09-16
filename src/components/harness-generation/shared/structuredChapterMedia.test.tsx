import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { DevAudioPlaybackProvider } from '../../../audio/DevAudioPlayback';
import { InlineAudioText } from '../../reader-chamber/development/InlineAudio';
import { SystemBlock } from '../../reader-chamber/development/SystemBlock';
import type { SystemEvent } from '../../reader-chamber/shared/types';
import { HarnessGenerationController } from './controller';
import { acceptHarnessModelResponse } from './responseAcceptance';
import { InMemoryHarnessGenerationRepository } from './repository';
import { createHarnessSenStory } from './senAdapter';
import { HARNESS_GENERATION_SCHEMA_VERSION } from './types';
import type {
  HarnessGenerationModelAdapter,
  HarnessGenerationRequest,
  HarnessGenerationResponse,
} from './types';

const response = (rawProviderResponse: string): HarnessGenerationResponse => ({
  rawProviderResponse,
  providerReceipt: {
    provider: 'fixture',
    model: 'fixture',
    generatedAt: '2026-09-15T12:00:00.000Z',
    usage: { source: 'reported', inputTokens: 10, outputTokens: 20, totalTokens: 30 },
  },
});

const mediaChapter = () => ({
  id: 'model-chapter-id',
  prose: 'This competing prose must not become the saved chapter.',
  title: 'The Debt Fox',
  blocks: [
    {
      id: 'model-block-id',
      type: 'paragraph',
      text: 'Mara held her ground as the fox growled once.',
      metadata: {
        mode: 'narration',
        atmosphereCategory: 'rain',
        atmosphereTags: ['courtyard', 'steady-rain'],
        music: {
          mood: 'tension',
          region: 'chinese',
          intensity: 0.7,
          trackId: 'MODEL_TRACK',
          customUrl: 'https://untrusted.example/model.mp3',
        },
        entities: [{ name: 'Mara', type: 'character', mention: 'reveal' }],
        beastEvent: {
          type: 'reveal',
          profile: { size: 'large', bodyType: 'mammal', threatTier: 'mythic', signatureSound: 'growl' },
        },
        audioMoments: [
          {
            triggerPhrase: 'the fox growled',
            occurrenceIndex: 0,
            sourceCategory: 'beasts',
            variation: 'growl',
            semanticTags: ['tiger', 'close'],
            relatedEntity: { name: 'Vermilion Debt Fox', type: 'creature' },
          },
          {
            triggerPhrase: 'the fox growled',
            occurrenceIndex: 0,
            sourceCategory: 'beasts',
            variation: 'growl',
            semanticTags: ['tiger'],
            cueUrl: 'https://untrusted.example/model.mp3',
          },
        ],
      },
    },
    {
      type: 'dialogue',
      text: '“Not today,” Mara said.',
      metadata: {
        mode: 'dialogue',
        speakerName: 'Mara',
        speakerRole: 'main_character',
        voiceId: 'model-voice',
      },
    },
    {
      type: 'paragraph',
      text: '[Qi rose to twelve.]',
      system: {
        kind: 'system_prompt',
        presentation: 'mechanical',
        promptType: 'progression',
        title: 'Breakthrough Achieved',
        rows: [{ label: 'Qi', value: '12', trend: 'up' }],
        status: { stats: [{ label: 'Qi', value: '12', delta: 2 }] },
      },
    },
  ],
  memory: {
    progression: [{
      description: 'Mara reaches twelve Qi.',
      subjects: [{ name: 'Mara', kind: 'character' }],
      significance: 'major',
      evidence: '[Qi rose to twelve.]',
      facts: { value: '12' },
      details: { mechanics: { subject: 'Mara', name: 'Qi', value: '12' } },
    }],
  },
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
  it('normalizes optional structures without sacrificing the authoritative readable block text', () => {
    const accepted = acceptHarnessModelResponse(JSON.stringify({
      prose: 'A stale duplicate.',
      blocks: [{
        id: 'model-id',
        type: 'paragraph',
        text: 'The clean chapter prose survives.',
        metadata: {
          music: { mood: 7, trackId: 'MODEL_TRACK', customUrl: 'https://untrusted.example/model.mp3' },
          entities: 'not-an-array',
          audioMoments: [{ triggerPhrase: 'prose survives', sourceCategory: 'beasts', variation: 'asset://growl' }],
        },
      }],
    }), 3);

    expect(accepted.accepted).toBe(true);
    if (!accepted.accepted) throw new Error(accepted.reason);
    expect(accepted.draft.prose).toBe('The clean chapter prose survives.');
    expect(accepted.draft.blocks).toEqual([{ id: 'c3-p1', type: 'paragraph', text: 'The clean chapter prose survives.' }]);
    expect(accepted.draft.audioMoments).toBeUndefined();
    expect(accepted.warnings.some(warning => warning.code === 'competing_prose_ignored')).toBe(true);
    expect(JSON.stringify(accepted.draft)).not.toMatch(/MODEL_TRACK|untrusted|asset:\/\//);
  });

  it('retains System Panel prose but omits incomplete panels from accepted Reader blocks', () => {
    const accepted = acceptHarnessModelResponse(JSON.stringify({
      blocks: [
        {
          type: 'paragraph',
          text: 'The incomplete breakthrough remains readable.',
          system: { kind: 'system_prompt', title: 'Breakthrough' },
        },
        {
          type: 'paragraph',
          text: 'The incomplete mechanical display remains readable.',
          system: {
            kind: 'system_prompt', title: 'Status', promptType: 'progression', presentation: 'mechanical',
          },
        },
        {
          type: 'paragraph',
          text: 'The incomplete notice remains readable.',
          system: {
            kind: 'system_prompt', title: 'Notice', promptType: 'warning', presentation: 'world_notice',
            worldNotice: { entries: [] },
          },
        },
        {
          type: 'paragraph',
          text: 'The incomplete fate result remains readable.',
          system: { kind: 'fate_system_prompt', title: 'Fate Settles' },
        },
        {
          type: 'paragraph',
          text: 'The complete narrative panel remains structured.',
          system: {
            kind: 'system_prompt', title: 'Scan', promptType: 'friendly_scan', presentation: 'narrative',
          },
        },
        {
          type: 'paragraph',
          text: 'The complete fate panel remains structured.',
          system: {
            kind: 'fate_system_prompt', title: 'Fate Settles',
            fateResult: {
              outcome: 'FATE SCARRED', timelineScar: 'The oath leaves a scar.', permanentCosts: ['Lost trust'],
            },
          },
        },
      ],
    }), 3);

    expect(accepted.accepted).toBe(true);
    if (!accepted.accepted) throw new Error(accepted.reason);
    expect(accepted.draft.prose).toContain('The incomplete mechanical display remains readable.');
    expect(accepted.draft.blocks?.slice(0, 4).every(block => !block.system)).toBe(true);
    expect(accepted.draft.blocks?.[4].system).toMatchObject({
      kind: 'system_prompt', promptType: 'friendly_scan', presentation: 'narrative',
    });
    expect(accepted.draft.blocks?.[5].system).toMatchObject({
      kind: 'fate_system_prompt', fateResult: { outcome: 'FATE SCARRED' },
    });
    expect(accepted.warnings).toContainEqual(expect.objectContaining({
      code: 'optional_chapter_structure_omitted',
      message: expect.stringContaining('incomplete System Panel'),
    }));
  });

  it('commits, reloads, and adapts canonical blocks and resolved media without replacing authored System Panels', async () => {
    const repository = new InMemoryHarnessGenerationRepository();
    const raw = JSON.stringify(mediaChapter());
    const controller = new HarnessGenerationController({ repository, modelAdapter: adapter(raw) });
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
    expect(committed.chapters[0].prose).toBe([
      'Mara held her ground as the fox growled once.',
      '“Not today,” Mara said.',
      '[Qi rose to twelve.]',
    ].join('\n\n'));
    expect(committed.chapters[0].blocks?.map(block => block.id)).toEqual(['c1-p1', 'c1-p2', 'c1-p3']);
    expect(committed.chapters[0].blocks?.[0].metadata).toMatchObject({
      atmosphereCategory: 'rain',
      atmosphereTags: ['courtyard', 'steady-rain'],
      music: { mood: 'tension', region: 'chinese', intensity: 0.7 },
      entities: [{ name: 'Mara', type: 'character', mention: 'reveal' }],
      beastEvent: { type: 'reveal', profile: { signatureSound: 'growl' } },
    });
    expect(committed.chapters[0].blocks?.[0].metadata?.audioMoments).toBeUndefined();
    expect(JSON.stringify(committed.chapters[0])).not.toMatch(/MODEL_TRACK|untrusted|model-voice/);
    expect(committed.chapters[0].audioMoments).toEqual([
      expect.objectContaining({
        blockId: 'c1-p1',
        triggerPhrase: 'the fox growled',
        sourceCategory: 'beasts',
        cue: { publicUrl: expect.stringContaining('/Beasts/Growl/') },
      }),
    ]);

    const reloaded = new HarnessGenerationController({ repository, modelAdapter: adapter('{}') });
    await reloaded.hydrate();
    const readerStory = createHarnessSenStory(reloaded.snapshot(), story.id);
    const readerChapter = readerStory.arcs[0].chapters[0];
    expect(readerChapter.blocks).toEqual(committed.chapters[0].blocks);
    expect(readerChapter.audioMoments).toEqual(committed.chapters[0].audioMoments);
    expect(readerChapter.blocks?.filter(block => Boolean(block.system))).toHaveLength(1);
    expect(readerChapter.blocks?.find(block => block.system)?.system?.title).toBe('Breakthrough Achieved');
    expect(readerChapter.blocks?.[0].metadata?.entities).toEqual([{ name: 'Mara', type: 'character', mention: 'reveal' }]);

    const systemMarkup = renderToStaticMarkup(createElement(SystemBlock, {
      content: readerChapter.blocks!.find(block => block.system)!.text,
      system: readerChapter.blocks!.find(block => block.system)!.system as SystemEvent,
    }));
    expect(systemMarkup).toContain('Breakthrough Achieved');

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

  it('keeps a chapter with no optional media enrichment on the normal generation and Reader path', async () => {
    const repository = new InMemoryHarnessGenerationRepository();
    const raw = JSON.stringify({ blocks: [{ type: 'paragraph', text: 'Mara crossed the quiet courtyard.' }], memory: {}, arcCompletion: { goalId: 'arc-1-opening', completed: false, evidence: '' } });
    const controller = new HarnessGenerationController({ repository, modelAdapter: adapter(raw) });
    await controller.hydrate();
    const story = await controller.createStory({ premise: 'Mara crosses a quiet city.', destinedEnding: 'Reach home.', initialArcPlan: { arcNumber: 1, goals: [{ id: 'arc-1-opening', text: 'Reach home.', chapters: 100 }] } });
    await controller.generateNextChapter(story.id, 'fixture');

    const chapter = createHarnessSenStory(controller.snapshot(), story.id).arcs[0].chapters[0];
    expect(chapter.generatedContent).toBe('Mara crossed the quiet courtyard.');
    expect(chapter.blocks).toEqual([{ id: 'c1-p1', type: 'paragraph', text: 'Mara crossed the quiet courtyard.' }]);
    expect(chapter.audioMoments).toBeUndefined();
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
    const controller = new HarnessGenerationController({ repository, modelAdapter: model });
    await controller.hydrate();
    const story = await controller.createStory({ premise: 'Mara faces the debt fox.', destinedEnding: 'Return home.', initialArcPlan: { arcNumber: 1, goals: [{ id: 'arc-1-opening', text: 'Face the debt fox.', chapters: 100 }] } });
    await controller.generateNextChapter(story.id, 'fixture');
    expect(controller.snapshot().attempts[0]).toMatchObject({ stage: 'accepted_not_durable', recoveryStage: 'committed' });
    expect(controller.snapshot().attempts[0].acceptedDraft?.blocks?.[0].metadata?.entities?.[0].mention).toBe('reveal');

    const reloaded = new HarnessGenerationController({ repository, modelAdapter: model });
    await reloaded.hydrate();
    await reloaded.retryAppropriateStage(reloaded.snapshot().attempts[0].id);
    expect(model.generate).toHaveBeenCalledTimes(1);
    expect(reloaded.snapshot().chapters[0].blocks?.[0].metadata?.entities?.[0].mention).toBe('reveal');
    expect(reloaded.snapshot().chapters[0].audioMoments).toHaveLength(1);
  });
});
