// @vitest-environment jsdom
import React, { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from '../../../test-utils/createReaderRoot';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { type FateResultData, type SystemEvent } from '@seihouse/sen/cards';
import { getColorCodeValue, resolveFateConsequenceDetailColorCode } from '@seihouse/sen/color-codes';
import { FateResultCard } from '@seihouse/sen/cards';
import { SystemBlock } from '@seihouse/sen/cards';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const baseResult: Omit<FateResultData, 'outcome'> = {
  timelineScar: 'The Rain Court remembers the wound.',
  permanentCosts: ['A permanent cost remains.'],
};

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
      ['FATE SCARRED', 'corruption'],
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
      root.render(<div data-fate-subject><SystemBlock content="[ A broken fate result. ]" system={malformedFate} /></div>);
    });
    expect(container.querySelector('[data-fate-subject]')!.innerHTML).toBe('');

    act(() => {
      root.render(<div data-fate-subject><FateResultCard data={malformedFateResult as unknown as FateResultData} /></div>);
    });
    expect(container.querySelector('[data-fate-subject]')!.innerHTML).toBe('');

    const malformedWorldNotice = {
      kind: 'system_prompt',
      presentation: 'world_notice',
      title: 'Incomplete Notice',
      worldNotice: { entries: [] },
    } as SystemEvent;
    act(() => {
      root.render(<div data-fate-subject><SystemBlock content="[ A broken notice. ]" system={malformedWorldNotice} /></div>);
    });
    expect(container.querySelector('[data-fate-subject]')!.innerHTML).toBe('');
  });
});
