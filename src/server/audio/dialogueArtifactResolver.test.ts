import { describe, expect, it, vi } from 'vitest';
import type { S3Client } from '@aws-sdk/client-s3';
import { DIALOGUE_ARTIFACT_PUBLIC_ORIGIN } from '../../audio/dialogueArtifacts';
import type { ChapterContent } from '../../components/chapter-generation/shared/types';
import {
  assertDialogueObjectKey,
  createConfiguredDialogueArtifactResolver,
  createDialogueArtifactResolver,
  ElevenLabsDialogueSpeechProvider,
  extractExactDialogueQuotes,
  loadDialogueAudioConfig,
  R2DialogueAudioArtifactStore,
  requiredServerValue,
  type DialogueAudioArtifactStore,
  type DialogueSpeechProvider,
} from './dialogueArtifactResolver';
import { loadVoiceCatalog } from './voiceCatalog';

const catalog = loadVoiceCatalog();
const voice = catalog.publicView.find(candidate => candidate.ttsAvailable)!;
const providerVoiceId = catalog.entries.find(entry => (
  entry.voice_id && entry.file_name === voice.fileName
))!.voice_id!;

const chapter = (text = 'Rin said, “Stand behind me.” Then she repeated, “Stand behind me.”'): ChapterContent => ({
  storyId: 'story-rain-court',
  chapterNumber: 3,
  generatedContent: text,
  blocks: [{
    id: 'c3-p7',
    type: 'dialogue',
    text,
    metadata: { mode: 'dialogue', speakerName: 'Rin' },
  }],
});

const characters = [{
  id: 'character-rin',
  name: 'Rin',
  voiceKey: voice.internalKey,
}];

class MemoryArtifactStore implements DialogueAudioArtifactStore {
  readonly artifacts = new Map<string, Uint8Array>();
  readonly has = vi.fn(async (objectKey: string) => this.artifacts.has(objectKey));
  readonly put = vi.fn(async (input: {
    objectKey: string;
    bytes: Uint8Array;
    checksumSha256: string;
  }) => {
    this.artifacts.set(input.objectKey, input.bytes);
  });
  publicUrl(objectKey: string): string {
    return `${DIALOGUE_ARTIFACT_PUBLIC_ORIGIN}/${objectKey}`;
  }
}

