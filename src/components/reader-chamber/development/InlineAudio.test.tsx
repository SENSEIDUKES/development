// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DevAudioPlaybackProvider,
  useDevAudioPlayback,
  type DevAudioPlayback,
  type DevAudioPlaybackEvent,
} from '../../../audio/DevAudioPlayback';
import {
  getInlineCueTrackId,
  type ResolvedAudioMoment,
  type ResolvedDialogueAudioMoment,
} from '../../../audio/inlineAudio';
import { installAudioMediaStubs } from '../../../test-utils/renderWithDevAudio';
import { InlineAudio, InlineAudioControl, InlineAudioText } from './InlineAudio';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const beastMoment: ResolvedAudioMoment = {
  id: 'world-cue:block-a:0:beast-growl',
  blockId: 'block-a',
  triggerPhrase: 'Vermilion Debt Fox growled',
  occurrenceIndex: 0,
  sourceCategory: 'beasts',
  variation: 'growl',
  semanticTags: ['tiger', 'close'],
  relatedEntity: { name: 'Vermilion Debt Fox', type: 'creature' },
  cue: {
    publicUrl: 'https://celestialaudio.seihouse.org/DEFAULT/Beasts/Growl/Tiger_Growl_1.mp3',
  },
};

const weaponMoment: ResolvedAudioMoment = {
  id: 'world-cue:block-a:0:weapon-unsheathe',
  blockId: 'block-a',
  triggerPhrase: 'drew the Ashen Sword',
  occurrenceIndex: 0,
  sourceCategory: 'weapons',
  variation: 'unsheathe',
  semanticTags: ['sword', 'metal'],
  relatedEntity: { name: 'Ashen Sword', type: 'artifact' },
  cue: {
    publicUrl: 'https://celestialaudio.seihouse.org/DEFAULT/Weapons/Unsheathe/Sword_Unsheathe_1.mp3',
  },
};

const dialogueMoment: ResolvedDialogueAudioMoment = {
  id: 'dialogue:block-a:0:mei-lin',
  blockId: 'block-a',
  triggerPhrase: '“Stand behind me.”',
  occurrenceIndex: 0,
  sourceCategory: 'voice',
  actionType: 'spoken-dialogue',
  semanticTags: ['dialogue', 'protective'],
  relatedEntity: { id: 'mei-lin', name: 'Mei Lin', type: 'character' },
  voiceKey: 'character.mei-lin',
  artifact: {
    publicUrl: 'https://celestialaudio.seihouse.org/dialogue/mei-lin/stand-behind-me.mp3',
  },
};

interface FakePlayback {
  playback: DevAudioPlayback;
  emit: (event: DevAudioPlaybackEvent) => void;
  unsubscribe: ReturnType<typeof vi.fn>;
}

function createFakePlayback(autoPlay = false): FakePlayback {
  const listeners = new Set<(event: DevAudioPlaybackEvent) => void>();
  const unsubscribe = vi.fn();
  const emit = (event: DevAudioPlaybackEvent) => listeners.forEach(listener => listener(event));
  const playback: DevAudioPlayback = {
    autoplayBlocked: false,
    currentSource: null,
    currentTrackId: null,
    errorMessage: '',
    hasError: false,
    isBuffering: false,
    isMuted: false,
    isPlaying: false,
    volume: 1,
    load: vi.fn(),
    pause: vi.fn(),
    play: vi.fn(),
    replace: vi.fn((request) => {
      playback.currentTrackId = request.id;
      playback.currentSource = request.source;
      emit({ type: 'track-change', trackId: request.id });
      if (autoPlay) emit({ type: 'play', trackId: request.id });
    }),
    setVolume: vi.fn(),
    stop: vi.fn(),
    subscribe: vi.fn((handler) => {
      listeners.add(handler);
      return () => {
        listeners.delete(handler);
        unsubscribe();
      };
    }),
    subscribeToQueueEnd: vi.fn(() => vi.fn()),
    subscribeToTrackChange: vi.fn(() => vi.fn()),
    toggleMute: vi.fn(),
  };
  return { playback, emit, unsubscribe };
}

