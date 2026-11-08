// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FrontDeskLiveBrief, FrontDeskLiveEvents } from '../core/controller';
import { createLiveEngine, type LiveConversation, type LiveTranslator } from './liveEngine';

const brief: FrontDeskLiveBrief = { familiar: { name: 'Fox', description: '' }, place: 'Home', language: 'en-US', topics: [], actions: [], docs: [] };
const events = () => ({ connected: vi.fn(), caption: vi.fn(), call: vi.fn(async () => 'Shown.'), ended: vi.fn(), notice: vi.fn() }) satisfies FrontDeskLiveEvents;
const track = { stop: vi.fn() };
const microphone = vi.fn(async () => ({ getTracks: () => [track] }) as unknown as MediaStream);
const respond = (status: number, body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status }));

/** A made-up provider: all a new model needs is a translator like this one. */
function translator() {
  const made = { conversation: undefined as LiveConversation | undefined, sent: [] as string[], close: vi.fn(), body: undefined as unknown };
  const plugged: LiveTranslator = {
    label: 'Newcomer',
    supported: () => true,
    begin(conversation) {
      made.conversation = conversation;
      return {
        async connect() { made.body = await conversation.request({ offer: 'o' }); await conversation.stream(); },
        send: text => made.sent.push(text),
        close: made.close,
      };
    },
  };
  return { plugged, made };
}

afterEach(() => { vi.useRealTimers(); track.stop.mockClear(); });

describe('the Familiar\'s live talk engine', () => {
  it('runs any provider plugged into it: the server request, captions, functions, typed messages and hanging up', async () => {
    const { plugged, made } = translator();
    const fetch = respond(201, { secret: 's' });
    const handlers = events();
    const session = createLiveEngine(plugged, { fetch, getUserMedia: microphone, model: 'new/model' }).start(brief, handlers);
    expect(microphone).toHaveBeenCalledOnce();
    await vi.waitFor(() => expect(made.body).toEqual({ secret: 's' }));
    expect(fetch).toHaveBeenCalledWith('/api/familiar-live', expect.objectContaining({ body: JSON.stringify({ brief, offer: 'o', model: 'new/model' }) }));
    const conversation = made.conversation!;
    session.send('too early');
    expect(made.sent).toEqual([]);
    conversation.opened();
    expect(handlers.connected).toHaveBeenCalledOnce();
    conversation.caption('reader', 'What is ');
    conversation.caption('reader', 'energy?');
    conversation.caption('familiar', 'It pays.');
    expect(handlers.caption).toHaveBeenCalledWith('reader', 'What is energy?');
    // The reader speaking after the Familiar starts new lines.
    conversation.caption('reader', 'Show me.');
    expect(handlers.caption).toHaveBeenCalledWith('familiar', '');
    expect(handlers.caption).toHaveBeenLastCalledWith('reader', 'Show me.');
    await expect(conversation.call('show_topic', '{"topic_id":"energy"}')).resolves.toBe('Shown.');
    await expect(conversation.call('run_code', {})).resolves.toBe('That request is not available.');
    session.send('Hello');
    expect(made.sent).toEqual(['Hello']);
    session.end();
    expect(made.close).toHaveBeenCalledOnce();
    expect(track.stop).toHaveBeenCalled();
    expect(handlers.ended).not.toHaveBeenCalled();
  });

  it('gives up on a provider that never answers, and hands over to the device voice', async () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { plugged, made } = translator();
    const handlers = events();
    createLiveEngine(plugged, { fetch: vi.fn(() => new Promise<Response>(() => {})), getUserMedia: microphone }).start(brief, handlers);
    await vi.advanceTimersByTimeAsync(15_000);
    expect(handlers.ended).toHaveBeenCalledWith('Live talk could not start: no answer from Newcomer in 15 seconds', true);
    expect(made.close).toHaveBeenCalledOnce();
  });
});
