import { describe, expect, it, vi } from 'vitest';
import { handleFamiliarLiveHttp, parseFamiliarLiveBrief } from './http';
import { familiarLiveDocs } from './prompt';

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
    expect((await handleFamiliarLiveHttp({ method: 'GET' }, { environment: { GEMINI_API_KEY: 'secret' } })).body).toEqual({
      configured: true, provider: 'gemini', model: 'google/gemini-3.8-live', models: [{ id: 'google/gemini-3.8-live', provider: 'gemini' }],
    });
    expect((await handleFamiliarLiveHttp({ method: 'GET' }, { environment: {} })).body).toMatchObject({ configured: false, models: [] });
    // With an OpenAI key, GPT-Live serves first; FAMILIAR_LIVE_MODEL chooses another. Both are offered to the Router.
    expect((await handleFamiliarLiveHttp({ method: 'GET' }, { environment: { GEMINI_API_KEY: 'g', OPENAI_API_KEY: 'o' } })).body).toEqual({
      configured: true, provider: 'openai', model: 'openai/gpt-live-1',
      models: [{ id: 'openai/gpt-live-1', provider: 'openai' }, { id: 'google/gemini-3.8-live', provider: 'gemini' }],
    });
    expect((await handleFamiliarLiveHttp({ method: 'GET' }, { environment: { GEMINI_API_KEY: 'g', OPENAI_API_KEY: 'o', FAMILIAR_LIVE_MODEL: 'google/gemini-3.8-live' } })).body)
      .toMatchObject({ configured: true, provider: 'gemini' });
    expect(JSON.stringify((await handleFamiliarLiveHttp({ method: 'GET' }, { environment: { GEMINI_API_KEY: 'secret' } })).body)).not.toContain('secret');
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
      provider: 'gemini',
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

  it('says it could not start when Gemini mints no token, with Gemini\'s reason and never the key', async () => {
    const onError = vi.fn();
    const result = await handleFamiliarLiveHttp({ method: 'POST', body: { brief } },
      { environment: { GEMINI_API_KEY: 'sk-live-123' }, tokens: () => ({ create: async () => { throw new Error('{"error":{"code":400,"message":"bad field for key sk-live-123"}}'); } }), onError });
    expect(result).toMatchObject({ status: 502, body: {
      error: 'Your Familiar could not start talking. Try again.',
      detail: '{"error":{"code":400,"message":"bad field for key [key]"}}',
    } });
    expect(JSON.stringify(result.body)).not.toContain('sk-live-123');
    expect(onError).toHaveBeenCalledOnce();
  });

  it('starts a GPT-Live conversation from the browser\'s offer: the voice speaks as the Familiar, the backend runs its functions', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ session: { id: 'live_1' }, transport: { type: 'webrtc', sdp: 'v=0 answer' } }), { status: 201 }));
    const result = await handleFamiliarLiveHttp({ method: 'POST', body: { brief, sdp: 'v=0 offer' } },
      { environment: { OPENAI_API_KEY: 'sk-test' }, openAiFetch: fetch as unknown as typeof globalThis.fetch });
    expect(result).toMatchObject({ status: 201, body: { provider: 'openai', session: { id: 'live_1' }, transport: { sdp: 'v=0 answer' } } });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.openai.com/v1/live/sessions');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk-test');
    const sent = JSON.parse(String(init.body));
    expect(sent.transport).toEqual({ type: 'webrtc', sdp: 'v=0 offer' });
    expect(sent.session).toMatchObject({ model: 'gpt-live-1', audio: { output: { voice: 'ballad' } } });
    expect(sent.session.instructions).toContain('You are Celestial Guardian');
    expect(sent.session.instructions).toContain('- Energy (energy): Energy is the currency used for manifesting.');
    expect(sent.session.instructions).toContain('delegate to the backend');
    expect(sent.session.delegation).toMatchObject({ type: 'responses', responses: {
      model: 'gpt-5.4-mini', tool_choice: 'auto', parallel_tool_calls: false, reasoning: { effort: 'low' },
    } });
    expect(sent.session.delegation.responses.instructions).toContain('- custom: Custom. Your own direction.');
    expect(sent.session.delegation.responses.tools.map((tool: { name: string }) => tool.name)).toEqual(['show_topic', 'propose_action', 'answer_proposal']);
    expect(sent.session.delegation.responses.tools[0]).toMatchObject({ type: 'function', parameters: { type: 'object', properties: { topic_id: { enum: ['energy'] } } } });
  });

  it('needs the browser\'s offer for OpenAI, and passes on OpenAI\'s reason without the key', async () => {
    expect((await handleFamiliarLiveHttp({ method: 'POST', body: { brief } }, { environment: { OPENAI_API_KEY: 'sk-test' } })).status).toBe(400);
    const fetch = vi.fn(async () => new Response(JSON.stringify({ error: { code: 'model_not_found', message: 'gpt-live-1 is not available to sk-test' } }), { status: 403 }));
    const result = await handleFamiliarLiveHttp({ method: 'POST', body: { brief, sdp: 'v=0 offer' } },
      { environment: { OPENAI_API_KEY: 'sk-test', FAMILIAR_LIVE_OPENAI_VOICE: 'marin', FAMILIAR_LIVE_OPENAI_BACKEND: 'gpt-5.4-nano' }, openAiFetch: fetch as unknown as typeof globalThis.fetch, onError: vi.fn() });
    expect(result).toMatchObject({ status: 502, body: { detail: 'OpenAI 403: model_not_found: gpt-live-1 is not available to [key]' } });
    const sent = JSON.parse(String((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(sent.session.audio.output.voice).toBe('marin');
    expect(sent.session.delegation.responses.model).toBe('gpt-5.4-nano');
  });

  it('runs the reader\'s Router choice when this server can, and the server\'s own otherwise', async () => {
    const create = vi.fn(async () => ({ name: 'auth_tokens/abc' }));
    const fetch = vi.fn(async () => new Response(JSON.stringify({ session: { id: 'live_1' }, transport: { type: 'webrtc', sdp: 'answer' } }), { status: 201 }));
    const environment = { GEMINI_API_KEY: 'g', OPENAI_API_KEY: 'o' };
    const chosen = await handleFamiliarLiveHttp({ method: 'POST', body: { brief, model: 'google/gemini-3.8-live' } },
      { environment, tokens: () => ({ create }), openAiFetch: fetch as unknown as typeof globalThis.fetch });
    expect(chosen.body).toMatchObject({ provider: 'gemini', token: 'auth_tokens/abc' });
    expect(fetch).not.toHaveBeenCalled();
    // A model this server cannot run falls back to its own choice.
    const unknown = await handleFamiliarLiveHttp({ method: 'POST', body: { brief, sdp: 'offer', model: 'xai/grok-voice' } },
      { environment, tokens: () => ({ create }), openAiFetch: fetch as unknown as typeof globalThis.fetch });
    expect(unknown.body).toMatchObject({ provider: 'openai' });
    const noKey = await handleFamiliarLiveHttp({ method: 'POST', body: { brief, model: 'openai/gpt-live-1' } },
      { environment: { GEMINI_API_KEY: 'g' }, tokens: () => ({ create }) });
    expect(noKey.body).toMatchObject({ provider: 'gemini' });
  });
});
