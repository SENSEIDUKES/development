// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { FamiliarPreview } from './FamiliarPreview';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    x: 0, y: 0, width: 960, height: 640, top: 0, left: 0, right: 960, bottom: 640,
    toJSON: () => ({}),
  } as DOMRect);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('inspects every catalogue Familiar and remounts the renderer for the chosen package', () => {
  act(() => root.render(<FamiliarPreview />));
  const [catalogue] = container.querySelectorAll<HTMLSelectElement>('select');
  expect(catalogue.value).toBe('quill');
  expect(catalogue.options).toHaveLength(11);
  expect(container.textContent).toContain('common · Default');

  const setValue = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!;
  act(() => {
    setValue.call(catalogue, 'phoenix');
    catalogue.dispatchEvent(new Event('change', { bubbles: true }));
  });
  expect(container.querySelector('h2')?.textContent).toBe('Phoenix');
  expect(document.querySelector('.familiar-companion [role="img"]')?.getAttribute('aria-label')).toContain('Phoenix');
});