describe('dialogue artifact resolver', () => {
  it('extracts the literal quote and preserves each exact occurrence', () => {
    expect(extractExactDialogueQuotes(
      '[SFX: “hidden quote”] Rin said, “Stand behind me.” Then: “Stand behind me.”',
    )).toEqual([{
      triggerPhrase: '“Stand behind me.”',
      spokenText: 'Stand behind me.',
      occurrenceIndex: 0,
    }, {
      triggerPhrase: '“Stand behind me.”',
      spokenText: 'Stand behind me.',
      occurrenceIndex: 1,
    }]);
  });

  it('synthesizes the exact spoken text once and reuses the immutable artifact', async () => {
    const objectStore = new MemoryArtifactStore();
    const synthesize = vi.fn(async () => new Uint8Array([1, 2, 3, 4]));
    const resolver = createDialogueArtifactResolver({
      model: 'eleven_multilingual_v2',
      objectStore,
      provider: { synthesize },
    });

    const first = await resolver({ chapter: chapter(), characters });
    const second = await resolver({ chapter: chapter(), characters });

    expect(synthesize).toHaveBeenCalledTimes(1);
    expect(synthesize).toHaveBeenCalledWith({
      providerVoiceId,
      text: 'Stand behind me.',
    });
    expect(objectStore.put).toHaveBeenCalledTimes(1);
    expect(first).toHaveLength(2);
    expect(first.map(candidate => candidate.occurrenceIndex)).toEqual([0, 1]);
    expect(new Set(first.map(candidate => candidate.publicUrl)).size).toBe(1);
    expect(second.map(candidate => candidate.publicUrl)).toEqual(
      first.map(candidate => candidate.publicUrl),
    );
    const serialized = JSON.stringify(first);
    expect(serialized).not.toContain(providerVoiceId);
    expect(serialized).not.toContain('elevenlabs');
    expect(serialized).not.toContain('R2_');
  });

  it('skips unnamed, ambiguous, Bestiary-like, and non-intelligent speakers', async () => {
    const objectStore = new MemoryArtifactStore();
    const synthesize = vi.fn(async () => new Uint8Array([1]));
    const resolver = createDialogueArtifactResolver({
      model: 'eleven_multilingual_v2',
      objectStore,
      provider: { synthesize },
    });

    const ineligible = await resolver({
      chapter: chapter(),
      characters: [{
        id: 'character-rin-beast',
        name: 'Rin',
        portraitKind: 'non-human',
        creatureProfile: { intelligence: 'feral instinct' },
        voiceKey: voice.internalKey,
      }],
    });
    const ambiguous = await resolver({
      chapter: chapter(),
      characters: [
        ...characters,
        { id: 'character-rin-2', name: 'Rin', voiceKey: voice.internalKey },
      ],
    });
    const unnamedChapter = chapter();
    unnamedChapter.blocks![0].metadata = { mode: 'dialogue' };
    const unnamed = await resolver({ chapter: unnamedChapter, characters });
    const wrongModeChapter = chapter();
    wrongModeChapter.blocks![0].metadata = { mode: 'narration', speakerName: 'Rin' };
    const wrongMode = await resolver({ chapter: wrongModeChapter, characters });
    const missingVoiceKey = await resolver({
      chapter: chapter(),
      characters: [{ id: 'character-rin', name: 'Rin' }],
    });
    const unknownVoiceKey = await resolver({
      chapter: chapter(),
      characters: [{ id: 'character-rin', name: 'Rin', voiceKey: 'not-in-catalog' }],
    });

    expect(ineligible).toEqual([]);
    expect(ambiguous).toEqual([]);
    expect(unnamed).toEqual([]);
    expect(wrongMode).toEqual([]);
    expect(missingVoiceKey).toEqual([]);
    expect(unknownVoiceKey).toEqual([]);
    expect(synthesize).not.toHaveBeenCalled();
  });

  it('bounds distinct artifact work while retaining every annotation', async () => {
    const objectStore = new MemoryArtifactStore();
    let active = 0;
    let maxActive = 0;
    const synthesize = vi.fn(async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise(resolve => setTimeout(resolve, 2));
      active -= 1;
      return new Uint8Array([1]);
    });
    const resolver = createDialogueArtifactResolver({
      model: 'eleven_multilingual_v2',
      objectStore,
      provider: { synthesize },
    });
    const result = await resolver({
      chapter: chapter('Rin said, “One.” “Two.” “Three.” “Four.” “Five.” “Six.”'),
      characters,
    });

    expect(result).toHaveLength(6);
    expect(synthesize).toHaveBeenCalledTimes(6);
    expect(maxActive).toBe(4);
  });

  it('contains synthesis failures and returns no dead annotation candidate', async () => {
    const onError = vi.fn();
    const resolver = createDialogueArtifactResolver({
      model: 'eleven_multilingual_v2',
      objectStore: new MemoryArtifactStore(),
      provider: {
        synthesize: vi.fn(async () => {
          throw new Error('private provider failure');
        }),
      },
      onError,
    });

    await expect(resolver({ chapter: chapter('Rin said, “No.”'), characters }))
      .resolves.toEqual([]);
    expect(onError).toHaveBeenCalledTimes(1);
  });
});

