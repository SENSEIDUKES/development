// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DevAudioPlaybackProvider,
  useDevAudioPlayback,
} from './DevAudioPlayback';
import { installAudioMediaStubs } from '../test-utils/renderWithDevAudio';

const VOICE_DATA_URI = 'data:audio/mpeg;base64,AAAA';
const VOICE_BLOB_URL = 'blob:http://localhost:5173/codex-voice';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function PlaybackHarness() {
  const playback = useDevAudioPlayback();
  return (
    <>
      <output data-testid="source">{playback.currentSource ?? 'idle'}</output>
      <output data-testid="autoplay-blocked">{String(playback.autoplayBlocked)}</output>
      <button
        type="button"
        data-testid="play-voice"
        onClick={() => playback.replace({
          id: 'codex-voice:mei-lin',
          source: VOICE_DATA_URI,
          title: 'Reader Codex voice',
        })}
      >
        Play voice
      </button>
      <button
        type="button"
        data-testid="play-library-cue"
        onClick={() => playback.replace({
          id: 'library-cue:bell',
          source: 'https://celestialaudio.seihouse.org/DEFAULT/System/Confirm/Confirm_2.wav',
        })}
      >
        Play Library cue
      </button>
      <button
        type="button"
        data-testid="restart-voice"
        onClick={() => playback.restart('codex-voice:mei-lin')}
      >
        Restart voice
      </button>
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

beforeEach(() => {
  installAudioMediaStubs();
  vi.stubGlobal('atob', (encoded: string) => encoded);
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => VOICE_BLOB_URL),
    revokeObjectURL: vi.fn(),
  });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(
    <DevAudioPlaybackProvider>
      <PlaybackHarness />
    </DevAudioPlaybackProvider>,
  ));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe('DevAudioPlayback data-URI sources', () => {
  it('plays synthesized audio as a Blob URL through the shared media element', async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play');

    await act(async () => control('play-voice').click());
    await vi.waitFor(() => expect(play).toHaveBeenCalledTimes(1));

    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.objectContaining({
      type: 'audio/mpeg',
    }));
    expect(container.querySelector('[data-testid="source"]')?.textContent).toBe(VOICE_BLOB_URL);
    expect(play).toHaveBeenCalledTimes(1);
  });

  it('releases the synthesized Blob URL after the shared player moves to another source', async () => {
    await act(async () => control('play-voice').click());
    await act(async () => control('play-library-cue').click());

    expect(URL.revokeObjectURL).toHaveBeenCalledWith(VOICE_BLOB_URL);
  });

  it('restarts a browser-blocked synthesized track from a later user gesture', async () => {
    const blocked = new Error('User interaction is required.');
    blocked.name = 'NotAllowedError';
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play')
      .mockRejectedValueOnce(blocked)
      .mockResolvedValueOnce();

    await act(async () => control('play-voice').click());
    await vi.waitFor(() => expect(play).toHaveBeenCalledTimes(1));
    expect(container.querySelector('[data-testid="autoplay-blocked"]')?.textContent).toBe('true');

    await act(async () => control('restart-voice').click());

    expect(play).toHaveBeenCalledTimes(2);
    expect(container.querySelector('[data-testid="autoplay-blocked"]')?.textContent).toBe('false');
  });
});
