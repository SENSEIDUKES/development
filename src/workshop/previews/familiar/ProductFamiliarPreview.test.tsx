// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ProductFamiliarSession, ProductFamiliarSurface, useProductFamiliarPreview } from './ProductFamiliarPreview';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); });

function ProfileEvents() {
  const context = useProductFamiliarPreview()!;
  return <>
    <button onClick={() => context.reportProfile({ uid: 'another-account', familiarId: 'celestial-guardian' })}>Switch account</button>
    <button onClick={() => context.reportProfile({ uid: context.selection.uid })}>Clear selection</button>
    <button onClick={() => context.reportProfile({ uid: null })}>Sign out</button>
  </>;
}
const render = () => act(() => root.render(<ProductFamiliarSession><ProductFamiliarSurface viewport>
  <ProductFamiliarSession><ProductFamiliarSurface viewport><ProfileEvents /></ProductFamiliarSurface></ProductFamiliarSession>
</ProductFamiliarSurface></ProductFamiliarSession>));
const click = (label: string) => act(() => [...container.querySelectorAll('button')].find(button => button.textContent === label)!.click());

it('mounts one companion for nested product pages and resets the interaction on account changes', () => {
  render();
  const initial = document.querySelector('.familiar-companion button');
  expect(document.querySelectorAll('.familiar-companion')).toHaveLength(1);
  click('Switch account');
  expect(document.querySelectorAll('.familiar-companion')).toHaveLength(1);
  expect(document.querySelector('.familiar-companion button')).not.toBe(initial);
});

it.each(['Clear selection', 'Sign out'])('removes the companion when the profile reports %s', action => {
  render();
  click(action);
  expect(document.querySelector('.familiar-companion')).toBeNull();
});
