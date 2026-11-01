// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FamiliarLiveBrief, FamiliarLiveEvents } from '@seihouse/library/familiar';
import { createFamiliarOpenAiLive } from './openaiLive';

const brief: FamiliarLiveBrief = { familiar: { name: 'Fox', description: '' }, place: 'Home', language: 'en-US', topics: [], actions: [] };

class Channel extends EventTarget {
  readyState = 'open';
  sent: Record<string, unknown>[] = [];
  constructor(readonly label: string) { super(); }
  send(text: string) { this.sent.push(JSON.parse(text)); }
  close = vi.fn(() => { this.readyState = 'closed'; });
  receive(event: unknown) { this.dispatchEvent(Object.assign(new Event('message'), { data: JSON.stringify(event) })); }
}

class Peer extends EventTarget {
  static last: Peer;
  channel?: Channel;
  tracks: unknown[] = [];
  transceivers: unknown[] = [];
  iceGatheringState = 'complete';
  connectionState = 'new';
  localDescription?: { sdp: string };
  remote?: { type: string; sdp: string };
  constructor() { super(); Peer.last = this; }
  createDataChannel(label: string) { return this.channel = new Channel(label); }
  addTrack(track: unknown) { this.tracks.push(track); }
  addTransceiver(kind: string, init: unknown) { this.transceivers.push([kind, init]); }
  async createOffer() { return { type: 'offer', sdp: 'v=0 offer' }; }
  async setLocalDescription(offer: { sdp: string }) { this.localDescription = offer; }
  async setRemoteDescription(answer: { type: string; sdp: string }) { this.remote = answer; }
  close = vi.fn();
}

const track = { stop: vi.fn() };
const microphone = () => vi.fn(async () => ({ getTracks: () => [track], getAudioTracks: () => [track] }) as unknown as MediaStream);
const respond = (status: number, body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status }));
const answered = () => respond(201, { provider: 'openai', session: { id: 'live_1' }, transport: { type: 'webrtc', sdp: 'v=0 answer' } });
const audio = () => ({ autoplay: false, srcObject: null, setAttribute: vi.fn(), play: vi.fn(async () => {}) }) as unknown as HTMLAudioElement;
function events() {
  return { connected: vi.fn(), caption: vi.fn(), call: vi.fn(async () => 'Shown.'), ended: vi.fn(), notice: vi.fn() } satisfies FamiliarLiveEvents;
}
const live = (fetch: typeof globalThis.fetch, getUserMedia = microphone()) => createFamiliarOpenAiLive({
  fetch, RTCPeerConnection: Peer as unknown as typeof RTCPeerConnection, getUserMedia, createAudio: audio, accessToken: () => 'owner',
});

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); track.stop.mockClear(); });

