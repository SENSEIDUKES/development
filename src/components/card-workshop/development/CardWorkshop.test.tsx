// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CardWorkshopView } from './CardWorkshopView';
import { createCardWorkshopContextualFixture } from './CardWorkshopContextualReader';
import { getReaderChamberSurfaceClass } from '../../reader-chamber/development/ReaderChamber';
import { CardWorkshopWorkspace } from '../../../workshop/previews/card-workshop/CardWorkshopWorkspace';
import { ACTIVE_CARD_PRESETS } from '../../../workshop/previews/card-workshop/previewData';
import { INITIAL_CARD_WORKSHOP_OVERRIDES } from '../../../workshop/previews/card-workshop/previewStates';
import { resetMockState } from '../../reader-chamber/shared/stubs';
import type { WorldCardEvent } from '../../reader-chamber/shared/types';
import { installAudioMediaStubs, renderWithDevAudio } from '../../../test-utils/renderWithDevAudio';
import {
  CARD_WORKSHOP_FALLBACK_PLAYBACK_MS,
  createCardWorkshopAudioAdapter,
  type DevAudioPlayerBridge,
} from '../shared/cardWorkshopAudioAdapter';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

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

const openTechnicalDetails = async () => {
  const details = container.querySelector<HTMLDetailsElement>('details');
  expect(details, 'Expected Technical Details to render').toBeTruthy();
  await act(async () => {
    details!.open = true;
  });
  expect(details!.open).toBe(true);
};

const audioCard = {
  entityType: 'creature',
  entityName: 'Test Echo',
  displayTitle: 'Test Echo',
  audioType: 'hiss',
  sound: { assetId: 'test-echo' },
} satisfies WorldCardEvent;

const createPlayer = (): DevAudioPlayerBridge => ({
  currentTrackId: null,
  isPlaying: false,
  play: vi.fn(),
  stop: vi.fn(),
  subscribeToTrackChange: vi.fn(),
  subscribeToQueueEnd: vi.fn(),
});

class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

beforeEach(() => {
  resetMockState();
  globalThis.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
  installAudioMediaStubs();
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
    expect(container.textContent).not.toContain('Technical Details');

    await clickButton('Development');
    expect(container.textContent).toContain('Development Only');
    expect(getButton('Card Type Tabs')).toBeTruthy();
    expect(getButton('Contextual View')).toBeTruthy();
  });
});

