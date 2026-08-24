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
import { CARD_BRANCHES } from '../../../workshop/previews/card-workshop/cardCategories';
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
    const tabs = () => [...(tablist?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [])];
    expect(tablist).toBeTruthy();
    expect(tabs()).toHaveLength(CARD_BRANCHES[0].categories.length);
    expect(container.querySelectorAll('[role="tabpanel"]')).toHaveLength(1);

    // Only the selected parent branch's categories are ever offered.
    for (const category of CARD_BRANCHES[0].categories) {
      expect(tabs().some(tab => tab.textContent?.trim() === category.label)).toBe(true);
    }
    for (const category of CARD_BRANCHES[1].categories) {
      expect(tabs().some(tab => tab.textContent?.trim() === category.label)).toBe(false);
    }

    expect(container.textContent).toContain('Codex Cards');
    expect(container.querySelector('[role="tabpanel"]')?.textContent).toContain('Human Portrait');
    expect(tabs()[0].getAttribute('aria-selected')).toBe('true');

    await act(async () => {
      tabs()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    });
    expect(tabs()[1].getAttribute('aria-selected')).toBe('true');
    expect(container.querySelector('[role="tabpanel"]')?.textContent).toContain('Non-Human Portrait');
    expect(document.activeElement).toBe(tabs()[1]);

    await clickButton('System Prompts');
    expect(tabs()).toHaveLength(CARD_BRANCHES[1].categories.length);
    for (const category of CARD_BRANCHES[1].categories) {
      expect(tabs().some(tab => tab.textContent?.trim() === category.label)).toBe(true);
    }
    for (const category of CARD_BRANCHES[0].categories) {
      expect(tabs().some(tab => tab.textContent?.trim() === category.label)).toBe(false);
    }
    expect(container.textContent).toContain('System Panels & Fate Outcomes');
    // Default compact event: the cultivation breakthrough — a dark smoky
    // event-tinted System window (mostly opaque pane with a mild backdrop
    // blur, thin luminous border on smaller rounded corners, restrained glow)
    // with the title-led header, classification line, key/value rows carrying
    // direction arrows on changed values, the System outcome row, and the
    // muted gray serif TTS prose in its own bottom section.
    const compactBlock = container.querySelector<HTMLElement>('.system-block');
    expect(compactBlock?.className).toContain('system-window');
    expect(compactBlock?.className).toContain('rounded-xl');
    expect(compactBlock?.textContent).toContain('Cultivation Breakthrough');
    expect(compactBlock?.textContent).toContain('Mortal Tribulation Surpassed');
    expect(compactBlock?.textContent).toContain('✦ Awakening ✦');
    expect(compactBlock?.textContent).toContain('New Realm');
    expect(compactBlock?.textContent).toContain('Foundation Establishment');
    expect(compactBlock?.textContent).toContain('Meridian State');
    expect(compactBlock?.textContent).toContain('Realm Ascended');
    expect(compactBlock?.textContent).toContain('Lifespan Increased');
    expect(compactBlock?.textContent).not.toContain('Lifespan +100');
    expect(compactBlock?.textContent).not.toContain('Presence Exposed');
    // The serif prose paragraph stays the only narration text: it carries the
    // sentence alone — never the headline, rows, or the outcome row — and
    // rests collapsed by default behind a centered bottom arrow toggle (the
    // reader expands it on demand; TTS reads it from the block data).
    const compactSummary = compactBlock?.querySelector('[data-system-summary]');
    expect(compactSummary?.textContent)
      .toBe('A golden interface unfurled before Yun Che, quiet where the tribulation\'s lightning had raged a breath before.');
    expect(compactSummary?.hasAttribute('hidden')).toBe(true);
    const summaryToggle = compactBlock?.querySelector('[aria-controls]');
    expect(summaryToggle?.getAttribute('aria-label')).toBe('Reveal System narration');
    expect(summaryToggle?.getAttribute('aria-expanded')).toBe('false');
    const consequenceRow = compactBlock?.querySelector('[data-consequence-count]');
    expect(consequenceRow).toBeTruthy();
    expect(
      consequenceRow!.compareDocumentPosition(compactSummary!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    // The compact outcome row holds at most two slots separated by a clear
    // divider: each is a white subject plus a meaning-colored state word,
    // never a number — the genuine mathematical change compresses to
    // Increased/Decreased from its direction (LIFESPAN INCREASED), so the
    // signed figure and the third outcome (PRESENCE EXPOSED) live only in
    // the expanded report.
    expect(consequenceRow?.getAttribute('data-consequence-count')).toBe('2');
    expect(consequenceRow?.textContent).toContain('|');
    const outcomeStates = [...(consequenceRow?.querySelectorAll('[data-outcome-state]') ?? [])] as HTMLElement[];
    expect(outcomeStates.map(element => element.textContent)).toEqual(['Ascended', 'Increased']);
    expect(outcomeStates.map(element => element.dataset.colorCode)).toEqual(['ally', 'ally']);
    const outcomeSubjects = [...(consequenceRow?.querySelectorAll('[data-outcome-subject]') ?? [])] as HTMLElement[];
    expect(outcomeSubjects.map(element => element.textContent?.trim())).toEqual(['Realm', 'Lifespan']);
    expect(outcomeSubjects.every(element => element.classList.contains('text-neutral-100'))).toBe(true);
    // Compact prompts keep the semantic System color system (breakthrough → gold).
    expect(compactBlock?.dataset.colorCode).toBe('mentor');
    // Changed row values carry a direction arrow: upgrades green.
    const trendArrows = [...(compactBlock?.querySelectorAll('[data-row-trend]') ?? [])];
    expect(trendArrows.map(element => element.getAttribute('data-row-trend'))).toEqual(['up', 'up']);
    expect(trendArrows.every(element => element.getAttribute('data-color-code') === 'ally')).toBe(true);
    expect(container.querySelector('[role="tabpanel"]')?.textContent).not.toContain('Human Portrait');
    expect(container.querySelectorAll('[role="tabpanel"]')).toHaveLength(1);

    // Switch between the mocked Wuxia events — the same data-driven compact
    // card renders each without per-event branches.
    await clickButton('Broken Promise');
    const promiseBlock = container.querySelector('.system-block');
    expect(promiseBlock?.textContent).toContain('Karmic Consequence');
    expect(promiseBlock?.textContent).toContain('Oath Before the Rain Court Broken');
    expect(promiseBlock?.textContent).toContain('✦ Consequence ✦');
    expect(promiseBlock?.textContent).toContain('A solemn interface surfaced before Magistrate Jinhai, its gilt script cold as the rain outside.');
    expect(promiseBlock?.textContent).toContain('Celestial Record');
    expect(promiseBlock?.textContent).toContain('Witnesses');
    // The compact slots drop the signed figure (KARMA −15 lives only in the
    // expanded report) and the third outcome stays out of the two slots.
    expect(promiseBlock?.textContent).toContain('Karma Decreased');
    expect(promiseBlock?.textContent).not.toContain('Karma −15');
    expect(promiseBlock?.textContent).toContain('Title Stripped');
    expect(promiseBlock?.textContent).not.toContain('Sect Enmity');
    const promiseStates = [...(promiseBlock?.querySelectorAll('[data-consequence-count] [data-outcome-state]') ?? [])] as HTMLElement[];
    expect(promiseStates.map(element => element.textContent)).toEqual(['Decreased', 'Stripped']);
    expect(promiseStates.every(element => element.getAttribute('data-color-code') === 'enemy')).toBe(true);
    // The broken oath's sealed record is a regression: red down-arrow.
    const promiseTrends = [...(promiseBlock?.querySelectorAll('[data-row-trend]') ?? [])];
    expect(promiseTrends.map(element => element.getAttribute('data-row-trend'))).toEqual(['down']);
    expect(promiseTrends[0]?.getAttribute('data-color-code')).toBe('enemy');

    // Target Scan lives under the Mechanical category, not Narrative.
    await clickButton('Mechanical');
    await clickButton('Target Scan');
    const scanBlock = container.querySelector('.system-block');
    expect(scanBlock?.textContent).toContain('Hostile Target Scan');
    expect(scanBlock?.textContent).toContain('Elder Kaelen Assessment');
    expect(scanBlock?.textContent).toContain('✦ Enemy ✦');
    expect(scanBlock?.querySelector('[data-system-summary]')?.textContent)
      .toBe('A crimson interface unfolded beside Elder Kaelen, taking his measure in silence.');
    expect(scanBlock?.textContent).toContain('Threat Assessment Moderate');
    expect(scanBlock?.textContent).toContain('Cultivation');
    expect(scanBlock?.textContent).toContain('Foundation Establishment, Stage 7');
    expect(scanBlock?.textContent).toContain('Intel Gained');
    expect(scanBlock?.textContent).toContain('Weakness Found');
    // The third outcome stays out of the compact two-slot row.
    expect(scanBlock?.textContent).not.toContain('Detection Risk');
    // A scan changes nothing: no direction arrows on its facts.
    expect(scanBlock?.querySelector('[data-row-trend]')).toBeFalsy();
    // Color communicates meaning: the compact classification keeps only its
    // most useful term (the subtype) in the assigned color, row labels stay
    // neutral gray, ordinary values stay white, and only the badge severity
    // takes the severity color.
    const scanSpans = [...(scanBlock?.querySelectorAll('span') ?? [])];
    const enemySubtype = scanSpans.find(element => element.textContent === 'Enemy');
    expect(enemySubtype?.getAttribute('data-color-code')).toBe('enemy');
    expect(scanBlock?.textContent).not.toContain('Combat');
    const cultivationLabel = scanSpans.find(element => element.textContent === 'Cultivation');
    expect(cultivationLabel?.className).toContain('text-neutral-400');
    const cultivationValue = scanSpans.find(element => element.textContent === 'Foundation Establishment, Stage 7');
    expect(cultivationValue?.className).toContain('text-neutral-100');
    const badgeLabel = scanSpans.find(element => element.textContent === 'Threat Assessment');
    expect(badgeLabel?.className).toContain('text-neutral-300');
    const badgeSeverity = scanSpans.find(element => element.textContent === 'Moderate');
    expect(badgeSeverity?.getAttribute('data-color-code')).toBe('itemGreat');
    const elderCodexAction = [...(scanBlock?.querySelectorAll<HTMLElement>('[role="button"]') ?? [])]
      .find(element => element.textContent === 'Elder Kaelen');
    expect(elderCodexAction).toBeTruthy();
    expect(elderCodexAction?.getAttribute('data-color-code')).toBe('enemy');
    await act(async () => elderCodexAction!.click());
    expect(document.body.querySelector('[role="dialog"][aria-label="Elder Kaelen Codex details"]'))
      .toBeTruthy();
    await act(async () => elderCodexAction!.click());

    // Toggle to structured mechanical example
    await clickButton('Structured Mechanical');
    expect(container.textContent).toContain('Meridian Status & Vitality Flow');
  });

  it('branches Codex Cards and System Prompts into their own category sets', async () => {
    act(() => root.render(renderWithDevAudio(<CardWorkshopView initialMode="tabs" />)));

    const branchList = container.querySelector('[role="tablist"][aria-label="Card families"]');
    const branchTabs = [...(branchList?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [])];
    expect(branchTabs.map(tab => tab.textContent?.trim())).toEqual(['Codex Cards', 'System Prompts']);
    expect(branchTabs[0].getAttribute('aria-selected')).toBe('true');

    const categoryLabels = () => [...container.querySelectorAll<HTMLButtonElement>(
      '[role="tablist"][aria-label="Card types"] [role="tab"]',
    )].map(tab => tab.textContent?.trim());

    expect(categoryLabels())
      .toEqual(['Human', 'Non-Human', 'Artifacts', 'Locations', 'Factions']);

    // The remaining Codex category resolves to a real Faction card.
    await clickButton('Factions');
    expect(container.querySelector('[role="tabpanel"]')?.textContent).toContain('Riverside Sect');
    expect(container.querySelector('[role="tabpanel"]')?.textContent).toContain('ReaderCodex > Factions');

    await clickButton('System Prompts');
    expect(branchTabs[1].getAttribute('aria-selected')).toBe('true');
    expect(categoryLabels())
      .toEqual(['Narrative', 'Mechanical', 'World Notice', 'Fate System']);

    // Each System category offers only the content examples that belong to it.
    const exampleLabels = () => [...container.querySelectorAll<HTMLButtonElement>('button')]
      .filter(button => button.closest('[role="tabpanel"]') && /^(Cultivation Breakthrough|Broken Promise|Target Scan|Structured Mechanical|Guild Bounty|Mission Board)$/
        .test(button.textContent?.trim() ?? ''))
      .map(button => button.textContent?.trim());

    expect(exampleLabels()).toEqual(['Cultivation Breakthrough', 'Broken Promise']);
    await clickButton('World Notice');
    expect(exampleLabels()).toEqual(['Guild Bounty', 'Mission Board']);
    expect(container.querySelector('[role="tabpanel"]')?.textContent).toContain('BLACKTHORN WOLF PACK');

    await clickButton('Fate System');
    expect(container.querySelector('[role="tabpanel"]')?.textContent).toContain('Fate System Prompt');

    // Returning to the Codex branch restores its own categories only.
    await clickButton('Codex Cards');
    expect(categoryLabels())
      .toEqual(['Human', 'Non-Human', 'Artifacts', 'Locations', 'Factions']);
    expect(container.querySelector('[role="tabpanel"]')?.textContent).toContain('Human Portrait');
  });

  it('renders the compact System Prompt outcomes as two flat subject/state slots', () => {
    act(() => root.render(renderWithDevAudio(
      <SystemBlock
        content="[ Yun Che has successfully broken through into the Foundation Establishment realm. ]"
        system={{
          kind: 'system_prompt',
          presentation: 'narrative',
          promptType: 'breakthrough',
          title: 'Cultivation Breakthrough',
          flavor: 'Mortal Tribulation Surpassed',
          changes: [
            { direction: 'gain', label: 'Realm Ascended' },
            { direction: 'loss', label: 'Karma 15' },
            { direction: 'gain', label: 'Lifespan 100' },
          ],
        }}
      />,
    )));

    const compactBlock = container.querySelector('.system-block');
    expect(compactBlock?.textContent).toContain('Cultivation Breakthrough');
    expect(compactBlock?.textContent).toContain('Mortal Tribulation Surpassed');
    expect(compactBlock?.textContent).toContain('Realm Ascended');
    expect(compactBlock?.textContent).toContain('Karma Decreased');
    // The compact bottom half is limited to two slots with a clear divider
    // and no numbers: the signed quantity (KARMA −15) and every outcome past
    // the first two appear only in the expanded event report.
    expect(compactBlock?.textContent).not.toContain('Karma −15');
    expect(compactBlock?.textContent).not.toContain('Lifespan');
    const outcomeRow = compactBlock?.querySelector('[data-consequence-count]');
    expect(outcomeRow?.getAttribute('data-consequence-count')).toBe('2');
    expect(outcomeRow?.className).toContain('flex-wrap');
    expect(outcomeRow?.textContent).toContain('|');
    // Clean flat slots: a neutral white subject plus the meaning-colored
    // state word (green gain, red loss), never individual badge containers.
    const outcomeSlots = [...(outcomeRow?.querySelectorAll('[data-outcome-slot]') ?? [])] as HTMLElement[];
    expect(outcomeSlots.map(element => element.textContent))
      .toEqual(['Realm Ascended', 'Karma Decreased']);
    const outcomeStates = [...(outcomeRow?.querySelectorAll('[data-outcome-state]') ?? [])] as HTMLElement[];
    expect(outcomeStates.map(element => element.textContent)).toEqual(['Ascended', 'Decreased']);
    expect(outcomeStates.map(element => element.dataset.colorCode)).toEqual(['ally', 'enemy']);
    const outcomeSubjects = [...(outcomeRow?.querySelectorAll('[data-outcome-subject]') ?? [])] as HTMLElement[];
    expect(outcomeSubjects.map(element => element.textContent?.trim())).toEqual(['Realm', 'Karma']);
    expect(outcomeSubjects.every(element => element.classList.contains('text-neutral-100'))).toBe(true);
    outcomeSlots.forEach(element => {
      expect(element.className).not.toContain('rounded-full');
      expect(element.className).not.toContain('border');
    });
  });

  it('routes explicit System Prompt presentations independently of their shared semantic color', () => {
    const renderProse = vi.fn((text: string) => <button data-world-notice-prose-link>{text}</button>);
    const onNoticeClick = vi.fn();

    act(() => root.render(renderWithDevAudio(
      <>
        <SystemBlock
          content="[ A message arrives from the guild. ]"
          system={{
            kind: 'system_prompt',
            presentation: 'narrative',
            promptType: 'quest_update',
            title: 'Quest Update',
          }}
        />
        <SystemBlock
          content="[ Objective parameters updated. ]"
          system={{
            kind: 'system_prompt',
            presentation: 'mechanical',
            promptType: 'quest_update',
            title: 'Objective Update',
            rows: [{ label: 'Status', value: 'Active' }],
          }}
        />
        <SystemBlock
          content="[ The guild board bears a fresh seal. ]"
          system={{
            kind: 'system_prompt',
            presentation: 'world_notice',
            promptType: 'quest_update',
            title: 'GUILD BOUNTY',
            flavor: 'Issued by the East Gate Adventurers Guild',
            worldNotice: {
              entries: [{
                title: 'Ashfang Direwolf',
                body: 'Cull the alpha before it reaches the trade road.',
                details: [
                  { label: 'Reward', value: '80 silver' },
                  { label: 'Location', value: 'Blackpine Pass' },
                ],
              }],
            },
          }}
          renderProse={renderProse}
          onClick={onNoticeClick}
          role="button"
          tabIndex={0}
          dangerouslySetInnerHTML={{ __html: '<p>Unsafe notice markup</p>' }}
        />
      </>,
    )));

    const presentations = [...container.querySelectorAll<HTMLElement>('[data-system-presentation]')];
    expect(presentations.map(element => element.dataset.systemPresentation))
      .toEqual(['narrative', 'mechanical', 'world_notice']);
    expect(new Set(presentations.map(element => element.dataset.colorCode)).size).toBe(1);
    expect(presentations[0]?.dataset.colorCode).toBe('mainCharacter');

    const notice = container.querySelector<HTMLElement>('[data-world-notice="true"]');
    expect(notice?.textContent).toContain('GUILD BOUNTY');
    expect(notice?.textContent).toContain('Issued by the East Gate Adventurers Guild');
    expect(notice?.textContent).toContain('Ashfang Direwolf');
    expect(notice?.textContent).toContain('Cull the alpha before it reaches the trade road.');
    expect(notice?.textContent).toContain('Reward');
    expect(notice?.textContent).toContain('80 silver');
    expect(notice?.dataset.worldNoticeBoard).toBe('false');
    expect(notice?.dataset.worldNoticeEntryCount).toBe('1');
    expect(notice?.dataset.readerNarration).toBe('excluded');
    expect(notice?.querySelectorAll('button, a[href], [role="button"], [tabindex]:not([tabindex="-1"])')).toHaveLength(0);
    expect(notice?.getAttribute('role')).toBeNull();
    expect(notice?.getAttribute('tabindex')).toBeNull();
    expect(notice?.getAttribute('dangerouslySetInnerHTML')).toBeNull();
    expect(notice?.textContent).not.toContain('Unsafe notice markup');
    expect(notice?.querySelector('[data-system-summary-toggle]')).toBeFalsy();
    expect(notice?.querySelector('[data-world-notice-prose-link]')).toBeFalsy();
    act(() => notice?.click());
    expect(onNoticeClick).not.toHaveBeenCalled();
    expect(renderProse).not.toHaveBeenCalled();
  });

  it('renders multi-entry World Notices as a static board and retains legacy layout fallback only when presentation is absent', () => {
    act(() => root.render(renderWithDevAudio(
      <>
        <SystemBlock
          content="[ The mission board is refreshed at dawn. ]"
          system={{
            kind: 'system_prompt',
            presentation: 'world_notice',
            promptType: 'quest_update',
            title: 'MISSION BRIEF',
            worldNotice: {
              entries: [
                {
                  title: 'WANTED NOTICE',
                  body: 'Bandit captain seen north of the river.',
                  details: [{ label: 'Reward', value: '120 silver' }],
                },
                {
                  title: 'ESCORT CONTRACT',
                  body: 'Guard the apothecary caravan to Rainwatch.',
                  details: [{ label: 'Departure', value: 'First bell' }],
                },
              ],
            },
          }}
        />
        <SystemBlock
          content="[ A legacy narrative notification. ]"
          system={{
            kind: 'system_prompt',
            promptType: 'quest_update',
            title: 'Legacy Narrative',
          }}
        />
        <SystemBlock
          content="[ A legacy mechanical display. ]"
          system={{
            kind: 'system_prompt',
            promptType: 'quest_update',
            title: 'Legacy Mechanical',
            rows: [{ label: 'Progress', value: '1/3' }],
          }}
        />
      </>,
    )));

    const notice = container.querySelector<HTMLElement>('[data-world-notice="true"]');
    expect(notice?.dataset.worldNoticeBoard).toBe('true');
    expect(notice?.dataset.worldNoticeEntryCount).toBe('2');
    const entries = [...(notice?.querySelectorAll<HTMLElement>('[data-world-notice-entry="true"]') ?? [])];
    expect(entries.map(entry => entry.textContent)).toEqual([
      expect.stringContaining('WANTED NOTICE'),
      expect.stringContaining('ESCORT CONTRACT'),
    ]);
    expect(entries[0]?.textContent).toContain('120 silver');
    expect(entries[1]?.textContent).toContain('First bell');
    expect(notice?.querySelectorAll('button, a[href], [role="button"], [tabindex]:not([tabindex="-1"])')).toHaveLength(0);

    const legacyPresentations = [...container.querySelectorAll<HTMLElement>('[data-system-presentation]')]
      .map(element => element.dataset.systemPresentation);
    expect(legacyPresentations).toEqual(['world_notice', 'narrative', 'mechanical']);
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
    expect(overlay?.textContent).toContain('Cultivation Breakthrough');
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
    // The report keeps every outcome with its signed figures — including the
    // quantity and the third outcome the compact two-slot row drops.
    expect(overlay?.querySelector('[data-consequence-count]')?.textContent).toContain('Presence Exposed');
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
    expect(elderHanAction?.getAttribute('data-color-code')).toBe('enemy');
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
        category: 'Narrative',
        control: 'Cultivation Breakthrough',
        subject: 'Yun Che',
        value: 'Foundation Establishment — Stage 4',
        consequence: 'Elder Han will move openly against Yun Che.',
        badge: null,
      },
      {
        category: 'Narrative',
        control: 'Broken Promise',
        subject: 'Magistrate Jinhai',
        value: 'Rain Court Standing — Disgraced',
        consequence: 'Magistrate Jinhai loses access to Riverside Sect testimony.',
        badge: null,
      },
      {
        category: 'Mechanical',
        control: 'Target Scan',
        subject: 'Elder Kaelen',
        value: 'Foundation Establishment — Stage 7',
        consequence: 'Elder Kaelen will prepare a countermeasure before the next encounter.',
        badge: 'Threat Assessment',
      },
    ];

    for (const example of examples) {
      await clickButton(example.category);
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

    await clickButton('System Prompts');
    await clickButton('Fate System');
    await clickButton('Contextual View');
    expect(container.querySelector('[data-testid="card-workshop-contextual-reader"]')).toBeTruthy();
    expect(container.textContent).toContain('FATE RESULT: FATE SCARRED');

    await openTechnicalDetails();
    await selectByLabel('Fate outcome', 'DOOM MANIFESTED');
    expect(container.textContent).toContain('FATE RESULT: DOOM MANIFESTED');

    await clickButton('Card Type Tabs');
    const selectedTab = container.querySelector<HTMLButtonElement>('#card-tab-system-fate');
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
    await selectByLabel('Card category', 'system-narrative');
    expect(reader?.textContent).toContain('Cultivation Breakthrough');
    expect(reader?.textContent).toContain('Mortal Tribulation Surpassed');
    expect(reader?.textContent).toContain('A golden interface unfurled before Yun Che, quiet where the tribulation\'s lightning had raged a breath before.');
    expect(reader?.textContent).toContain('New Realm');
    expect(reader?.textContent).toContain('Realm Ascended');
    expect(reader?.textContent).toContain('Then the thunder moved on');
  });

  it('keeps the full target-scan narration source while linking only its named character in Reader prose', async () => {
    act(() => root.render(renderWithDevAudio(<CardWorkshopView initialMode="contextual" />)));
    await openTechnicalDetails();
    await selectByLabel('Card category', 'system-mechanical');
    await selectByLabel('System prompt example style', 'target-scan');

    const reader = container.querySelector<HTMLElement>('[data-testid="card-workshop-contextual-reader"]');
    const systemBlock = reader?.querySelector<HTMLElement>('.system-block');
    expect(systemBlock?.querySelector('[data-system-summary]')?.textContent)
      .toBe('A crimson interface unfolded beside Elder Kaelen, taking his measure in silence.');
    expect(systemBlock?.textContent).toContain('Threat Assessment Moderate');

    const elderCodexAction = [...(systemBlock?.querySelectorAll<HTMLElement>('[role="button"]') ?? [])]
      .find(element => element.textContent === 'Elder Kaelen');
    expect(elderCodexAction).toBeTruthy();
    expect(elderCodexAction?.getAttribute('data-color-code')).toBe('enemy');
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
    await selectByLabel('Card category', 'system-world-notice');
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
