// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CardWorkshopView } from './CardWorkshopView';
import { createCardWorkshopContextualFixture } from './CardWorkshopContextualReader';
import { getManifestBackdrop } from '@seihouse/sen/codex-cards';
import { getReaderChamberSurfaceClass, SystemBlock } from '@seihouse/sen/reader-chamber';
import { CardWorkshopWorkspace } from '../../../workshop/previews/card-workshop/CardWorkshopWorkspace';
import { ACTIVE_CARD_PRESETS } from '../../../workshop/previews/card-workshop/previewData';
import { INITIAL_CARD_WORKSHOP_OVERRIDES } from '../../../workshop/previews/card-workshop/previewStates';
import { resetMockState } from '../../reader-chamber/shared/stubs';
import { installAudioMediaStubs, renderWithDevAudio } from '../../../test-utils/renderWithDevAudio';

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

    await clickButton('System Prompt');
    expect(container.textContent).toContain('System Panels & Fate Outcomes');
    // Default compact event: the cultivation breakthrough — SYSTEM kicker,
    // dramatic headline, serif prose, and the signed consequence row.
    const compactBlock = container.querySelector('.system-block');
    expect(compactBlock?.textContent).toContain('Mortal Tribulation Surpassed');
    expect(compactBlock?.textContent).toContain('Yun Che has successfully broken through into the Foundation Establishment realm.');
    expect(compactBlock?.textContent).toContain('+ Stage 4');
    expect(compactBlock?.textContent).toContain('+ 100 Lifespan');
    expect(compactBlock?.textContent).toContain('− Easier to Detect');
    // The serif prose paragraph stays the only narration text: it carries the
    // sentence alone — never the headline or the consequence row.
    expect(compactBlock?.querySelector('p')?.textContent)
      .toBe('Yun Che has successfully broken through into the Foundation Establishment realm.');
    // Compact prompts keep the semantic System color system (breakthrough → gold).
    expect(compactBlock?.className).toContain('border-amber-400/50');
    expect(compactBlock?.className).toContain('text-amber-400');
    expect(container.querySelector('[role="tabpanel"]')?.textContent).not.toContain('Human Portrait');
    expect(container.querySelectorAll('[role="tabpanel"]')).toHaveLength(1);

    // Switch between the mocked Wuxia events — the same data-driven compact
    // card renders each without per-event branches.
    await clickButton('Broken Promise');
    const promiseBlock = container.querySelector('.system-block');
    expect(promiseBlock?.textContent).toContain('Oath Before the Rain Court Broken');
    expect(promiseBlock?.textContent).toContain("The Magistrate's sworn promise to the Riverside Sect lies broken.");
    expect(promiseBlock?.textContent).toContain('− Reputation');
    expect(promiseBlock?.textContent).toContain('+ Sect Enmity');

    await clickButton('Target Scan');
    const scanBlock = container.querySelector('.system-block');
    expect(scanBlock?.textContent).toContain('Hostile Target Scan Complete');
    expect(scanBlock?.textContent).toContain('Elder Kaelen — Foundation Establishment, Stage 7. Threat assessment: moderate.');
    expect(scanBlock?.textContent).toContain('+ Intel');
    expect(scanBlock?.textContent).toContain('+ Weakness');
    expect(scanBlock?.textContent).toContain('− Exposed');

    // Toggle to structured mechanical example
    await clickButton('Structured Mechanical');
    expect(container.textContent).toContain('Meridian Status & Vitality Flow');
  });

  it('caps the compact System Prompt consequence row at four prioritized changes', () => {
    act(() => root.render(renderWithDevAudio(
      <SystemBlock
        content="[ Yun Che has successfully broken through into the Foundation Establishment realm. ]"
        system={{
          kind: 'system_prompt',
          promptType: 'breakthrough',
          title: 'Mortal Tribulation Surpassed',
          changes: [
            { direction: 'gain', label: 'Stage 4' },
            { direction: 'gain', label: '100 Lifespan' },
            { direction: 'loss', label: 'Easier to Detect' },
            { direction: 'gain', label: 'Dao Heart Tempered' },
            { direction: 'loss', label: 'Fifth Consequence' },
          ],
        }}
      />,
    )));

    const compactBlock = container.querySelector('.system-block');
    expect(compactBlock?.textContent).toContain('Mortal Tribulation Surpassed');
    expect(compactBlock?.textContent).toContain('+ Dao Heart Tempered');
    expect(compactBlock?.textContent).not.toContain('Fifth Consequence');
  });

  it('switches between Card Type Tabs and Contextual View without losing the selected preset or override state', async () => {
    act(() => root.render(renderWithDevAudio(<CardWorkshopView initialMode="tabs" />)));

    await clickButton('Fate System Prompt');
    await clickButton('Contextual View');
    expect(container.querySelector('[data-testid="card-workshop-contextual-reader"]')).toBeTruthy();
    expect(container.textContent).toContain('FATE RESULT: FATE SCARRED');

    await openTechnicalDetails();
    await selectByLabel('Fate outcome', 'DOOM MANIFESTED');
    expect(container.textContent).toContain('FATE RESULT: DOOM MANIFESTED');

    await clickButton('Card Type Tabs');
    const selectedTab = container.querySelector<HTMLButtonElement>('#card-tab-preset-fate-system-prompt');
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
    const rainCourtCodexAction = [...(reader?.querySelectorAll<HTMLElement>('[role="button"]') ?? [])]
      .find(element => element.textContent === 'Rain Court');
    const rainCourtCueAction = reader?.querySelector<HTMLButtonElement>(
      'button[aria-label="Play World Cue for The Rain Court bell tolled once"]',
    );
    expect(rainCourtCodexAction).toBeTruthy();
    expect(rainCourtCueAction).toBeTruthy();
    expect(rainCourtCueAction).not.toBe(rainCourtCodexAction);
    expect(rainCourtCueAction?.closest('[data-cue-annotation="The Rain Court bell tolled once"]')?.textContent
      ?.replace(/\u2060/g, ''))
      .toBe('The Rain Court bell tolled once');

    const foxCueAction = reader?.querySelector<HTMLButtonElement>(
      'button[aria-label="Play World Cue for a Vermilion Debt Fox growled"]',
    );
    const foxCodexAction = [...(reader?.querySelectorAll<HTMLElement>('[role="button"]') ?? [])]
      .find(element => element.textContent === 'Vermilion Debt Fox');
    expect(foxCueAction).toBeTruthy();
    expect(foxCodexAction).toBeFalsy();
    expect(foxCueAction?.closest('[data-cue-annotation="a Vermilion Debt Fox growled"]')?.textContent
      ?.replace(/\u2060/g, ''))
      .toBe('a Vermilion Debt Fox growled');

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

  it('renders the selected System Panel inside the same deterministic Reader fixture', async () => {
    act(() => root.render(renderWithDevAudio(<CardWorkshopView initialMode="contextual" />)));
    await openTechnicalDetails();

    const reader = container.querySelector<HTMLElement>('[data-testid="card-workshop-contextual-reader"]');
    await selectByLabel('Card preset', 'preset-system-prompt');
    expect(reader?.textContent).toContain('Mortal Tribulation Surpassed');
    expect(reader?.textContent).toContain('Yun Che has successfully broken through into the Foundation Establishment realm.');
    expect(reader?.textContent).toContain('+ Stage 4');
    expect(reader?.textContent).toContain('Then the thunder moved on');
  });

  it('keeps image, Manifest/Awaken, Codex, entity-mention, and portrait overrides active in Contextual View', async () => {
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
    expect(container.textContent).toContain('Manifesting...');
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
      .toBe(getManifestBackdrop('codex-char-rin'));
    expect(fixture.chapter.blocks?.map(block => block.id)).toEqual([
      'card-workshop-context-opening',
      'card-workshop-context-mention',
      'card-workshop-context-card',
      'card-workshop-context-aftermath',
    ]);

    act(() => root.render(renderWithDevAudio(<CardWorkshopView initialMode="contextual" />)));
    await openTechnicalDetails();
    await selectByLabel('Card preset', 'preset-system-status');
    await clickButton('Card Type Tabs');
    await clickButton('Contextual View');

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
    expect(container.querySelector('[data-testid="card-workshop-contextual-reader"] img[src^="http"]')).toBeFalsy();
  });

  it('dispatches the real @seihouse/audio-player session when the contextual World Cue glyph is tapped', async () => {
    vi.useFakeTimers();
    const playSpy = vi
      .spyOn(HTMLMediaElement.prototype, 'play')
      .mockResolvedValue(undefined);

    act(() => root.render(
      renderWithDevAudio(<CardWorkshopView initialMode="contextual" />),
    ));

    await clickButton('Play World Cue for The Rain Court bell tolled once');
    await act(async () => {
      vi.advanceTimersByTime(50);
    });
    expect(playSpy).toHaveBeenCalled();
  });
});
