import { describe, expect, it, vi } from 'vitest';
import { resolvePlayableAudioMoment } from '../../../audio/inlineAudio';
import { validateMediaPack, type MediaPack } from '../../../audio/mediaPacks';
import { HarnessGenerationController } from './controller';
import type { HarnessRuntime } from './ids';
import { InMemoryHarnessGenerationRepository } from './repository';
import { createHarnessSenStory } from './senAdapter';
import type {
  HarnessGenerationModelAdapter,
  HarnessGenerationRequest,
  HarnessGenerationResponse,
} from './types';

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

const chapterReply = () => response({
  blocks: [{
    type: 'paragraph',
    text: 'Rain crossed the mountain pass as the clockwork beast roared across the stones.',
    metadata: {
      music: { mood: 'storm-path', intensity: 0.6 },
      environment: ['mountain-pass', 'rain'],
      atmosphereCategory: 'rain',
      atmosphereTags: ['thunder'],
      audioMoments: [{
        triggerPhrase: 'clockwork beast roared',
        sourceCategory: 'beasts',
        variation: 'roar',
        semanticTags: ['clockwork', 'metallic'],
      }],
    },
  }],
});

const soundscapePack = (version = '1.0.0', url = 'https://fixtures.r2.dev/storm-v1.mp3'): MediaPack => validateMediaPack({
  id: 'test.story-soundscapes', version, type: 'soundscape',
  displayName: `Story Soundscapes ${version}`, description: 'Test-only soundscapes.',
  source: { path: `catalogs/soundscapes-${version}.json`, digest: (version === '1.0.0' ? '1' : '2').repeat(64) },
  entries: [{ id: 'TEST_STORM_PATH', mood: 'storm-path', moods: ['storm-path'], tags: ['rain', 'mountain-pass', 'thunder'], url, isPremium: false }],
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
      registeredMediaPacks: [soundscapes, soundCues],
    });
    await controller.hydrate();
    const story = await controller.createStory({ premise: 'A courier crosses a storm-broken mountain pass.' });

    await expect(controller.setMediaLoadoutSlot(story.id, 'soundscapes', soundscapes)).rejects.toThrow('Unlock');
    await expect(controller.setMediaLoadoutSlot(story.id, 'soundCues', { id: 'missing', version: '1.0.0' })).rejects.toThrow('registered');

    await controller.grantMediaPackEntitlement(soundscapes, { kind: 'development-test-reward', id: 'reward-soundscapes' });
    expect(controller.snapshot().stories[0].mediaLoadout).toBeUndefined();
    await controller.setMediaLoadoutSlot(story.id, 'soundscapes', soundscapes);
    expect(controller.snapshot().stories[0].mediaLoadout).toEqual({ soundscapes: { id: soundscapes.id, version: soundscapes.version } });
    await expect(controller.setMediaLoadoutSlot(story.id, 'soundCues', soundscapes)).rejects.toThrow('Sound Cues');

    await controller.grantMediaPackEntitlement(soundCues, { kind: 'reward', id: 'reward-cues' });
    expect(controller.snapshot().stories[0].mediaLoadout?.soundCues).toBeUndefined();
    await controller.setMediaLoadoutSlot(story.id, 'soundCues', soundCues);
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
      resource: { track: { id: 'TEST_STORM_PATH' }, provenance: { kind: 'media-pack', id: soundscapes.id, version: '1.0.0' } },
    });
    expect(committed.audioMoments?.[0]).toMatchObject({
      cue: { publicUrl: 'https://fixtures.r2.dev/clockwork-roar.mp3', provenance: { kind: 'media-pack', id: soundCues.id } },
    });
    expect(committed.mediaLoadout).toMatchObject({
      soundscapes: { id: soundscapes.id, version: '1.0.0', source: soundscapes.source },
      soundCues: { id: soundCues.id, version: '1.0.0', source: soundCues.source },
    });

    const committedBeforeChanges = JSON.stringify(committed);
    await controller.setMediaLoadoutSlot(story.id, 'soundscapes');
    await controller.setMediaLoadoutSlot(story.id, 'soundCues');
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
      repository, modelAdapter: provider.value, runtime: runtime(), registeredMediaPacks: [v1, v2],
    });
    await controller.hydrate();
    const story = await controller.createStory({ premise: 'A courier crosses a storm-broken mountain pass.' });
    await controller.grantMediaPackEntitlement(v1, { kind: 'reward', id: 'v1-reward' });
    await controller.setMediaLoadoutSlot(story.id, 'soundscapes', v1);
    await controller.generateNextChapter(story.id, 'fixture');
    const failed = controller.snapshot().attempts[0];
    expect(failed.stage).toBe('generation_failed');
    expect(failed.mediaLoadout.soundscapes?.version).toBe('1.0.0');

    await controller.grantMediaPackEntitlement(v2, { kind: 'reward', id: 'v2-reward' });
    await controller.setMediaLoadoutSlot(story.id, 'soundscapes', v2);
    await controller.retryModelRequest(failed.id);

    const state = controller.snapshot();
    expect(state.attempts[1].mediaLoadout.soundscapes?.version).toBe('1.0.0');
    expect(state.chapters[0].mediaLoadout.soundscapes?.version).toBe('1.0.0');
    expect(state.chapters[0].soundscapes?.[0].resource.track.url).toBe('https://fixtures.r2.dev/storm-v1.mp3');
  });
});
