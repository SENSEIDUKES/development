// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FamiliarLiveBrief, FamiliarLiveEvents } from '@seihouse/library/familiar';
import { createFamiliarRealtimeLive, ELEVENLABS_REALTIME_URL } from './realtimeLive';

const brief: FamiliarLiveBrief = { familiar: { name: 'Quill', description: '' }, place: 'Home', language: 'en-US', topics: [], actions: [] };

class Socket {
  static last: Socket;
  readyState = 1;
  sent: Record<string, unknown>[] = [];
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: ((event: { code: number; reason: string }) => void) | null = null;
  close = vi.fn(() => { this.readyState = 3; });
  constructor(readonly url: string, readonly protocols: string[]) { Socket.last = this; }
  send(text: string) { this.sent.push(JSON.parse(text)); }
  event(event: unknown) { this.onmessage?.({ data: JSON.stringify(event) }); }
}
class Port { onmessage: ((event: { data: Float32Array }) => void) | null = null; }
class WorkletNode { static last: WorkletNode; port = new Port(); connect = vi.fn((next: unknown) => next); disconnect = vi.fn(); constructor() { WorkletNode.last = this; } }
const node = () => ({ connect: vi.fn((next: unknown) => next), disconnect: vi.fn() });
const played: { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }[] = [];
class Audio {
  sampleRate = 48_000;
  currentTime = 0;
  destination = {};
  audioWorklet = { addModule: vi.fn(async () => {}) };
  resume = vi.fn(async () => {});
  close = vi.fn(async () => {});
  createMediaStreamSource = vi.fn(node);
  createGain = vi.fn(() => ({ ...node(), gain: { value: 1 } }));
  createBuffer = vi.fn((_channels: number, length: number, rate: number) => ({ duration: length / rate, copyToChannel: vi.fn() }));
  createBufferSource = vi.fn(() => { const source = { buffer: null, connect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: null }; played.push(source); return source; });
}
function events() {
  return { connected: vi.fn(), caption: vi.fn(), call: vi.fn(async () => 'Shown.'), ended: vi.fn(), notice: vi.fn() } satisfies FamiliarLiveEvents;
}
const track = { stop: vi.fn() };
const microphone = vi.fn(async () => ({ getTracks: () => [track] }) as unknown as MediaStream);
const respond = (status: number, body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status }));
const live = (fetch: typeof globalThis.fetch) => createFamiliarRealtimeLive({
  fetch, WebSocket: Socket as unknown as typeof WebSocket, AudioContext: Audio as unknown as typeof AudioContext, getUserMedia: microphone, accessToken: () => 'owner', model: 'elevenlabs/eleven_realtime_v1_mini',
});
const pcm = btoa(String.fromCharCode(0, 64, 0, 192));

afterEach(() => { vi.unstubAllGlobals(); played.length = 0; track.stop.mockClear(); Socket.last = undefined as unknown as Socket; });

