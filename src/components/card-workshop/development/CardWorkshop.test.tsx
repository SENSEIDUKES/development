// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CardWorkshopView } from './CardWorkshopView';
import { CardWorkshopWorkspace } from '../../../workshop/previews/card-workshop/CardWorkshopWorkspace';
import { CARD_PRESETS } from '../../../workshop/previews/card-workshop/previewData';
import { resetMockState } from '../../reader-chamber/shared/stubs';

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

class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

beforeEach(() => {
  resetMockState();
  globalThis.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
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
    act(() => root.render(<CardWorkshopWorkspace />));

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
  it('renders every required real presentation and labels the routes under review', () => {
    act(() => root.render(<CardWorkshopView initialMode="overview" />));

    expect(container.textContent).toContain('World Entity Cards');
    expect(container.textContent).toContain('Codex Reveal Moments');
    expect(container.textContent).toContain('System Panels & Fate Outcomes');
    expect(container.textContent).toContain('Chapter-Level Visual Memories');
    expect(container.textContent).toContain('Current Routing Under Review');

    for (const label of [
      'Human Character',
      'Non-Human Individual',
      'Generic Creature Species',
      'Artifact or Relic',
      'Location',
      'Faction',
      'System Status',
      'Skill Acquisition',
      'Level-Up / Breakthrough',
      'Quest & Appraisal',
      'Fate Result Card',
      'Manifestation Image',
    ]) {
      expect(container.textContent).toContain(label);
    }

    expect(container.querySelector('img[alt="Chapter Crux Manifestation"]')).toBeTruthy();
    expect(container.textContent).toContain('FATE RESULT: FATE SCARRED');
    expect(container.textContent).toContain('CURRENT ROUTING UNDER REVIEW');
  });

  it('switches presets and preserves the Bestiary species versus Non-Human Portrait distinction', async () => {
    act(() => root.render(<CardWorkshopView initialMode="inspection" />));

    await selectByLabel('Card preset', 'preset-nonhuman-portrait-reveal');
    expect(container.textContent).toContain('ReaderCodex > Portraits (Non-Human Section)');
    expect(container.textContent).toContain('Non-Human Portrait Reveal');

    await selectByLabel('Creature scope', 'species');
    expect(container.textContent).toContain('ReaderCodex > Bestiary');
    expect(container.textContent).toContain('Generic Creature Species');

    const species = CARD_PRESETS.find(preset => preset.id === 'preset-creature-species')!;
    const individual = CARD_PRESETS.find(preset => preset.id === 'preset-nonhuman-portrait-reveal')!;
    expect(species.explanation.capabilities.hasManifestAction).toBe(false);
    expect(individual.explanation.capabilities.hasManifestAction).toBe(true);
  });

  it('covers existing image, Manifest/Awaken, and missing-image states', async () => {
    act(() => root.render(
      <CardWorkshopView
        initialMode="inspection"
        initialPresetId="preset-nonhuman-portrait-reveal"
      />,
    ));

    expect(container.querySelector('img[alt="Lei"]')).toBeTruthy();

    await selectByLabel('Image state', 'manifest');
    expect(getButton('Manifest portrait for Lei')).toBeTruthy();

    await selectByLabel('Image state', 'missing');
    expect(getButton('Manifest portrait for Lei')).toBeFalsy();
    expect(container.querySelector('img[alt="Backdrop"]')?.getAttribute('src'))
      .toBe('/card-workshop/reveal-backdrop.svg');
  });

  it('covers Codex present/missing and first-reveal/existing-reference behavior', async () => {
    act(() => root.render(
      <CardWorkshopView
        initialMode="inspection"
        initialPresetId="preset-nonhuman-portrait-reveal"
      />,
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
      <CardWorkshopView initialMode="inspection" initialPresetId="preset-human-character" />,
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
      <CardWorkshopView initialMode="inspection" initialPresetId="preset-system-status" />,
    ));

    await selectByLabel('System panel kind', 'skill_acquired');
    expect(container.textContent).toContain('Meridian Status & Vitality Flow');

    await selectByLabel('Card preset', 'preset-fate-result');
    expect(container.textContent).toContain('FATE RESULT: FATE SCARRED');
    await selectByLabel('Fate outcome', 'DOOM MANIFESTED');
    expect(container.textContent).toContain('FATE RESULT: DOOM MANIFESTED');
  });

  it('switches mobile, tablet, and desktop preview widths', async () => {
    act(() => root.render(<CardWorkshopView initialMode="inspection" />));

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

    act(() => root.render(<CardWorkshopView initialMode="overview" />));
    await clickButton('Inspection Mode');
    await selectByLabel('Card preset', 'preset-manifestation-image');

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
    expect(container.querySelector('img[src^="http"]')).toBeFalsy();
  });
});