describe('Familiar live talk on GPT-Live', () => {
  it('asks for the microphone during the tap, then sends the offer and applies OpenAI\'s answer', async () => {
    const getUserMedia = microphone();
    const fetch = answered();
    live(fetch, getUserMedia).start(brief, events());
    expect(getUserMedia).toHaveBeenCalledOnce();
    await vi.waitFor(() => expect(Peer.last.remote).toEqual({ type: 'answer', sdp: 'v=0 answer' }));
    expect(Peer.last.channel!.label).toBe('oai-events');
    expect(Peer.last.tracks).toEqual([track]);
    expect(fetch).toHaveBeenCalledWith('/api/familiar-live', expect.objectContaining({ method: 'POST', body: JSON.stringify({ brief, sdp: 'v=0 offer' }),
      headers: expect.objectContaining({ Authorization: 'Bearer owner' }) }));
  });

  it('captions both sides, runs the backend\'s functions on the screen and continues it, and hangs up gracefully', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const handlers = events();
    const session = live(answered()).start(brief, handlers);
    await vi.waitFor(() => expect(Peer.last.remote).toBeTruthy());
    const channel = Peer.last.channel!;
    channel.receive({ type: 'session.started', session: { id: 'live_1' } });
    expect(handlers.connected).toHaveBeenCalledOnce();
    channel.receive({ type: 'session.input_transcript.delta', delta: 'What is' });
    channel.receive({ type: 'session.input_transcript.delta', delta: ' energy?' });
    channel.receive({ type: 'session.output_transcript.delta', delta: 'It pays for manifesting.' });
    expect(handlers.caption).toHaveBeenCalledWith('reader', 'What is energy?');
    expect(handlers.caption).toHaveBeenLastCalledWith('familiar', 'It pays for manifesting.');
    // The reader speaking again starts new lines.
    channel.receive({ type: 'session.input_transcript.delta', delta: 'Show me.' });
    expect(handlers.caption).toHaveBeenCalledWith('reader', '');
    expect(handlers.caption).toHaveBeenLastCalledWith('reader', 'Show me.');
    channel.receive({ type: 'response.event', delegation_id: 'd1', event: { type: 'response.output_item.done',
      item: { type: 'function_call', call_id: 'call_1', name: 'show_topic', arguments: '{"topic_id":"energy"}' } } });
    await vi.waitFor(() => expect(channel.sent).toContainEqual({ type: 'response.create' }));
    expect(handlers.call).toHaveBeenCalledWith({ name: 'show_topic', topicId: 'energy' });
    expect(channel.sent).toContainEqual({ type: 'response.item.create', item: { type: 'function_call_output', call_id: 'call_1', output: '{"result":"Shown."}' } });
    // A refused setting mid-conversation is said in OpenAI's words.
    channel.receive({ type: 'error', error: { code: 'responses_validation_failed', message: 'reasoning.effort is not supported' } });
    expect(handlers.notice).toHaveBeenCalledWith('Live talk: responses_validation_failed: reasoning.effort is not supported');
    // A typed message goes to the backend, which the Familiar then says.
    session.send('And manifesting?');
    expect(channel.sent.slice(-2)).toEqual([
      { type: 'response.item.create', item: { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'And manifesting?' }] } },
      { type: 'response.create' },
    ]);
    session.end();
    expect(channel.sent.at(-1)).toEqual({ type: 'session.close' });
    expect(track.stop).toHaveBeenCalled();
    channel.receive({ type: 'session.closed', reason: 'close_requested' });
    vi.advanceTimersByTime(3_000);
    expect(Peer.last.close).toHaveBeenCalled();
    expect(handlers.ended).not.toHaveBeenCalled();
  });

  it('opens a typed conversation that only receives the voice and never asks for the microphone', async () => {
    const getUserMedia = microphone();
    live(answered(), getUserMedia).start(brief, events(), { microphone: false });
    await vi.waitFor(() => expect(Peer.last.remote).toBeTruthy());
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(Peer.last.transceivers).toEqual([['audio', { direction: 'recvonly' }]]);
  });

  it('says exactly why it could not start, and hands over to the device voice', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const refused = events();
    live(respond(502, { error: 'Your Familiar could not start talking. Try again.', detail: 'OpenAI 403: model_not_found: no access' })).start(brief, refused);
    await vi.waitFor(() => expect(refused.ended).toHaveBeenCalledWith(
      'Live talk could not start: server 502, Your Familiar could not start talking. Try again. (OpenAI 403: model_not_found: no access)', true));
    const denied = events();
    live(answered(), vi.fn(async () => { throw new DOMException('Permission denied', 'NotAllowedError'); })).start(brief, denied);
    await vi.waitFor(() => expect(denied.ended).toHaveBeenCalledWith('Allow the microphone to talk with your Familiar. (NotAllowedError: Permission denied)', false));
    const spent = events();
    live(respond(429, {})).start(brief, spent);
    await vi.waitFor(() => expect(spent.ended).toHaveBeenCalledWith(expect.stringContaining('talked enough for today'), true));
  });
});
