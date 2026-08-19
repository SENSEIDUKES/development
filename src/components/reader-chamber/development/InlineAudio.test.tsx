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
import type { InlineAudioHighlight } from '../../../audio/inlineAudio';
import { installAudioMediaStubs } from '../../../test-utils/renderWithDevAudio';
import { InlineAudio, InlineAudioControl } from './InlineAudio';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const beastHighlight: InlineAudioHighlight = {
  id: 'beast',
  phrase: 'Vermilion Debt Fox',
  action: {
    type: 'sound',
    cueUrl: 'https://celestialaudio.seihouse.org/DEFAULT/Beasts/Growl/Tiger_Growl_1.mp3',
  },
  accentColor: 'var(--color-entity-enemy)',
};

const weaponHighlight: InlineAudioHighlight = {
  id: 'weapon',
  phrase: 'Ashen Sword',
  action: {
    type: 'sound',
    cueUrl: 'https://celestialaudio.seihouse.org/DEFAULT/Weapons/Unsheathe/Sword_Unsheathe_1.mp3',
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
  .find(button => button.textContent === phrase)!;

describe('InlineAudioControl', () => {
  it('is an accessible inline native button and never plays without user activation', () => {
    const { playback } = createFakePlayback();
    render(<p>Before <InlineAudioControl highlight={beastHighlight} playback={playback} /> after.</p>);

    const button = buttonFor(beastHighlight.phrase);
    expect(button.tagName).toBe('BUTTON');
    expect(button.type).toBe('button');
    expect(button.tabIndex).toBe(0);
    expect(button.getAttribute('aria-label')).toBe('Play sound for Vermilion Debt Fox');
    expect(button.hasAttribute('aria-pressed')).toBe(false);
    expect(button.dataset.state).toBe('idle');
    expect(button.style.getPropertyValue('--inline-audio-accent')).toBe('var(--color-entity-enemy)');
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
    render(<InlineAudioControl highlight={beastHighlight} playback={fake.playback} />);
    const button = buttonFor(beastHighlight.phrase);

    act(() => button.click());
    expect(button.dataset.state).toBe('loading');
    expect(button.getAttribute('aria-busy')).toBe('true');

    const trackId = fake.playback.currentTrackId!;
    act(() => fake.emit({ type: 'play', trackId }));
    expect(button.dataset.state).toBe('playing');
    expect(button.hasAttribute('aria-pressed')).toBe(false);

    act(() => fake.emit({ type: 'error', trackId, error: 'Cue network failure' }));
    expect(button.dataset.state).toBe('error');
    expect(container.textContent).toContain('Cue network failure');
  });

  it('replaces a rapidly tapped cue instead of stacking playback', () => {
    const fake = createFakePlayback(true);
    render(
      <p>
        <InlineAudioControl highlight={beastHighlight} playback={fake.playback} /> then{' '}
        <InlineAudioControl highlight={weaponHighlight} playback={fake.playback} />
      </p>,
    );

    const beast = buttonFor(beastHighlight.phrase);
    const weapon = buttonFor(weaponHighlight.phrase);
    act(() => {
      beast.click();
      weapon.click();
    });

    expect(fake.playback.replace).toHaveBeenCalledTimes(2);
    expect(beast.dataset.state).toBe('idle');
    expect(weapon.dataset.state).toBe('playing');
    expect(fake.playback.currentSource).toBe(weaponHighlight.action.type === 'sound'
      ? weaponHighlight.action.cueUrl
      : null);
  });

  it('unsubscribes and stops only its own cue on cleanup', () => {
    const fake = createFakePlayback();
    render(<InlineAudioControl highlight={beastHighlight} playback={fake.playback} />);
    act(() => buttonFor(beastHighlight.phrase).click());
    const trackId = fake.playback.currentTrackId;

    act(() => root.unmount());
    mounted = false;
    expect(fake.unsubscribe).toHaveBeenCalledTimes(1);
    expect(fake.playback.stop).toHaveBeenCalledWith(trackId);
  });

  it('uses the latest committed playback adapter for cleanup', () => {
    const first = createFakePlayback();
    const second = createFakePlayback();
    render(<InlineAudioControl highlight={beastHighlight} playback={first.playback} />);
    act(() => buttonFor(beastHighlight.phrase).click());
    const trackId = first.playback.currentTrackId;

    render(<InlineAudioControl highlight={beastHighlight} playback={second.playback} />);
    act(() => root.unmount());
    mounted = false;

    expect(first.playback.stop).not.toHaveBeenCalled();
    expect(second.playback.stop).toHaveBeenCalledWith(trackId);
  });

  it('reports catalog and future voice failures without using browser speech synthesis', () => {
    const fake = createFakePlayback();
    const speak = vi.fn();
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { speak },
    });
    const missing: InlineAudioHighlight = {
      id: 'missing',
      phrase: 'Missing Cue',
      action: { type: 'sound', cueUrl: 'https://example.com/missing.mp3' },
    };
    const voice: InlineAudioHighlight = {
      id: 'voice',
      phrase: 'Mei Lin',
      action: { type: 'voice', voiceKey: 'ashen-sword-saint', quoteText: 'Stand.' },
    };
    render(
      <p>
        <InlineAudioControl highlight={missing} playback={fake.playback} />{' '}
        <InlineAudioControl highlight={voice} playback={fake.playback} />
      </p>,
    );

    act(() => {
      buttonFor(missing.phrase).click();
      buttonFor(voice.phrase).click();
    });
    expect(buttonFor(missing.phrase).dataset.state).toBe('error');
    expect(buttonFor(voice.phrase).dataset.state).toBe('error');
    expect(fake.playback.replace).not.toHaveBeenCalled();
    expect(speak).not.toHaveBeenCalled();
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
        <InlineAudio highlight={beastHighlight} />
        <InlineAudio highlight={weaponHighlight} />
        <PlaybackProbe />
      </DevAudioPlaybackProvider>,
    );
    expect(container.querySelectorAll('audio')).toHaveLength(1);

    await act(async () => buttonFor(beastHighlight.phrase).click());
    const firstTrack = container.querySelector('[data-testid="track-id"]')?.textContent;
    expect(firstTrack).toContain('Tiger_Growl_1.mp3');

    await act(async () => buttonFor(weaponHighlight.phrase).click());
    const secondTrack = container.querySelector('[data-testid="track-id"]')?.textContent;
    expect(secondTrack).toContain('Sword_Unsheathe_1.mp3');
    expect(secondTrack).not.toBe(firstTrack);
    expect(container.querySelectorAll('audio')).toHaveLength(1);
  });
});