describe('CardWorkshopView', () => {
  it('keeps the accessible Card Type Tabs gallery and mounts only the selected presentation', async () => {
    act(() => root.render(renderWithDevAudio(<CardWorkshopView initialMode="tabs" />)));

    const tablist = container.querySelector('[role="tablist"][aria-label="Card types"]');
    const tabs = [...container.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    expect(tablist).toBeTruthy();
    expect(tabs).toHaveLength(ACTIVE_CARD_PRESETS.length);
    expect(container.querySelectorAll('[role="tabpanel"]')).toHaveLength(1);

    for (const preset of ACTIVE_CARD_PRESETS) {
      expect(tabs.some(tab => tab.textContent?.includes(preset.title))).toBe(true);
    }

    expect(container.textContent).toContain('Codex Cards');
    expect(container.querySelector('[role="tabpanel"]')?.textContent).toContain('Human Portrait');
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');

    await act(async () => {
      tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    });
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    expect(container.querySelector('[role="tabpanel"]')?.textContent).toContain('Non-Human Portrait');
    expect(document.activeElement).toBe(tabs[1]);

    await clickButton('Highlighted Bestiary Species');
    expect(container.textContent).toContain('World Cards');
    expect(container.textContent).toContain('Apex Abyss Beast');
    expect(container.querySelector('[role="tabpanel"]')?.textContent).not.toContain('Human Portrait');
    expect(container.querySelectorAll('[role="tabpanel"]')).toHaveLength(1);
  });

  it('switches between Card Type Tabs and Contextual View without losing the selected preset or override state', async () => {
    act(() => root.render(renderWithDevAudio(<CardWorkshopView initialMode="tabs" />)));

    await clickButton('Fate Result Card');
    await clickButton('Contextual View');
    expect(container.querySelector('[data-testid="card-workshop-contextual-reader"]')).toBeTruthy();
    expect(container.textContent).toContain('FATE RESULT: FATE SCARRED');

    await openTechnicalDetails();
    await selectByLabel('Fate outcome', 'DOOM MANIFESTED');
    expect(container.textContent).toContain('FATE RESULT: DOOM MANIFESTED');

    await clickButton('Card Type Tabs');
    const selectedTab = container.querySelector<HTMLButtonElement>('#card-tab-preset-fate-result');
    expect(selectedTab?.getAttribute('aria-selected')).toBe('true');
    expect(container.textContent).toContain('FATE RESULT: DOOM MANIFESTED');

    await clickButton('Contextual View');
    expect(container.textContent).toContain('FATE RESULT: DOOM MANIFESTED');
  });

  it('uses the real ReaderViewport path with highlighted prose before and after the selected Codex card', () => {
    act(() => root.render(renderWithDevAudio(<CardWorkshopView initialMode="contextual" />)));

    const reader = container.querySelector<HTMLElement>('[data-testid="card-workshop-contextual-reader"]');
    expect(reader).toBeTruthy();
    const readerRoot = reader?.querySelector<HTMLElement>('#reader-chamber-root');
    expect(readerRoot).toBeTruthy();
    expect(readerRoot?.className).toBe(getReaderChamberSurfaceClass('void'));
    expect(reader?.querySelector('.reader-prose')).toBeTruthy();
    expect(reader?.textContent).toContain('Ashes of the Ninth Meridian • Chapter 1');
    expect(reader?.textContent).toContain('Rain threaded down the bronze eaves');
    expect(reader?.textContent).toContain('Then the thunder moved on');

    const highlightedMention = [...(reader?.querySelectorAll<HTMLElement>('[role="button"]') ?? [])]
      .find(element => element.textContent === 'Aster');
    expect(highlightedMention).toBeTruthy();

    const cardTitle = [...(reader?.querySelectorAll('h4') ?? [])]
      .find(element => element.textContent === 'Rin');
    const beforeCard = reader?.querySelector('#para-1');
    const afterCard = reader?.querySelector('#para-3');
    expect(cardTitle).toBeTruthy();
    expect(beforeCard).toBeTruthy();
    expect(afterCard).toBeTruthy();
    expect(beforeCard!.compareDocumentPosition(cardTitle!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(cardTitle!.compareDocumentPosition(afterCard!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('renders the selected World Card and System Panel inside the same deterministic Reader fixture', async () => {
    act(() => root.render(renderWithDevAudio(<CardWorkshopView initialMode="contextual" />)));
    await openTechnicalDetails();

    await selectByLabel('Card preset', 'preset-creature-species');
    const reader = container.querySelector<HTMLElement>('[data-testid="card-workshop-contextual-reader"]');
    expect(reader?.textContent).toContain('Apex Abyss Beast');
    expect(reader?.textContent).toContain('Then the thunder moved on');

    await selectByLabel('Card preset', 'preset-system-status');
    expect(reader?.textContent).toContain('Meridian Status & Vitality Flow');
    expect(reader?.textContent).toContain('Then the thunder moved on');
  });

  it('keeps image, Manifest/Awaken, Codex, entity-mention, portrait, audio, and mute overrides active in Contextual View', async () => {
    vi.useFakeTimers();
    act(() => root.render(
      renderWithDevAudio(
        <CardWorkshopView initialMode="contextual" initialPresetId="preset-nonhuman-individual" />,
      ),
    ));
    await openTechnicalDetails();

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

    await selectByLabel('Codex entry state', 'missing');
    expect(getButton('Manifest portrait for Lei')).toBeFalsy();
    await selectByLabel('Codex entry state', 'present');
    await selectByLabel('Entity mention state', 'reference');
    expect(getButton('Manifest portrait for Lei')).toBeFalsy();
    await selectByLabel('Entity mention state', 'reveal');
    expect(getButton('Manifest portrait for Lei')).toBeTruthy();
    await selectByLabel('Image state', 'existing');
    await selectByLabel('Portrait kind', 'human');
    expect(container.querySelector('img[alt="Lei"]')?.getAttribute('src'))
      .toBe('/card-workshop/test-images/ye_chen_portrait.png');

    await selectByLabel('Card preset', 'preset-creature-species');
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
  });

  it('preserves the device-size controls for the contextual Reader preview', async () => {
    act(() => root.render(renderWithDevAudio(<CardWorkshopView initialMode="contextual" />)));

    const contextualStage = () => container.querySelector<HTMLElement>(
      '[data-testid="card-workshop-contextual-reader"]',
    )?.parentElement;

    await clickButton('Mobile Viewport');
    expect(contextualStage()?.className).toContain('max-w-[375px]');
    await clickButton('Tablet Viewport');
    expect(contextualStage()?.className).toContain('max-w-[768px]');
    await clickButton('Desktop Viewport');
    expect(contextualStage()?.className).toContain('max-w-4xl');
  });

  it('uses only local fixture data and performs no model, API, or persistence activity', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Unexpected request'));
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem');
    const humanPreset = ACTIVE_CARD_PRESETS.find(preset => preset.id === 'preset-human-character')!;
    const fixture = createCardWorkshopContextualFixture(
      humanPreset,
      INITIAL_CARD_WORKSHOP_OVERRIDES,
      new Set(),
    );

    expect(fixture.activeStory.assignedRevealBackdrops?.['codex-char-rin'])
      .toBe('/card-workshop/reveal-backdrop.svg');
    expect(fixture.chapter.blocks?.map(block => block.id)).toEqual([
      'card-workshop-context-opening',
      'card-workshop-context-mention',
      'card-workshop-context-card',
      'card-workshop-context-aftermath',
    ]);

    act(() => root.render(renderWithDevAudio(<CardWorkshopView initialMode="contextual" />)));
    await openTechnicalDetails();
    await selectByLabel('Card preset', 'preset-random-beast');
    await clickButton('Card Type Tabs');
    await clickButton('Contextual View');

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
    expect(container.querySelector('[data-testid="card-workshop-contextual-reader"] img[src^="http"]')).toBeFalsy();
  });

  it('dispatches the real @seihouse/audio-player session when a contextual World Card is tapped', async () => {
    vi.useFakeTimers();
    const playSpy = vi
      .spyOn(HTMLMediaElement.prototype, 'play')
      .mockResolvedValue(undefined);

    act(() => root.render(
      renderWithDevAudio(
        <CardWorkshopView initialMode="contextual" initialPresetId="preset-creature-species" />,
      ),
    ));

    await clickButton('Tap to Listen');
    await act(async () => {
      vi.advanceTimersByTime(50);
    });
    expect(playSpy).toHaveBeenCalled();
  });
});

describe('createCardWorkshopAudioAdapter', () => {
  it('uses the shared player lifecycle, ignores replacement-track completion, and stops active Workshop audio during cleanup', async () => {
    vi.useFakeTimers();
    const player = createPlayer();
    const adapter = createCardWorkshopAudioAdapter({
      state: 'available',
      muted: false,
      resolveSource: () => 'https://example.com/test-echo.mp3',
      player,
    });
    const asset = adapter.resolve(audioCard)!;
    const playback = await adapter.play(asset);
    const ended = vi.fn();
    playback.onended = ended;

    expect(player.play).toHaveBeenCalledWith(expect.objectContaining({ id: asset.id }));
    const queueEnded = vi.mocked(player.subscribeToQueueEnd).mock.calls[0][0];
    queueEnded();
    expect(ended).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(CARD_WORKSHOP_FALLBACK_PLAYBACK_MS);
    });
    expect(ended).toHaveBeenCalledTimes(1);

    const replacementPlayback = await adapter.play(asset);
    replacementPlayback.onended = ended;
    const trackChanged = vi.mocked(player.subscribeToTrackChange).mock.calls[1][0];
    const replacementQueueEnded = vi.mocked(player.subscribeToQueueEnd).mock.calls[1][0];
    trackChanged('story-seed-help');
    replacementQueueEnded();
    expect(ended).toHaveBeenCalledTimes(1);

    await adapter.play(asset);
    adapter.dispose();
    expect(player.stop).toHaveBeenCalledWith(asset.id);
  });

  it('retains the deterministic timer ending when no shared player is supplied', async () => {
    vi.useFakeTimers();
    const adapter = createCardWorkshopAudioAdapter({
      state: 'available',
      muted: false,
      resolveSource: () => null,
      player: null,
    });
    const playback = await adapter.play(adapter.resolve(audioCard)!);
    const ended = vi.fn();
    playback.onended = ended;

    await act(async () => {
      vi.advanceTimersByTime(899);
    });
    expect(ended).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(ended).toHaveBeenCalledTimes(1);
  });
});
