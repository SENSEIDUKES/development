import { describe, expect, it, vi } from 'vitest';
import { familiarLiveDocs, handleFamiliarLiveHttp, parseFamiliarLiveBrief } from './http';

const brief = {
  familiar: { name: 'Celestial Guardian', description: 'A loyal fox spirit.' },
  place: 'Home',
  language: 'en-US',
  topics: [{ id: 'energy', label: 'Energy', explanation: 'Energy is the currency used for manifesting.' }],
  actions: [{ id: 'custom', label: 'Custom', detail: 'Your own direction', input: { label: 'Direction', maxLength: 1200 } }],
};
const NOW = Date.parse('2026-10-29T12:00:00Z');

describe('Familiar live talk route', () => {
  it('reports whether live talk is configured, without revealing the key', async () => {
    expect((await handleFamiliarLiveHttp({ method: 'GET' }, { environment: { GEMINI_API_KEY: 'secret' } })).body).toEqual({ configured: true });
    expect((await handleFamiliarLiveHttp({ method: 'GET' }, { environment: {} })).body).toEqual({ configured: false });
    expect(await handleFamiliarLiveHttp({ method: 'POST', body: { brief } }, { environment: {} })).toMatchObject({ status: 503, body: { code: 'unavailable' } });
  });

  it('mints one single-use token locked to the model, voice, instructions and tools', async () => {
    const create = vi.fn(async () => ({ name: 'auth_tokens/abc' }));
    const result = await handleFamiliarLiveHttp({ method: 'POST', body: JSON.stringify({ brief }) },
      { environment: { GEMINI_API_KEY: 'secret' }, tokens: () => ({ create }), now: () => NOW });
    expect(result.status).toBe(200);
    const { config } = (create.mock.calls[0] as unknown as [{ config: Record<string, any> }])[0];
    expect(config).toMatchObject({
      uses: 1,
      expireTime: '2026-10-29T12:10:00.000Z',
      newSessionExpireTime: '2026-10-29T12:01:00.000Z',
      liveConnectConstraints: { model: 'gemini-3.8-live', config: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } } } },
    });
    // Gemini refuses the field mask the SDK writes for it (2026-10-29), so the whole setup is locked instead.
    expect(config).not.toHaveProperty('lockAdditionalFields');
    const instruction: string = config.liveConnectConstraints.config.systemInstruction.parts[0].text;
    expect(instruction).toContain('You are Celestial Guardian');
    expect(instruction).toContain('- Energy (energy): Energy is the currency used for manifesting.');
    expect(instruction).toContain('- custom: Custom. Your own direction. Needs their words for "Direction", at most 1200 characters');
    // Beyond the page, the NovelExpanded Docs are its facts.
    expect(instruction).toContain(familiarLiveDocs());
    expect(familiarLiveDocs()).toContain('- Story Seed (Story): The starting place for a new novel and its world.');
    const tools = config.liveConnectConstraints.config.tools[0].functionDeclarations;
    expect(tools.map((tool: { name: string }) => tool.name)).toEqual(['show_topic', 'propose_action', 'answer_proposal']);
    expect(tools[0].parameters.properties.topic_id.enum).toEqual(['energy']);
    expect(tools[1].parameters.properties.action_id.enum).toEqual(['custom']);
    // The browser opens the same setup the token locks.
    expect(result.body).toEqual({
      token: 'auth_tokens/abc',
      expiresAt: '2026-10-29T12:10:00.000Z',
      setup: expect.objectContaining({
        model: 'models/gemini-3.8-live',
        generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } } },
        systemInstruction: { parts: [{ text: instruction }] },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      }),
    });
  });

  it('offers no tools a place does not have, and follows the server\'s live model and voice', async () => {
    const create = vi.fn(async () => ({ name: 'auth_tokens/abc' }));
    await handleFamiliarLiveHttp({ method: 'POST', body: { brief: { ...brief, topics: [], actions: [] } } },
      { environment: { GEMINI_API_KEY: 'secret', FAMILIAR_LIVE_VOICE: 'Kore', FAMILIAR_LIVE_MODEL: 'google/unknown' }, tokens: () => ({ create }) });
    const { config } = (create.mock.calls[0] as unknown as [{ config: Record<string, any> }])[0];
    expect(config.liveConnectConstraints.model).toBe('gemini-3.8-live');
    expect(config.liveConnectConstraints.config.tools).toBeUndefined();
    expect(config.liveConnectConstraints.config.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName).toBe('Kore');
    expect(config.liveConnectConstraints.config.systemInstruction.parts[0].text).toContain('You cannot change anything on this page.');
  });

  it('accepts only a bounded brief, so a request cannot become a general prompt', async () => {
    expect(() => parseFamiliarLiveBrief({})).toThrow('needs a brief');
    expect(() => parseFamiliarLiveBrief({ brief: { ...brief, place: 'x'.repeat(81) } })).toThrow('place must be text of at most 80');
    expect(() => parseFamiliarLiveBrief({ brief: { ...brief, topics: [{ ...brief.topics[0], id: 'no spaces' }] } })).toThrow('not a valid id');
    expect(() => parseFamiliarLiveBrief({ brief: { ...brief, topics: Array(21).fill(brief.topics[0]) } })).toThrow('at most 20');
    expect(() => parseFamiliarLiveBrief({ brief: { ...brief, language: 'English please' } })).toThrow('language');
    const result = await handleFamiliarLiveHttp({ method: 'POST', body: '{' }, { environment: { GEMINI_API_KEY: 'secret' } });
    expect(result.status).toBe(400);
  });

  it('says it could not start when Gemini mints no token, and never leaks the error', async () => {
    const onError = vi.fn();
    const result = await handleFamiliarLiveHttp({ method: 'POST', body: { brief } },
      { environment: { GEMINI_API_KEY: 'secret' }, tokens: () => ({ create: async () => { throw new Error('quota: secret detail'); } }), onError });
    expect(result).toMatchObject({ status: 502, body: { error: 'Your Familiar could not start talking. Try again.' } });
    expect(onError).toHaveBeenCalledOnce();
  });
});
