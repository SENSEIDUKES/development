// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FateResultData, StoryWorld, SystemEvent } from '../shared/types';
import { getColorCodeValue, resolveFateConsequenceDetailColorCode } from '../shared/colorCodes';
import { FateResultCard } from './FateResultCard';
import { FateSurvivalExplanation } from './FateSurvivalExplanation';
import { ReaderFateAlerts } from './ReaderFateAlerts';
import { SystemBlock } from './SystemBlock';
import { FateSurvivalExplanation as StorySeedFateSurvivalExplanation } from '../../story-seed/reference/FateSurvivalExplanation';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const baseResult: Omit<FateResultData, 'outcome'> = {
  timelineScar: 'The Rain Court remembers the wound.',
  permanentCosts: ['A permanent cost remains.'],
};

const fateTypeColorCodes = [
  'corruption', 'bond', 'mentor', 'location', 'itemGreat',
  'mentor', 'enemy', 'mainCharacter', 'unknown', 'itemGood',
];

describe('Reader fate Color Codes', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('routes every Fate result and flag through the shared outcome mapping', () => {
    const outcomes: Array<[FateResultData['outcome'], string]> = [
      ['FATE AVERTED', 'mentor'],
      ['FATE SCARRED', 'itemGreat'],
      ['DOOM MANIFESTED', 'corruption'],
    ];

    for (const [outcome, colorCode] of outcomes) {
      act(() => {
        root.render(<FateResultCard data={{
          ...baseResult,
          outcome,
          newStoryState: 'The Rain Court opens its gates.',
          genreShift: 'Court intrigue becomes a war chronicle.',
        }} />);
      });
      const card = container.querySelector<HTMLElement>('[data-color-code]');
      expect(card?.dataset.colorCode).toBe(colorCode);
      expect(card?.style.color).toBe(getColorCodeValue(colorCode as Parameters<typeof getColorCodeValue>[0]));

      for (const detail of ['newStoryState', 'genreShift'] as const) {
        const detailValue = container.querySelector<HTMLElement>(`[data-fate-consequence-detail="${detail}"]`);
        const detailColorCode = resolveFateConsequenceDetailColorCode(detail);
        expect(detailValue?.dataset.colorCode).toBe(detailColorCode);
        expect(detailValue?.style.color).toBe(getColorCodeValue(detailColorCode));
      }
    }

    act(() => {
      root.render(<SystemBlock content="[ DEATH FLAG: the oath turns fatal. ]" />);
    });
    expect(container.querySelector('[data-color-code="corruption"]')).toBeTruthy();
    expect(container.querySelector('.animate-menacing-fate')).toBeTruthy();

    act(() => {
      root.render(<SystemBlock content="[ IRON FATE WARNING: the lock tightens. ]" />);
    });
    expect(container.querySelector('[data-color-code="mentor"]')).toBeTruthy();
    expect(container.querySelector('.animate-menacing-fate')).toBeTruthy();
  });

  it('does not let malformed explicit Fate or World Notice data fall through to a regular System Prompt', () => {
    const malformedFateResult = { outcome: 'FATE SCARRED' };
    const malformedFate = {
      kind: 'fate_system_prompt',
      title: 'Invalid Fate',
      fateResult: malformedFateResult,
    } as SystemEvent;

    act(() => {
      root.render(<SystemBlock content="[ A broken fate result. ]" system={malformedFate} />);
    });
    expect(container.innerHTML).toBe('');

    act(() => {
      root.render(<FateResultCard data={malformedFateResult as unknown as FateResultData} />);
    });
    expect(container.innerHTML).toBe('');

    const malformedWorldNotice = {
      kind: 'system_prompt',
      presentation: 'world_notice',
      title: 'Incomplete Notice',
      worldNotice: { entries: [] },
    } as SystemEvent;
    act(() => {
      root.render(<SystemBlock content="[ A broken notice. ]" system={malformedWorldNotice} />);
    });
    expect(container.innerHTML).toBe('');
  });

  it('uses the same Color Codes in fate-type choices and Reader fate alerts', () => {
    act(() => {
      root.render(<FateSurvivalExplanation />);
    });
    const fateButtons = [...container.querySelectorAll<HTMLButtonElement>('button[data-color-code]')];
    expect(fateButtons.map(button => button.dataset.colorCode)).toEqual(fateTypeColorCodes);

    act(() => fateButtons[0]?.click());
    expect(fateButtons[0]?.style.color).toBe(getColorCodeValue('corruption'));

    // The visible Story Seed Original Reference uses this same fate taxonomy,
    // rather than keeping a second palette beside the Reader's mapping.
    act(() => {
      root.render(<StorySeedFateSurvivalExplanation />);
    });
    expect([...container.querySelectorAll<HTMLButtonElement>('button[data-color-code]')]
      .map(button => button.dataset.colorCode)).toEqual(fateTypeColorCodes);

    const fateStory = {
      genre: 'Fate Survival',
      hardcoreFateMode: true,
      mcName: 'Rin',
      memory: { currentPowerStage: 'Foundation Establishment' },
    } as StoryWorld;
    act(() => {
      root.render(
        <ReaderFateAlerts
          activeStory={fateStory}
          currentPowerStage="Mortal"
          selectedChapterNum={4}
          showFateCodex={false}
          setShowFateCodex={vi.fn()}
        />,
      );
    });

    expect(container.querySelector('[data-color-code="corruption"]')?.textContent)
      .toContain('Fate Survival Mode Active');
    expect(container.textContent).toContain('Hardcore Fate Mode Engaged');
  });
});
