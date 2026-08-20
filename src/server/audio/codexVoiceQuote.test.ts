import { describe, expect, it, vi } from 'vitest';
import {
  CodexVoiceQuoteService,
  codexVoiceObjectKey,
  createConfiguredCodexVoiceQuoteService,
  isCodexVoiceConfigured,
  loadCodexVoiceConfig,
  type VoiceArtifactStore,
  type VoiceSpeechProvider,
} from './codexVoiceQuote';
import { CODEX_VOICE_ARTIFACT_VERSION } from '../../audio/voiceArtifacts';

const environment = {
  ELEVENLABS_API_KEY: 'server-only-provider-key',
  ELEVENLABS_MODEL_ID: 'eleven_multilingual_v2',
  R2_ACCESS_KEY_ID: 'server-only-access-key',
  R2_SECRET_ACCESS_KEY: 'server-only-secret',
  R2_ENDPOINT_URL: 'https://accountid.r2.cloudflarestorage.com',
  R2_PUBLIC_BUCKET_NAME: 'library',
  R2_PUBLIC_AUDIO_URL: 'https://celestialaudio.seihouse.org',
};

const character = (overrides: Record<string, unknown> = {}) => ({
  id: 'character-wen-shu',
  name: 'Wen Shu',
  signatureQuote: 'The archive remembers what the court forgets.',
  ...overrides,
});

/** In-memory stand-in for the immutable R2 namespace. */
const createStore = () => {
  const objects = new Map<string, Uint8Array>();
  const store: VoiceArtifactStore & { objects: Map<string, Uint8Array> } = {
    objects,
    has: vi.fn(async (objectKey: string) => objects.has(objectKey)),
    put: vi.fn(async ({ objectKey, bytes }) => {
      objects.set(objectKey, bytes);
    }),
    publicUrl: (objectKey: string) => `https://celestialaudio.seihouse.org/${objectKey}`,
  };
  return store;
};

const createProvider = (): VoiceSpeechProvider & { synthesize: ReturnType<typeof vi.fn> } => ({
  synthesize: vi.fn(async () => new Uint8Array([1, 2, 3])),
});

const createService = () => {
  const objectStore = createStore();
  const provider = createProvider();
  const service = new CodexVoiceQuoteService({
    model: 'eleven_multilingual_v2',
    objectStore,
    provider,
  });
  return { service, objectStore, provider };
};

