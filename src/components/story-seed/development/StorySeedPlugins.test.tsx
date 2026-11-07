// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { StorySeedPlugins } from './StorySeedPlugins';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
beforeEach(() => { container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
afterEach(() => { act(() => root.unmount()); container.remove(); });

it('shows the Writer plugins first and keeps the Blueprint skills folded under Advanced', () => {
  act(() => root.render(<StorySeedPlugins writer={<p data-testid="writer-slots">slots</p>} />));
  const headings = [...container.querySelectorAll('h3')].map(heading => heading.textContent);
  expect(headings).toEqual(['Writer', 'Blueprint']);
  expect(container.querySelector('[data-testid="writer-slots"]')).toBeTruthy();
  const advanced = container.querySelector<HTMLDetailsElement>('[data-testid="plugins-advanced"]')!;
  expect(advanced.open).toBe(false);
  expect(advanced.querySelector('summary')?.textContent).toBe('Advanced');
  const blueprint = [...advanced.querySelectorAll('li')].map(item => item.firstElementChild?.textContent);
  expect(blueprint).toEqual([
    expect.stringMatching(/^Origin · SEN Eastern Fantasy v/),
    expect.stringMatching(/^World · SEN World Builder v/),
    expect.stringMatching(/^Arc · SEN Arc Planner v/),
  ]);
});
