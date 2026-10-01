// @vitest-environment jsdom
import { LibraryPresentationProvider } from '@seihouse/library/presentation';
import React, { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from '../test-utils/createReaderRoot';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNarrativeAudio, type NarrativeAudioPlayback, type NarrativeAudioPlaybackEvent } from '@seihouse/sen/audio';
import { DevAudioPlaybackProvider } from './DevAudioPlayback';
import { soundCueTrackId, type SoundCueAttachment } from '@seihouse/sen/audio';
import { installAudioMediaStubs } from '../test-utils/renderWithDevAudio';
import { InlineAudio, InlineAudioControl, InlineAudioText } from '@seihouse/sen/inline-audio';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** A Sound Cue on `words` inside `text`, as the HARNESS stores it. */
const soundCue = (
  words: string, sound: string, publicUrl: string,
  { text = words, blockId = 'block-a', catalogId = 'test-cues' }: { text?: string; blockId?: string; catalogId?: string } = {},
): SoundCueAttachment => {
  const start = text.indexOf(words);
  return {
    id: `sound-cue:${blockId}:${start}-${start + words.length}`,
    kind: 'sound-cue',
    anchor: { level: 'span', blockId, startOffset: start, endOffset: start + words.length, selectedText: words },
    payload: { origin: 'harness', sound, cue: { publicUrl, provenance: { catalogId, version: '1' }, category: sound === 'blade drawn' ? 'weapons' : 'beasts' } },
  };
};

const BEAST_URL = 'https://celestialaudio.seihouse.org/DEFAULT/Beasts/Growl/Tiger_Growl_1.mp3';
const WEAPON_URL = 'https://celestialaudio.seihouse.org/DEFAULT/Weapons/Unsheathe/Sword_Unsheathe_1.mp3';
const beastCue = soundCue('Vermilion Debt Fox growled', 'beast growl', BEAST_URL);
const weaponCue = soundCue('drew the Ashen Sword', 'blade drawn', WEAPON_URL);

interface FakePlayback {
  playback: NarrativeAudioPlayback;
  emit: (event: NarrativeAudioPlaybackEvent) => void;
  unsubscribe: ReturnType<typeof vi.fn>;
}