describe('ElevenLabs server adapter', () => {
  it('sends the exact quote through the private provider contract', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response(new Uint8Array([9, 8, 7]), {
      status: 200,
      headers: { 'content-type': 'audio/mpeg' },
    }));
    const provider = new ElevenLabsDialogueSpeechProvider(
      'private-elevenlabs-key',
      'eleven_multilingual_v2',
      5_000,
      fetchImpl,
    );

    await expect(provider.synthesize({
      providerVoiceId,
      text: 'Your oath has a seam, Magistrate,',
    })).resolves.toEqual(new Uint8Array([9, 8, 7]));

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, request] = fetchImpl.mock.calls[0];
    expect(String(url)).toContain(`/v1/text-to-speech/${providerVoiceId}`);
    expect(String(url)).toContain('output_format=mp3_44100_128');
    expect(request?.headers).toMatchObject({
      'xi-api-key': 'private-elevenlabs-key',
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(String(request?.body))).toEqual({
      text: 'Your oath has a seam, Magistrate,',
      model_id: 'eleven_multilingual_v2',
    });
  });

  it('keeps incomplete infrastructure disabled without manufacturing artifacts', () => {
    expect(loadDialogueAudioConfig({})).toBeNull();
    expect(createConfiguredDialogueArtifactResolver({})).toBeUndefined();
    expect(() => loadDialogueAudioConfig({ ELEVENLABS_API_KEY: 'partial' }))
      .toThrow('partially configured');
  });

  it('enforces server-only credential names and the immutable object namespace', () => {
    expect(() => requiredServerValue({ VITE_PRIVATE_KEY: 'exposed' }, 'VITE_PRIVATE_KEY'))
      .toThrow('server-side');
    expect(() => assertDialogueObjectKey('other/v1/deadbeef.mp3'))
      .toThrow('immutable dialogue namespace');
    expect(() => assertDialogueObjectKey('dialogue/v1/not-a-digest.mp3'))
      .toThrow('immutable dialogue namespace');
  });

  it('retries a conditional upload conflict when the artifact is still absent', async () => {
    let call = 0;
    const send = vi.fn(async () => {
      call += 1;
      if (call === 1) {
        throw Object.assign(new Error('conflict'), {
          name: 'ConditionalRequestConflict',
          $metadata: { httpStatusCode: 409 },
        });
      }
      if (call === 2) {
        throw Object.assign(new Error('missing'), {
          name: 'NotFound',
          $metadata: { httpStatusCode: 404 },
        });
      }
      return {};
    });
    const store = new R2DialogueAudioArtifactStore({
      accessKeyId: 'private-access-key',
      secretAccessKey: 'private-secret',
      endpoint: 'https://account.r2.cloudflarestorage.com',
      bucket: 'library',
      publicBaseUrl: DIALOGUE_ARTIFACT_PUBLIC_ORIGIN,
      region: 'auto',
    }, { send } as unknown as S3Client);

    await expect(store.put({
      objectKey: `dialogue/v1/${'a'.repeat(64)}.mp3`,
      bytes: new Uint8Array([1, 2, 3]),
      checksumSha256: 'checksum',
    })).resolves.toBeUndefined();
    expect(send).toHaveBeenCalledTimes(3);
  });

  it('supports injected provider and storage adapters without exposing credentials', async () => {
    const environment = {
      ELEVENLABS_API_KEY: 'private-api-key',
      R2_ACCESS_KEY_ID: 'private-r2-key',
      R2_SECRET_ACCESS_KEY: 'private-r2-secret',
      R2_ENDPOINT_URL: 'https://account.r2.cloudflarestorage.com',
      R2_PUBLIC_BUCKET_NAME: 'library',
      R2_PUBLIC_AUDIO_URL: DIALOGUE_ARTIFACT_PUBLIC_ORIGIN,
    };
    const objectStore = new MemoryArtifactStore();
    const provider: DialogueSpeechProvider = {
      synthesize: vi.fn(async () => new Uint8Array([4, 5, 6])),
    };
    const resolver = createConfiguredDialogueArtifactResolver(environment, {
      objectStore,
      provider,
    });
    const result = await resolver!({ chapter: chapter('Rin said, “Proceed.”'), characters });

    const serialized = JSON.stringify(result);
    expect(result).toHaveLength(1);
    expect(serialized).not.toContain(environment.ELEVENLABS_API_KEY);
    expect(serialized).not.toContain(environment.R2_ACCESS_KEY_ID);
    expect(serialized).not.toContain(environment.R2_SECRET_ACCESS_KEY);
    expect(serialized).not.toContain(providerVoiceId);
  });
});
