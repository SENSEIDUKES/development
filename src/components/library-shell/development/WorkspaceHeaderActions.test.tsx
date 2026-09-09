// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { HeaderOverflow } from './WorkspaceHeaderActions';
import { WorkspaceHeader } from './WorkspaceHeader';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); });

it('focuses the first enabled action and restores the trigger on Escape', () => {
  act(() => root.render(<HeaderOverflow actions={[
    { id: 'blocked', label: 'Unavailable', disabled: true, onAction: vi.fn() },
    { id: 'help', label: 'Help', onAction: vi.fn() },
  ]} />));
  const trigger = container.querySelector<HTMLButtonElement>('[aria-expanded]')!;
  act(() => trigger.click());
  expect(document.activeElement?.textContent).toBe('Help');
  act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  expect(document.activeElement).toBe(trigger);
});

it('dispatches a host action once, closes the disclosure, and preserves host focus', () => {
  const target = document.createElement('button'); document.body.append(target);
  const action = vi.fn(() => target.focus());
  act(() => root.render(<HeaderOverflow actions={[{ id: 'settings', label: 'Settings', onAction: action }]} />));
  act(() => container.querySelector<HTMLButtonElement>('[aria-expanded]')!.click());
  act(() => container.querySelector<HTMLButtonElement>('.header-overflow-panel button')!.click());
  expect(action).toHaveBeenCalledTimes(1);
  expect(container.querySelector('.header-overflow-panel')).toBeNull();
  expect(document.activeElement).toBe(target);
  target.remove();
});

it('dismisses on outside focus without stealing that focus', () => {
  act(() => root.render(<HeaderOverflow actions={[{ id: 'help', label: 'Help', onAction: vi.fn() }]} />));
  act(() => container.querySelector<HTMLButtonElement>('[aria-expanded]')!.click());
  const outside = document.createElement('button'); document.body.append(outside);
  act(() => outside.focus());
  expect(container.querySelector('.header-overflow-panel')).toBeNull();
  expect(document.activeElement).toBe(outside);
  outside.remove();
});

it('accepts a minimal identity without creating actions or domain content', () => {
  act(() => root.render(<WorkspaceHeader title="Quiet workspace" />));
  // Application chrome names the workspace without owning a heading, so the
  // document outline still starts at the page's own content.
  expect(container.querySelector('h1')).toBeNull();
  expect(container.querySelector('[data-slot="library-header-badge-title"]')?.textContent).toBe('Quiet workspace');
  expect(container.querySelector('button')).toBeNull();
  expect(container.querySelector('[role="status"]')).toBeNull();
  expect(container.textContent).not.toMatch(/Dao|Seed|Qi/);
});

it('keeps disabled primary eligibility with the host and intercepts home locally', () => {
  const primary = vi.fn(); const home = vi.fn();
  act(() => root.render(<WorkspaceHeader title="Story Seed" emblem={{ src: '/favicon.jpg', alt: 'Library' }}
    home={{ href: '/', label: 'Home', onNavigate: home }} primaryAction={{ id: 'save', label: 'Save', disabled: true, onAction: primary }} />));
  act(() => container.querySelector<HTMLButtonElement>('.workspace-primary-action button')!.click());
  expect(primary).not.toHaveBeenCalled();
  act(() => container.querySelector<HTMLAnchorElement>('a')!.click());
  expect(home).toHaveBeenCalledTimes(1);
});
