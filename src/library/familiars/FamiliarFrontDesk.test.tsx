// @vitest-environment jsdom
import { act, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NarrativeAudioProvider, type NarrativeAudioPlayback } from '@seihouse/sen/audio';
import { FrontDeskTalkButton, useFrontDeskContext } from '@seihouse/front-desk';
import { FamiliarFrontDesk } from './FamiliarFrontDesk';
import { SpokenCode } from '@seihouse/sen/presentation';
import type { FrontDeskContext, FrontDeskLive, FrontDeskLiveEvents, FrontDeskVoice, FrontDeskWakeWord } from '@seihouse/front-desk';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;
beforeEach(() => { container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
afterEach(() => { act(() => root.unmount()); container.remove(); });
const button = (label: string) => [...document.querySelectorAll('button')].find(element => (element.getAttribute('aria-label') ?? element.textContent) === label)!;
const click = async (label: string) => { await act(async () => button(label).click()); };
function Screen({ context }: { context: FrontDeskContext }) { useFrontDeskContext(context); return null; }
function setup() {
  let heard: (text: string) => void = () => {};
  const abort = vi.fn();
  const run = vi.fn(async () => {});
  const release = vi.fn();
  const voice: FrontDeskVoice = { available: true,
    listen: vi.fn((_language, result) => { heard = result; return { stop: vi.fn(), cancel: abort }; }),
    speak: vi.fn(() => () => {}),
  };
  const context: FrontDeskContext = { key: 'reader:2', title: 'Fate', hint: 'Say Conflict.', topics: [], interrupt: () => release,
    actions: [{ id: 'conflict', label: 'Conflict', phrases: ['conflict'], describe: () => 'Chapter 2: A rival arrives.', success: 'Saved.', run }],
  };
  const render = (screen: FrontDeskContext | undefined = context) => act(() => root.render(<StrictMode><FamiliarFrontDesk voice={voice}>
    {screen && <Screen context={screen} />}<FrontDeskTalkButton />
  </FamiliarFrontDesk></StrictMode>));
  render();
  return { render, context, voice, run, release, abort, heard: (text: string) => heard(text) };
}

describe('The Familiar on Front Desk', () => {
  it('shows spoken codes on the page only while the Familiar is in use', async () => {
    const voice: FrontDeskVoice = { available: true, listen: vi.fn(() => ({ stop: vi.fn(), cancel: vi.fn() })), speak: vi.fn(() => () => {}) };
    act(() => root.render(<FamiliarFrontDesk voice={voice}><SpokenCode code="N1" /><FrontDeskTalkButton /></FamiliarFrontDesk>));
    expect(document.querySelector('[data-spoken-code="N1"]')).toBeNull();
    await click('Talk to Familiar');
    expect(document.querySelector('[data-spoken-code="N1"]')?.textContent).toBe('N1');
    await click('Close Familiar');
    expect(document.querySelector('[data-spoken-code="N1"]')).toBeNull();
  });

  it('shows a page\'s front suggestions first, the rest behind See all, and its first topics with the rest behind More', async () => {
    const t = setup();
    const go = (id: string, label: string) => ({ id, label, phrases: [label.toLowerCase()], describe: () => label, success: `Opened ${label}.`, run: vi.fn(async () => {}) });
    const topic = (id: string) => ({ id, label: id, phrases: [id], explanation: `${id} explained.` });
    t.render({ key: 'place:home', title: 'Home', hint: '', page: 'home', topics: ['a', 'b', 'c', 'd', 'e', 'f'].map(topic),
      actions: [go('go-home', 'Home'), go('go-profile', 'Profile'), go('go-settings', 'Settings'), go('go-store', 'Store'), go('go-energy', 'My Energy'), go('go-create', 'Create')] });
    await click('Talk to Familiar');
    const tiles = () => [...document.querySelectorAll('.front-desk-card-actions button[aria-label]')].map(element => element.getAttribute('aria-label'));
    // Home's front four in their order; Home itself is not offered on Home.
    expect(tiles()).toEqual(['Create', 'My Energy', 'Store', 'Settings']);
    await click('See all (1 more)');
    expect(tiles()).toEqual(['Create', 'My Energy', 'Store', 'Settings', 'Profile']);
    await click('Fewer');
    expect(tiles()).toHaveLength(4);
    await click('Explain');
    const chips = () => [...document.querySelectorAll('.front-desk-card-topics button[aria-pressed]')].map(element => element.textContent);
    expect(chips()).toEqual(['a', 'b', 'c', 'd']);
    await click('More (2 more)');
    expect(chips()).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
  });

  it('keeps "Take me back" as its own pill, never a tile, and backs out of a change before it leaves the page', async () => {
    const t = setup();
    const back = vi.fn(async () => {});
    const go = (id: string, label: string) => ({ id, label, phrases: [label.toLowerCase()], describe: () => label, success: `Opened ${label}.`, run: vi.fn(async () => {}) });
    t.render({ ...t.context, key: 'reader:back', page: 'reader', actions: [
      { id: 'go-back', label: 'Take me back', phrases: ['take me back'], describe: () => 'Back.', success: 'Went back.', run: back },
      ...t.context.actions, go('go-energy', 'My Energy'),
    ] });
    await click('Talk to Familiar');
    await click('Action');
    const tiles = () => [...document.querySelectorAll('.front-desk-card-actions button[aria-label]')].map(element => element.getAttribute('aria-label'));
    expect(tiles()).not.toContain('Take me back');
    // A change waiting to be confirmed: the pill backs out of it and stays on the page.
    await click('Conflict');
    expect(button('Back out')).toBeTruthy();
    await click('Back out');
    expect(t.run).not.toHaveBeenCalled();
    expect(back).not.toHaveBeenCalled();
    await click('Take me back');
    expect(back).toHaveBeenCalledOnce();
  });

  it('handles a queued size measurement when the card closes and reopens', async () => {
    let resize = () => {};
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback: () => void) { resize = callback; }
      observe() {}
      disconnect() {}
    });
    try {
      const t = setup();
      await click('Talk to Familiar');
      act(() => resize());
      await click('Close Familiar');
      act(() => resize());
      await click('Talk to Familiar');
      expect(document.querySelector('.front-desk-card')).not.toBeNull();
      expect(button('Move Familiar card')).toBeTruthy();
      expect(t.voice.listen).not.toHaveBeenCalled();
    } finally { vi.unstubAllGlobals(); }
  });
  it.each(['mouse', 'touch'])('moves the card by its header with %s, clamps it, and keeps its placement on reopen', async pointerType => {
    const t = setup();
    await click('Talk to Familiar');
    const panel = document.querySelector<HTMLElement>('.front-desk-card')!;
    const handle = button('Move Familiar card');
    const bounds = () => ({ left: parseFloat(panel.style.left), top: parseFloat(panel.style.top), width: 360, height: 200 } as DOMRect);
    vi.spyOn(panel, 'getBoundingClientRect').mockImplementation(bounds);
    const pointer = (type: string, x: number, y: number, target: HTMLElement = handle, id = 1) => {
      const event = new Event(type, { bubbles: true });
      Object.assign(event, { clientX: x, clientY: y, pointerId: id, pointerType, button: 0, isPrimary: id === 1 });
      act(() => target.dispatchEvent(event));
    };
    const start = bounds();
    pointer('pointerdown', 100, 100);
    pointer('pointermove', 200, 180, handle, 2);
    expect(bounds().left).toBe(start.left);
    pointer('pointermove', 200, 180);
    expect(bounds()).toMatchObject({ left: start.left + 100, top: start.top + 80 });
    expect(panel.dataset.dragging).toBe('true');
    pointer('pointermove', 5000, 5000);
    expect(bounds()).toMatchObject({ left: window.innerWidth - 376, top: window.innerHeight - 288 });
    pointer('pointercancel', 5000, 5000);
    expect(panel.dataset.dragging).toBeUndefined();
    pointer('pointermove', 100, 100);
    expect(bounds().left).toBe(window.innerWidth - 376);
    pointer('pointerdown', 500, 500);
    pointer('pointermove', -5000, -5000);
    pointer('pointerup', -5000, -5000);
    expect(bounds()).toMatchObject({ left: 16, top: 16 });
    pointer('pointerdown', 100, 100);
    pointer('pointermove', 200, 180);
    pointer('pointerup', 200, 180);
    const placed = { left: panel.style.left, top: panel.style.top };
    // Mode and close controls remain buttons, not drag handles.
    pointer('pointerdown', 100, 100, button('Explain'));
    pointer('pointermove', 300, 300, button('Explain'));
    expect(panel.style.left).toBe(placed.left);
    await click('Close Familiar');
    await click('Talk to Familiar');
    const reopened = document.querySelector<HTMLElement>('.front-desk-card')!;
    expect(reopened.style.left).toBe(placed.left);
    expect(reopened.style.top).toBe(placed.top);
    expect(t.voice.listen).not.toHaveBeenCalled();
  });
  it('supports keyboard movement and keeps the card in view after resize', async () => {
    setup();
    await click('Talk to Familiar');
    const panel = document.querySelector<HTMLElement>('.front-desk-card')!;
    vi.spyOn(panel, 'getBoundingClientRect').mockImplementation(() => ({ left: parseFloat(panel.style.left), top: parseFloat(panel.style.top), width: 360, height: 200 } as DOMRect));
    const move = (key: string, shiftKey = false) => act(() => button('Move Familiar card').dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true })));
    move('ArrowRight'); move('ArrowDown', true);
    expect(panel.style.left).toBe('26px');
    expect(panel.style.top).toBe('56px');
    for (let i = 0; i < 20; i++) { move('ArrowRight', true); move('ArrowDown', true); }
    const width = window.innerWidth; const height = window.innerHeight;
    try {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: 500 });
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: 400 });
      act(() => window.dispatchEvent(new Event('resize')));
      expect(panel.style.left).toBe('124px');
      expect(panel.style.top).toBe('112px');
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
    }
  });
  it('stops device listening after live talk fails instead of starting another paid session', async () => {
    const t = setup();
    let events: FrontDeskLiveEvents | undefined;
    const live: FrontDeskLive = { start: vi.fn((_brief, handlers) => { events = handlers; return { end: vi.fn(), send: vi.fn() }; }) };
    act(() => root.render(<StrictMode><FamiliarFrontDesk voice={t.voice} live={live}>
      <Screen context={t.context} /><FrontDeskTalkButton />
    </FamiliarFrontDesk></StrictMode>));
    await click('Talk to Familiar');
    await click('Talk with your Familiar');
    act(() => events!.ended('Connection failed', true));
    expect(t.voice.listen).toHaveBeenCalledOnce();
    await click('Done talking');
    act(() => t.heard('conflict'));
    expect(live.start).toHaveBeenCalledOnce();
    expect(t.voice.listen).toHaveBeenCalledOnce();
    expect(button('Talk with your Familiar').getAttribute('aria-pressed')).toBe('false');
    expect(button('Confirm')).toBeTruthy();
  });
  it('opens and reopens idle, and only the card microphone starts device speech', async () => {
    const t = setup();
    await click('Talk to Familiar');
    expect(t.voice.listen).not.toHaveBeenCalled();
    expect(t.voice.speak).not.toHaveBeenCalled();
    await click('Close Familiar');
    await click('Talk to Familiar');
    expect(t.voice.listen).not.toHaveBeenCalled();
    await click('Speak');
    expect(t.voice.listen).toHaveBeenCalledOnce();
    await click('Done talking');
    expect(button('Speak').getAttribute('aria-pressed')).toBe('false');
    await click('Close Familiar');
    act(() => t.heard('conflict'));
    await click('Talk to Familiar');
    expect(button('Confirm')).toBeUndefined();
    expect(t.voice.listen).toHaveBeenCalledOnce();
  });
  it.each(['stop', 'close', 'hide', 'unmount'] as const)('ends connecting live talk on %s and ignores late provider callbacks', async action => {
    const t = setup();
    let events: FrontDeskLiveEvents | undefined;
    const end = vi.fn();
    const live: FrontDeskLive = { start: vi.fn((_brief, handlers) => { events = handlers; return { end, send: vi.fn() }; }) };
    act(() => root.render(<StrictMode><FamiliarFrontDesk voice={t.voice} live={live}>
      <Screen context={t.context} /><FrontDeskTalkButton />
    </FamiliarFrontDesk></StrictMode>));
    await click('Talk to Familiar');
    await click('Conversation');
    expect(live.start).not.toHaveBeenCalled();
    await click('Talk with your Familiar');
    if (action === 'stop') await click('Connecting… tap to stop');
    else if (action === 'close') await click('Close Familiar');
    else if (action === 'unmount') act(() => root.render(null));
    else {
      vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
      act(() => document.dispatchEvent(new Event('visibilitychange')));
      vi.restoreAllMocks();
    }
    expect(end).toHaveBeenCalledOnce();
    act(() => { events!.connected(); events!.caption('familiar', 'Late reply'); events!.ended('Unavailable', true); });
    expect(t.voice.listen).not.toHaveBeenCalled();
    expect(live.start).toHaveBeenCalledOnce();
    expect(document.body.textContent).not.toContain('Late reply');
    expect(document.querySelector('[data-phase="live"]')).toBeNull();
    if (action === 'close' || action === 'hide') {
      await click('Talk to Familiar');
      expect(live.start).toHaveBeenCalledOnce();
    }
  });

  it('focuses a nonmodal panel and returns focus on Escape without saving', async () => {
    const t = setup();
    await click('Talk to Familiar');
    const panel = document.querySelector('[role="dialog"]')!;
    expect(panel.getAttribute('aria-modal')).toBe('false');
    expect(document.activeElement).toBe(panel);
    await click('Conflict');
    expect(document.activeElement).toBe(button('Confirm'));
    expect(t.abort).not.toHaveBeenCalled();
    expect(t.voice.speak).not.toHaveBeenCalled();
    expect(t.run).not.toHaveBeenCalled();
    act(() => panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(button('Talk to Familiar'));
    expect(t.release).toHaveBeenCalledExactlyOnceWith(true);
  });
  it('clears a proposal when the screen leaves and ignores late speech', async () => {
    const t = setup();
    await click('Talk to Familiar');
    await click('Conflict');
    // Explicitly render no screen under the same global provider.
    act(() => root.render(<StrictMode><FamiliarFrontDesk voice={t.voice}><FrontDeskTalkButton /></FamiliarFrontDesk></StrictMode>));
    act(() => t.heard('confirm'));
    expect(document.body.textContent).toContain('Nothing to do here yet.');
    expect(button('Confirm')).toBeUndefined();
    expect(t.run).not.toHaveBeenCalled();
    expect(t.release).toHaveBeenCalledExactlyOnceWith(false);
  });
  it('applies once on confirmation and removes the proposal', async () => {
    const t = setup();
    await click('Talk to Familiar');
    await click('Conflict');
    await click('Confirm');
    expect(t.run).toHaveBeenCalledOnce();
    expect(document.body.textContent).toContain('Saved.');
    expect(document.activeElement).toBe(document.querySelector('[role="dialog"]'));
    expect(button('Confirm')).toBeUndefined();
    expect(t.release).toHaveBeenCalledExactlyOnceWith(true);
  });
  it('explains a topic with its clip and recorded voice, and keeps a topic without a clip compact', async () => {
    const t = setup();
    const play = vi.fn(() => () => {});
    const voice = { ...t.voice, play };
    const topics = [
      { id: 'codex', label: 'Codex', phrases: ['codex'], explanation: 'The Codex keeps who you have met.', audioUrl: 'https://cdn.example/codex.mp3', videoUrl: 'https://cdn.example/codex.mp4' },
      { id: 'fate', label: 'Fate', phrases: ['fate'], explanation: 'Fate chooses the next chapter.' },
    ];
    act(() => root.render(<StrictMode><FamiliarFrontDesk voice={voice}>
      <Screen context={{ ...t.context, topics }} /><FrontDeskTalkButton />
    </FamiliarFrontDesk></StrictMode>));
    await click('Talk to Familiar');
    await click('Explain');
    expect(document.querySelector('video')).toBeNull();
    await click('Fate');
    expect(document.querySelector('.front-desk-card-topic')!.textContent).toContain('Fate chooses the next chapter.');
    expect(document.querySelector('video')).toBeNull();
    expect(voice.speak).toHaveBeenLastCalledWith('Fate chooses the next chapter.', 'en-US', expect.any(Function), expect.any(Function));
    await click('Codex');
    expect(document.querySelector('video')!.getAttribute('src')).toBe('https://cdn.example/codex.mp4');
    // The clip can be paused and played from the keyboard, not only by tapping it.
    expect(button('Play the clip') ?? button('Pause the clip')).toBeTruthy();
    expect(play).toHaveBeenCalledWith('https://cdn.example/codex.mp3', expect.any(Function), expect.any(Function));
    expect(t.run).not.toHaveBeenCalled();
  });
  it('keeps how to talk behind the info button', async () => {
    setup();
    await click('Talk to Familiar');
    expect(document.body.textContent).not.toContain('Say Conflict.');
    await click('How to talk to your Familiar');
    expect(document.querySelector('.front-desk-card-info')!.textContent).toContain('Say Conflict.');
  });
  it('stops a recorded line through the player as it is now, so Stop silences it', async () => {
    const t = setup();
    // Like the app's player, stop only acts on the track its own snapshot knows is playing.
    const player = (currentTrackId: string | null): NarrativeAudioPlayback => ({
      autoplayBlocked: false, currentSource: null, currentTrackId, errorMessage: '', hasError: false, isBuffering: false, isMuted: false, isPlaying: Boolean(currentTrackId), volume: 1,
      load: vi.fn(), pause: vi.fn(), play: vi.fn(), replace: vi.fn(), restart: vi.fn(() => false), setVolume: vi.fn(),
      stop: vi.fn((trackId?: string) => { if (trackId && trackId !== currentTrackId) return; }),
      subscribe: vi.fn(() => () => {}), subscribeToTrackChange: vi.fn(() => () => {}), subscribeToQueueEnd: vi.fn(() => () => {}), toggleMute: vi.fn(),
    });
    const topics = [{ id: 'energy', label: 'Energy', phrases: ['energy'], explanation: 'Energy powers creation.', audioUrl: 'https://cdn.example/energy.mp3' }];
    const app = (playback: NarrativeAudioPlayback) => <StrictMode><NarrativeAudioProvider value={playback}><FamiliarFrontDesk voice={t.voice}>
      <Screen context={{ ...t.context, topics }} /><FrontDeskTalkButton />
    </FamiliarFrontDesk></NarrativeAudioProvider></StrictMode>;
    const before = player(null);
    act(() => root.render(app(before)));
    await click('Talk to Familiar');
    await click('Explain');
    await click('Energy');
    expect(before.play).toHaveBeenCalledWith(expect.objectContaining({ source: 'https://cdn.example/energy.mp3' }));
    // The player re-renders with the line now playing.
    const playing = player('familiar-line:https://cdn.example/energy.mp3');
    act(() => root.render(app(playing)));
    await click('Stop');
    expect(playing.stop).toHaveBeenCalledWith('familiar-line:https://cdn.example/energy.mp3');
  });
  it('stops a recorded line that never started before the device voice reads it instead', async () => {
    vi.useFakeTimers();
    try {
      const t = setup();
      let current: string | null = null;
      const playback = {
        autoplayBlocked: false, currentSource: null, currentTrackId: null, errorMessage: '', hasError: false, isBuffering: true, isMuted: false, isPlaying: false, volume: 1,
        load: vi.fn(), pause: vi.fn(), play: vi.fn((request?: { id: string }) => { current = request?.id ?? current; }), replace: vi.fn(), restart: vi.fn(() => false), setVolume: vi.fn(),
        stop: vi.fn((trackId?: string) => { if (trackId === current) current = null; }),
        subscribe: vi.fn(() => () => {}), subscribeToTrackChange: vi.fn(() => () => {}), subscribeToQueueEnd: vi.fn(() => () => {}), toggleMute: vi.fn(),
      } satisfies NarrativeAudioPlayback;
      const topics = [{ id: 'energy', label: 'Energy', phrases: ['energy'], explanation: 'Energy powers creation.', audioUrl: 'https://cdn.example/energy.mp3' }];
      act(() => root.render(<StrictMode><NarrativeAudioProvider value={playback}><FamiliarFrontDesk voice={t.voice}>
        <Screen context={{ ...t.context, topics }} /><FrontDeskTalkButton />
      </FamiliarFrontDesk></NarrativeAudioProvider></StrictMode>));
      await click('Talk to Familiar');
      await click('Explain');
      await click('Energy');
      expect(current).toBe('familiar-line:https://cdn.example/energy.mp3');
      // Still loading after eight seconds: the line is stopped, and the device voice reads the words.
      act(() => { vi.advanceTimersByTime(8_000); });
      expect(playback.stop).toHaveBeenCalledWith('familiar-line:https://cdn.example/energy.mp3');
      expect(current).toBeNull();
      expect(t.voice.speak).toHaveBeenLastCalledWith('Energy powers creation.', 'en-US', expect.any(Function), expect.any(Function));
    } finally { vi.useRealTimers(); }
  });
  it('talks live with the equipped Familiar from its microphone, keeps the conversation behind its own button, and hangs up on a second tap', async () => {
    const t = setup();
    let events: FrontDeskLiveEvents | undefined;
    const end = vi.fn();
    const send = vi.fn();
    const live: FrontDeskLive = { start: vi.fn((_brief, handlers) => { events = handlers; return { end, send }; }) };
    act(() => root.render(<StrictMode><FamiliarFrontDesk voice={t.voice} live={live} familiar={{ name: 'Celestial Guardian', description: 'A fox.' }}>
      <Screen context={t.context} /><FrontDeskTalkButton />
    </FamiliarFrontDesk></StrictMode>));
    await click('Talk to Familiar');
    expect(live.start).not.toHaveBeenCalled();
    await click('Talk with your Familiar');
    expect(live.start).toHaveBeenCalledWith(expect.objectContaining({ familiar: { name: 'Celestial Guardian', description: 'A fox.' }, place: 'Fate' }), expect.anything(), { microphone: true });
    expect(t.voice.listen).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('Connecting…');
    act(() => events!.connected());
    act(() => { events!.caption('reader', 'What can I do here?'); events!.caption('familiar', 'You can choose Conflict.'); });
    // The panel itself stays as it is: the conversation is behind its button.
    expect(document.querySelector('[role="log"]')).toBeNull();
    expect(document.body.textContent).not.toContain('You can choose Conflict.');
    expect(button('Conflict')).toBeTruthy();
    await click('Conversation');
    const chat = document.querySelector('[role="log"]')!;
    expect(chat.getAttribute('aria-label')).toBe('Conversation with Celestial Guardian');
    expect(chat.textContent).toBe('Talking on FateYou: What can I do here?Celestial Guardian: You can choose Conflict.');
    const input = document.querySelector<HTMLInputElement>('input[aria-label="Message Celestial Guardian"]')!;
    act(() => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'Pick Conflict'); input.dispatchEvent(new Event('input', { bubbles: true })); });
    await click('Send');
    expect(send).toHaveBeenCalledExactlyOnceWith('Pick Conflict');
    expect(document.querySelector('[role="log"]')!.textContent).toContain('You: Pick Conflict');
    // In Explain too, the conversation covers the panel while open.
    await click('Conversation');
    await click('Explain');
    await click('Conversation');
    expect(document.querySelector('[role="log"]')).toBeTruthy();
    // Back to the panel: the choices, not the chat.
    await click('Conversation');
    expect(document.querySelector('[role="log"]')).toBeNull();
    expect(button('Hang up').getAttribute('data-phase')).toBe('live');
    await click('Hang up');
    expect(end).toHaveBeenCalledOnce();
    expect(button('Talk with your Familiar')).toBeTruthy();
  });
  it('calls the Familiar when its wake word is heard, and listens for it only while the Familiar is idle', async () => {
    vi.useFakeTimers();
    try {
      const t = setup();
      let events: FrontDeskLiveEvents | undefined;
      const live: FrontDeskLive = { start: vi.fn((_brief, handlers) => { events = handlers; return { end: vi.fn(), send: vi.fn() }; }) };
      let heard: (() => void) | undefined;
      const stops: ReturnType<typeof vi.fn>[] = [];
      const wake: FrontDeskWakeWord = { available: true, listen: vi.fn((_word, _language, onHeard) => { heard = onHeard; const stop = vi.fn(); stops.push(stop); return stop; }) };
      act(() => root.render(<FamiliarFrontDesk voice={t.voice} live={live} wake={wake}>
        <Screen context={t.context} /><FrontDeskTalkButton />
      </FamiliarFrontDesk>));
      expect(wake.listen).toHaveBeenCalledWith('familiar', 'en-US', expect.any(Function), expect.any(Function));
      // Hearing it calls the Familiar as its microphone does, once the recognizer has let go.
      act(() => heard!());
      expect(stops.at(-1)).toHaveBeenCalled();
      expect(live.start).not.toHaveBeenCalled();
      await act(async () => { vi.advanceTimersByTime(250); });
      expect(live.start).toHaveBeenCalledWith(expect.anything(), expect.anything(), { microphone: true });
      expect(document.querySelector('[role="dialog"], .front-desk-card')).toBeTruthy();
      // No listening for it while talking.
      const calls = (wake.listen as ReturnType<typeof vi.fn>).mock.calls.length;
      act(() => events!.connected());
      expect((wake.listen as ReturnType<typeof vi.fn>).mock.calls.length).toBe(calls);
      // Back to idle, it listens again.
      await click('Hang up');
      expect((wake.listen as ReturnType<typeof vi.fn>).mock.calls.length).toBe(calls + 1);
    } finally {
      vi.useRealTimers();
    }
  });
  it('puts a typed message that could not be sent back in the box', async () => {
    const t = setup();
    let events: FrontDeskLiveEvents | undefined;
    const live: FrontDeskLive = { start: vi.fn((_brief, handlers) => { events = handlers; return { end: vi.fn(), send: vi.fn() }; }) };
    act(() => root.render(<StrictMode><FamiliarFrontDesk voice={t.voice} live={live} familiar={{ name: 'Quill', description: '' }}>
      <Screen context={t.context} /><FrontDeskTalkButton />
    </FamiliarFrontDesk></StrictMode>));
    await click('Talk to Familiar');
    await click('Conversation');
    expect(live.start).not.toHaveBeenCalled();
    const input = () => document.querySelector<HTMLInputElement>('input[aria-label="Message Quill"]')!;
    act(() => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input(), 'What is energy?'); input().dispatchEvent(new Event('input', { bubbles: true })); });
    await click('Send');
    expect(input().value).toBe('');
    expect(live.start).toHaveBeenCalledWith(expect.anything(), expect.anything(), { microphone: false });
    act(() => events!.ended(undefined, true));
    expect(input().value).toBe('What is energy?');
    expect(document.querySelector('[role="log"]')!.textContent).toContain('Not sent: your Familiar could not connect.');
    expect(t.voice.listen).not.toHaveBeenCalled();
  });
});
