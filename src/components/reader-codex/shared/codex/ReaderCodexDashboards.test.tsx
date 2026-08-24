// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StoryMemory, StoryWorld } from '../types';
import { ReaderCodexDashboards } from './ReaderCodexDashboards';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('ReaderCodexDashboards Color Codes', () => {
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

  it('uses shared danger, boon, and destiny codes for the Karma metric badges', () => {
    const activeStory = {
      karmaNodes: [
        { id: 'debt', type: 'Debt', status: 'active' },
        { id: 'boon', type: 'Boon', status: 'active' },
        { id: 'destiny', type: 'Destiny', status: 'resolved' },
        { id: 'enmity', type: 'Enmity', status: 'active' },
      ],
    } as unknown as StoryWorld;

    act(() => {
      root.render(
        <ReaderCodexDashboards
          memory={{ currentPowerStage: 'Foundation Establishment', characters: [] } as StoryMemory}
          activeStory={activeStory}
          flatChapters={[{ chapterNumber: 1, title: 'The First Oath' }]}
          charsToRender={[]}
          affinityTimelineOfChar={[]}
          powerTimeline={[]}
          selectedChartCharId=""
          setSelectedChartCharId={vi.fn()}
        />,
      );
    });

    const metricCode = (label: string) => {
      const labelElement = [...container.querySelectorAll<HTMLElement>('span')]
        .find(element => element.textContent === label);
      return labelElement?.closest('div.p-4')?.querySelector<HTMLElement>('[data-color-code]')?.dataset.colorCode;
    };

    expect(metricCode('Karmic Debts')).toBe('enemy');
    expect(metricCode('Celestial Boons')).toBe('ally');
    expect(metricCode('Destinies & Enmities')).toBe('mentor');
  });

  it('uses the shared stage and breakthrough mappings across the power chart', () => {
    act(() => {
      root.render(
        <ReaderCodexDashboards
          memory={{ currentPowerStage: 'Foundation Establishment', characters: [] } as StoryMemory}
          activeStory={{ karmaNodes: [] } as unknown as StoryWorld}
          flatChapters={[{ chapterNumber: 1, title: 'The First Oath' }]}
          charsToRender={[]}
          affinityTimelineOfChar={[]}
          powerTimeline={[
            { chapterNumber: 1, title: 'Qi Awakening', score: 35, stageName: 'Qi Condensation', breakthrough: false, summary: 'Qi begins to circulate.' },
            { chapterNumber: 2, title: 'Foundation Set', score: 55, stageName: 'Foundation Establishment', breakthrough: true, summary: 'The foundation stabilizes.' },
          ]}
          selectedChartCharId=""
          setSelectedChartCharId={vi.fn()}
        />,
      );
    });

    const codeForText = (text: string) => [...container.querySelectorAll<HTMLElement>('[data-color-code]')]
      .find(element => element.textContent === text)
      ?.dataset.colorCode;

    expect(codeForText('Nascent (85)')).toBe('location');
    expect(codeForText('Core (70)')).toBe('mentor');
    expect(codeForText('Found. (55)')).toBe('mainCharacter');
    expect(codeForText('Qi (35)')).toBe('ally');
    expect(codeForText('Mortal')).toBe('unknown');
    expect(codeForText('Ascension Path')).toBe('mentor');
    expect(codeForText('Foundation Establishment')).toBe('mainCharacter');

    expect(container.querySelector('path[data-color-code="mentor"]')).toBeTruthy();
    expect(container.querySelector('circle[data-color-code="mentor"]')).toBeTruthy();
    expect([...container.querySelectorAll<HTMLElement>('[data-color-code="mentor"]')]
      .some(element => element.textContent?.includes('Core breakthrough advancement'))).toBe(true);
  });
});