let container: HTMLDivElement;
let root: Root;
let mounted: boolean;

beforeEach(() => {
  installAudioMediaStubs();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  mounted = false;
});

afterEach(() => {
  if (mounted) act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

const render = (node: React.ReactNode) => {
  act(() => root.render(node));
  mounted = true;
};

const buttonFor = (phrase: string) => [...container.querySelectorAll<HTMLButtonElement>('button')]
  .find(button => button.dataset.cuePhrase === phrase)!;

const visibleAnnotationText = (annotation: HTMLElement | null | undefined) => (
  annotation?.textContent?.replace(/\u2060/g, '') ?? ''
);

describe('InlineAudioControl', () => {
  it('is an accessible inline native button and never plays without user activation', () => {
    const { playback } = createFakePlayback();
    render(<p>Before <InlineAudioControl moment={beastMoment} playback={playback} /> after.</p>);

    const button = buttonFor(beastMoment.triggerPhrase);
    expect(button.tagName).toBe('BUTTON');
    expect(button.type).toBe('button');
    expect(button.tabIndex).toBe(0);
    expect(button.getAttribute('aria-label'))
      .toBe('Play World Cue for Vermilion Debt Fox growled');
    expect(button.dataset.audioMomentId).toBe(beastMoment.id);
    expect(button.dataset.state).toBe('idle');
    expect(button.textContent).toBe('');
    expect(button.querySelector('[data-library-glyph="sound"]')).toBeTruthy();
    act(() => {
      window.dispatchEvent(new Event('scroll'));
      button.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    });
    expect(playback.replace).not.toHaveBeenCalled();

    act(() => button.focus());
    expect(document.activeElement).toBe(button);
  });

  it('exposes loading, playing, and failure states from the shared playback lifecycle', () => {
    const fake = createFakePlayback();
    render(<InlineAudioControl moment={beastMoment} playback={fake.playback} />);
    const button = buttonFor(beastMoment.triggerPhrase);

    act(() => button.click());
    expect(button.dataset.state).toBe('loading');
    expect(button.getAttribute('aria-busy')).toBe('true');

    const trackId = fake.playback.currentTrackId!;
    act(() => fake.emit({ type: 'play', trackId }));
    expect(button.dataset.state).toBe('playing');

    act(() => fake.emit({ type: 'error', trackId, error: 'Cue network failure' }));
    expect(button.dataset.state).toBe('error');
    expect(container.textContent).toContain('Cue network failure');
  });

  it('replaces a rapidly tapped cue instead of stacking playback', () => {
    const fake = createFakePlayback(true);
    render(
      <p>
        <InlineAudioControl moment={beastMoment} playback={fake.playback} /> then{' '}
        <InlineAudioControl moment={weaponMoment} playback={fake.playback} />
      </p>,
    );

    const beast = buttonFor(beastMoment.triggerPhrase);
    const weapon = buttonFor(weaponMoment.triggerPhrase);
    act(() => {
      beast.click();
      weapon.click();
    });

    expect(fake.playback.replace).toHaveBeenCalledTimes(2);
    expect(beast.dataset.state).toBe('idle');
    expect(weapon.dataset.state).toBe('playing');
    expect(fake.playback.currentSource).toBe(weaponMoment.cue.publicUrl);
  });

  it('keeps separate annotation state when two events resolve to the same cue URL', () => {
    const fake = createFakePlayback(true);
    const secondMoment: ResolvedAudioMoment = {
      ...beastMoment,
      id: 'world-cue:block-b:0:beast-growl',
      blockId: 'block-b',
      triggerPhrase: 'the beast growled',
    };
    render(
      <p>
        <InlineAudioControl moment={beastMoment} playback={fake.playback} />
        <InlineAudioControl moment={secondMoment} playback={fake.playback} />
      </p>,
    );

    act(() => buttonFor(beastMoment.triggerPhrase).click());
    const firstTrackId = fake.playback.currentTrackId;
    act(() => buttonFor(secondMoment.triggerPhrase).click());
    expect(fake.playback.currentTrackId).not.toBe(firstTrackId);
    expect(buttonFor(beastMoment.triggerPhrase).dataset.state).toBe('idle');
    expect(buttonFor(secondMoment.triggerPhrase).dataset.state).toBe('playing');
  });

  it('clears stale playing UI when a context update already points at another track', () => {
    const first = createFakePlayback();
    first.playback.currentTrackId = getInlineCueTrackId(beastMoment);
    first.playback.isPlaying = true;
    render(<InlineAudioControl moment={beastMoment} playback={first.playback} />);
    expect(buttonFor(beastMoment.triggerPhrase).dataset.state).toBe('playing');

    const replacement = createFakePlayback();
    replacement.playback.currentTrackId = getInlineCueTrackId(weaponMoment);
    replacement.playback.isPlaying = true;
    render(<InlineAudioControl moment={beastMoment} playback={replacement.playback} />);

    expect(buttonFor(beastMoment.triggerPhrase).dataset.state).toBe('idle');
  });

  it('unsubscribes and stops only its own cue on cleanup', () => {
    const fake = createFakePlayback();
    render(<InlineAudioControl moment={beastMoment} playback={fake.playback} />);
    act(() => buttonFor(beastMoment.triggerPhrase).click());
    const trackId = fake.playback.currentTrackId;

    act(() => root.unmount());
    mounted = false;
    expect(fake.unsubscribe).toHaveBeenCalledTimes(1);
    expect(fake.playback.stop).toHaveBeenCalledWith(trackId);
  });

  it('uses the latest committed playback adapter for cleanup', () => {
    const first = createFakePlayback();
    const second = createFakePlayback();
    render(<InlineAudioControl moment={beastMoment} playback={first.playback} />);
    act(() => buttonFor(beastMoment.triggerPhrase).click());
    const trackId = first.playback.currentTrackId;

    render(<InlineAudioControl moment={beastMoment} playback={second.playback} />);
    act(() => root.unmount());
    mounted = false;

    expect(first.playback.stop).not.toHaveBeenCalled();
    expect(second.playback.stop).toHaveBeenCalledWith(trackId);
  });

  it('renders no glyph and never plays when a persisted cue cannot resolve', () => {
    const fake = createFakePlayback();
    const missing: ResolvedAudioMoment = {
      ...beastMoment,
      id: 'world-cue:block-a:0:missing',
      cue: { publicUrl: 'https://example.com/missing.mp3' },
    };
    render(
      <InlineAudioText
        moments={[missing]}
        text="Vermilion Debt Fox growled."
        renderText={text => text}
      />,
    );

    expect(container.querySelector('[data-library-glyph="sound"]')).toBeNull();
    expect(container.textContent).toBe('Vermilion Debt Fox growled.');
    expect(fake.playback.replace).not.toHaveBeenCalled();
  });

  it('attaches a provider-neutral dialogue artifact to its exact quote without autoplay or client synthesis', () => {
    const fake = createFakePlayback();
    const speak = vi.fn();
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { speak },
    });
    render(<InlineAudioControl moment={dialogueMoment} playback={fake.playback} />);

    const button = buttonFor(dialogueMoment.triggerPhrase);
    expect(button.getAttribute('aria-label')).toBe('Play dialogue audio for “Stand behind me.”');
    expect(button.dataset.actionType).toBe('spoken-dialogue');
    expect(fake.playback.replace).not.toHaveBeenCalled();
    expect(speak).not.toHaveBeenCalled();

    act(() => button.click());
    expect(fake.playback.replace).toHaveBeenCalledWith(expect.objectContaining({
      id: `reader-inline:${dialogueMoment.id}`,
      source: dialogueMoment.artifact.publicUrl,
    }));
    expect(speak).not.toHaveBeenCalled();
  });

  it('renders no dialogue glyph when no synthesized artifact exists', () => {
    const missingArtifact = {
      ...dialogueMoment,
      artifact: undefined,
    } as unknown as ResolvedAudioMoment;
    render(
      <InlineAudioText
        moments={[missingArtifact]}
        text="Mei Lin said, “Stand behind me.”"
        renderText={text => text}
      />,
    );
    expect(container.querySelector('[data-library-glyph="sound"]')).toBeNull();
    expect(container.textContent).toBe('Mei Lin said, “Stand behind me.”');
  });

  it('keeps Codex text and the sound glyph as independent accessible actions', () => {
    render(
      <DevAudioPlaybackProvider>
        <InlineAudioText
          moments={[weaponMoment]}
          text="Mei Lin drew the Ashen Sword, in silence."
          renderText={(text) => text === weaponMoment.triggerPhrase
            ? <>drew the <button type="button" aria-label="Open Codex entry for Ashen Sword">Ashen Sword</button></>
            : text}
        />
        <PlaybackProbe />
      </DevAudioPlaybackProvider>,
    );

    const codexButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Open Codex entry for Ashen Sword"]',
    );
    const cueButton = buttonFor(weaponMoment.triggerPhrase);
    expect(codexButton).toBeTruthy();
    expect(cueButton).toBeTruthy();
    expect(cueButton).not.toBe(codexButton);
    expect(container.textContent?.replace(/\u2060/g, ''))
      .toContain('Mei Lin drew the Ashen Sword, in silence.');

    const annotation = cueButton.closest<HTMLElement>(
      '[data-cue-annotation="drew the Ashen Sword"]',
    );
    expect(visibleAnnotationText(annotation)).toBe('drew the Ashen Sword,');
    expect(codexButton?.parentElement).toBe(
      annotation?.querySelector('.inline-world-cue-annotation__text'),
    );
    expect(cueButton.parentElement).toBe(annotation);

    act(() => codexButton!.click());
    expect(container.querySelector('[data-testid="track-id"]')?.textContent).toBe('');
  });

  it('leaves sound-only action prose unstyled while binding the phrase, mark, and punctuation', () => {
    render(
      <DevAudioPlaybackProvider>
        <InlineAudioText
          moments={[beastMoment]}
          text="A Vermilion Debt Fox growled, then crouched beneath the lintel."
          renderText={text => text}
        />
      </DevAudioPlaybackProvider>,
    );

    const cueButton = buttonFor(beastMoment.triggerPhrase);
    const annotation = cueButton.closest<HTMLElement>(
      '[data-cue-annotation="Vermilion Debt Fox growled"]',
    );
    expect(visibleAnnotationText(annotation)).toBe('Vermilion Debt Fox growled,');
    expect(annotation?.firstElementChild?.classList)
      .toContain('inline-world-cue-annotation__text');
    expect(annotation?.querySelectorAll('button')).toHaveLength(1);
    expect(annotation?.lastChild?.textContent).toBe(',');
    expect(cueButton.compareDocumentPosition(annotation!.lastChild!))
      .toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(container.textContent?.replace(/\u2060/g, ''))
      .toBe('A Vermilion Debt Fox growled, then crouched beneath the lintel.');
  });
});

function PlaybackProbe() {
  const playback = useDevAudioPlayback();
  return <output data-testid="track-id">{playback.currentTrackId}</output>;
}

describe('InlineAudio shared-session integration', () => {
  it('keeps one package-owned audio element while replacing the active Cue', async () => {
    render(
      <DevAudioPlaybackProvider>
        <InlineAudio moment={beastMoment} />
        <InlineAudio moment={weaponMoment} />
        <PlaybackProbe />
      </DevAudioPlaybackProvider>,
    );
    expect(container.querySelectorAll('audio')).toHaveLength(1);

    await act(async () => buttonFor(beastMoment.triggerPhrase).click());
    const firstTrack = container.querySelector('[data-testid="track-id"]')?.textContent;
    expect(firstTrack).toContain(beastMoment.id);

    await act(async () => buttonFor(weaponMoment.triggerPhrase).click());
    const secondTrack = container.querySelector('[data-testid="track-id"]')?.textContent;
    expect(secondTrack).toContain(weaponMoment.id);
    expect(secondTrack).not.toBe(firstTrack);
    expect(container.querySelectorAll('audio')).toHaveLength(1);
  });
});