function createFakePlayback(autoPlay = false): FakePlayback {
  const listeners = new Set<(event: NarrativeAudioPlaybackEvent) => void>();
  const unsubscribe = vi.fn();
  const emit = (event: NarrativeAudioPlaybackEvent) => listeners.forEach(listener => listener(event));
  const playback: NarrativeAudioPlayback = {
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
    restart: vi.fn(() => true),
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
  act(() => root.render(<LibraryPresentationProvider>{node}</LibraryPresentationProvider>));
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
    render(<p>Before <InlineAudioControl cue={beastCue} playback={playback} /> after.</p>);

    const button = buttonFor(beastCue.anchor.selectedText);
    expect(button.tagName).toBe('BUTTON');
    expect(button.type).toBe('button');
    expect(button.tabIndex).toBe(0);
    expect(button.getAttribute('aria-label'))
      .toBe('Play beast growl for Vermilion Debt Fox growled');
    expect(button.dataset.soundCueId).toBe(beastCue.id);
    expect(button.dataset.sound).toBe('beast growl');
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
    render(<InlineAudioControl cue={beastCue} playback={fake.playback} />);
    const button = buttonFor(beastCue.anchor.selectedText);

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
        <InlineAudioControl cue={beastCue} playback={fake.playback} /> then{' '}
        <InlineAudioControl cue={weaponCue} playback={fake.playback} />
      </p>,
    );

    const beast = buttonFor(beastCue.anchor.selectedText);
    const weapon = buttonFor(weaponCue.anchor.selectedText);
    act(() => {
      beast.click();
      weapon.click();
    });

    expect(fake.playback.replace).toHaveBeenCalledTimes(2);
    expect(beast.dataset.state).toBe('idle');
    expect(weapon.dataset.state).toBe('playing');
    expect(fake.playback.currentSource).toBe(weaponCue.payload.cue.publicUrl);
  });

  it('keeps separate annotation state when two events resolve to the same cue URL', () => {
    const fake = createFakePlayback(true);
    const secondCue = soundCue('the beast growled', 'beast growl', BEAST_URL, { blockId: 'block-b' });
    render(
      <p>
        <InlineAudioControl cue={beastCue} playback={fake.playback} />
        <InlineAudioControl cue={secondCue} playback={fake.playback} />
      </p>,
    );

    act(() => buttonFor(beastCue.anchor.selectedText).click());
    const firstTrackId = fake.playback.currentTrackId;
    act(() => buttonFor(secondCue.anchor.selectedText).click());
    expect(fake.playback.currentTrackId).not.toBe(firstTrackId);
    expect(buttonFor(beastCue.anchor.selectedText).dataset.state).toBe('idle');
    expect(buttonFor(secondCue.anchor.selectedText).dataset.state).toBe('playing');
  });

  it('clears stale playing UI when a context update already points at another track', () => {
    const first = createFakePlayback();
    first.playback.currentTrackId = soundCueTrackId(beastCue);
    first.playback.isPlaying = true;
    render(<InlineAudioControl cue={beastCue} playback={first.playback} />);
    expect(buttonFor(beastCue.anchor.selectedText).dataset.state).toBe('playing');

    const replacement = createFakePlayback();
    replacement.playback.currentTrackId = soundCueTrackId(weaponCue);
    replacement.playback.isPlaying = true;
    render(<InlineAudioControl cue={beastCue} playback={replacement.playback} />);

    expect(buttonFor(beastCue.anchor.selectedText).dataset.state).toBe('idle');
  });

  it('unsubscribes and stops only its own cue on cleanup', () => {
    const fake = createFakePlayback();
    render(<InlineAudioControl cue={beastCue} playback={fake.playback} />);
    act(() => buttonFor(beastCue.anchor.selectedText).click());
    const trackId = fake.playback.currentTrackId;

    act(() => root.unmount());
    mounted = false;
    expect(fake.unsubscribe).toHaveBeenCalledTimes(1);
    expect(fake.playback.stop).toHaveBeenCalledWith(trackId);
  });

  it('uses the latest committed playback adapter for cleanup', () => {
    const first = createFakePlayback();
    const second = createFakePlayback();
    render(<InlineAudioControl cue={beastCue} playback={first.playback} />);
    act(() => buttonFor(beastCue.anchor.selectedText).click());
    const trackId = first.playback.currentTrackId;

    render(<InlineAudioControl cue={beastCue} playback={second.playback} />);
    act(() => root.unmount());
    mounted = false;

    expect(first.playback.stop).not.toHaveBeenCalled();
    expect(second.playback.stop).toHaveBeenCalledWith(trackId);
  });

  it('renders no glyph and never plays when a persisted cue cannot resolve', () => {
    const fake = createFakePlayback();
    // No provenance: the recording was never approved by a catalog.
    const missing = soundCue('Vermilion Debt Fox growled', 'beast growl', 'https://example.com/missing.mp3', { catalogId: '' });
    render(
      <InlineAudioText
        cues={[missing]}
        text="Vermilion Debt Fox growled."
        renderText={text => text}
      />,
    );

    expect(container.querySelector('[data-library-glyph="sound"]')).toBeNull();
    expect(container.textContent).toBe('Vermilion Debt Fox growled.');
    expect(fake.playback.replace).not.toHaveBeenCalled();
  });

  it('never renders a voice glyph in chapter prose', () => {
    // Character voice belongs to the Reader Codex signature quote. A voice
    // annotation reaching Reader prose is not playable and stays plain text.
    const voiceAnnotation = {
      id: 'dialogue:block-a:0:mei-lin',
      blockId: 'block-a',
      triggerPhrase: '“Stand behind me.”',
      occurrenceIndex: 0,
      sourceCategory: 'voice',
      semanticTags: ['dialogue'],
      relatedEntity: { id: 'mei-lin', name: 'Mei Lin', type: 'character' },
      artifact: { publicUrl: 'https://celestialaudio.seihouse.org/voice/v1/whatever.mp3' },
    } as unknown as SoundCueAttachment;
    render(
      <InlineAudioText
        cues={[voiceAnnotation]}
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
          cues={[soundCue('drew the Ashen Sword', 'blade drawn', WEAPON_URL, { text: 'Mei Lin drew the Ashen Sword, in silence.' })]}
          text="Mei Lin drew the Ashen Sword, in silence."
          renderText={(text) => text === weaponCue.anchor.selectedText
            ? <>drew the <button type="button" aria-label="Open Codex entry for Ashen Sword">Ashen Sword</button></>
            : text}
        />
        <PlaybackProbe />
      </DevAudioPlaybackProvider>,
    );

    const codexButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Open Codex entry for Ashen Sword"]',
    );
    const cueButton = buttonFor(weaponCue.anchor.selectedText);
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
          cues={[soundCue('Vermilion Debt Fox growled', 'beast growl', BEAST_URL, { text: 'A Vermilion Debt Fox growled, then crouched beneath the lintel.' })]}
          text="A Vermilion Debt Fox growled, then crouched beneath the lintel."
          renderText={text => text}
        />
      </DevAudioPlaybackProvider>,
    );

    const cueButton = buttonFor(beastCue.anchor.selectedText);
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
  const playback = useNarrativeAudio();
  return <output data-testid="track-id">{playback.currentTrackId}</output>;
}

describe('InlineAudio shared-session integration', () => {
  it('keeps one package-owned audio element while replacing the active Cue', async () => {
    render(
      <DevAudioPlaybackProvider>
        <InlineAudio cue={beastCue} />
        <InlineAudio cue={weaponCue} />
        <PlaybackProbe />
      </DevAudioPlaybackProvider>,
    );
    expect(container.querySelectorAll('audio')).toHaveLength(1);

    await act(async () => buttonFor(beastCue.anchor.selectedText).click());
    const firstTrack = container.querySelector('[data-testid="track-id"]')?.textContent;
    expect(firstTrack).toContain(beastCue.id);

    await act(async () => buttonFor(weaponCue.anchor.selectedText).click());
    const secondTrack = container.querySelector('[data-testid="track-id"]')?.textContent;
    expect(secondTrack).toContain(weaponCue.id);
    expect(secondTrack).not.toBe(firstTrack);
    expect(container.querySelectorAll('audio')).toHaveLength(1);
  });
});
