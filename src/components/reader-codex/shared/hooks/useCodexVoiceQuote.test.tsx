// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  audioDataUri,
  codexVoiceIdentity,
  useCodexVoiceQuote,
  type CodexVoiceResolution,
} from './useCodexVoiceQuote';
import type { Character } from '../types';

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
  audio: {
    base64: 'AAAA',
    mimeType: 'audio/mpeg',
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
  it('offers the interaction before any audio has been heard and never generates on render', () => {
    const requestVoice = vi.fn(async () => resolution());
    render({ char: character(), requestVoice });

    expect(state()).toBe('ready');
    expect(requestVoice).not.toHaveBeenCalled();
    expect(playback.replace).not.toHaveBeenCalled();
  });

  it('calls the server on every tap and plays the returned audio through the shared owner', async () => {
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
      source: audioDataUri(resolution().audio),
    }));
  });

  it('calls the server again on a later tap — nothing is stored or reused', async () => {
    const requestVoice = vi.fn(async () => resolution());
    render({ char: character(), requestVoice });

    await act(async () => {
      (container.querySelector('[data-testid="tap"]') as HTMLButtonElement).click();
    });
    await act(async () => {
      (container.querySelector('[data-testid="tap"]') as HTMLButtonElement).click();
    });

    expect(requestVoice).toHaveBeenCalledTimes(2);
    expect(playback.replace).toHaveBeenCalledTimes(2);
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
    const requestVoice = async () => resolution();
    render({ char: character(), requestVoice });

    await act(async () => {
      (container.querySelector('[data-testid="tap"]') as HTMLButtonElement).click();
    });
    // The shared owner now reports this Character as the playing track.
    playback.currentTrackId = 'codex-voice:character-wen-shu';
    playback.isPlaying = true;
    render({ char: character(), requestVoice });
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

  it('sends the stored Codex identity the server needs, and nothing it must own', () => {
    const identity = codexVoiceIdentity(character({
      voiceKey: 'ancient-master-female',
      portraitKind: 'human',
    }));

    // Without the persisted quote the server cannot resolve anything.
    expect(identity).toMatchObject({
      id: 'character-wen-shu',
      name: 'Wen Shu',
      signatureQuote: QUOTE,
      voiceKey: 'ancient-master-female',
    });
    // The client never proposes the audio itself.
    for (const forbidden of ['text', 'quote', 'model', 'voice_id', 'audio', 'base64']) {
      expect(identity).not.toHaveProperty(forbidden);
    }
  });

  it('marks a Character with no signature quote unavailable', () => {
    const requestVoice = vi.fn(async () => resolution());
    render({ char: character({ signatureQuote: undefined }), requestVoice });

    expect(state()).toBe('unavailable');
    tap();
    expect(requestVoice).not.toHaveBeenCalled();
  });
});
