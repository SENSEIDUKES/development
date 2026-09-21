// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ProductFamiliarSession, ProductFamiliarSurface, useProductFamiliarPreview } from './ProductFamiliarPreview';
import { WorkspaceHeader } from '@seihouse/library/shell';

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
    <button onClick={() => context.setMinimized(true)}>Minimize</button>
    <button onClick={() => context.reportProfile({ ...context.selection, familiarSize: 1.8 })}>Resize</button>
  </>;
}
const render = () => act(() => root.render(<ProductFamiliarSession><ProductFamiliarSurface viewport headerRecall>
  <WorkspaceHeader title="Product" />
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

it('forwards Codex activity into the mounted companion', () => {
  act(() => root.render(<ProductFamiliarSession><ProductFamiliarSurface viewport activity="blocked"><span /></ProductFamiliarSurface></ProductFamiliarSession>));
  expect(document.querySelector('.familiar-companion [role="img"]')?.getAttribute('aria-label')).toBe('Celestial Guardian, Disappointed');
});

it('opens header actions before explicitly expanding a minimized pet and preserves its profile size', async () => {
  render();
  click('Resize');
  expect(Number.parseFloat(document.querySelector<HTMLElement>('.familiar-companion')!.style.width)).toBeCloseTo(187.2);
  click('Minimize');
  expect(document.querySelector('.familiar-companion')).toBeNull();
  const recall = container.querySelector<HTMLButtonElement>('header .familiar-recall')!;
  expect(recall).not.toBeNull();
  await act(async () => recall.click());
  expect(document.querySelector('.familiar-companion')).toBeNull();
  await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="Expand Familiar"]')!.click());
  expect(document.querySelector('.familiar-companion')).not.toBeNull();
  expect(container.querySelector('.familiar-recall')).toBeNull();
});
