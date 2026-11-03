// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { HostDialog } from './HostDialog';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let container: HTMLDivElement;
let root: Root;
beforeEach(() => { container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
afterEach(() => { act(() => root.unmount()); container.remove(); });

it('keeps focus inside, closes with Escape, and returns focus where it came from', async () => {
  const onClose = vi.fn();
  const render = (open: boolean) => act(async () => root.render(<>
    <button type="button" id="behind">Behind</button>
    <HostDialog open={open} onClose={onClose} title="Usage"><button type="button">Inside</button></HostDialog>
  </>));
  await render(false);
  const behind = document.getElementById('behind')!;
  behind.focus();
  await render(true);
  const close = document.querySelector<HTMLButtonElement>('[aria-label="Close Usage"]')!;
  expect(document.activeElement).toBe(close);
  // Focus that wanders behind the page is brought back inside.
  await act(async () => { behind.focus(); await new Promise(resolve => setTimeout(resolve, 20)); });
  expect(document.querySelector('[role="dialog"]')!.contains(document.activeElement)).toBe(true);
  await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
  expect(onClose).toHaveBeenCalledOnce();
  await render(false);
  expect(document.activeElement).toBe(behind);
});
