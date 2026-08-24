// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Chapter } from '../types';
import { ReaderCodexTimeline } from './ReaderCodexTimeline';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('ReaderCodexTimeline Color Codes', () => {
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

  it('uses the shared mentor Color Code for a chapter progression badge', () => {
    const chapter = {
      number: 1,
      title: 'The First Oath',
      premise: 'A cultivation trial begins.',
      status: 'read',
      statsChangeMessage: 'Qi Condensation reached',
    } as Chapter;

    act(() => {
      root.render(
        <ReaderCodexTimeline
          flatChapters={[{ chapter, arcTitle: 'First Arc', arcIndex: 0, isFirstInArc: true }]}
        />,
      );
    });

    const badge = [...container.querySelectorAll<HTMLElement>('[data-color-code]')]
      .find(element => element.textContent === 'Qi Condensation reached');

    expect(badge?.dataset.colorCode).toBe('mentor');
    expect(badge?.style.color).toBe('var(--color-entity-mentor)');
  });
});
