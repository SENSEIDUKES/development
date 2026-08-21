import { describe, expect, it, vi } from 'vitest';
import {
  CodexVoiceQuoteService,
  createConfiguredCodexVoiceQuoteService,
  isCodexVoiceConfigured,
  loadCodexVoiceConfig,
  type VoiceSpeechProvider,
} from './codexVoiceQuote';

const environment = {
  ELEVENLABS_API_KEY: 'server-only-provider-key',
  ELEVENLABS_MODEL_ID: 'eleven_multilingual_v2',
};

const character = (overrides: Record<string, unknown> = {}) => ({
  id: 'character-wen-shu',
  name: 'Wen Shu',
  signatureQuote: 'The archive remembers what the court forgets.',
  ...overrides,
});

const createProvider = (): VoiceSpeechProvider & { synthesize: ReturnType<typeof vi.fn> } => ({
  synthesize: vi.fn(async () => new Uint8Array([1, 2, 3])),
});

const createService = () => {
  const provider = createProvider();
  const service = new CodexVoiceQuoteService({
    model: 'eleven_multilingual_v2',
    provider,
  });
  return { service, provider };
};

describe('Codex signature-quote voice generation', () => {
  it('calls the provider and returns audio bytes for immediate playback', async () => {
    const { service, provider } = createService();

    const result = await service.resolve({ character: character() });

    expect(result).toMatchObject({ ok: true, characterId: 'character-wen-shu' });
    expect(provider.synthesize).toHaveBeenCalledTimes(1);
    expect(provider.synthesize.mock.calls[0][0].text)
      .toBe('The archive remembers what the court forgets.');
    if (!result.ok) throw new Error('expected success');
    expect(result.audio).toMatchObject({
      base64: Buffer.from([1, 2, 3]).toString('base64'),
      mimeType: 'audio/mpeg',
    });
  });

  it('calls the provider again on every later tap — nothing is cached or reused', async () => {
    const { service, provider } = createService();

    const first = await service.resolve({ character: character() });
    const second = await service.resolve({ character: character() });
    const third = await service.resolve({ character: character() });

    expect(provider.synthesize).toHaveBeenCalledTimes(3);
    expect(first).toMatchObject({ ok: true });
    expect(second).toMatchObject({ ok: true });
    expect(third).toMatchObject({ ok: true });
  });

  it('calls the provider once per concurrent tap — taps are never collapsed', async () => {
    const { service, provider } = createService();

    const results = await Promise.all([
      service.resolve({ character: character() }),
      service.resolve({ character: character() }),
      service.resolve({ character: character() }),
      service.resolve({ character: character() }),
    ]);

    expect(provider.synthesize).toHaveBeenCalledTimes(4);
    expect(results.every(result => result.ok)).toBe(true);
  });

  it('resolves the assigned voiceKey for a changed quote or a reassigned voice', async () => {
    const { service, provider } = createService();

    const original = await service.resolve({ character: character() });
    if (!original.ok) throw new Error('expected success');

    const changedQuote = await service.resolve({
      character: character({ signatureQuote: 'A seam runs through every oath.' }),
    });
    if (!changedQuote.ok) throw new Error('expected success');
    expect(provider.synthesize).toHaveBeenCalledTimes(2);

    const reassignedVoiceKey = original.voiceKey === 'merchant-male'
      ? 'dark-sect-elder-male'
      : 'merchant-male';
    const changedVoice = await service.resolve({
      character: character({ voiceKey: reassignedVoiceKey }),
    });
    if (!changedVoice.ok) throw new Error('expected success');
    expect(changedVoice.voiceKey).toBe(reassignedVoiceKey);
    expect(provider.synthesize).toHaveBeenCalledTimes(3);
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
    const onError = vi.fn();
    const service = new CodexVoiceQuoteService({
      model: 'eleven_multilingual_v2',
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
  });
});

describe('Codex voice configuration', () => {
  it('keeps the provider credential on the server', () => {
    const config = loadCodexVoiceConfig(environment);

    expect(config).toMatchObject({ elevenLabsApiKey: 'server-only-provider-key' });
    expect(isCodexVoiceConfigured(environment)).toBe(true);
    // A browser-exposed variable can never stand in for a server credential.
    const browserExposed = {
      ...environment,
      ELEVENLABS_API_KEY: undefined,
      VITE_ELEVENLABS_API_KEY: 'leaked',
    } as Record<string, string | undefined>;
    expect(loadCodexVoiceConfig(browserExposed)).toBeNull();
    expect(isCodexVoiceConfigured(browserExposed)).toBe(false);
  });

  it('rejects an invalid model id', () => {
    expect(() => loadCodexVoiceConfig({
      ...environment,
      ELEVENLABS_MODEL_ID: '  ',
    })).not.toThrow();
    expect(() => loadCodexVoiceConfig({
      ...environment,
      ELEVENLABS_MODEL_ID: '$invalid$',
    })).toThrow(/ELEVENLABS_MODEL_ID is invalid/u);
  });

  it('creates no service at all when nothing is configured', () => {
    expect(createConfiguredCodexVoiceQuoteService({})).toBeUndefined();
  });
});
