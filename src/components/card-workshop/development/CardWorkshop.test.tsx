// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CardWorkshopView } from './CardWorkshopView';
import { createCardWorkshopContextualFixture } from './CardWorkshopContextualReader';
import { getManifestBackdrop } from '@seihouse/sen/codex-cards';
import { getReaderChamberSurfaceClass, SystemBlock } from '@seihouse/sen/reader-chamber';
import { CardWorkshopWorkspace } from '../../../workshop/previews/card-workshop/CardWorkshopWorkspace';
import {
  ACTIVE_CARD_PRESETS,
  SYSTEM_PROMPT_PRESET_EXAMPLES,
} from '../../../workshop/previews/card-workshop/previewData';
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
    // Default compact event: the cultivation breakthrough — title-led header,
    // classification line, key/value rows, signed consequence row, and the
    // serif TTS prose in its own bottom section.
    const compactBlock = container.querySelector('.system-block');
    expect(compactBlock?.textContent).toContain('Mortal Tribulation Surpassed');
    expect(compactBlock?.textContent).toContain('✦ Breakthrough | Awakening (Gold) ✦');
    expect(compactBlock?.textContent).toContain('New Realm');
    expect(compactBlock?.textContent).toContain('Foundation Establishment');
    expect(compactBlock?.textContent).toContain('Meridian State');
    expect(compactBlock?.textContent).toContain('+ Stage 4');
    expect(compactBlock?.textContent).toContain('+ 100 Lifespan');
    expect(compactBlock?.textContent).toContain('− Easier to Detect');
    // The serif prose paragraph stays the only narration text: it carries the
    // sentence alone — never the headline, rows, or the consequence row — and
    // sits in its own section below the consequences.
    const compactSummary = compactBlock?.querySelector('[data-system-summary]');
    expect(compactSummary?.textContent)
      .toBe('A golden interface unfurled before Yun Che, quiet where the tribulation\'s lightning had raged a breath before.');
    const consequenceRow = compactBlock?.querySelector('[data-consequence-count]');
    expect(consequenceRow).toBeTruthy();
    expect(
      consequenceRow!.compareDocumentPosition(compactSummary!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    // Gains render green, losses red; the labels stay readable neutral.
    const gainSigns = [...(compactBlock?.querySelectorAll('[data-consequence-count] .text-emerald-400') ?? [])];
    expect(gainSigns.map(element => element.textContent)).toEqual(['+', '+']);
    const lossSigns = [...(compactBlock?.querySelectorAll('[data-consequence-count] .text-red-400') ?? [])];
    expect(lossSigns.map(element => element.textContent)).toEqual(['−']);
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
    expect(promiseBlock?.textContent).toContain('✦ Karma | Consequence (Orange) ✦');
    expect(promiseBlock?.textContent).toContain('A solemn interface surfaced before Magistrate Jinhai, its gilt script cold as the rain outside.');
    expect(promiseBlock?.textContent).toContain('Celestial Record');
    expect(promiseBlock?.textContent).toContain('Witnesses');
    expect(promiseBlock?.textContent).toContain('− Reputation');
    expect(promiseBlock?.textContent).toContain('+ Sect Enmity');

    await clickButton('Target Scan');
    const scanBlock = container.querySelector('.system-block');
    expect(scanBlock?.textContent).toContain('Hostile Target Scan Complete');
    expect(scanBlock?.textContent).toContain('✦ Combat | Enemy (Red) ✦');
    expect(scanBlock?.querySelector('[data-system-summary]')?.textContent)
      .toBe('A crimson interface unfolded beside Elder Kaelen, taking his measure in silence.');
    expect(scanBlock?.textContent).toContain('Threat Assessment · Moderate');
    expect(scanBlock?.textContent).toContain('Cultivation');
    expect(scanBlock?.textContent).toContain('Foundation Establishment, Stage 7');
    expect(scanBlock?.textContent).toContain('+ Intel');
    expect(scanBlock?.textContent).toContain('+ Weakness');
    expect(scanBlock?.textContent).toContain('− Exposed');
    // Color communicates meaning: the classification subtype carries the
    // assigned color, row labels stay neutral gray, ordinary values stay
    // white, and only the badge severity takes the severity color.
    const scanSpans = [...(scanBlock?.querySelectorAll('span') ?? [])];
    const enemySubtype = scanSpans.find(element => element.textContent === 'Enemy');
    expect(enemySubtype?.className).toContain('text-red-500');
    const combatCategory = scanSpans.find(element => element.textContent === 'Combat');
    expect(combatCategory?.className).toContain('text-neutral-300');
    const cultivationLabel = scanSpans.find(element => element.textContent === 'Cultivation');
    expect(cultivationLabel?.className).toContain('text-neutral-400');
    const cultivationValue = scanSpans.find(element => element.textContent === 'Foundation Establishment, Stage 7');
    expect(cultivationValue?.className).toContain('text-neutral-100');
    const badgeLabel = scanSpans.find(element => element.textContent === 'Threat Assessment');
    expect(badgeLabel?.className).toContain('text-neutral-300');
    const badgeSeverity = scanSpans.find(element => element.textContent === 'Moderate');
    expect(badgeSeverity?.className).toContain('text-orange-400');
    const elderCodexAction = [...(scanBlock?.querySelectorAll<HTMLElement>('[role="button"]') ?? [])]
      .find(element => element.textContent === 'Elder Kaelen');
    expect(elderCodexAction).toBeTruthy();
    expect(elderCodexAction?.className).toContain('text-red-500');
    await act(async () => elderCodexAction!.click());
    expect(document.body.querySelector('[role="dialog"][aria-label="Elder Kaelen Codex details"]'))
      .toBeTruthy();
    await act(async () => elderCodexAction!.click());

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

  it('uses the celestial orb to expand in place, replace consequences, and collapse to the compact default', async () => {
    act(() => root.render(renderWithDevAudio(
      <CardWorkshopView initialMode="tabs" initialPresetId="preset-system-prompt" />,
    )));

    const systemBlock = container.querySelector<HTMLElement>('.system-block');
    const compactSummary = 'A golden interface unfurled before Yun Che, quiet where the tribulation\'s lightning had raged a breath before.';
    expect(systemBlock?.dataset.systemPromptState).toBe('compact');
    expect(systemBlock?.querySelector('[data-consequence-count]')).toBeTruthy();
    expect(systemBlock?.querySelector('[data-system-expanded]')).toBeFalsy();
    expect(systemBlock?.querySelector('[data-system-orb-icon="closed"]')).toBeTruthy();
    expect(systemBlock?.querySelector('[data-system-summary]')?.textContent).toBe(compactSummary);
    expect(getButton('Expand System Prompt details')?.getAttribute('aria-expanded')).toBe('false');

    await clickButton('Expand System Prompt details');

    expect(systemBlock?.dataset.systemPromptState).toBe('expanded');
    expect(systemBlock?.querySelector('[data-consequence-count]')).toBeFalsy();
    expect(systemBlock?.querySelector('[data-system-expanded]')?.getAttribute('data-reader-narration'))
      .toBe('excluded');
    expect(systemBlock?.querySelector('[data-system-orb-icon="open"]')).toBeTruthy();
    expect(getButton('Collapse System Prompt details')?.getAttribute('aria-expanded')).toBe('true');
    expect(systemBlock?.textContent).toContain('MC (You)');
    expect(systemBlock?.textContent).toContain('Power Rankings');
    expect(systemBlock?.textContent).toContain('Foundation Establishment — Stage 4');
    expect(systemBlock?.textContent).toContain('37/100');
    expect(systemBlock?.textContent).toContain('Karma Bond');
    expect(systemBlock?.textContent).toContain('−75/100');
    expect(systemBlock?.textContent).toContain('Danger');
    expect(systemBlock?.textContent).toContain('Lore');
    expect(systemBlock?.textContent).toContain('Warning');
    expect(systemBlock?.textContent).toContain('Narrative Consequences');
    expect(systemBlock?.querySelector('[data-system-summary]')?.textContent).toBe(compactSummary);
    expect(systemBlock?.querySelector('[role="progressbar"][aria-label="Power Rankings progress"]'))
      .toBeTruthy();

    const elderHanAction = [...(systemBlock?.querySelectorAll<HTMLElement>('[role="button"]') ?? [])]
      .find(element => element.textContent === 'Elder Han');
    expect(elderHanAction).toBeTruthy();
    expect(elderHanAction?.className).toContain('text-[#d4af37]');
    await act(async () => elderHanAction!.click());
    expect(document.body.querySelector('[role="dialog"][aria-label="Elder Han Codex details"]'))
      .toBeTruthy();
    await act(async () => elderHanAction!.click());

    await clickButton('Collapse System Prompt details');
    expect(systemBlock?.dataset.systemPromptState).toBe('compact');
    expect(systemBlock?.querySelector('[data-system-expanded]')).toBeFalsy();
    expect(systemBlock?.querySelector('[data-consequence-count]')).toBeTruthy();
    expect(systemBlock?.querySelector('[data-system-orb-icon="closed"]')).toBeTruthy();
  });

  it('provides complete local expanded breakdowns for all three System Prompt examples', async () => {
    act(() => root.render(renderWithDevAudio(
      <CardWorkshopView initialMode="tabs" initialPresetId="preset-system-prompt" />,
    )));

    const examples = [
      {
        control: 'Cultivation Breakthrough',
        subject: 'Yun Che',
        value: 'Foundation Establishment — Stage 4',
        consequence: 'Elder Han will move openly against Yun Che.',
      },
      {
        control: 'Broken Promise',
        subject: 'Magistrate Jinhai',
        value: 'Rain Court Standing — Disgraced',
        consequence: 'Magistrate Jinhai loses access to Riverside Sect testimony.',
      },
      {
        control: 'Target Scan',
        subject: 'Elder Kaelen',
        value: 'Foundation Establishment — Stage 7',
        consequence: 'Elder Kaelen will prepare a countermeasure before the next encounter.',
      },
    ];

    for (const example of examples) {
      await clickButton(example.control);
      const systemBlock = container.querySelector<HTMLElement>('.system-block');
      expect(systemBlock?.dataset.systemPromptState).toBe('compact');

      await clickButton('Expand System Prompt details');
      expect(systemBlock?.textContent).toContain(example.subject);
      expect(systemBlock?.textContent).toContain(example.value);
      expect(systemBlock?.textContent).toContain('Lore');
      expect(systemBlock?.textContent).toContain('Warning');
      expect(systemBlock?.textContent).toContain('Narrative Consequences');
      expect(systemBlock?.textContent).toContain(example.consequence);
    }
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
    expect(reader?.textContent).toContain('A golden interface unfurled before Yun Che, quiet where the tribulation\'s lightning had raged a breath before.');
    expect(reader?.textContent).toContain('New Realm');
    expect(reader?.textContent).toContain('+ Stage 4');
    expect(reader?.textContent).toContain('Then the thunder moved on');
  });

  it('keeps the full target-scan narration source while linking only its named character in Reader prose', async () => {
    act(() => root.render(renderWithDevAudio(<CardWorkshopView initialMode="contextual" />)));
    await openTechnicalDetails();
    await selectByLabel('Card preset', 'preset-system-prompt');
    await selectByLabel('System prompt example style', 'target-scan');

    const reader = container.querySelector<HTMLElement>('[data-testid="card-workshop-contextual-reader"]');
    const systemBlock = reader?.querySelector<HTMLElement>('.system-block');
    expect(systemBlock?.querySelector('[data-system-summary]')?.textContent)
      .toBe('A crimson interface unfolded beside Elder Kaelen, taking his measure in silence.');
    expect(systemBlock?.textContent).toContain('Threat Assessment · Moderate');

    const elderCodexAction = [...(systemBlock?.querySelectorAll<HTMLElement>('[role="button"]') ?? [])]
      .find(element => element.textContent === 'Elder Kaelen');
    expect(elderCodexAction).toBeTruthy();
    expect(elderCodexAction?.className).toContain('text-red-500');
    await act(async () => elderCodexAction!.click());
    expect(document.body.querySelector('[role="dialog"][aria-label="Elder Kaelen Codex details"]'))
      .toBeTruthy();

    const targetScanPreset = ACTIVE_CARD_PRESETS.find(preset => preset.id === 'preset-system-prompt')!;
    const targetScanFixture = createCardWorkshopContextualFixture(
      targetScanPreset,
      { ...INITIAL_CARD_WORKSHOP_OVERRIDES, systemPromptContentStyle: 'target-scan' },
      new Set(),
    );
    expect(targetScanFixture.chapter.blocks?.[2]?.text)
      .toBe('[ A crimson interface unfolded beside Elder Kaelen, taking his measure in silence. Threat assessment: moderate. ]');
  });

  it('keeps expanded mock information outside the short System Prompt TTS source', () => {
    const systemPreset = ACTIVE_CARD_PRESETS.find(preset => preset.id === 'preset-system-prompt')!;
    const styles = ['breakthrough', 'broken-promise', 'target-scan'] as const;

    for (const style of styles) {
      const fixture = createCardWorkshopContextualFixture(
        systemPreset,
        { ...INITIAL_CARD_WORKSHOP_OVERRIDES, systemPromptContentStyle: style },
        new Set(),
      );
      const systemBlock = fixture.chapter.blocks?.[2];

      expect(systemBlock?.text).toBe(SYSTEM_PROMPT_PRESET_EXAMPLES[style].systemContent);
      expect(systemBlock?.system?.expanded?.sections.length).toBeGreaterThan(0);
      expect(systemBlock?.text).not.toContain('Power Rankings');
      expect(systemBlock?.text).not.toContain('Narrative Consequences');
      expect(systemBlock?.text).not.toContain(systemBlock?.system?.expanded?.sections[0]?.value ?? '__missing__');
    }
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
