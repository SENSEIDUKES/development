import { describe, expect, it, vi } from 'vitest';
import { castChapterVoices, createChapterVoiceService } from './chapterVoice';
import { handleChapterVoiceHttp } from './chapterVoiceHttp';
import { loadVoiceCatalog } from './voiceCatalog';

/**
 * Character voices: a cast voice chosen from what a Codex card says, and one
 * spoken line made in it. The narration is never sent here.
 */

const voices = loadVoiceCatalog().publicView;
const voiceOf = (key: string) => voices.find(voice => voice.internalKey === key)!;

describe('casting character voices', () => {
  it('gives each character a voice of their own sex and age, and keeps a fixed being\'s voice out', () => {
    const cast = castChapterVoices([
      { key: 'lin', gender: 'male', age: '19', voice: 'A cool, dry young man with a mocking lilt', mainCharacter: true },
      { key: 'shen', gender: 'female', age: '20', voice: 'Bright and quick, warm when she forgets herself' },
      { key: 'master', gender: 'male', age: '70', voice: 'A slow, grave elder' },
    ]);
    const lin = voiceOf(cast.lin.voiceKey);
    const shen = voiceOf(cast.shen.voiceKey);
    const master = voiceOf(cast.master.voiceKey);
    expect(lin.gender).toBe('male');
    expect(lin.ageYears![0]).toBeLessThanOrEqual(19);
    expect(shen.gender).toBe('female');
    expect(shen.ageYears![0]).toBeLessThanOrEqual(20);
    expect(master.gender).toBe('male');
    expect(master.ageYears![0]).toBeGreaterThanOrEqual(50);
    for (const voice of [lin, shen, master]) expect(voice.classification).toBe('flexible');
    expect(new Set([lin.internalKey, shen.internalKey, master.internalKey]).size).toBe(3);
    expect(cast.lin.name).toBe(lin.archetype);
  });

  it('chooses the same voices every time, and never changes a voice a character already has', () => {
    const characters = [{ key: 'a', gender: 'male', age: '30' }, { key: 'b', gender: 'male', age: '30' }];
    const first = castChapterVoices(characters);
    expect(castChapterVoices(characters)).toEqual(first);
    expect(first.a.voiceKey).not.toBe(first.b.voiceKey);
    const kept = castChapterVoices(characters, { b: first.a.voiceKey });
    expect(kept.b.voiceKey).toBe(first.a.voiceKey);
    expect(kept.a.voiceKey).not.toBe(first.a.voiceKey);
  });

  it('gives a character cast in a later chapter a voice no one in the story already has', () => {
    const earlier = castChapterVoices([{ key: 'a', gender: 'male', age: '30' }]);
    // Only the new speaker is in this chapter; the story's saved cast still reserves the first one's voice.
    const later = castChapterVoices([{ key: 'b', gender: 'male', age: '30' }], { a: earlier.a.voiceKey });
    expect(later.b.voiceKey).not.toBe(earlier.a.voiceKey);
    expect(later.a).toBeUndefined();
  });
});

describe('the chapter voice endpoint', () => {
  const synthesize = vi.fn(async () => new Uint8Array([1, 2, 3]));
  const service = createChapterVoiceService({ ELEVENLABS_API_KEY: 'key' }, { provider: { synthesize } })!;
  const dependencies = { environment: {}, service };
  const voiceKey = castChapterVoices([{ key: 'a', gender: 'female', age: '25' }]).a.voiceKey;

  it('says whether voices can be made and with which model, without spending anything', async () => {
    expect((await handleChapterVoiceHttp({ method: 'GET' }, dependencies)).body).toEqual({ available: true, model: 'eleven_multilingual_v2' });
    expect((await handleChapterVoiceHttp({ method: 'GET' }, { environment: {} })).body).toEqual({ available: false });
    expect((await handleChapterVoiceHttp({ method: 'POST', body: { line: { text: 'Hello.', voiceKey } } }, { environment: {} })).status).toBe(503);
    expect(synthesize).not.toHaveBeenCalled();
  });

  it('casts from Codex cards without calling the voice provider', async () => {
    const answer = await handleChapterVoiceHttp({ method: 'POST', body: { cast: { characters: [{ key: 'a', gender: 'female', age: '25' }] } } }, dependencies);
    expect(answer.status).toBe(200);
    expect((answer.body as { cast: Record<string, { voiceKey: string }> }).cast.a.voiceKey).toBe(voiceKey);
    expect(synthesize).not.toHaveBeenCalled();
    expect((await handleChapterVoiceHttp({ method: 'POST', body: { cast: { characters: [] } } }, dependencies)).status).toBe(400);
  });

  it('voices one spoken line in a cast voice, and refuses a provider voice, a long line or an unknown voice', async () => {
    const answer = await handleChapterVoiceHttp({ method: 'POST', body: { line: { text: '"Only the ones who deserve it,"', voiceKey } } }, dependencies);
    expect(answer.status).toBe(200);
    expect(answer.body).toEqual({ audio: { base64: 'AQID', mimeType: 'audio/mpeg' }, model: 'eleven_multilingual_v2', characters: 31 });
    // The provider is given its own voice ID, which the browser never holds.
    const sent = synthesize.mock.calls[0] as unknown as [{ providerVoiceId: string; text: string }];
    expect(sent[0].text).toBe('"Only the ones who deserve it,"');
    expect(sent[0].providerVoiceId).not.toBe(voiceKey);
    expect((await handleChapterVoiceHttp({ method: 'POST', body: { line: { text: 'Hi.', voiceKey: sent[0].providerVoiceId } } }, dependencies)).status).toBe(422);
    expect((await handleChapterVoiceHttp({ method: 'POST', body: { line: { text: 'x'.repeat(401), voiceKey } } }, dependencies)).status).toBe(400);
    expect((await handleChapterVoiceHttp({ method: 'POST', body: { line: { text: 'Hi.' } } }, dependencies)).status).toBe(400);
    expect(synthesize).toHaveBeenCalledTimes(1);
  });

  it('answers a provider failure without the provider\'s own words', async () => {
    synthesize.mockRejectedValueOnce(new Error('quota exceeded for key sk-123'));
    const answer = await handleChapterVoiceHttp({ method: 'POST', body: { line: { text: 'Hi.', voiceKey } } }, dependencies);
    expect(answer.status).toBe(502);
    expect(JSON.stringify(answer.body)).not.toContain('sk-123');
  });
});