describe('Familiar live talk on ElevenLabs Realtime', () => {
  it('opens with the server\'s client secret, streams the microphone and plays the Familiar\'s voice', async () => {
    vi.stubGlobal('AudioWorkletNode', WorkletNode);
    const fetch = respond(201, { provider: 'elevenlabs', secret: 'ek_live', rate: 24_000 });
    const handlers = events();
    live(fetch).start(brief, handlers);
    await vi.waitFor(() => expect(Socket.last?.url).toBe(ELEVENLABS_REALTIME_URL));
    expect(fetch).toHaveBeenCalledWith('/api/familiar-live', expect.objectContaining({ body: JSON.stringify({ brief, model: 'elevenlabs/eleven_realtime_v1_mini' }) }));
    // The secret rides as a subprotocol: a browser cannot set headers on a WebSocket.
    expect(Socket.last.protocols).toEqual(['realtime', 'openai-insecure-api-key.ek_live']);
    Socket.last.event({ type: 'session.created' });
    expect(handlers.connected).toHaveBeenCalledOnce();
    // The microphone goes out as 24 kHz 16-bit pieces.
    WorkletNode.last.port.onmessage?.({ data: new Float32Array(4_800).fill(0.5) });
    expect(Socket.last.sent.at(-1)).toMatchObject({ type: 'input_audio_buffer.append' });
    // The Familiar's voice plays; the reader speaking over it stops it at once.
    Socket.last.event({ type: 'response.output_audio.delta', delta: pcm });
    expect(played).toHaveLength(1);
    Socket.last.event({ type: 'input_audio_buffer.speech_started' });
    expect(played[0].stop).toHaveBeenCalled();
  });

  it('captions both sides, runs the Familiar\'s functions on the screen and continues, and sends typed messages', async () => {
    vi.stubGlobal('AudioWorkletNode', WorkletNode);
    const handlers = events();
    const session = live(respond(201, { secret: 'ek_live' })).start(brief, handlers);
    await vi.waitFor(() => expect(Socket.last?.protocols?.[1]).toBe('openai-insecure-api-key.ek_live'));
    const socket = Socket.last;
    socket.event({ type: 'session.created' });
    socket.event({ type: 'conversation.item.input_audio_transcription.completed', transcript: 'What is energy?' });
    socket.event({ type: 'response.output_audio_transcript.delta', delta: 'It pays ' });
    socket.event({ type: 'response.output_audio_transcript.delta', delta: 'for manifesting.' });
    expect(handlers.caption).toHaveBeenCalledWith('reader', 'What is energy?');
    expect(handlers.caption).toHaveBeenLastCalledWith('familiar', 'It pays for manifesting.');
    // The reader speaking again starts new lines.
    socket.event({ type: 'conversation.item.input_audio_transcription.completed', transcript: 'Show me.' });
    expect(handlers.caption).toHaveBeenCalledWith('reader', '');
    expect(handlers.caption).toHaveBeenLastCalledWith('reader', 'Show me.');
    // A function call, answered once even when announced twice.
    const item = { type: 'function_call', call_id: 'call_1', name: 'show_topic', arguments: '{"topic_id":"energy"}' };
    socket.event({ type: 'response.output_item.done', item });
    socket.event({ type: 'response.output_item.done', item });
    await vi.waitFor(() => expect(socket.sent).toContainEqual({ type: 'response.create' }));
    expect(handlers.call).toHaveBeenCalledExactlyOnceWith({ name: 'show_topic', topicId: 'energy' });
    expect(socket.sent).toContainEqual({ type: 'conversation.item.create', item: { type: 'function_call_output', call_id: 'call_1', output: '{"result":"Shown."}' } });
    // An error mid-conversation is said in the provider's words.
    socket.event({ type: 'error', error: { code: 'rate_limited', message: 'Slow down' } });
    expect(handlers.notice).toHaveBeenCalledWith('Live talk: rate_limited: Slow down');
    session.send('And manifesting?');
    expect(socket.sent.slice(-2)).toEqual([
      { type: 'conversation.item.create', item: { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'And manifesting?' }] } },
      { type: 'response.create' },
    ]);
    session.end();
    expect(socket.close).toHaveBeenCalledWith(1000);
    expect(track.stop).toHaveBeenCalled();
  });

  it('says exactly why it could not start, and hands over to the device voice', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const refused = events();
    live(respond(502, { error: 'Your Familiar could not start talking. Try again.', detail: 'ElevenLabs 403: Realtime models are not available for this workspace.' })).start(brief, refused);
    await vi.waitFor(() => expect(refused.ended).toHaveBeenCalledWith(
      'Live talk could not start: server 502, Your Familiar could not start talking. Try again. (ElevenLabs 403: Realtime models are not available for this workspace.)', true));
    const closed = events();
    live(respond(201, { secret: 'ek_live' })).start(brief, closed);
    await vi.waitFor(() => expect(Socket.last?.onclose).toBeTruthy());
    Socket.last.onclose?.({ code: 4001, reason: 'invalid secret' });
    expect(closed.ended).toHaveBeenCalledWith('Live talk could not start: ElevenLabs closed the connection, 4001: invalid secret', true);
  });
});
