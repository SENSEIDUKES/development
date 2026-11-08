// @vitest-environment jsdom
/**
 * Regression checks for separating SEIHouse Front Desk (step 1), asked for by
 * SENSEI at approval: Model Router selection, token handling and usage
 * tracking; the browser voice and the configured live engines; microphone
 * cleanup; and the hand-off between a guide's or a line's audio and a
 * conversation. Each runs through the code the app runs.
 */
import { act, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FrontDeskController, FrontDeskProvider, FrontDeskTalkButton, useFrontDeskContext, useFrontDeskReadAloud, type FrontDeskContext, type FrontDeskLive, type FrontDeskLiveBrief, type FrontDeskLiveEvents, type FrontDeskVoice } from '@seihouse/front-desk';
import * as engines from '@seihouse/front-desk/engines';
import { NarrativeAudioProvider, type NarrativeAudioPlayback } from '@seihouse/sen/audio';
import { FamiliarFrontDesk } from '@seihouse/library/familiar';
import { GENERATION_CONSUMERS, PROVIDER_ADAPTERS } from '../server/model-router/catalog';
import { chooseLiveModel, createLive, withLiveUsage, type FamiliarLiveOffer } from '../host/familiar/liveTalk';
import { readUsage } from '../host/usage/usageLog';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const brief: FrontDeskLiveBrief = { familiar: { name: 'Quill', description: '' }, place: 'Home', language: 'en-US', topics: [], actions: [], docs: [] };
const events = () => ({ connected: vi.fn(), caption: vi.fn(), call: vi.fn(async () => 'Done.'), ended: vi.fn(), notice: vi.fn() }) satisfies FrontDeskLiveEvents;
const track = { stop: vi.fn() };
const microphone = vi.fn(async () => ({ getTracks: () => [track] }) as unknown as MediaStream);
const respond = (status: number, body: unknown) => vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify(body), { status }));

/** A provider plugged into Front Desk's engine, as each of the app's three is. */
function translator() {
  const made = { close: vi.fn(), opened: false };
  const plugged: engines.LiveTranslator = {
    label: 'Provider',
    supported: () => true,
    begin(conversation) {
      return {
        async connect() { await conversation.request({}); await conversation.stream(); if (conversation.over) return; made.opened = true; conversation.opened(); },
        send: () => {},
        close: made.close,
      };
    },
  };
  return { plugged, made };
}

/** A device voice whose every reading can be stopped, and says when it was. */
function deviceVoice() {
  const stops: ReturnType<typeof vi.fn>[] = [];
  const voice: FrontDeskVoice = {
    available: true,
    listen: vi.fn(() => ({ stop: vi.fn(), cancel: vi.fn() })),
    speak: vi.fn(() => { const stop = vi.fn(); stops.push(stop); return stop; }),
  };
  return { voice, stops };
}

/** A live talk that records how each conversation ended. */
function liveTalk() {
  const ends: ReturnType<typeof vi.fn>[] = [];
  const live: FrontDeskLive = { start: vi.fn((_brief, events: FrontDeskLiveEvents) => {
    const end = vi.fn();
    ends.push(end);
    queueMicrotask(() => events.connected());
    return { end, send: vi.fn() };
  }) };
  return { live, ends };
}

