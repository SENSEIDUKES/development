// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COLOR_CODE_PALETTE_IDS, SYSTEM_COLORS_LEGEND } from '../shared/colorCodes';
import { SystemColorLegend } from './SystemColorLegend';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('SystemColorLegend', () => {
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

  it('presents Color Codes and every event meaning from the shared registry', () => {
    act(() => {
      root.render(
        <SystemColorLegend
          currentPrefs={{ colorPaletteId: 'deuteranopia' }}
          handleUpdatePreference={vi.fn()}
          setShowLegend={vi.fn()}
        />,
      );
    });

    expect(container.querySelector('[aria-labelledby="color-codes-legend-heading"]')).toBeTruthy();
    expect(container.querySelector('#color-codes-legend-heading')?.textContent).toBe('Color Codes');
    expect([...container.querySelectorAll('option')].map(option => option.value)).toEqual(COLOR_CODE_PALETTE_IDS);
    expect([...container.querySelectorAll<HTMLElement>('[data-color-code]')].map(element => element.dataset.colorCode))
      .toEqual(SYSTEM_COLORS_LEGEND.map(meaning => meaning.colorCode));
  });
});
