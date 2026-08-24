// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ReaderCodexMysteries } from './ReaderCodexMysteries';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('ReaderCodexMysteries Color Codes', () => {
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

  it('uses the shared danger and boon codes for unresolved and resolved thread surfaces', () => {
    act(() => {
      root.render(
        <ReaderCodexMysteries
          memory={{
            unresolvedPlotThreads: ['The broken seal still calls from the mountain.'],
            resolvedPlotThreads: ['The river oath has been fulfilled.'],
          }}
        />,
      );
    });

    const unresolvedHeading = [...container.querySelectorAll<HTMLElement>('span[data-color-code]')]
      .find(element => element.textContent?.startsWith('Unresolved mysteries'));
    const resolvedHeading = [...container.querySelectorAll<HTMLElement>('span[data-color-code]')]
      .find(element => element.textContent?.startsWith('Severed karma'));
    expect(unresolvedHeading?.dataset.colorCode).toBe('enemy');
    expect(unresolvedHeading?.style.color).toBe('var(--color-entity-enemy)');
    expect(resolvedHeading?.dataset.colorCode).toBe('ally');
    expect(resolvedHeading?.style.color).toBe('var(--color-entity-friend)');
    expect(container.querySelectorAll('[data-color-code="enemy"]').length).toBeGreaterThanOrEqual(2);
    expect(container.querySelectorAll('[data-color-code="ally"]').length).toBeGreaterThanOrEqual(3);
  });
});
