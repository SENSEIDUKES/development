// @vitest-environment jsdom
import { act, type ComponentProps } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FeatureWorkspace } from './FeatureWorkspace';
import type { WorkshopEntry } from './manifest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const entry: WorkshopEntry = {
  id: 'controls-test',
  title: 'Controls Test',
  description: 'Shared Workshop Controls test fixture.',
  category: 'other',
  version: 'v1.0',
  source: {
    repository: 'SENSEIDUKES/development',
    path: 'src/workshop/FeatureWorkspace.tsx',
    lastCompared: '2026-08-17',
  },
};

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

function renderWorkspace(workshopControls?: ComponentProps<typeof FeatureWorkspace>['workshopControls']) {
  act(() => {
    root.render(
      <FeatureWorkspace
        entry={entry}
        workshopControls={workshopControls}
        renderReference={() => <div>Reference canvas</div>}
        renderDevelopment={() => <div>Development canvas</div>}
      />,
    );
  });
}

describe('FeatureWorkspace Workshop Controls', () => {
  it('orders feature-supplied sections by the canonical menu structure', () => {
    renderWorkspace({
      defaultSection: 'states',
      sections: [
        { id: 'effects', content: <p>Effect options</p> },
        { id: 'pages', content: <p>Page options</p> },
        { id: 'states', content: <p>State options</p> },
      ],
    });

    const navigation = container.querySelector('[aria-label="Workshop control sections"]')!;
    const labels = [...navigation.querySelectorAll('button')].map(button => button.textContent?.trim());
    expect(labels).toEqual(['Pages', 'States', 'Effects']);
    expect(container.querySelector('[data-workshop-control-section="states"]')?.textContent).toContain('State options');

    const effectsButton = [...navigation.querySelectorAll('button')]
      .find(button => button.textContent?.trim() === 'Effects')!;
    act(() => effectsButton.click());

    expect(effectsButton.getAttribute('aria-pressed')).toBe('true');
    expect(container.querySelector('[data-workshop-control-section="effects"]')?.textContent).toContain('Effect options');
  });

  it('uses one mobile disclosure that closes on Escape', () => {
    renderWorkspace({
      sections: [{ id: 'scenes', content: <button type="button">Reveal flow</button> }],
    });

    const toggle = [...container.querySelectorAll('button')]
      .find(button => button.textContent?.includes('Open'))!;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    act(() => toggle.click());
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(container.textContent).toContain('Reveal flow');

    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('keeps the shared shell present when a preview has no external options', () => {
    renderWorkspace();

    expect(container.querySelectorAll('[data-workshop-controls]')).toHaveLength(1);
    expect(container.textContent).toContain('This preview has no external Workshop options.');
    expect(container.textContent).toContain('Development canvas');
  });
});
