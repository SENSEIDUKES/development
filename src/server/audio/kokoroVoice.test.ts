import { describe, expect, it, vi } from 'vitest';
import { handleChapterVoiceHttp, isKokoroVoiceRequest } from './chapterVoiceHttp';
import { createKokoroVoiceService, kokoroVoiceAvailable } from './kokoroVoice';

/** Free Kokoro lines: the app's server asks SEIHouse's voice server, with the key, and hands back the saved clip's address. */

const environment = { KOKORO_SERVER_URL: 'https://kokoro.example.run.app/', KOKORO_SERVER_TOKEN: 'shared-key' };

describe('Kokoro voices through the app\'s server', () => {
  it('asks the voice server with its key and answers the clip at the voice server\'s address', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ url: '/clip/kokoro-82m-v1.0-fp32/bm_lewis/abc.mp3', made: true }), { status: 200 }));
    const service = createKokoroVoiceService(environment, fetchImpl as unknown as typeof fetch);
    await expect(service.line({ text: 'The gate stood open.', voice: 'bm_lewis' })).resolves.toEqual({
      url: 'https://kokoro.example.run.app/clip/kokoro-82m-v1.0-fp32/bm_lewis/abc.mp3', made: true,
    });
    const [address, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(address).toBe('https://kokoro.example.run.app/line');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer shared-key');
    expect(JSON.parse(init.body as string)).toEqual({ text: 'The gate stood open.', voice: 'bm_lewis' });
  });

  it('is only offered when the voice server is set up', async () => {
    expect(kokoroVoiceAvailable({})).toBe(false);
    expect(kokoroVoiceAvailable(environment)).toBe(true);
    const off = await handleChapterVoiceHttp({ method: 'GET' }, { environment: {} });
    expect(off.body).toMatchObject({ kokoro: false });
    const refused = await handleChapterVoiceHttp({ method: 'POST', body: { kokoro: { text: 'Hello.', voice: 'bm_lewis' } } }, { environment: {} });
    expect(refused.status).toBe(503);
  });

  it('checks the line and the voice, and never lets the key reach the browser', async () => {
    const line = vi.fn(async () => ({ url: 'https://kokoro.example.run.app/clip/x.mp3', made: false }));
    const ask = (kokoro: unknown) => handleChapterVoiceHttp({ method: 'POST', body: { kokoro } }, { environment, kokoro: { line } });
    expect((await ask({ text: '', voice: 'bm_lewis' })).status).toBe(400);
    expect((await ask({ text: 'x'.repeat(601), voice: 'bm_lewis' })).status).toBe(400);
    expect((await ask({ text: 'Hello.', voice: '../etc' })).status).toBe(400);
    const answer = await ask({ text: '  Hello.  ', voice: 'am_puck' });
    expect(answer).toMatchObject({ status: 200, body: { url: 'https://kokoro.example.run.app/clip/x.mp3', made: false } });
    expect(JSON.stringify(answer)).not.toContain('shared-key');
    expect(line).toHaveBeenCalledWith({ text: 'Hello.', voice: 'am_puck' });
  });

  it('answers a failed voice server plainly', async () => {
    const onError = vi.fn();
    const answer = await handleChapterVoiceHttp({ method: 'POST', body: { kokoro: { text: 'Hello.', voice: 'bm_lewis' } } }, {
      environment, onError, kokoro: { line: async () => { throw new Error('boom'); } },
    });
    expect(answer).toMatchObject({ status: 502, body: { error: 'The line could not be voiced right now.' } });
    expect(onError).toHaveBeenCalled();
  });

  it('tells a free Kokoro line from a paid one, for its own visitor limit', () => {
    expect(isKokoroVoiceRequest({ kokoro: { text: 'a', voice: 'bm_lewis' } })).toBe(true);
    expect(isKokoroVoiceRequest(JSON.stringify({ kokoro: {} }))).toBe(true);
    expect(isKokoroVoiceRequest({ line: { text: 'a', voiceKey: 'v' } })).toBe(false);
    expect(isKokoroVoiceRequest('not json')).toBe(false);
    // A paid line cannot be counted as Kokoro: what is counted is what is made.
    expect(isKokoroVoiceRequest({ kokoro: null, line: { text: 'a', voiceKey: 'v' } })).toBe(false);
    expect(isKokoroVoiceRequest({ kokoro: 'yes', line: { text: 'a', voiceKey: 'v' } })).toBe(false);
  });
});
