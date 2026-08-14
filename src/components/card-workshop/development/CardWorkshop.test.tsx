// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CardWorkshopView } from './CardWorkshopView';
import { CardWorkshopWorkspace } from '../../../workshop/previews/card-workshop/CardWorkshopWorkspace';
import { CARD_PRESETS } from '../../../workshop/previews/card-workshop/previewData';
import { resetMockState } from '../../reader-chamber/shared/stubs';
import { DevAudioPlaybackProvider } from '../../../audio/DevAudioPlayback';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

const renderWithDevAudio = (node: ReactNode) => (
  <DevAudioPlaybackProvider>{node}</DevAudioPlaybackProvider>
);

const buttons = () => [...container.querySelectorAll<HTMLButtonElement>('button')];

const getButton = (label: string) => (
  buttons().find(candidate => (
    candidate.getAttribute('aria-label') === label
    || candidate.getAttribute('title')?.includes(label)
    || candidate.textContent?.trim() === label
  )) ?? buttons().find(candidate => candidate.textContent?.includes(label))
);

const clickButton = async (label: string) => {
  const target = getButton(label);
  expect(target, `Expected button "${label}" to render`).toBeTruthy();
  await act(async () => {
    target!.click();
  });
};

const selectByLabel = async (label: string, value: string) => {
  const target = container.querySelector<HTMLSelectElement>(`select[aria-label="${label}"]`);
  expect(target, `Expected select "${label}" to render`).toBeTruthy();
  await act(async () => {
    target!.value = value;
    target!.dispatchEvent(new Event('change', { bubbles: true }));
  });
};

class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

// The DEV shared audio player is wrapped around every render now that the
// Card Workshop adapter routes through `useDevAudioPlayback`. JSDOM exposes
// `HTMLMediaElement.play` / `pause` / `load` as no-op stubs that return
// `undefined`, so the package would otherwise see an undefined promise and
// crash on `.then(...)`. Force the methods to return a resolved promise
// (or undefined for the synchronous stoppers) so the package's lifecycle
// hooks can run.
const installMediaElementStubs = () => {
  Object.defineProperty(HTMLMediaElement.prototype, 'play', {
    configurable: true,
    value: () => Promise.resolve(),
  });
  Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
    configurable: true,
    value: () => undefined,
  });
  Object.defineProperty(HTMLMediaElement.prototype, 'load', {
    configurable: true,
    value: () => undefined,
  });
};

