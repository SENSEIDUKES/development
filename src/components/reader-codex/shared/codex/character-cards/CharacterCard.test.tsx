// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CharacterCard } from './CharacterCard';
import { CodexProvider } from '../CodexContext';
import type { CodexVoiceQuoteStatus } from '../../hooks/useCodexVoiceQuote';
import type { Character, Story } from '../../types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const character = {
  id: 'character-wen-shu',
  name: 'Wen Shu',
  role: 'Archivist, Sealed Court',
  status: 'alive',
  relationshipToMC: 'Ally',
  description: 'Keeper of the sealed record.',
  signatureQuote: 'The archive remembers what the court forgets.',
} as Character;

/** The card only needs the Codex context its Portrait gallery reads. */
const codexValue = {
  memory: { characters: [character] },
  arcs: [],
  activeStory: { id: 'story-1', currentChapterNumber: 1 },
  mcName: 'Rin',
  onUpdateMemory: vi.fn(),
  updateStoryFields: vi.fn(),
  pushNotification: vi.fn(),
  getPowerRankScore: () => ({ score: 12, title: 'Ordinary' }),
  handleAwakenCardImage: vi.fn(),
  handleRevertImage: vi.fn(),
  previews: {},
  setPreviews: vi.fn(),
  generatingId: null,
  openEntryContextEditor: vi.fn(),
} as unknown as Parameters<typeof CodexProvider>[0]['value'];

let container: HTMLDivElement;
let root: Root;

const render = (
  status: CodexVoiceQuoteStatus,
  onQuoteTap = vi.fn(),
  downloadProps: { canDownloadVoice?: boolean; onDownloadVoice?: () => void } = {},
) => {
  act(() => root.render(
    <CodexProvider value={codexValue}>
      <CharacterCard
        char={character}
        activePreview={undefined}
        activeStory={{ id: 'story-1', currentChapterNumber: 1 } as unknown as Story}
        cScore={{ score: 12 }}
        hasAppeared
        voiceStatus={status}
        isGenerating={false}
        canGenerate
        isFreeUserOnHubStory={false}
        onQuoteTap={onQuoteTap}
        beginCharEdit={vi.fn()}
        handleAwakenCardImage={vi.fn()}
        {...downloadProps}
      />
    </CodexProvider>,
  ));
  return onQuoteTap;
};

const voiceControl = () => (
  container.querySelector<HTMLButtonElement>('button[data-voice-state]')
);

const downloadControl = () => (
  container.querySelector<HTMLButtonElement>('button[aria-label^="Download the voice recording"]')
);

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('Character Portrait card signature-quote voice', () => {
  it('offers the voice control before any artifact exists', () => {
    const onQuoteTap = render({ state: 'ready', canRetry: false });

    const control = voiceControl();
    expect(control).not.toBeNull();
    expect(control!.disabled).toBe(false);
    expect(control!.textContent).toContain('Hear Voice');
    expect(control!.getAttribute('aria-label'))
      .toBe('Hear Wen Shu speak their signature quote');
    expect(container.textContent).toContain('The archive remembers what the court forgets.');

    act(() => control!.click());
    expect(onQuoteTap).toHaveBeenCalledWith(character);
  });

  it('shows a distinct control for every interaction state', () => {
    const expectations: Array<[CodexVoiceQuoteStatus, string, boolean]> = [
      [{ state: 'generating', canRetry: false }, 'Preparing Voice...', true],
      [{ state: 'playing', canRetry: false }, 'Stop Voice', false],
      [{ state: 'stopping', canRetry: false }, 'Stopping...', true],
      [{ state: 'unavailable', canRetry: false }, 'Voice Unavailable', true],
      [
        { state: 'error', message: 'The voice service is unavailable.', canRetry: true },
        'Retry Voice',
        false,
      ],
    ];

    for (const [status, label, disabled] of expectations) {
      render(status);
      const control = voiceControl()!;
      expect(control.dataset.voiceState).toBe(status.state);
      expect(control.textContent).toContain(label);
      expect(control.disabled).toBe(disabled);
    }
  });

  it('shows the reader-safe error message and stays tappable for a retry', () => {
    const onQuoteTap = render({
      state: 'error',
      message: 'The voice service is unavailable.',
      canRetry: true,
    });

    expect(container.textContent).toContain('The voice service is unavailable.');
    act(() => voiceControl()!.click());
    expect(onQuoteTap).toHaveBeenCalledTimes(1);
  });

  it('hides the download control until this session has heard the voice', () => {
    render({ state: 'ready', canRetry: false });
    expect(downloadControl()).toBeNull();
  });

  it('offers a download once audio has been resolved this session', () => {
    const onDownloadVoice = vi.fn();
    render({ state: 'playing', canRetry: false }, vi.fn(), {
      canDownloadVoice: true,
      onDownloadVoice,
    });

    const control = downloadControl();
    expect(control).not.toBeNull();
    act(() => control!.click());
    expect(onDownloadVoice).toHaveBeenCalledTimes(1);
  });
});
