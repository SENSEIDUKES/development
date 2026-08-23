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
    // Default compact event: the cultivation breakthrough — a translucent
    // event-colored System window (tinted pane, bright clipped border,
    // stronger header band) with the title-led header, classification line,
    // key/value rows, the System outcome row, and the serif TTS prose in its
    // own bottom section.
    const compactBlock = container.querySelector('.system-block');
    expect(compactBlock?.querySelector('[data-system-surface]')).toBeTruthy();
    expect(compactBlock?.className).not.toContain('rounded-2xl');
    expect(compactBlock?.textContent).toContain('Mortal Tribulation Surpassed');
    expect(compactBlock?.textContent).toContain('✦ Breakthrough | Awakening ✦');
    expect(compactBlock?.textContent).toContain('New Realm');
    expect(compactBlock?.textContent).toContain('Foundation Establishment');
    expect(compactBlock?.textContent).toContain('Meridian State');
    expect(compactBlock?.textContent).toContain('Realm Ascended');
    expect(compactBlock?.textContent).toContain('Lifespan +100');
    expect(compactBlock?.textContent).toContain('Presence Exposed');
    // The serif prose paragraph stays the only narration text: it carries the
    // sentence alone — never the headline, rows, or the outcome row — and
    // sits in its own section below the outcomes.
    const compactSummary = compactBlock?.querySelector('[data-system-summary]');
    expect(compactSummary?.textContent)
      .toBe('A golden interface unfurled before Yun Che, quiet where the tribulation\'s lightning had raged a breath before.');
    const consequenceRow = compactBlock?.querySelector('[data-consequence-count]');
    expect(consequenceRow).toBeTruthy();
    expect(
      consequenceRow!.compareDocumentPosition(compactSummary!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    // Signs appear only on genuine mathematical changes: LIFESPAN 100 is a
    // real quantity delta (green gain sign before the number), while REALM
    // ASCENDED and PRESENCE EXPOSED stay unsigned.
    const gainSigns = [...(compactBlock?.querySelectorAll('[data-consequence-count] .text-emerald-400') ?? [])];
    expect(gainSigns.map(element => element.textContent)).toEqual(['+']);
    const lossSigns = [...(compactBlock?.querySelectorAll('[data-consequence-count] .text-red-400') ?? [])];
    expect(lossSigns.map(element => element.textContent)).toEqual([]);
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
    expect(promiseBlock?.textContent).toContain('✦ Karma | Consequence ✦');
    expect(promiseBlock?.textContent).toContain('A solemn interface surfaced before Magistrate Jinhai, its gilt script cold as the rain outside.');
    expect(promiseBlock?.textContent).toContain('Celestial Record');
    expect(promiseBlock?.textContent).toContain('Witnesses');
    expect(promiseBlock?.textContent).toContain('Karma −15');
    expect(promiseBlock?.textContent).toContain('Title Stripped');
    expect(promiseBlock?.textContent).toContain('Sect Enmity');

    await clickButton('Target Scan');
    const scanBlock = container.querySelector('.system-block');
    expect(scanBlock?.textContent).toContain('Hostile Target Scan Complete');
    expect(scanBlock?.textContent).toContain('✦ Combat | Enemy ✦');
    expect(scanBlock?.querySelector('[data-system-summary]')?.textContent)
      .toBe('A crimson interface unfolded beside Elder Kaelen, taking his measure in silence.');
    expect(scanBlock?.textContent).toContain('Threat Assessment · Moderate');
    expect(scanBlock?.textContent).toContain('Cultivation');
    expect(scanBlock?.textContent).toContain('Foundation Establishment, Stage 7');
    expect(scanBlock?.textContent).toContain('Intel Gained');
    expect(scanBlock?.textContent).toContain('Weakness Found');
    expect(scanBlock?.textContent).toContain('Detection Risk: High');
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

  it('caps the compact System Prompt outcome row at three prioritized outcomes', () => {
    act(() => root.render(renderWithDevAudio(
      <SystemBlock
        content="[ Yun Che has successfully broken through into the Foundation Establishment realm. ]"
        system={{
          kind: 'system_prompt',
          promptType: 'breakthrough',
          title: 'Mortal Tribulation Surpassed',
          changes: [
            { direction: 'gain', label: 'Realm Ascended' },
            { direction: 'gain', label: 'Lifespan 100' },
            { direction: 'loss', label: 'Presence Exposed' },
            { direction: 'gain', label: 'Dao Heart Tempered' },
          ],
        }}
      />,
    )));

    const compactBlock = container.querySelector('.system-block');
    expect(compactBlock?.textContent).toContain('Mortal Tribulation Surpassed');
    expect(compactBlock?.textContent).toContain('Realm Ascended');
    expect(compactBlock?.textContent).toContain('Lifespan +100');
    expect(compactBlock?.textContent).toContain('Presence Exposed');
    expect(compactBlock?.textContent).not.toContain('Dao Heart Tempered');
  });

  it('opens the expanded event report in a viewport overlay and restores focus to the orb action', async () => {
    act(() => root.render(renderWithDevAudio(
      <CardWorkshopView initialMode="tabs" initialPresetId="preset-system-prompt" />,
    )));

    const systemBlock = container.querySelector<HTMLElement>('.system-block');
    const compactSummary = 'A golden interface unfurled before Yun Che, quiet where the tribulation\'s lightning had raged a breath before.';
    expect(systemBlock?.dataset.systemPromptState).toBe('compact');
    expect(systemBlock?.querySelector('[data-consequence-count]')).toBeTruthy();
    expect(systemBlock?.querySelector('[data-system-orb-icon="closed"]')).toBeTruthy();
    expect(systemBlock?.querySelector('[data-system-summary]')?.textContent).toBe(compactSummary);
    expect(document.body.querySelector('[data-system-expanded]')).toBeFalsy();
    expect(getButton('Expand System Prompt details')?.getAttribute('aria-expanded')).toBe('false');

    await clickButton('Expand System Prompt details');

    // The report is a viewport-locked dialog portaled above the reader —
    // outside the compact card, which keeps its compact content untouched.
    const overlay = document.body.querySelector<HTMLElement>('[role="dialog"][data-system-expanded="true"]');
    expect(overlay).toBeTruthy();
    expect(overlay?.getAttribute('aria-modal')).toBe('true');
    expect(overlay?.getAttribute('data-reader-narration')).toBe('excluded');
    expect(overlay?.className).toContain('max-h-full');
    expect(overlay?.className).toContain('overflow-y-auto');
    expect(overlay?.className).toContain('overscroll-contain');
    expect(systemBlock?.contains(overlay!)).toBe(false);
    expect(systemBlock?.dataset.systemPromptState).toBe('expanded');
    expect(systemBlock?.querySelector('[data-consequence-count]')).toBeTruthy();
    expect(systemBlock?.querySelector('[data-system-summary]')?.textContent).toBe(compactSummary);
    expect(systemBlock?.textContent).not.toContain('Power Rankings');
    expect(systemBlock?.querySelector('[data-system-orb-icon="open"]')).toBeTruthy();
    expect(getButton('Collapse System Prompt details')?.getAttribute('aria-expanded')).toBe('true');

    // One flat report: classification, headline, subject, the System
    // outcome row, and the Codex sections with progress — never narration.
    expect(overlay?.textContent).toContain('✦ Breakthrough | Awakening ✦');
    expect(overlay?.textContent).toContain('Mortal Tribulation Surpassed');
    expect(overlay?.textContent).toContain('MC (You)');
    expect(overlay?.textContent).toContain('Power Rankings');
    expect(overlay?.textContent).toContain('Foundation Establishment — Stage 4');
    expect(overlay?.textContent).toContain('37/100');
    expect(overlay?.textContent).toContain('Karma Bond');
    expect(overlay?.textContent).toContain('−75/100');
    expect(overlay?.textContent).toContain('Danger');
    expect(overlay?.textContent).toContain('Lore');
    expect(overlay?.textContent).toContain('Warning');
    expect(overlay?.textContent).toContain('Narrative Consequences');
    expect(overlay?.querySelector('[data-consequence-count]')?.textContent).toContain('Realm Ascended');
    expect(overlay?.querySelector('[data-consequence-count]')?.textContent).toContain('Lifespan +100');
    expect(overlay?.querySelector('[role="progressbar"][aria-label="Power Rankings progress"]'))
      .toBeTruthy();
    // Flat sections with simple dividers — no stacked card boxes.
    const powerSection = overlay?.querySelector('[data-system-expanded-section="power-rankings"]');
    expect(powerSection?.className).toContain('border-t');
    expect(powerSection?.className).not.toContain('rounded-xl');

    // Mobile keeps only the three highest-priority sections; the rest are
    // desktop-only through `hidden md:block`.
    const narrativeSection = overlay?.querySelector('[data-system-expanded-section="narrative-consequences"]');
    expect(narrativeSection?.className).toContain('hidden');
    expect(narrativeSection?.className).toContain('md:block');
    expect(powerSection?.className).not.toContain('hidden');

    // Character names inside the report keep their Codex colors and links.
    const elderHanAction = [...(overlay?.querySelectorAll<HTMLElement>('[role="button"]') ?? [])]
      .find(element => element.textContent === 'Elder Han');
    expect(elderHanAction).toBeTruthy();
    expect(elderHanAction?.className).toContain('text-[#d4af37]');
    await act(async () => elderHanAction!.click());
    expect(document.body.querySelector('[role="dialog"][aria-label="Elder Han Codex details"]'))
      .toBeTruthy();
    // Escape closes the hovercard first; the event report stays open. The
    // hovercard marker is stripped immediately, so a rapid second Escape closes
    // the report without waiting for exit animation.
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(document.body.querySelector('[role="dialog"][data-system-expanded="true"]')).toBeTruthy();

    // Second Escape immediately closes the report and returns focus to the orb action.
    const orbAction = getButton('Collapse System Prompt details');
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(document.body.querySelector('[data-system-expanded]')).toBeFalsy();
    expect(systemBlock?.dataset.systemPromptState).toBe('compact');
    expect(systemBlock?.querySelector('[data-consequence-count]')).toBeTruthy();
    expect(systemBlock?.querySelector('[data-system-orb-icon="closed"]')).toBeTruthy();
    expect(document.activeElement).toBe(orbAction);

    // Reopening and using the dedicated close button restores focus the same way.
    await clickButton('Expand System Prompt details');
    expect(document.body.querySelector('[data-system-expanded]')).toBeTruthy();
    const reopenOrb = getButton('Collapse System Prompt details');
    const closeAction = [...document.body.querySelectorAll<HTMLButtonElement>('button')]
      .find(element => element.getAttribute('aria-label') === 'Close System event report');
    expect(closeAction).toBeTruthy();
    await act(async () => closeAction!.click());
    expect(document.body.querySelector('[data-system-expanded]')).toBeFalsy();
    expect(document.activeElement).toBe(reopenOrb);

    // Backdrop click requires pointer-down on the backdrop itself to avoid
    // closing during text selection drag releases.
    await clickButton('Expand System Prompt details');
    const backdrop = document.body.querySelector<HTMLElement>('.fixed.inset-0.z-\\[100\\]');
    const activeOverlay = document.body.querySelector<HTMLElement>('[role="dialog"][data-system-expanded="true"]');
    expect(backdrop).toBeTruthy();
    expect(activeOverlay).toBeTruthy();
    // Drag starting inside panel and releasing on backdrop does not close
    await act(async () => {
      activeOverlay?.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
      backdrop?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(document.body.querySelector('[data-system-expanded]')).toBeTruthy();
    // Direct click on backdrop closes
    await act(async () => {
      backdrop?.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
      backdrop?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(document.body.querySelector('[data-system-expanded]')).toBeFalsy();

    // Pre-existing Codex hovercard open before expanded overlay mounts:
    // Opening a hovercard in compact summary, then opening the overlay,
    // verifies that the first Escape dismisses the hovercard and leaves the overlay open.
    const compactCharacterLink = [...(container.querySelectorAll<HTMLElement>('.system-block [role="button"]') ?? [])]
      .find(element => element.textContent === 'Yun Che' || element.textContent === 'Elder Han');
    if (compactCharacterLink) {
      await act(async () => compactCharacterLink.click());
      await clickButton('Expand System Prompt details');
      expect(document.body.querySelector('[role="dialog"][data-system-expanded="true"]')).toBeTruthy();
      // First Escape dismisses the hovercard only
      await act(async () => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      });
      expect(document.body.querySelector('[role="dialog"][data-system-expanded="true"]')).toBeTruthy();
      // Second Escape dismisses the overlay
      await act(async () => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      });
      expect(document.body.querySelector('[data-system-expanded]')).toBeFalsy();
    }
  });

  it('provides complete local expanded reports for all three System Prompt examples', async () => {
    act(() => root.render(renderWithDevAudio(
      <CardWorkshopView initialMode="tabs" initialPresetId="preset-system-prompt" />,
    )));

    const examples = [
      {
        control: 'Cultivation Breakthrough',
        subject: 'Yun Che',
        value: 'Foundation Establishment — Stage 4',
        consequence: 'Elder Han will move openly against Yun Che.',
        badge: null,
      },
      {
        control: 'Broken Promise',
        subject: 'Magistrate Jinhai',
        value: 'Rain Court Standing — Disgraced',
        consequence: 'Magistrate Jinhai loses access to Riverside Sect testimony.',
        badge: null,
      },
      {
        control: 'Target Scan',
        subject: 'Elder Kaelen',
        value: 'Foundation Establishment — Stage 7',
        consequence: 'Elder Kaelen will prepare a countermeasure before the next encounter.',
        badge: 'Threat Assessment',
      },
    ];

    for (const example of examples) {
      await clickButton(example.control);
      const systemBlock = container.querySelector<HTMLElement>('.system-block');
      expect(systemBlock?.dataset.systemPromptState).toBe('compact');

      await clickButton('Expand System Prompt details');
      // The full report lives in the overlay, never in the compact card.
      const overlay = document.body.querySelector<HTMLElement>('[role="dialog"][data-system-expanded="true"]');
      expect(overlay).toBeTruthy();
      expect(systemBlock?.textContent).not.toContain('Narrative Consequences');
      expect(overlay?.textContent).toContain(example.subject);
      expect(overlay?.textContent).toContain(example.value);
      expect(overlay?.textContent).toContain('Lore');
      expect(overlay?.textContent).toContain('Warning');
      expect(overlay?.textContent).toContain('Narrative Consequences');
      expect(overlay?.textContent).toContain(example.consequence);
      if (example.badge) {
        expect(overlay?.textContent).toContain(example.badge);
      }

      await act(async () => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      });
      expect(document.body.querySelector('[data-system-expanded]')).toBeFalsy();
      expect(systemBlock?.dataset.systemPromptState).toBe('compact');
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
    expect(reader?.textContent).toContain('Realm Ascended');
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
