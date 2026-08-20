// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCodexVoiceQuote, type CodexVoiceResolution } from './useCodexVoiceQuote';
import type { Character } from '../types';
import { CODEX_VOICE_ARTIFACT_VERSION } from '../../../../audio/voiceArtifacts';

const playback = vi.hoisted(() => ({
  currentTrackId: null as string | null,
  isPlaying: false,
  replace: vi.fn(),
  stop: vi.fn(),
}));

vi.mock('../../../../audio/DevAudioPlayback', () => ({
  useDevAudioPlayback: () => playback,
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const QUOTE = 'The archive remembers what the court forgets.';
const ARTIFACT_URL = 'https://celestialaudio.seihouse.org/voice/v1/'
  + 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.mp3';

const character = (overrides: Partial<Character> = {}): Character => ({
  id: 'character-wen-shu',
  name: 'Wen Shu',
  role: 'Archivist',
  status: 'alive',
  relationshipToMC: 'Ally',
  description: 'Keeper of the sealed record.',
  signatureQuote: QUOTE,
  ...overrides,
} as Character);

const resolution = (): CodexVoiceResolution => ({
  characterId: 'character-wen-shu',
  voiceKey: 'ancient-master-female',
  artifact: {
    publicUrl: ARTIFACT_URL,
    quote: QUOTE,
    voiceKey: 'ancient-master-female',
    model: 'eleven_multilingual_v2',
    artifactVersion: CODEX_VOICE_ARTIFACT_VERSION,
  },
});

interface HarnessProps {
  char: Character;
  requestVoice: (character: Character) => Promise<CodexVoiceResolution>;
  onVoiceResolved?: (value: CodexVoiceResolution) => void;
}

function Harness({ char, requestVoice, onVoiceResolved }: HarnessProps) {
  const { handleQuoteTap, voiceStatus } = useCodexVoiceQuote({ requestVoice, onVoiceResolved });
  const status = voiceStatus(char);
  return (
    <>
      <output data-testid="state">{status.state}</output>
      <output data-testid="message">{status.message ?? ''}</output>
      <button type="button" data-testid="tap" onClick={() => { void handleQuoteTap(char); }}>
        Tap
      </button>
    </>
  );
}

let container: HTMLDivElement;
let root: Root;

const render = (props: HarnessProps) => {
  act(() => root.render(<Harness {...props} />));
};

const tap = () => act(() => {
  (container.querySelector('[data-testid="tap"]') as HTMLButtonElement).click();
});

const state = () => container.querySelector('[data-testid="state"]')!.textContent;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  playback.currentTrackId = null;
  playback.isPlaying = false;
  playback.replace.mockReset();
  playback.stop.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('useCodexVoiceQuote', () => {
  it('offers the interaction before any artifact exists and never generates on render', () => {
    const requestVoice = vi.fn(async () => resolution());
    render({ char: character(), requestVoice });

    expect(state()).toBe('ready');
    expect(requestVoice).not.toHaveBeenCalled();
    expect(playback.replace).not.toHaveBeenCalled();
  });

  it('generates once on the first tap and then plays through the shared audio owner', async () => {
    const requestVoice = vi.fn(async () => resolution());
    const onVoiceResolved = vi.fn();
    render({ char: character(), requestVoice, onVoiceResolved });

    await act(async () => {
      (container.querySelector('[data-testid="tap"]') as HTMLButtonElement).click();
    });

    expect(requestVoice).toHaveBeenCalledTimes(1);
    expect(onVoiceResolved).toHaveBeenCalledWith(resolution());
    expect(playback.replace).toHaveBeenCalledWith(expect.objectContaining({
      id: 'codex-voice:character-wen-shu',
      source: ARTIFACT_URL,
    }));
  });

  it('reuses the stored artifact on later taps without calling the server again', async () => {
    const requestVoice = vi.fn(async () => resolution());
    const stored = character({
      voiceKey: 'ancient-master-female',
      voiceClip: resolution().artifact,
    });
    render({ char: stored, requestVoice });

    await act(async () => {
      (container.querySelector('[data-testid="tap"]') as HTMLButtonElement).click();
    });
    await act(async () => {
      (container.querySelector('[data-testid="tap"]') as HTMLButtonElement).click();
    });

    expect(requestVoice).not.toHaveBeenCalled();
    expect(playback.replace).toHaveBeenCalledTimes(2);
  });

  it('regenerates when the quote or the voice no longer matches the stored artifact', async () => {
    const requestVoice = vi.fn(async () => resolution());
    const changedQuote = character({
      voiceKey: 'ancient-master-female',
      voiceClip: resolution().artifact,
      signatureQuote: 'A seam runs through every oath.',
    });
    render({ char: changedQuote, requestVoice });
    await act(async () => {
      (container.querySelector('[data-testid="tap"]') as HTMLButtonElement).click();
    });
    expect(requestVoice).toHaveBeenCalledTimes(1);

    const changedVoice = character({
      voiceKey: 'merchant-male',
      voiceClip: resolution().artifact,
    });
    render({ char: changedVoice, requestVoice });
    await act(async () => {
      (container.querySelector('[data-testid="tap"]') as HTMLButtonElement).click();
    });
    expect(requestVoice).toHaveBeenCalledTimes(2);
  });

  it('never starts a second generation while the first tap is still running', async () => {
    let release: (value: CodexVoiceResolution) => void = () => {};
    const requestVoice = vi.fn(() => new Promise<CodexVoiceResolution>(resolve => {
      release = resolve;
    }));
    render({ char: character(), requestVoice });

    tap();
    tap();
    tap();
    expect(state()).toBe('generating');
    expect(requestVoice).toHaveBeenCalledTimes(1);

    await act(async () => { release(resolution()); });
    expect(requestVoice).toHaveBeenCalledTimes(1);
    expect(playback.replace).toHaveBeenCalledTimes(1);
  });

  it('stops the current playback instead of overlapping a second track', async () => {
    const stored = character({
      voiceKey: 'ancient-master-female',
      voiceClip: resolution().artifact,
    });
    render({ char: stored, requestVoice: async () => resolution() });

    await act(async () => {
      (container.querySelector('[data-testid="tap"]') as HTMLButtonElement).click();
    });
    // The shared owner now reports this Character as the playing track.
    playback.currentTrackId = 'codex-voice:character-wen-shu';
    playback.isPlaying = true;
    render({ char: stored, requestVoice: async () => resolution() });
    expect(state()).toBe('playing');

    tap();
    expect(playback.stop).toHaveBeenCalledWith('codex-voice:character-wen-shu');
    expect(state()).toBe('stopping');
    expect(playback.replace).toHaveBeenCalledTimes(1);
  });

  it('surfaces a retryable error state and keeps the control tappable', async () => {
    const requestVoice = vi.fn()
      .mockRejectedValueOnce(new Error('The voice service is unavailable.'))
      .mockResolvedValueOnce(resolution());
    render({ char: character(), requestVoice });

    await act(async () => {
      (container.querySelector('[data-testid="tap"]') as HTMLButtonElement).click();
    });
    expect(state()).toBe('error');
    expect(container.querySelector('[data-testid="message"]')!.textContent)
      .toBe('The voice service is unavailable.');

    await act(async () => {
      (container.querySelector('[data-testid="tap"]') as HTMLButtonElement).click();
    });
    expect(state()).toBe('ready');
    expect(playback.replace).toHaveBeenCalledTimes(1);
  });

  it('marks a Character with no signature quote unavailable', () => {
    const requestVoice = vi.fn(async () => resolution());
    render({ char: character({ signatureQuote: undefined }), requestVoice });

    expect(state()).toBe('unavailable');
    tap();
    expect(requestVoice).not.toHaveBeenCalled();
  });
});
