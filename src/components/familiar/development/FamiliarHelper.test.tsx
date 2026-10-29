// @vitest-environment jsdom
import { act, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NarrativeAudioProvider, type NarrativeAudioPlayback } from '@seihouse/sen/audio';
import { FamiliarHelperAction, FamiliarHelperProvider, useFamiliarHelperContext } from './FamiliarHelper';
import type { FamiliarHelperContext, FamiliarLive, FamiliarLiveEvents, FamiliarVoice } from '../../../library/familiars/helper';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;
beforeEach(() => { container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
afterEach(() => { act(() => root.unmount()); container.remove(); });
const button = (label: string) => [...document.querySelectorAll('button')].find(element => element.textContent === label || element.getAttribute('aria-label') === label)!;
const click = async (label: string) => { await act(async () => button(label).click()); };
function Screen({ context }: { context: FamiliarHelperContext }) { useFamiliarHelperContext(context); return null; }
function setup() {
  let heard: (text: string) => void = () => {};
  const abort = vi.fn();
  const run = vi.fn(async () => {});
  const release = vi.fn();
  const voice: FamiliarVoice = { available: true,
    listen: vi.fn((_language, result) => { heard = result; return { stop: vi.fn(), cancel: abort }; }),
    speak: vi.fn(() => () => {}),
  };
  const context: FamiliarHelperContext = { key: 'reader:2', title: 'Fate', hint: 'Say Conflict.', topics: [], interrupt: () => release,
    actions: [{ id: 'conflict', label: 'Conflict', phrases: ['conflict'], describe: () => 'Chapter 2: A rival arrives.', success: 'Saved.', run }],
  };
  const render = (screen: FamiliarHelperContext | undefined = context) => act(() => root.render(<StrictMode><FamiliarHelperProvider voice={voice}>
    {screen && <Screen context={screen} />}<FamiliarHelperAction />
  </FamiliarHelperProvider></StrictMode>));
  render();
  return { render, context, voice, run, release, abort, heard: (text: string) => heard(text) };
}

describe('Familiar helper surface', () => {
  it('focuses a nonmodal panel and returns focus on Escape without saving', async () => {
    const t = setup();
    await click('Talk to Familiar');
    const panel = document.querySelector('[role="dialog"]')!;
    expect(panel.getAttribute('aria-modal')).toBe('false');
    expect(document.activeElement).toBe(panel);
    await click('Conflict');
    expect(document.activeElement).toBe(button('Confirm'));
    expect(t.abort).toHaveBeenCalled();
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
    act(() => root.render(<StrictMode><FamiliarHelperProvider voice={t.voice}><FamiliarHelperAction /></FamiliarHelperProvider></StrictMode>));
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
    act(() => root.render(<StrictMode><FamiliarHelperProvider voice={voice}>
      <Screen context={{ ...t.context, topics }} /><FamiliarHelperAction />
    </FamiliarHelperProvider></StrictMode>));
    await click('Talk to Familiar');
    await click('Explain');
    expect(document.querySelector('video')).toBeNull();
    await click('Fate');
    expect(document.querySelector('.familiar-helper-topic')!.textContent).toContain('Fate chooses the next chapter.');
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
    expect(document.querySelector('.familiar-helper-info')!.textContent).toContain('Say Conflict.');
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
    const app = (playback: NarrativeAudioPlayback) => <StrictMode><NarrativeAudioProvider value={playback}><FamiliarHelperProvider voice={t.voice}>
      <Screen context={{ ...t.context, topics }} /><FamiliarHelperAction />
    </FamiliarHelperProvider></NarrativeAudioProvider></StrictMode>;
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
      act(() => root.render(<StrictMode><NarrativeAudioProvider value={playback}><FamiliarHelperProvider voice={t.voice}>
        <Screen context={{ ...t.context, topics }} /><FamiliarHelperAction />
      </FamiliarHelperProvider></NarrativeAudioProvider></StrictMode>));
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
    let events: FamiliarLiveEvents | undefined;
    const end = vi.fn();
    const send = vi.fn();
    const live: FamiliarLive = { start: vi.fn((_brief, handlers) => { events = handlers; return { end, send }; }) };
    act(() => root.render(<StrictMode><FamiliarHelperProvider voice={t.voice} live={live} familiar={{ name: 'Celestial Guardian', description: 'A fox.' }}>
      <Screen context={t.context} /><FamiliarHelperAction />
    </FamiliarHelperProvider></StrictMode>));
    await click('Talk to Familiar');
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
  it('puts a typed message that could not be sent back in the box', async () => {
    const t = setup();
    let events: FamiliarLiveEvents | undefined;
    const live: FamiliarLive = { start: vi.fn((_brief, handlers) => { events = handlers; return { end: vi.fn(), send: vi.fn() }; }) };
    act(() => root.render(<StrictMode><FamiliarHelperProvider voice={t.voice} live={live} familiar={{ name: 'Quill', description: '' }}>
      <Screen context={t.context} /><FamiliarHelperAction />
    </FamiliarHelperProvider></StrictMode>));
    await click('Talk to Familiar');
    await click('Connecting… tap to stop');
    await click('Conversation');
    const input = () => document.querySelector<HTMLInputElement>('input[aria-label="Message Quill"]')!;
    act(() => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input(), 'What is energy?'); input().dispatchEvent(new Event('input', { bubbles: true })); });
    await click('Send');
    expect(input().value).toBe('');
    act(() => events!.ended(undefined, true));
    expect(input().value).toBe('What is energy?');
    expect(document.querySelector('[role="log"]')!.textContent).toContain('Not sent: your Familiar could not connect.');
    expect(t.voice.listen).not.toHaveBeenCalled();
  });
});