beforeEach(() => {
  resetMockState();
  globalThis.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
  installMediaElementStubs();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

describe('CardWorkshopWorkspace', () => {
  it('opens through the shared Workshop shell with independent Reference and Development panes', async () => {
    act(() => root.render(renderWithDevAudio(<CardWorkshopWorkspace />)));

    expect(container.textContent).toContain('Card Workshop');
    expect(container.textContent).toContain('Reader Card Workshop');
    expect(getButton('Original Reference')).toBeTruthy();
    expect(getButton('Development')).toBeTruthy();
    expect(getButton('Compare')).toBeTruthy();

    await clickButton('Original Reference');
    expect(container.textContent).toContain('Locked production baseline');
    expect(container.textContent).not.toContain('Interactive Overrides');

    await clickButton('Development');
    expect(container.textContent).toContain('Development Only');
  });
});

describe('CardWorkshopView', () => {
  it('gives every card type its own tab and mounts only the selected presentation', async () => {
    act(() => root.render(renderWithDevAudio(<CardWorkshopView initialMode="overview" />)));

    const tablist = container.querySelector('[role="tablist"][aria-label="Card types"]');
    const tabs = [...container.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    expect(tablist).toBeTruthy();
    expect(tabs).toHaveLength(CARD_PRESETS.length);
    expect(container.querySelectorAll('[role="tabpanel"]')).toHaveLength(1);

    for (const preset of CARD_PRESETS) {
      expect(tabs.some(tab => tab.textContent?.includes(
        preset.title.replace('Routing Under Review: ', ''),
      ))).toBe(true);
    }

    expect(container.textContent).toContain('World Entity Cards');
    expect(container.textContent).toContain('First Witness of the Broken Oath');
    expect(container.textContent).not.toContain('Reveal · Companion');
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');

    await act(async () => {
      tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    });
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    expect(container.textContent).toContain('Young Storm Sovereign');
    expect(document.activeElement).toBe(tabs[1]);

    await clickButton('Non-Human Portrait Reveal');
    expect(container.textContent).toContain('Codex Reveal Moments');
    expect(container.textContent).toContain('Reveal · Companion');
    expect(container.textContent).not.toContain('First Witness of the Broken Oath');
    expect(container.querySelectorAll('[role="tabpanel"]')).toHaveLength(1);

    await clickButton('Fate Result Card');
    expect(container.textContent).toContain('System Panels & Fate Outcomes');
    expect(container.textContent).toContain('FATE RESULT: FATE SCARRED');
    expect(container.textContent).not.toContain('Reveal · Companion');

    await clickButton('Manifestation Image');
    expect(container.textContent).toContain('Chapter-Level Visual Memories');
    expect(container.querySelector('img[alt="Chapter Crux Manifestation"]')).toBeTruthy();
    expect(container.textContent).not.toContain('FATE RESULT: FATE SCARRED');

    await clickButton('System as World Card');
    expect(container.textContent).toContain('CURRENT ROUTING UNDER REVIEW');
    expect(container.querySelectorAll('[role="tabpanel"]')).toHaveLength(1);
  });

  it('switches presets and preserves the Bestiary species versus Non-Human Portrait distinction', async () => {
    act(() => root.render(renderWithDevAudio(<CardWorkshopView initialMode="inspection" />)));

    await selectByLabel('Card preset', 'preset-nonhuman-portrait-reveal');
    expect(container.textContent).toContain('ReaderCodex > Portraits (Non-Human Section)');
    expect(container.textContent).toContain('Non-Human Portrait Reveal');

    await selectByLabel('Creature scope', 'species');
    expect(container.textContent).toContain('ReaderCodex > Bestiary');
    expect(container.textContent).toContain('Generic Creature Species');

    const species = CARD_PRESETS.find(preset => preset.id === 'preset-creature-species')!;
    const individual = CARD_PRESETS.find(preset => preset.id === 'preset-nonhuman-portrait-reveal')!;
    expect(species.explanation.capabilities.hasManifestAction).toBe(false);
    expect(species.explanation.capabilities.hasAudio).toBe(false);
    expect(individual.explanation.capabilities.hasManifestAction).toBe(true);
  });

  it('covers existing image, Manifest/Awaken, and missing-image states', async () => {
    vi.useFakeTimers();
    act(() => root.render(
      renderWithDevAudio(
        <CardWorkshopView
          initialMode="inspection"
          initialPresetId="preset-nonhuman-portrait-reveal"
        />,
      ),
    ));

    expect(container.querySelector('img[alt="Lei"]')).toBeTruthy();

    await selectByLabel('Image state', 'manifest');
    expect(getButton('Manifest portrait for Lei')).toBeTruthy();
    await clickButton('Manifest portrait for Lei');
    expect(container.textContent).toContain('Summoning...');
    await clickButton('Reset Local Awaken State');
    await act(async () => {
      vi.advanceTimersByTime(1200);
    });
    expect(getButton('Manifest portrait for Lei')).toBeTruthy();
    expect(container.querySelector('img[alt="Lei"]')).toBeFalsy();

    await selectByLabel('Image state', 'missing');
    expect(getButton('Manifest portrait for Lei')).toBeFalsy();
    expect(container.querySelector('img[alt="Backdrop"]')?.getAttribute('src'))
      .toBe('/card-workshop/reveal-backdrop.svg');
  });

  it('covers Codex present/missing and first-reveal/existing-reference behavior', async () => {
    act(() => root.render(
      renderWithDevAudio(
        <CardWorkshopView
          initialMode="inspection"
          initialPresetId="preset-nonhuman-portrait-reveal"
        />,
      ),
    ));

    await selectByLabel('Codex entry state', 'missing');
    expect(container.textContent).toContain('No Codex entry resolved');

    await selectByLabel('Codex entry state', 'present');
    await selectByLabel('Entity mention state', 'reference');
    expect(container.textContent).toContain('Existing entity reference');

    await selectByLabel('Entity mention state', 'reveal');
    expect(container.textContent).toContain('Reveal · Companion');

    await selectByLabel('Portrait kind', 'human');
    expect(container.querySelector('img[alt="Lei"]')?.getAttribute('src'))
      .toBe('/card-workshop/human-portrait.svg');
    await selectByLabel('Image state', 'manifest');
    expect(getButton('Manifest portrait for Lei')).toBeTruthy();
  });

  it('simulates audio available, unavailable, loading, playing, and muted without media playback', async () => {
    vi.useFakeTimers();
    act(() => root.render(
      renderWithDevAudio(
        <CardWorkshopView initialMode="inspection" initialPresetId="preset-human-character" />,
      ),
    ));

    expect(container.textContent).toContain('Tap to Listen');

    await selectByLabel('Audio state', 'unavailable');
    expect(container.textContent).toContain('Echo Unavailable');

    await selectByLabel('Audio state', 'loading');
    await clickButton('Tap to Listen');
    expect(container.textContent).toContain('Channeling...');

    await selectByLabel('Audio state', 'playing');
    await clickButton('Tap to Listen');
    expect(container.textContent).toContain('Resonating...');

    await clickButton('Simulate Audio Mute');
    expect(container.textContent).toContain('Mute: On');
    vi.useRealTimers();
  });

  it('changes SystemBlock kinds and renders FateResultCard only through SystemBlock', async () => {
    act(() => root.render(
      renderWithDevAudio(
        <CardWorkshopView initialMode="inspection" initialPresetId="preset-system-status" />,
      ),
    ));

    await selectByLabel('System panel kind', 'skill_acquired');
    expect(container.textContent).toContain('Meridian Status & Vitality Flow');

    await selectByLabel('Card preset', 'preset-fate-result');
    expect(container.textContent).toContain('FATE RESULT: FATE SCARRED');
    await selectByLabel('Fate outcome', 'DOOM MANIFESTED');
    expect(container.textContent).toContain('FATE RESULT: DOOM MANIFESTED');
  });

  it('switches mobile, tablet, and desktop preview widths', async () => {
    act(() => root.render(renderWithDevAudio(<CardWorkshopView initialMode="inspection" />)));

    await clickButton('Mobile Viewport');
    expect(container.querySelector('[class~="max-w-[375px]"]')).toBeTruthy();
    await clickButton('Tablet Viewport');
    expect(container.querySelector('[class~="max-w-[768px]"]')).toBeTruthy();
    await clickButton('Desktop Viewport');
    expect(container.querySelector('.max-w-4xl')).toBeTruthy();
  });

  it('uses local fixtures and causes no model, API, story-write, or persistence side effects', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Unexpected request'));
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem');

    act(() => root.render(renderWithDevAudio(<CardWorkshopView initialMode="overview" />)));
    await clickButton('Inspection Mode');
    await selectByLabel('Card preset', 'preset-manifestation-image');

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
    expect(container.querySelector('img[src^="http"]')).toBeFalsy();
  });

  it('dispatches the real @seihouse/audio-player session when the human character is tapped', async () => {
    vi.useFakeTimers();

    // Spy on the underlying HTMLMediaElement play() to observe that the
    // shared audio session was actually asked to start the resolved track.
    const playSpy = vi
      .spyOn(HTMLMediaElement.prototype, 'play')
      .mockResolvedValue(undefined);

    act(() => root.render(
      renderWithDevAudio(
        <CardWorkshopView initialMode="inspection" initialPresetId="preset-human-character" />,
      ),
    ));

    await clickButton('Tap to Listen');

    await act(async () => {
      vi.advanceTimersByTime(50);
    });

    expect(playSpy).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
