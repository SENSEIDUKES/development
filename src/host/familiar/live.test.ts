// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FamiliarLiveBrief, FamiliarLiveEvents } from '@seihouse/library/familiar';
import { base64ToFloat32, createFamiliarGeminiLive, downsample, liveCall, pcm16ToBase64 } from './live';

const brief: FamiliarLiveBrief = { familiar: { name: 'Fox', description: '' }, place: 'Home', language: 'en-US', topics: [], actions: [] };

class Socket {
  static last: Socket;
  readyState = 0;
  binaryType = '';
  sent: unknown[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string | ArrayBuffer }) => void) | null = null;
  onclose: ((event: { code: number; reason: string }) => void) | null = null;
  close = vi.fn(() => { this.readyState = 3; });
  constructor(readonly url: string) { Socket.last = this; }
  send(text: string) { this.sent.push(JSON.parse(text)); }
  open() { this.readyState = 1; this.onopen?.(); }
  message(message: unknown) { this.onmessage?.({ data: JSON.stringify(message) }); }
}

class Port { onmessage: ((event: { data: Float32Array }) => void) | null = null; }
class WorkletNode { port = new Port(); connect = vi.fn((next: unknown) => next); disconnect = vi.fn(); }
const node = () => ({ connect: vi.fn((next: unknown) => next), disconnect: vi.fn() });
const played: { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }[] = [];
class Audio {
  static last: Audio;
  sampleRate = 48_000;
  currentTime = 0;
  destination = {};
  audioWorklet = { addModule: vi.fn(async () => {}) };
  resume = vi.fn(async () => {});
  close = vi.fn(async () => {});
  constructor() { Audio.last = this; }
  createMediaStreamSource = vi.fn(node);
  createGain = vi.fn(() => ({ ...node(), gain: { value: 1 } }));
  createBuffer = vi.fn((_channels: number, length: number, rate: number) => ({ duration: length / rate, copyToChannel: vi.fn() }));
  createBufferSource = vi.fn(() => { const source = { buffer: null, connect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: null }; played.push(source); return source; });
}

function events() {
  return { connected: vi.fn(), caption: vi.fn(), call: vi.fn(async () => 'Shown.'), ended: vi.fn() } satisfies FamiliarLiveEvents;
}
const track = { stop: vi.fn() };
const microphone = vi.fn(async () => ({ getTracks: () => [track] }) as unknown as MediaStream);
const respond = (status: number, body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status }));
const flush = () => new Promise(resolve => setTimeout(resolve, 0));
const live = (fetch: typeof globalThis.fetch) => createFamiliarGeminiLive({
  fetch, WebSocket: Socket as unknown as typeof WebSocket, AudioContext: Audio as unknown as typeof AudioContext, getUserMedia: microphone, accessToken: () => 'owner',
});

afterEach(() => { vi.unstubAllGlobals(); played.length = 0; track.stop.mockClear(); });

