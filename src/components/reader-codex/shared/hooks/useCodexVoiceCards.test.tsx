// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isPlayableCodexVoiceSource,
  useCodexVoiceCards,
} from './useCodexVoiceCards';

const playback = vi.hoisted(() => ({
  currentTrackId: null as string | null,
  isPlaying: false,
  replace: vi.fn(),
  stop: vi.fn(),
}));

const YAN_SHI_ARTIFACT = 'data:audio/mpeg;base64,AAAA';
const LI_MEI_ARTIFACT = 'data:audio/mpeg;base64,BBBB';

vi.mock('../../../../audio/DevAudioPlayback', () => ({
  useDevAudioPlayback: () => playback,
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function VoiceHarness() {
  const { playingVoiceId, handlePlayVoice, handleStopVoice } = useCodexVoiceCards();
  return (
    <>
      <output data-testid="playing">{playingVoiceId ?? 'idle'}</output>
      <button
        type="button"
        data-testid="play-artifact"
        onClick={() => handlePlayVoice(YAN_SHI_ARTIFACT, 'char-yan-shi')}
      >
        Play artifact
      </button>
      <button
        type="button"
        data-testid="play-second"
        onClick={() => handlePlayVoice(LI_MEI_ARTIFACT, 'char-li-mei')}
      >
        Play second
      </button>
      <button
        type="button"
        data-testid="play-legacy"
        onClick={() => handlePlayVoice('workshop-voice:Stand.', 'char-yan-shi')}
      >
        Play legacy
      </button>
      <button type="button" data-testid="stop" onClick={handleStopVoice}>Stop</button>
    </>
  );
}

let container: HTMLDivElement;
let root: Root;

const control = (id: string): HTMLButtonElement => {
  const element = container.querySelector<HTMLButtonElement>(`[data-testid="${id}"]`);
  expect(element).toBeTruthy();
  return element!;
};

const render = () => {
  act(() => root.render(<VoiceHarness />));
};

beforeEach(() => {
  playback.currentTrackId = null;
  playback.isPlaying = false;
  vi.clearAllMocks();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('isPlayableCodexVoiceSource', () => {
  it('requires the server-produced audio data URI instead of a voice identity, URL, or legacy marker', () => {
    expect(isPlayableCodexVoiceSource()).toBe(false);
    expect(isPlayableCodexVoiceSource('')).toBe(false);
    expect(isPlayableCodexVoiceSource('workshop-voice:Stand.')).toBe(false);
    expect(isPlayableCodexVoiceSource('ancient-master-female')).toBe(false);
    expect(isPlayableCodexVoiceSource('/generated/voice.mp3')).toBe(false);
    expect(isPlayableCodexVoiceSource('https://audio.example/voice.mp3')).toBe(false);
    expect(isPlayableCodexVoiceSource('https://api.elevenlabs.io/v1/audio/provider-voice-id')).toBe(false);
    expect(isPlayableCodexVoiceSource('blob:https://reader.example/artifact')).toBe(false);
    expect(isPlayableCodexVoiceSource('data:text/plain;base64,AAAA')).toBe(false);
    expect(isPlayableCodexVoiceSource(YAN_SHI_ARTIFACT)).toBe(true);
  });
});

describe('useCodexVoiceCards', () => {
  it('does not autoplay or invoke browser speech synthesis for a legacy marker', () => {
    const speak = vi.fn();
    const cancel = vi.fn();
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { speak, cancel },
    });

    render();
    expect(playback.replace).not.toHaveBeenCalled();

    act(() => control('play-legacy').click());

    expect(playback.replace).not.toHaveBeenCalled();
    expect(speak).not.toHaveBeenCalled();
    expect(cancel).not.toHaveBeenCalled();
    expect(container.querySelector('[data-testid="playing"]')?.textContent).toBe('idle');
  });

  it('replaces the shared queue only after the user activates a playable artifact', () => {
    render();

    act(() => control('play-artifact').click());
    expect(playback.replace).toHaveBeenCalledTimes(1);
    expect(playback.replace).toHaveBeenLastCalledWith({
      id: 'codex-voice:char-yan-shi',
      source: YAN_SHI_ARTIFACT,
      title: 'Reader Codex voice',
    });

    playback.currentTrackId = 'codex-voice:char-yan-shi';
    playback.isPlaying = false;
    render();
    expect(container.querySelector('[data-testid="playing"]')?.textContent).toBe('idle');

    playback.isPlaying = true;
    render();
    expect(container.querySelector('[data-testid="playing"]')?.textContent).toBe('char-yan-shi');

    act(() => control('play-second').click());
    expect(playback.stop).toHaveBeenCalledWith('codex-voice:char-yan-shi');
    expect(playback.replace).toHaveBeenLastCalledWith({
      id: 'codex-voice:char-li-mei',
      source: LI_MEI_ARTIFACT,
      title: 'Reader Codex voice',
    });
    expect(playback.stop.mock.invocationCallOrder.at(-1)).toBeLessThan(
      playback.replace.mock.invocationCallOrder.at(-1)!,
    );
  });

  it('stops only its own active shared track', () => {
    render();
    act(() => control('play-artifact').click());
    act(() => control('stop').click());

    expect(playback.stop).toHaveBeenCalledWith('codex-voice:char-yan-shi');
    expect(container.querySelector('[data-testid="playing"]')?.textContent).toBe('idle');
  });
});
