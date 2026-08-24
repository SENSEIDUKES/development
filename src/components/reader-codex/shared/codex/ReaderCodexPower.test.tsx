// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { StoryMemory, StoryWorld } from '../types';
import { ReaderCodexPower } from './ReaderCodexPower';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('ReaderCodexPower Color Codes', () => {
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

  const renderPower = (currentPowerStage: string) => {
    act(() => {
      root.render(
        <ReaderCodexPower
          memory={{ currentPowerStage } as StoryMemory}
          activeStory={{} as StoryWorld}
          getPowerStageLevel={() => ({ score: 0, title: 'Mortal' })}
          mcName="Rin"
          getPowerRankScore={() => ({ score: 55, title: 'Foundation Establishment' })}
          charsToRender={[]}
        />,
      );
    });
  };

  it('shares the Dashboard stage resolver for the live Active Tier badge', () => {
    renderPower('Foundation Establishment');

    let activeTier = [...container.querySelectorAll<HTMLElement>('[data-color-code]')]
      .find(element => element.textContent === 'Active Tier: Foundation Establishment');
    expect(activeTier?.dataset.colorCode).toBe('mainCharacter');
    expect(activeTier?.style.color).toBe('var(--color-entity-mc)');

    renderPower('Nascent Soul');
    activeTier = [...container.querySelectorAll<HTMLElement>('[data-color-code]')]
      .find(element => element.textContent === 'Active Tier: Nascent Soul');
    expect(activeTier?.dataset.colorCode).toBe('location');
    expect(activeTier?.style.color).toBe('var(--color-location-regular)');
  });
});