const place: FrontDeskContext = { key: 'home', title: 'Home', topics: [], actions: [], hint: '' };

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  localStorage.clear();
  track.stop.mockClear();
  microphone.mockClear();
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const click = async (label: string) => {
  const button = document.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`);
  if (!button) throw new Error(`No button "${label}"`);
  await act(async () => { button.click(); });
};
function Screen({ context }: { context: FrontDeskContext }) { useFrontDeskContext(context); return null; }

describe('Front Desk regression: Model Router, tokens and usage', () => {
  it('runs live talk on the model the Router chose, or the server\'s own, and keeps every engine registered in the Router', () => {
    const offer: FamiliarLiveOffer = { model: 'gemini/live', provider: 'gemini', models: [{ id: 'gemini/live', provider: 'gemini' }, { id: 'openai/gpt-live', provider: 'openai' }] };
    expect(chooseLiveModel(offer, 'openai/gpt-live')).toEqual({ id: 'openai/gpt-live', provider: 'openai' });
    expect(chooseLiveModel(offer, 'nobody/offers-this')).toEqual({ id: 'gemini/live', provider: 'gemini' });
    expect(chooseLiveModel(offer)).toEqual({ id: 'gemini/live', provider: 'gemini' });
    // The Router's "Used by" lists live talk, following the Router's choice, and the browser ends now in Front Desk.
    expect(GENERATION_CONSUMERS).toContainEqual(expect.objectContaining({ capability: 'live', entry: 'src/server/familiar-live/http.ts', modelChoice: 'router' }));
    expect(PROVIDER_ADAPTERS).toEqual(expect.arrayContaining(['src/front-desk/engines/live.ts', 'src/front-desk/engines/realtimeLive.ts']));
  });

  it('sends the host\'s own access token to its live-talk route, and none when it has none', async () => {
    const withToken = respond(201, {});
    createLiveEngine(withToken, () => ' owner ').start(brief, events(), { microphone: false });
    await vi.waitFor(() => expect(withToken).toHaveBeenCalledOnce());
    expect(withToken.mock.calls[0][0]).toBe('/api/familiar-live');
    expect((withToken.mock.calls[0][1]!.headers as Record<string, string>).Authorization).toBe('Bearer owner');
    const without = respond(201, {});
    createLiveEngine(without).start(brief, events(), { microphone: false });
    await vi.waitFor(() => expect(without).toHaveBeenCalledOnce());
    expect((without.mock.calls[0][1]!.headers as Record<string, string>).Authorization).toBeUndefined();
    // A host can name its own route.
    const elsewhere = respond(201, {});
    engines.createLiveEngine(translator().plugged, { fetch: elsewhere, endpoint: '/api/my-live' }).start(brief, events(), { microphone: false });
    await vi.waitFor(() => expect(elsewhere).toHaveBeenCalledWith('/api/my-live', expect.anything()));
  });

  it('hands each of the app\'s live engines the owner\'s saved token, read when a conversation starts', async () => {
    const gemini = vi.spyOn(engines, 'createGeminiLive');
    const openai = vi.spyOn(engines, 'createOpenAiLive');
    const realtime = vi.spyOn(engines, 'createRealtimeLive');
    const saved = { current: undefined as string | undefined };
    createLive('gemini', 'gemini/live', saved as never);
    createLive('openai', 'openai/gpt-live', saved as never);
    createLive('elevenlabs', 'elevenlabs/realtime', saved as never);
    expect(gemini).toHaveBeenCalledWith(expect.objectContaining({ model: 'gemini/live' }));
    expect(openai).toHaveBeenCalledWith(expect.objectContaining({ model: 'openai/gpt-live' }));
    expect(realtime).toHaveBeenCalledWith(expect.objectContaining({ model: 'elevenlabs/realtime', label: 'ElevenLabs' }));
    for (const spy of [gemini, openai, realtime]) {
      const { accessToken } = spy.mock.calls[0][0]!;
      expect(accessToken?.()).toBeUndefined();
      saved.current = 'owner';
      expect(accessToken?.()).toBe('owner');
      saved.current = undefined;
    }
  });

  it('records live talk on a Front Desk engine for the Usage page, once, from connecting to hanging up', async () => {
    let clock = 0;
    const { plugged } = translator();
    const fetch = respond(201, {});
    const handlers = events();
    const session = withLiveUsage(engines.createLiveEngine(plugged, { fetch, getUserMedia: microphone }), 'openai/gpt-live-1', () => clock).start(brief, handlers);
    await vi.waitFor(() => expect(handlers.connected).toHaveBeenCalledOnce());
    clock += 42_000;
    session.end();
    session.end();
    expect(readUsage().map(({ at: _at, ...entry }) => entry)).toEqual([{ kind: 'live', model: 'openai/gpt-live-1', grade: 'immortal', seconds: 42 }]);
  });
});

/** Front Desk's engine with a provider plugged in, a token, and the app's route. */
function createLiveEngine(fetch: ReturnType<typeof respond>, accessToken?: () => string | undefined) {
  return engines.createLiveEngine(translator().plugged, { fetch, getUserMedia: microphone, ...(accessToken ? { accessToken } : {}) });
}

describe('Front Desk regression: the browser voice and the configured live engines', () => {
  it('builds the free browser voice and the wake word on any page, and says when the browser cannot listen', () => {
    const voice = engines.createBrowserVoice();
    expect(typeof voice.available).toBe('boolean');
    expect(typeof voice.listen).toBe('function');
    expect(typeof voice.speak).toBe('function');
    // jsdom has no speech recognition: the wake word says it cannot listen, and the app keeps tapping.
    expect(engines.createWakeWord(undefined).available).toBe(false);
  });

  it('runs each configured engine through Front Desk: opens, answers the screen\'s calls, and closes', async () => {
    for (const provider of ['gemini', 'openai', 'elevenlabs'] as const) {
      const spy = vi.spyOn(engines, provider === 'openai' ? 'createOpenAiLive' : provider === 'elevenlabs' ? 'createRealtimeLive' : 'createGeminiLive');
      const live = createLive(provider, `${provider}/model`, { current: undefined } as never);
      expect(spy).toHaveBeenCalledOnce();
      expect(typeof live.start).toBe('function');
      spy.mockRestore();
    }
    // The shared engine under all three: the request, a call from the model to the screen, and hanging up.
    const { plugged, made } = translator();
    const handlers = events();
    const session = engines.createLiveEngine(plugged, { fetch: respond(201, {}), getUserMedia: microphone }).start(brief, handlers);
    await vi.waitFor(() => expect(made.opened).toBe(true));
    expect(engines.liveCall('propose_action', { action_id: 'go-home' })).toEqual({ name: 'propose_action', actionId: 'go-home', input: '' });
    session.end();
    expect(made.close).toHaveBeenCalled();
  });
});

describe('Front Desk regression: the microphone is always given back', () => {
  it('releases the microphone when the reader hangs up', async () => {
    const { plugged, made } = translator();
    const session = engines.createLiveEngine(plugged, { fetch: respond(201, {}), getUserMedia: microphone }).start(brief, events());
    await vi.waitFor(() => expect(made.opened).toBe(true));
    session.end();
    expect(track.stop).toHaveBeenCalled();
  });

  it('releases the microphone when live talk fails to start', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const handlers = events();
    engines.createLiveEngine(translator().plugged, { fetch: respond(500, { error: 'No.' }), getUserMedia: microphone }).start(brief, handlers);
    await vi.waitFor(() => expect(handlers.ended).toHaveBeenCalled());
    await vi.waitFor(() => expect(track.stop).toHaveBeenCalled());
  });

  it('ends the conversation, and with it the microphone, when the card closes', async () => {
    const { voice } = deviceVoice();
    const { live, ends } = liveTalk();
    const desk = new FrontDeskController(voice, 'en-US', live);
    desk.setContext(Symbol('page'), place);
    desk.open();
    desk.talk();
    expect(live.start).toHaveBeenCalledOnce();
    desk.close();
    expect(ends[0]).toHaveBeenCalledOnce();
    expect(desk.getSnapshot().live).toBeUndefined();
  });

  it('ends the conversation when the page is hidden, as the app wires it', async () => {
    const { voice } = deviceVoice();
    const { live, ends } = liveTalk();
    act(() => root.render(<StrictMode><FrontDeskProvider voice={voice} live={live}><Screen context={place} /><FrontDeskTalkButton /></FrontDeskProvider></StrictMode>));
    await click('Talk to Familiar');
    await click('Talk with your Familiar');
    expect(live.start).toHaveBeenCalledOnce();
    const hidden = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    hidden.mockRestore();
    expect(ends[0]).toHaveBeenCalled();
  });
});

describe('Front Desk regression: one voice at a time', () => {
  it('stops a guide\'s reading when a conversation starts, and reads nothing over a conversation', () => {
    const { voice, stops } = deviceVoice();
    const { live } = liveTalk();
    const desk = new FrontDeskController(voice, 'en-US', live);
    desk.setContext(Symbol('page'), place);
    desk.read('I go everywhere you go.');
    expect(voice.speak).toHaveBeenCalledOnce();
    desk.open();
    desk.talk();
    expect(stops[0]).toHaveBeenCalled();
    desk.read('Every story begins as a seed.');
    expect(voice.speak).toHaveBeenCalledOnce();
  });

  it('stops a guide\'s recorded line on the app\'s player when a conversation starts', async () => {
    let current: string | null = null;
    const playback = {
      autoplayBlocked: false, currentSource: null, currentTrackId: null, errorMessage: '', hasError: false, isBuffering: false, isMuted: false, isPlaying: false, volume: 1,
      load: vi.fn(), pause: vi.fn(), play: vi.fn((request?: { id: string }) => { current = request?.id ?? current; }), replace: vi.fn(), restart: vi.fn(() => false), setVolume: vi.fn(),
      stop: vi.fn((trackId?: string) => { if (trackId === current) current = null; }),
      subscribe: vi.fn(() => () => {}), subscribeToTrackChange: vi.fn(() => () => {}), subscribeToQueueEnd: vi.fn(() => () => {}), toggleMute: vi.fn(),
    } satisfies NarrativeAudioPlayback;
    const { voice } = deviceVoice();
    const { live } = liveTalk();
    let readAloud: ReturnType<typeof useFrontDeskReadAloud> = null;
    function Guide() { readAloud = useFrontDeskReadAloud(); return null; }
    act(() => root.render(<NarrativeAudioProvider value={playback}><FamiliarFrontDesk voice={voice} live={live}>
      <Screen context={place} /><Guide /><FrontDeskTalkButton />
    </FamiliarFrontDesk></NarrativeAudioProvider>));
    act(() => readAloud!.read('I go everywhere you go.', 'https://cdn.example/meet.mp3'));
    expect(playback.play).toHaveBeenCalledWith(expect.objectContaining({ id: 'familiar-line:https://cdn.example/meet.mp3' }));
    await click('Talk to Familiar');
    await click('Talk with your Familiar');
    expect(playback.stop).toHaveBeenCalledWith('familiar-line:https://cdn.example/meet.mp3');
    expect(current).toBeNull();
  });
});
