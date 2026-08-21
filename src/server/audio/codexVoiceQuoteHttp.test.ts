import { describe, expect, it, vi } from 'vitest';
import { handleCodexVoiceQuoteHttp } from './codexVoiceQuoteHttp';
import { CodexVoiceQuoteService } from './codexVoiceQuote';

const environment = {
  ELEVENLABS_API_KEY: 'server-only-provider-key',
};

const createService = () => {
  const synthesize = vi.fn(async () => new Uint8Array([1, 2, 3]));
  return {
    synthesize,
    service: new CodexVoiceQuoteService({
      model: 'eleven_multilingual_v2',
      provider: { synthesize },
    }),
  };
};

const characterBody = (overrides: Record<string, unknown> = {}) => ({
  character: {
    id: 'character-wen-shu',
    name: 'Wen Shu',
    signatureQuote: 'The archive remembers what the court forgets.',
    ...overrides,
  },
});

describe('Codex voice quote endpoint', () => {
  it('returns synthesized audio and voiceKey for a valid tap', async () => {
    const { service, synthesize } = createService();

    const response = await handleCodexVoiceQuoteHttp(
      { method: 'POST', body: characterBody() },
      { environment, service },
    );

    expect(response.status).toBe(200);
    const body = response.body as {
      voice: { characterId: string; voiceKey: string; audio: { base64: string; mimeType: string } };
    };
    expect(body.voice.characterId).toBe('character-wen-shu');
    expect(body.voice.voiceKey).toEqual(expect.any(String));
    expect(body.voice.audio.mimeType).toBe('audio/mpeg');
    expect(body.voice.audio.base64).toBe(Buffer.from([1, 2, 3]).toString('base64'));
    expect(synthesize).toHaveBeenCalledTimes(1);
    // No provider identity ever crosses the response boundary.
    const serialized = JSON.stringify(response.body);
    expect(serialized).not.toContain('elevenlabs');
    expect(serialized).not.toContain('server-only-provider-key');
    expect(serialized).not.toContain('voice_id');
    expect(serialized).not.toContain('providerVoiceId');
  });

  it('calls the provider again on a repeated request — nothing is reused', async () => {
    const { service, synthesize } = createService();
    const request = { method: 'POST', body: characterBody() };

    await handleCodexVoiceQuoteHttp(request, { environment, service });
    await handleCodexVoiceQuoteHttp(request, { environment, service });

    expect(synthesize).toHaveBeenCalledTimes(2);
  });

  it('refuses any client-chosen text, voice, key, or model', async () => {
    const { service, synthesize } = createService();
    const rejected = [
      { character: { id: 'c', name: 'N' }, text: 'say anything' },
      characterBody({ voice_id: 'provider-voice' }),
      characterBody({ model: 'eleven_turbo_v2' }),
      characterBody({ quote: 'A quote the Codex never stored.' }),
      characterBody({ audio: { base64: 'AAAA', mimeType: 'audio/mpeg' } }),
    ];

    for (const body of rejected) {
      const response = await handleCodexVoiceQuoteHttp(
        { method: 'POST', body },
        { environment, service },
      );
      expect(response.status).toBe(400);
    }
    expect(synthesize).not.toHaveBeenCalled();
  });

  it('requires POST', async () => {
    const { service, synthesize } = createService();

    await expect(handleCodexVoiceQuoteHttp(
      { method: 'GET' },
      { environment, service },
    )).resolves.toMatchObject({ status: 405 });

    expect(synthesize).not.toHaveBeenCalled();
  });

  it('reports the control as unavailable when nothing is configured', async () => {
    const response = await handleCodexVoiceQuoteHttp(
      { method: 'POST', body: characterBody() },
      { environment: {} },
    );

    expect(response.status).toBe(503);
  });

  it('rejects ineligible entities without any provider call', async () => {
    const { service, synthesize } = createService();

    const response = await handleCodexVoiceQuoteHttp(
      {
        method: 'POST',
        body: characterBody({
          portraitKind: 'non-human',
          creatureProfile: { intelligence: 'mindless' },
        }),
      },
      { environment, service },
    );

    expect(response.status).toBe(422);
    expect(synthesize).not.toHaveBeenCalled();
  });
});