describe('Codex signature-quote voice generation', () => {
  it('generates once on the first tap and stores the artifact in the voice namespace', async () => {
    const { service, objectStore, provider } = createService();

    const result = await service.resolve({ character: character() });

    expect(result).toMatchObject({ ok: true, generated: true, characterId: 'character-wen-shu' });
    expect(provider.synthesize).toHaveBeenCalledTimes(1);
    expect(provider.synthesize.mock.calls[0][0].text)
      .toBe('The archive remembers what the court forgets.');
    expect(objectStore.put).toHaveBeenCalledTimes(1);
    const [objectKey] = [...objectStore.objects.keys()];
    expect(objectKey).toMatch(
      new RegExp(`^voice/${CODEX_VOICE_ARTIFACT_VERSION}/[a-f0-9]{64}\\.mp3$`, 'u'),
    );
    if (!result.ok) throw new Error('expected success');
    expect(result.artifact).toMatchObject({
      publicUrl: `https://celestialaudio.seihouse.org/${objectKey}`,
      quote: 'The archive remembers what the court forgets.',
      model: 'eleven_multilingual_v2',
      artifactVersion: CODEX_VOICE_ARTIFACT_VERSION,
    });
  });

  it('reuses the stored R2 object on every later tap without calling the provider again', async () => {
    const { service, objectStore, provider } = createService();

    const first = await service.resolve({ character: character() });
    const second = await service.resolve({ character: character() });
    const third = await service.resolve({ character: character() });

    expect(provider.synthesize).toHaveBeenCalledTimes(1);
    expect(objectStore.put).toHaveBeenCalledTimes(1);
    expect(second).toMatchObject({ ok: true, generated: false });
    expect(third).toMatchObject({ ok: true, generated: false });
    if (!first.ok || !second.ok) throw new Error('expected success');
    expect(second.artifact.publicUrl).toBe(first.artifact.publicUrl);
  });

  it('collapses concurrent taps into a single generation', async () => {
    const { service, objectStore, provider } = createService();

    const results = await Promise.all([
      service.resolve({ character: character() }),
      service.resolve({ character: character() }),
      service.resolve({ character: character() }),
      service.resolve({ character: character() }),
    ]);

    expect(provider.synthesize).toHaveBeenCalledTimes(1);
    expect(objectStore.put).toHaveBeenCalledTimes(1);
    expect(objectStore.objects.size).toBe(1);
    const urls = new Set(results.map(result => (result.ok ? result.artifact.publicUrl : 'failed')));
    expect(urls.size).toBe(1);
  });

  it('invalidates the stored artifact when the quote or the voice changes', async () => {
    const { service, objectStore, provider } = createService();

    const original = await service.resolve({ character: character() });
    if (!original.ok) throw new Error('expected success');

    const changedQuote = await service.resolve({
      character: character({ signatureQuote: 'A seam runs through every oath.' }),
    });
    if (!changedQuote.ok) throw new Error('expected success');
    expect(changedQuote.artifact.publicUrl).not.toBe(original.artifact.publicUrl);
    expect(provider.synthesize).toHaveBeenCalledTimes(2);

    const reassignedVoiceKey = original.voiceKey === 'merchant-male'
      ? 'dark-sect-elder-male'
      : 'merchant-male';
    const changedVoice = await service.resolve({
      character: character({ voiceKey: reassignedVoiceKey }),
    });
    if (!changedVoice.ok) throw new Error('expected success');
    expect(changedVoice.artifact.voiceKey).toBe(reassignedVoiceKey);
    expect(changedVoice.artifact.publicUrl).not.toBe(original.artifact.publicUrl);
    expect(objectStore.objects.size).toBe(3);
  });

  it('binds the object key to character, quote, voiceKey, model, and artifact version', () => {
    const base = {
      characterId: 'character-wen-shu',
      voiceKey: 'ancient-master-female',
      quote: 'The archive remembers.',
      model: 'eleven_multilingual_v2',
    };
    const key = codexVoiceObjectKey(base);

    expect(codexVoiceObjectKey(base)).toBe(key);
    expect(codexVoiceObjectKey({ ...base, characterId: 'character-rin' })).not.toBe(key);
    expect(codexVoiceObjectKey({ ...base, quote: 'The archive forgets.' })).not.toBe(key);
    expect(codexVoiceObjectKey({ ...base, voiceKey: 'other-voice' })).not.toBe(key);
    expect(codexVoiceObjectKey({ ...base, model: 'eleven_turbo_v2' })).not.toBe(key);
    expect(key.startsWith(`voice/${CODEX_VOICE_ARTIFACT_VERSION}/`)).toBe(true);
  });

  it('refuses unnamed, quoteless, and non-intelligent entities', async () => {
    const { service, provider } = createService();

    await expect(service.resolve({ character: character({ name: '  ' }) }))
      .resolves.toMatchObject({ ok: false, reason: 'invalid-character' });
    await expect(service.resolve({ character: character({ signatureQuote: '' }) }))
      .resolves.toMatchObject({ ok: false, reason: 'missing-signature-quote' });
    await expect(service.resolve({
      character: character({
        portraitKind: 'non-human',
        creatureProfile: { intelligence: 'feral' },
      }),
    })).resolves.toMatchObject({ ok: false, reason: 'ineligible-character' });

    expect(provider.synthesize).not.toHaveBeenCalled();
  });

  it('reports a safe failure and never leaks provider detail when synthesis fails', async () => {
    const objectStore = createStore();
    const onError = vi.fn();
    const service = new CodexVoiceQuoteService({
      model: 'eleven_multilingual_v2',
      objectStore,
      provider: {
        synthesize: async () => {
          throw new Error('xi-api-key rejected: server-only-provider-key');
        },
      },
      onError,
    });

    const result = await service.resolve({ character: character() });

    expect(result).toMatchObject({ ok: false, reason: 'synthesis-failed' });
    expect(JSON.stringify(result)).not.toContain('server-only-provider-key');
    expect(JSON.stringify(result)).not.toContain('xi-api-key');
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(objectStore.objects.size).toBe(0);
  });
});

describe('Codex voice configuration', () => {
  it('keeps every provider and storage credential on the server', () => {
    const config = loadCodexVoiceConfig(environment);

    expect(config).toMatchObject({
      elevenLabsApiKey: 'server-only-provider-key',
      r2: expect.objectContaining({ accessKeyId: 'server-only-access-key' }),
    });
    expect(isCodexVoiceConfigured(environment)).toBe(true);
    // A browser-exposed variable can never stand in for a server credential.
    const browserExposed = {
      ...environment,
      ELEVENLABS_API_KEY: undefined,
      VITE_ELEVENLABS_API_KEY: 'leaked',
    } as Record<string, string | undefined>;
    expect(() => loadCodexVoiceConfig(browserExposed)).toThrow(/partially configured/u);
    expect(isCodexVoiceConfigured(browserExposed)).toBe(false);
  });

  it('rejects a partially configured or non-application storage origin', () => {
    expect(() => loadCodexVoiceConfig({ ELEVENLABS_API_KEY: 'only-this' }))
      .toThrow(/partially configured/u);
    expect(() => loadCodexVoiceConfig({
      ...environment,
      R2_PUBLIC_AUDIO_URL: 'https://audio.example.invalid',
    })).toThrow(/SEIHouse audio artifact origin/u);
    expect(() => loadCodexVoiceConfig({
      ...environment,
      R2_ENDPOINT_URL: 'https://user:secret@accountid.r2.cloudflarestorage.com',
    })).toThrow(/without embedded credentials/u);
  });

  it('creates no service at all when nothing is configured', () => {
    expect(createConfiguredCodexVoiceQuoteService({})).toBeUndefined();
  });
});
