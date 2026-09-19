import { describe, expect, it, vi } from 'vitest';
import { resolvePlayableAudioMoment } from '@seihouse/sen/audio';
import { createLibraryMediaPort, validateMediaPack, type MediaPack, type MediaPackEntitlement } from '@seihouse/library/media';
import { HarnessGenerationController } from '@seihouse/sen/harness-generation';
import type { HarnessRuntime } from './ids';
import { InMemoryHarnessGenerationRepository } from '../../../test-utils/InMemoryHarnessGenerationRepository';
import { createHarnessSenStory } from '@seihouse/sen/harness-generation';
import { type HarnessGenerationModelAdapter, type HarnessGenerationRequest, type HarnessGenerationResponse } from '@seihouse/sen/harness-generation';

const runtime = (): HarnessRuntime => {
  let id = 0;
  let tick = 0;
  return {
    createId: prefix => `${prefix}_media_${++id}`,
    now: () => `2026-09-16T12:00:${String(tick++).padStart(2, '0')}.000Z`,
  };
};

const response = (value: unknown): HarnessGenerationResponse => ({
  rawProviderResponse: typeof value === 'string' ? value : JSON.stringify(value),
  providerReceipt: {
    provider: 'gemini', model: 'fixture', generatedAt: '2026-09-16T12:00:00.000Z',
    usage: { source: 'unavailable' },
  },
});

/** Prose plus compact semantic intent; the resolved media below is HARNESS work. */
const chapterReply = () => response({
  prose: 'Rain crossed the mountain pass as the clockwork beast roared across the stones.',
  soundscapes: [{ anchorText: 'Rain crossed the mountain pass', mood: 'storm-path', region: 'korean', tags: ['mountain-pass', 'rain', 'thunder'], intensity: 0.6 }],
  soundCues: [{ anchorText: 'clockwork beast roared', category: 'beasts', variation: 'roar', tags: ['clockwork', 'metallic'] }],
  arcCompletion: { goalId: 'arc-1', completed: false, evidence: '' },
});

const soundscapePack = (version = '1.0.0', url = 'https://fixtures.r2.dev/storm-v1.mp3'): MediaPack => validateMediaPack({
  id: 'test.story-soundscapes', version, type: 'soundscape',
  displayName: `Story Soundscapes ${version}`, description: 'Test-only soundscapes.',
  source: { path: `catalogs/soundscapes-${version}.json`, digest: (version === '1.0.0' ? '1' : '2').repeat(64) },
  entries: [{ id: 'TEST_STORM_PATH', mood: 'storm-path', moods: ['storm-path'], tags: ['rain', 'mountain-pass', 'thunder'], region: 'korean', url }],
});

const soundCuePack = (): MediaPack => validateMediaPack({
  id: 'test.story-cues', version: '1.0.0', type: 'sound-cue',
  displayName: 'Story Cues', description: 'Test-only sound cues.',
  source: { path: 'catalogs/cues.json', digest: '3'.repeat(64) },
  entries: [{
    file_path: 'fixtures/clockwork-roar.mp3',
    public_url: 'https://fixtures.r2.dev/clockwork-roar.mp3',
    metadata: { main_category: 'beasts', broad_variation: 'roar', soft_tags: ['clockwork', 'metallic'], description: 'Test roar.', confidence_score: 1 },
  }],
});

const entitlement = (pack: MediaPack, expiresAt?: string): MediaPackEntitlement => ({
  pack: { id: pack.id, version: pack.version },
  unlockedAt: '2026-09-16T11:00:00.000Z',
  ...(expiresAt ? { expiresAt } : {}),
});

const adapter = (...outputs: Array<HarnessGenerationResponse | Error>) => {
  const generate = vi.fn(async (_request: HarnessGenerationRequest) => {
    const output = outputs.shift();
    if (!output) throw new Error('Missing provider fixture.');
    if (output instanceof Error) throw output;
    return output;
  });
  const value: HarnessGenerationModelAdapter = {
    getServerInfo: async () => ({ provider: 'gemini', configured: true, models: [], defaultModel: 'fixture' }),
    generate,
    arcOperation: async () => response({
      plan: { arcNumber: 1, goals: [{ id: 'arc-1', text: 'Cross the pass.', chapters: 100 }] },
      destinedEnding: 'Reach the city beyond the pass.',
    }),
  };
  return { value, generate };
};

