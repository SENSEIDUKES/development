// @vitest-environment jsdom
import React, { act } from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('motion/react', async importOriginal => {
  const actual = await importOriginal<typeof import('motion/react')>();
  return { ...actual, useReducedMotion: () => true };
});

import { SystemBlock } from './SystemBlock';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('System Prompt accessibility and motion', () => {
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

  it('removes component and ambient animation when reduced motion is requested', () => {
    act(() => root.render(
      <>
        <SystemBlock
          content="[ A quiet System report. ]"
          system={{
            kind: 'system_prompt',
            presentation: 'narrative',
            title: 'Quiet Report',
          }}
        />
        <SystemBlock
          content="[ DEATH FLAG: the archive darkens. ]"
          system={{
            kind: 'system_prompt',
            presentation: 'mechanical',
            title: 'Death Flag Record',
            rarity: 'Forbidden',
            rows: [{ label: 'State', value: 'Sealed' }],
          }}
        />
        <SystemBlock
          content="[ Fate closes around the oath. ]"
          system={{
            kind: 'fate_system_prompt',
            title: 'Fate Result',
            fateResult: {
              outcome: 'DOOM MANIFESTED',
              timelineScar: 'The oath remains broken.',
              permanentCosts: ['The archive remembers.'],
            },
          }}
        />
      </>,
    ));

    const animatedSurfaces = [...container.querySelectorAll<HTMLElement>('[data-motion]')];
    expect(animatedSurfaces.map(element => element.dataset.motion))
      .toEqual(['reduced', 'reduced', 'reduced']);
    expect(container.querySelector('[data-system-presentation="mechanical"] .animate-pulse')?.getAttribute('class'))
      .toContain('motion-reduce:animate-none');
    expect(container.querySelector('[data-system-presentation="fate"]')?.className)
      .toContain('motion-reduce:animate-none');

    const scopedStyles = readFileSync(
      join(process.cwd(), 'src/components/reader-chamber/shared/reader-chamber.css'),
      'utf8',
    );
    expect(scopedStyles).toContain('@media (prefers-reduced-motion: reduce)');
    expect(scopedStyles).toContain('.system-block.holographic-panel .rarity-accent');
    expect(scopedStyles).toContain('.animate-menacing-fate');
  });

  it('restores focus when a live event replacement unmounts an open report', () => {
    const renderEvent = (title: string, content: string) => (
      <SystemBlock
        content={content}
        system={{
          kind: 'system_prompt',
          presentation: 'narrative',
          title,
          changes: [{ label: 'Realm Advanced', direction: 'gain' }],
          expanded: {
            sections: [{ heading: 'Realm', value: 'Advanced' }],
          },
        }}
      />
    );

    act(() => root.render(renderEvent('First Report', 'The first event is recorded.')));
    const opener = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Expand System Prompt details"]',
    );
    expect(opener).toBeTruthy();
    act(() => opener!.click());
    expect(document.body.querySelector('[role="dialog"]')).toBeTruthy();
    expect(document.activeElement?.getAttribute('role')).toBe('dialog');

    act(() => root.render(renderEvent('Replacement Report', 'A newer event replaces it.')));

    const replacementOpener = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Expand System Prompt details"]',
    );
    expect(document.body.querySelector('[role="dialog"]')).toBeFalsy();
    expect(replacementOpener).toBeTruthy();
    expect(document.activeElement).toBe(replacementOpener);
  });
});