describe('Familiar live talk in the browser', () => {
  it('converts the microphone to 16 kHz speech and Gemini\'s speech back to samples', () => {
    expect([...downsample(new Float32Array([1, 1, 1, -1, -1, -1]), 48_000)]).toEqual([0x7fff, -0x8000]);
    const back = base64ToFloat32(pcm16ToBase64(new Int16Array([0x4000, -0x4000])));
    expect([...back]).toEqual([0.5, -0.5]);
  });

  it('reads only the requests the screen understands', () => {
    expect(liveCall('show_topic', { topic_id: 'energy' })).toEqual({ name: 'show_topic', topicId: 'energy' });
    expect(liveCall('propose_action', { action_id: 'custom' })).toEqual({ name: 'propose_action', actionId: 'custom', input: '' });
    expect(liveCall('answer_proposal', { answer: 'confirm' })).toEqual({ name: 'answer_proposal', answer: 'confirm' });
    expect(liveCall('answer_proposal', { answer: 'delete everything' })).toBeUndefined();
    expect(liveCall('run_code', {})).toBeUndefined();
  });

  it('hands over to the device voice where the server has no live talk, or the day\'s talks are spent', async () => {
    const handlers = events();
    live(respond(503, {})).start(brief, handlers);
    await vi.waitFor(() => expect(handlers.ended).toHaveBeenCalledWith(undefined, true));
    const spent = events();
    live(respond(429, {})).start(brief, spent);
    await vi.waitFor(() => expect(spent.ended).toHaveBeenCalledWith(expect.stringContaining('talked enough for today'), true));
  });

  it('opens Gemini with the server\'s token and setup, streams the microphone, plays and captions the Familiar, and answers its requests', async () => {
    vi.stubGlobal('AudioWorkletNode', WorkletNode);
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:capture') }));
    const fetch = respond(200, { token: 'auth_tokens/abc', setup: { model: 'models/gemini-3.8-live' } });
    const handlers = events();
    const session = live(fetch).start(brief, handlers);
    await vi.waitFor(() => expect(Socket.last?.url).toContain('BidiGenerateContentConstrained?access_token=auth_tokens%2Fabc'));
    expect(fetch).toHaveBeenCalledWith('/api/familiar-live', expect.objectContaining({ method: 'POST', body: JSON.stringify({ brief }),
      headers: expect.objectContaining({ Authorization: 'Bearer owner' }) }));
    const socket = Socket.last;
    socket.open();
    expect(socket.sent).toEqual([{ setup: { model: 'models/gemini-3.8-live' } }]);
    socket.message({ setupComplete: {} });
    expect(handlers.connected).toHaveBeenCalledOnce();
    // 100 ms of microphone at 48 kHz goes out as 16 kHz speech.
    const capture = (Audio.last.createMediaStreamSource.mock.results[0].value.connect.mock.calls[0] as unknown[])[0] as WorkletNode;
    capture.port.onmessage!({ data: new Float32Array(4_800) });
    expect(socket.sent[1]).toEqual({ realtimeInput: { audio: { data: expect.any(String), mimeType: 'audio/pcm;rate=16000' } } });
    socket.message({ serverContent: { inputTranscription: { text: 'What is energy?' } } });
    socket.message({ serverContent: { modelTurn: { parts: [{ inlineData: { data: pcm16ToBase64(new Int16Array(2_400)), mimeType: 'audio/pcm;rate=24000' } }] }, outputTranscription: { text: 'It pays' } } });
    socket.message({ serverContent: { outputTranscription: { text: ' for manifesting.' }, turnComplete: true } });
    expect(handlers.caption).toHaveBeenCalledWith('reader', 'What is energy?');
    expect(handlers.caption).toHaveBeenLastCalledWith('familiar', 'It pays for manifesting.');
    expect(played).toHaveLength(1);
    // The reader talking over it stops its voice.
    socket.message({ serverContent: { interrupted: true } });
    expect(played[0].stop).toHaveBeenCalled();
    socket.message({ toolCall: { functionCalls: [{ id: 'c1', name: 'show_topic', args: { topic_id: 'energy' } }] } });
    await vi.waitFor(() => expect(socket.sent).toContainEqual({ toolResponse: { functionResponses: [{ id: 'c1', name: 'show_topic', response: { result: 'Shown.' } }] } }));
    expect(handlers.call).toHaveBeenCalledWith({ name: 'show_topic', topicId: 'energy' });
    // Hanging up releases the microphone and ends quietly.
    session.end();
    expect(track.stop).toHaveBeenCalled();
    expect(socket.close).toHaveBeenCalled();
    socket.onclose?.({ code: 1000, reason: '' });
    expect(handlers.ended).not.toHaveBeenCalled();
  });

  it('says so when the microphone is refused or the conversation drops', async () => {
    const handlers = events();
    createFamiliarGeminiLive({ fetch: respond(200, { token: 't', setup: {} }), WebSocket: Socket as unknown as typeof WebSocket,
      AudioContext: Audio as unknown as typeof AudioContext, getUserMedia: async () => { throw new Error('denied'); } }).start(brief, handlers);
    await vi.waitFor(() => expect(handlers.ended).toHaveBeenCalledWith('Allow the microphone to talk with your Familiar.', false));
    vi.stubGlobal('AudioWorkletNode', WorkletNode);
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:capture') }));
    const dropped = events();
    live(respond(200, { token: 't', setup: {} })).start(brief, dropped);
    await flush();
    await vi.waitFor(() => expect(Socket.last.onclose).toBeTruthy());
    Socket.last.open();
    Socket.last.message({ setupComplete: {} });
    Socket.last.onclose!({ code: 1011, reason: '' });
    expect(dropped.ended).toHaveBeenCalledWith('Your Familiar stopped talking.', false);
  });
});