describe('HARNESS Media Loadout runtime integration', () => {
  it('keeps registration, rewards and two story slots separate, then persists resolved media through reload and Reader adaptation', async () => {
    const repository = new InMemoryHarnessGenerationRepository();
    const provider = adapter(chapterReply());
    const soundscapes = soundscapePack();
    const soundCues = soundCuePack();
    const controller = new HarnessGenerationController({
      repository,
      modelAdapter: provider.value,
      runtime: runtime(),
      media: createLibraryMediaPort({ registered: [soundscapes, soundCues], entitlements: [] }),
    });
    await controller.hydrate();
    const story = await controller.createStory({ premise: 'A courier crosses a storm-broken mountain pass.' });

    controller.setMediaPort(createLibraryMediaPort({ registered: [soundscapes, soundCues], entitlements: [entitlement(soundscapes, '2026-09-16T11:30:00.000Z')] }));
    await expect(controller.setMediaSelection(story.id, 'soundscapes', soundscapes)).rejects.toThrow('Unlock');
    await expect(controller.setMediaSelection(story.id, 'soundCues', { id: 'missing', version: '1.0.0' })).rejects.toThrow('registered');

    controller.setMediaPort(createLibraryMediaPort({ registered: [soundscapes, soundCues], entitlements: [entitlement(soundscapes)] }));
    expect('mediaPackEntitlements' in controller.snapshot()).toBe(false);
    expect(JSON.stringify(await repository.load())).not.toContain('mediaPackEntitlements');
    expect(controller.snapshot().stories[0].mediaLoadout).toBeUndefined();
    await controller.setMediaSelection(story.id, 'soundscapes', soundscapes);
    expect(controller.snapshot().stories[0].mediaLoadout).toEqual({ soundscapes: { id: soundscapes.id, version: soundscapes.version } });
    await expect(controller.setMediaSelection(story.id, 'soundCues', soundscapes)).rejects.toThrow('Sound Cues');

    controller.setMediaPort(createLibraryMediaPort({ registered: [soundscapes, soundCues], entitlements: [entitlement(soundscapes), entitlement(soundCues)] }));
    expect(controller.snapshot().stories[0].mediaLoadout?.soundCues).toBeUndefined();
    await controller.setMediaSelection(story.id, 'soundCues', soundCues);
    expect(controller.snapshot().stories[0].mediaLoadout).toEqual({
      soundscapes: { id: soundscapes.id, version: soundscapes.version },
      soundCues: { id: soundCues.id, version: soundCues.version },
    });

    await controller.generateNextChapter(story.id, 'fixture');
    const request = provider.generate.mock.calls[0][0] as HarnessGenerationRequest;
    expect(Object.keys(request)).toEqual([
      'storyId', 'attemptId', 'model', 'capaPrompt', 'storyInformation', 'immediateChapterRequest',
    ]);
    const serializedRequest = JSON.stringify(request);
    expect(serializedRequest).not.toContain(soundscapes.id);
    expect(serializedRequest).not.toContain(soundCues.id);
    expect(serializedRequest).not.toContain('fixtures.r2.dev');
    expect(request.capaPrompt.text).not.toContain('Media Pack');

    const committed = controller.snapshot().chapters[0];
    expect(committed.soundscapes?.[0]).toMatchObject({
      intent: { region: 'korean' },
      resource: { track: { id: 'TEST_STORM_PATH', region: 'korean' }, provenance: { catalogId: soundscapes.id, version: '1.0.0' } },
    });
    expect(committed.audioMoments?.[0]).toMatchObject({
      cue: { publicUrl: 'https://fixtures.r2.dev/clockwork-roar.mp3', provenance: { catalogId: soundCues.id } },
    });
    expect(committed.mediaLoadout).toMatchObject({
      soundscapes: [{ provenance: { catalogId: soundscapes.id, version: '1.0.0', source: soundscapes.source } }],
      soundCues: [{ provenance: { catalogId: soundCues.id, version: '1.0.0', source: soundCues.source } }],
    });

    const committedBeforeChanges = JSON.stringify(committed);
    controller.setMediaPort(createLibraryMediaPort({ registered: [soundscapes, soundCues], entitlements: [] }));
    await controller.setMediaSelection(story.id, 'soundscapes');
    await controller.setMediaSelection(story.id, 'soundCues');
    await controller.replayStory(story.id, committed.id);
    expect(JSON.stringify(controller.snapshot().chapters[0])).toBe(committedBeforeChanges);

    const reloaded = new HarnessGenerationController({ repository, modelAdapter: adapter().value, runtime: runtime() });
    await reloaded.hydrate();
    const readerStory = createHarnessSenStory(reloaded.snapshot(), story.id);
    const readerChapter = readerStory.arcs[0].chapters[0];
    expect(readerChapter.generatedContent).toContain('clockwork beast roared');
    expect(readerChapter.soundscapes?.[0].resource.track.id).toBe('TEST_STORM_PATH');
    const playable = resolvePlayableAudioMoment(readerChapter.audioMoments![0]);
    expect(playable).toEqual({ ok: true, publicUrl: 'https://fixtures.r2.dev/clockwork-roar.mp3', actionLabel: 'World Cue' });

    const unavailable = {
      ...readerChapter.audioMoments![0],
      cue: { ...readerChapter.audioMoments![0].cue, publicUrl: 'https://fixtures.r2.dev/cue.mp3?token=secret' },
    };
    expect(resolvePlayableAudioMoment(unavailable).ok).toBe(false);
    expect(readerChapter.generatedContent).toContain('Rain crossed the mountain pass');
  });

  it('reuses the original frozen pack version for an explicit model retry after equipment changes', async () => {
    const v1 = soundscapePack('1.0.0', 'https://fixtures.r2.dev/storm-v1.mp3');
    const v2 = soundscapePack('2.0.0', 'https://fixtures.r2.dev/storm-v2.mp3');
    const repository = new InMemoryHarnessGenerationRepository();
    const provider = adapter(new Error('Provider unavailable.'), chapterReply());
    const controller = new HarnessGenerationController({
      repository, modelAdapter: provider.value, runtime: runtime(), media: createLibraryMediaPort({ registered: [v1, v2], entitlements: [entitlement(v1)] }),
    });
    await controller.hydrate();
    const story = await controller.createStory({ premise: 'A courier crosses a storm-broken mountain pass.' });
    await controller.setMediaSelection(story.id, 'soundscapes', v1);
    await controller.generateNextChapter(story.id, 'fixture');
    const failed = controller.snapshot().attempts[0];
    expect(failed.stage).toBe('generation_failed');
    expect(failed.mediaLoadout.soundscapes[0]?.provenance.version).toBe('1.0.0');

    controller.setMediaPort(createLibraryMediaPort({ registered: [v1, v2], entitlements: [entitlement(v1), entitlement(v2)] }));
    await controller.setMediaSelection(story.id, 'soundscapes', v2);
    await controller.retryModelRequest(failed.id);

    const state = controller.snapshot();
    expect(state.attempts[1].mediaLoadout.soundscapes[0]?.provenance.version).toBe('1.0.0');
    expect(state.chapters[0].mediaLoadout.soundscapes[0]?.provenance.version).toBe('1.0.0');
    expect(state.chapters[0].soundscapes?.[0].resource.track.url).toBe('https://fixtures.r2.dev/storm-v1.mp3');
  });

  it('rechecks host entitlement expiration when freezing an attempt without rewriting story equipment', async () => {
    const pack = soundscapePack();
    const repository = new InMemoryHarnessGenerationRepository();
    const controller = new HarnessGenerationController({
      repository,
      modelAdapter: adapter(chapterReply()).value,
      runtime: runtime(),
      media: createLibraryMediaPort({ registered: [pack], entitlements: [entitlement(pack)] }),
    });
    await controller.hydrate();
    const story = await controller.createStory({ premise: 'A courier crosses a storm-broken mountain pass.' });
    await controller.setMediaSelection(story.id, 'soundscapes', pack);
    controller.setMediaPort(createLibraryMediaPort({ registered: [pack], entitlements: [entitlement(pack, '2026-09-16T11:30:00.000Z')] }));

    await controller.generateNextChapter(story.id, 'fixture');
    const state = controller.snapshot();
    expect(state.stories[0].mediaLoadout?.soundscapes).toEqual({ id: pack.id, version: pack.version });
    expect(state.attempts[0].mediaLoadout.soundscapes).toEqual([]);
    expect(state.chapters[0].mediaLoadout.soundscapes).toEqual([]);
    expect(state.chapters[0].soundscapes).toBeUndefined();
    expect(JSON.stringify(await repository.load())).not.toContain('mediaPackEntitlements');
  });
});
