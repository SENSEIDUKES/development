import { describe, expect, it, vi } from 'vitest';
import { handleCodexVoiceQuoteHttp } from './codexVoiceQuoteHttp';
import { CodexVoiceQuoteService, type VoiceArtifactStore } from './codexVoiceQuote';
import { CODEX_VOICE_ARTIFACT_VERSION } from '../../audio/voiceArtifacts';

const environment = {
  ELEVENLABS_API_KEY: 'server-only-provider-key',
  R2_ACCESS_KEY_ID: 'server-only-access-key',
  R2_SECRET_ACCESS_KEY: 'server-only-secret',
  R2_ENDPOINT_URL: 'https://accountid.r2.cloudflarestorage.com',
  R2_PUBLIC_BUCKET_NAME: 'library',
  R2_PUBLIC_AUDIO_URL: 'https://celestialaudio.seihouse.org',
};

const createService = () => {
  const objects = new Map<string, Uint8Array>();
  const objectStore: VoiceArtifactStore = {
    has: async key => objects.has(key),
    put: async ({ objectKey, bytes }) => { objects.set(objectKey, bytes); },
    publicUrl: key => `https://celestialaudio.seihouse.org/${key}`,
  };
  const synthesize = vi.fn(async () => new Uint8Array([1, 2, 3]));
  return {
    objects,
    synthesize,
    service: new CodexVoiceQuoteService({
      model: 'eleven_multilingual_v2',
      objectStore,
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
  it('returns an application-owned artifact and voiceKey for a valid tap', async () => {
    const { service, synthesize } = createService();

    const response = await handleCodexVoiceQuoteHttp(
      { method: 'POST', body: characterBody() },
      { environment, service },
    );

    expect(response.status).toBe(200);
    const body = response.body as {
      voice: { characterId: string; voiceKey: string; artifact: Record<string, string> };
    };
    expect(body.voice.characterId).toBe('character-wen-shu');
    expect(body.voice.voiceKey).toEqual(expect.any(String));
    expect(body.voice.artifact.publicUrl)
      .toMatch(/^https:\/\/celestialaudio\.seihouse\.org\/voice\//u);
    expect(body.voice.artifact.artifactVersion).toBe(CODEX_VOICE_ARTIFACT_VERSION);
    expect(synthesize).toHaveBeenCalledTimes(1);
    // No provider identity ever crosses the response boundary.
    const serialized = JSON.stringify(response.body);
    expect(serialized).not.toContain('elevenlabs');
    expect(serialized).not.toContain('server-only-provider-key');
    expect(serialized).not.toContain('voice_id');
    expect(serialized).not.toContain('providerVoiceId');
  });

  it('reuses the stored artifact on a repeated request', async () => {
    const { service, synthesize } = createService();
    const request = { method: 'POST', body: characterBody() };

    const first = await handleCodexVoiceQuoteHttp(request, { environment, service });
    const second = await handleCodexVoiceQuoteHttp(request, { environment, service });

    expect(synthesize).toHaveBeenCalledTimes(1);
    expect(second.body).toEqual(first.body);
  });

  it('refuses any client-chosen text, voice, key, model, or URL', async () => {
    const { service, synthesize } = createService();
    const rejected = [
      { character: { id: 'c', name: 'N' }, text: 'say anything' },
      characterBody({ voice_id: 'provider-voice' }),
      characterBody({ objectKey: 'voice/v1/attacker.mp3' }),
      characterBody({ publicUrl: 'https://audio.example.invalid/x.mp3' }),
      characterBody({ model: 'eleven_turbo_v2' }),
      characterBody({ quote: 'A quote the Codex never stored.' }),
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
